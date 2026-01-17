import mongoose from 'mongoose';
import { LedgerService } from '../ledger/LedgerService';
import { BidDocument, BidModel } from '../models/Bid.model';
import { BidStatus } from '../types/bid.types';
import { LedgerEntryTypes, LedgerRefType } from '../types/ledger.types';

export class BidProcessor {
  private ledgerService: LedgerService;

  constructor() {
    this.ledgerService = new LedgerService();
  }

  async createBid(data: {
    auctionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    roundNumber: number;
    amount: number;
    idempotencyKey: string;
  }): Promise<BidDocument> {
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const bid = new BidModel({
        auctionId: data.auctionId,
        userId: data.userId,
        roundNumber: data.roundNumber,
        amount: data.amount,
        status: BidStatus.ACTIVE,
        idempotencyKey: data.idempotencyKey,
        placedAt: new Date(),
      });

      await bid.save({ session });

      await session.commitTransaction();

      return bid;
    } catch (error) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  async increaseBid(data: {
    bidId: string;
    auctionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    roundNumber: number;
    amount: number;
    idempotencyKey: string;
  }): Promise<BidDocument> {
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const bid = await this.findBidById(data.bidId, session);
      if (!bid) {
        throw new Error('Bid not found');
      }
      bid.amount = Number(bid.amount) + Number(data.amount);

      await bid.save({ session });

      await session.commitTransaction();

      return bid;
    } catch (error) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  async findBidByIdempotencyKey(idempotencyKey: string): Promise<BidDocument | null> {
    return await BidModel.findOne({ idempotencyKey });
  }

  async getUserBidsForRound(
    userId: string,
    auctionId: string,
    roundNumber: number,
  ): Promise<BidDocument[]> {
    return await BidModel.find({
      userId,
      auctionId,
      roundNumber,
      status: BidStatus.ACTIVE,
    });
  }

  async findBidById(
    bidId: string,
    session?: mongoose.ClientSession | null,
  ): Promise<BidDocument | null> {
    const query = BidModel.findOne({ _id: bidId });
    return session ? query.session(session) : query;
  }

  async getTotalBidAmount(userId: string, auctionId: string, roundNumber: number): Promise<number> {
    const bids = await this.getUserBidsForRound(userId, auctionId, roundNumber);
    return bids.reduce((sum, bid) => sum + bid.amount, 0);
  }
}
