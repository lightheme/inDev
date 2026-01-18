import { Command } from '../../types/command.types';
import { CommandResult } from '../../types/command.types';
import { IncreaseBidDTO } from '../../api/dto/increase-bid.dto';
import { AuctionEngine } from '../../core/AuctionEngine';
import { BidProcessor } from '../../core/BidProcessor';
import { BalanceManager } from '../../core/BalanceManager';
import { AppError } from '../../utils/errors';
import { LedgerRefType } from '../../types/ledger.types';
import { UserRepository } from '../../repositories/UserRepository';
import { logger } from '../../utils/logger';
import { LedgerRepository } from '../../repositories/LedgerRepository';

export class IncreaseBidCommand implements Command {
  type = 'IncreaseBid';
  payload: IncreaseBidDTO;
  idempotencyKey: string;

  private auctionEngine: AuctionEngine;
  private bidProcessor: BidProcessor;
  private balanceManager: BalanceManager;
  private userRepository: UserRepository;
  private ledgerRepository: LedgerRepository;

  constructor(payload: IncreaseBidDTO) {
    this.payload = {
      ...payload,
      amount: Number(payload.amount),
    };
    this.idempotencyKey = payload.idempotencyKey;
    this.auctionEngine = new AuctionEngine();
    this.bidProcessor = new BidProcessor();
    this.balanceManager = new BalanceManager();
    this.userRepository = new UserRepository();
    this.ledgerRepository = new LedgerRepository();
  }

  async validate(): Promise<boolean> {
    const { auctionId, userId, amount } = this.payload;
    
    const auction = await this.auctionEngine.getAuction(auctionId);
    if (!auction) {
      throw new AppError('Auction not found', 404);
    }

    if (auction.status !== 'active') {
      throw new AppError('Auction is not active', 400);
    }

    const currentRound = auction.rounds[auction.currentRound];
    if (!currentRound || currentRound.status !== 'active') {
      throw new AppError('No active round', 400);
    }

    const hasBalance = await this.balanceManager.hasAvailableBalance(userId, amount);
    if (!hasBalance) {
      throw new AppError('Insufficient balance', 400);
    }

    if (amount <= 0) {
      throw new AppError('Bid amount must be positive', 400);
    }

    return true;
  }

  async execute(): Promise<CommandResult> {
    const { bidId, auctionId, userId, amount, idempotencyKey } = this.payload;
    const auction = await this.auctionEngine.getAuction(auctionId);
    const user = await this.userRepository.findById(userId);
    const currentRound = auction!.rounds[auction!.currentRound];

    // Verify bid ownership
    const existingBid = await this.bidProcessor.findBidById(bidId);
    if (!existingBid) {
      throw new AppError('Bid not found', 404);
    }
    if (existingBid.userId.toString() !== userId) {
      throw new AppError('Bid does not belong to user', 403);
    }

    if (await this.ledgerRepository.existsByCommandId(idempotencyKey)) {
      return {
        success: true,
        data: existingBid,
      };
    }

    // Use unique commandId for reserve operation
    const reserveCommandId = `reserve-${idempotencyKey}`;
    await this.balanceManager.reserve({
      userId,
      amount,
      refType: LedgerRefType.AUCTION,
      refId: auction!._id.toString(),
      commandId: reserveCommandId,
    });

    try {
      const bid = await this.bidProcessor.increaseBid({
        bidId,
        auctionId: auction!._id,
        userId: user!._id,
        roundNumber: currentRound.roundNumber,
        amount,
        idempotencyKey,
      });

      const shouldExtend = await this.auctionEngine.checkAntiSniping(
        auctionId,
        auction!.currentRound,
      );

      if (shouldExtend) {
        await this.auctionEngine.extendRound(auctionId, auction!.currentRound);
      }

      return {
        success: true,
        data: bid,
      };
    } catch (error: any) {
      // Compensation: Release reserved balance if bid increase failed
      // Use unique idempotency key for release operation (compensation)
      const releaseCommandId = `release-${idempotencyKey}`;
      try {
        await this.balanceManager.release({
          userId,
          amount,
          refType: LedgerRefType.AUCTION,
          refId: auction!._id.toString(),
          commandId: releaseCommandId,
        });
      } catch (releaseError: any) {
        // Log the release failure but don't mask the original error
        // The release operation is idempotent, so it can be retried later
        logger.error('Failed to release balance after bid increase failure', {
          userId,
          amount,
          auctionId,
          bidId,
          originalError: error.message,
          releaseError: releaseError.message,
          releaseCommandId,
        });
        // Note: Balance will remain reserved. This should be handled by a cleanup job or manual intervention.
      }
      throw error;
    }
  }
}
