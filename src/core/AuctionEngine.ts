import { AuctionModel, AuctionDocument } from '../models/Auctions.model';
import { AuctionStatus, RoundStatus } from '../types/auction.types';
import { CreateAuctionDTO } from '../api/dto/create-auction.dto';
import { RoundManager } from './RoundManager';
import { WinnerCalculator } from './WinnerCalculator';
import { BalanceManager } from './BalanceManager';
import { BidModel } from '../models/Bid.model';
import { BidStatus } from '../types/bid.types';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { LedgerRefType } from '../types/ledger.types';

export class AuctionEngine {
  private roundManager: RoundManager;
  private winnerCalculator: WinnerCalculator;
  private balanceManager: BalanceManager;

  constructor() {
    this.roundManager = new RoundManager();
    this.winnerCalculator = new WinnerCalculator();
    this.balanceManager = new BalanceManager();
  }

  async getAuction(auctionId: string): Promise<AuctionDocument | null> {
    return await AuctionModel.findById(auctionId);
  }

  async createAuction(data: CreateAuctionDTO & { creatorId: string }): Promise<AuctionDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const rounds = this.roundManager.generateRounds({
        totalGifts: data.totalGifts,
        roundDurations: data.roundDurations,
        giftsPerRound: data.giftsPerRound,
        antiSnipingSeconds: 30,
      });

      const auction = new AuctionModel({
        creatorId: data.creatorId,
        title: data.title,
        totalGifts: data.totalGifts,
        status: AuctionStatus.DRAFT,
        rounds,
        currentRound: 0,
      });

      // Start auction within the same transaction
      auction.status = AuctionStatus.ACTIVE;
      auction.rounds[0].status = RoundStatus.ACTIVE;
      auction.rounds[0].startTime = new Date();
      auction.rounds[0].endTime = new Date(Date.now() + auction.rounds[0].duration * 60 * 1000);

      await auction.save({ session });
      await session.commitTransaction();

      logger.info(`Auction created and started: ${auction.id}`);

      return auction;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async startAuction(auctionId: string): Promise<void> {
    const auction = await this.getAuction(auctionId);
    if (!auction) {
      throw new Error('Auction not found');
    }

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new Error('Auction already started');
    }

    auction.status = AuctionStatus.ACTIVE;
    auction.rounds[0].status = RoundStatus.ACTIVE;
    auction.rounds[0].startTime = new Date();
    auction.rounds[0].endTime = new Date(Date.now() + auction.rounds[0].duration * 60 * 1000);

    await auction.save();

    logger.info(`Auction started: ${auctionId}`);
  }

  async endRound(auctionId: string, roundNumber: number, commandId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const auction = await AuctionModel.findById(auctionId).session(session);
      if (!auction) {
        throw new Error('Auction not found');
      }

      // Bounds checking for roundNumber
      if (roundNumber < 0 || roundNumber >= auction.rounds.length) {
        throw new Error(
          `Invalid round number: ${roundNumber}. Auction has ${auction.rounds.length} rounds.`,
        );
      }

      const round = auction.rounds[roundNumber];
      if (!round) {
        throw new Error(`Round ${roundNumber} not found`);
      }

      if (round.status !== RoundStatus.ACTIVE) {
        throw new Error('Round is not active');
      }

      const winners = await this.winnerCalculator.calculateWinners(
        auctionId,
        roundNumber + 1,
        round.giftsToDistribute,
      );

      round.status = RoundStatus.COMPLETED;
      round.endTime = new Date();
      round.winnerIds = winners.map((w) => new mongoose.Types.ObjectId(w.userId));

      await this.processRoundResults(auctionId, roundNumber + 1, winners, session, commandId);

      if (roundNumber < auction.rounds.length - 1) {
        auction.currentRound = roundNumber + 1;
        auction.rounds[roundNumber + 1].status = RoundStatus.ACTIVE;
        auction.rounds[roundNumber + 1].startTime = new Date();
        auction.rounds[roundNumber + 1].endTime = new Date(
          Date.now() + auction.rounds[roundNumber + 1].duration * 60 * 1000,
        );
      } else {
        auction.status = AuctionStatus.COMPLETED;
      }

      await auction.save({ session });
      await session.commitTransaction();

      logger.info(`Round ${roundNumber + 1} ended for auction ${auctionId}`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async checkAntiSniping(auctionId: string, roundNumber: number): Promise<boolean> {
    const auction = await this.getAuction(auctionId);
    if (!auction) return false;

    const round = auction.rounds[roundNumber];
    if (!round || round.status !== RoundStatus.ACTIVE) return false;

    const timeLeft = round.endTime.getTime() - Date.now();
    const antiSnipingWindow = 30 * 1000;

    return timeLeft <= antiSnipingWindow;
  }

  async extendRound(auctionId: string, roundNumber: number): Promise<void> {
    const auction = await this.getAuction(auctionId);
    if (!auction) return;

    const round = auction.rounds[roundNumber];
    if (!round || round.status !== RoundStatus.ACTIVE) return;

    round.endTime = new Date(round.endTime.getTime() + 30 * 1000);
    await auction.save();

    logger.info(`Round ${roundNumber + 1} extended for auction ${auctionId}`);
  }

  private async processRoundResults(
    auctionId: string,
    roundNumber: number,
    winners: any[],
    session: mongoose.ClientSession,
    commandId: string,
  ): Promise<void> {
    const winnerUserIds = new Set(winners.map((w) => w.userId));

    const allBids = await BidModel.find({
      auctionId,
      roundNumber,
      status: BidStatus.ACTIVE,
    }).session(session);

    for (const bid of allBids) {
      const userId = bid.userId.toString();

      if (winnerUserIds.has(userId)) {
        bid.status = BidStatus.WON;
        const chargeCommandId = `${commandId}-charge-${bid._id.toString()}`;
        await this.balanceManager.charge({
          userId,
          amount: bid.amount,
          refType: LedgerRefType.BID,
          refId: bid._id.toString(),
          commandId: chargeCommandId,
        });
      } else {
        bid.status = BidStatus.REFUNDED;
        const releaseCommandId = `${commandId}-release-${bid._id.toString()}`;
        await this.balanceManager.release({
          userId,
          amount: bid.amount,
          refType: LedgerRefType.BID,
          refId: bid._id.toString(),
          commandId: releaseCommandId,
        });
      }

      await bid.save({ session });
    }
  }
}
