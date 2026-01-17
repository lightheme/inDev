import { Command } from '../../types/command.types';
import { CommandResult } from '../../types/command.types';
import { PlaceBidDTO } from '../../api/dto/place-bid.dto';
import { AuctionEngine } from '../../core/AuctionEngine';
import { BidProcessor } from '../../core/BidProcessor';
import { BalanceManager } from '../../core/BalanceManager';
import { AppError } from '../../utils/errors';
import { LedgerRefType } from '../../types/ledger.types';
import { UserRepository } from '../../repositories/UserRepository';
import { logger } from '../../utils/logger';

export class PlaceBidCommand implements Command {
  type = 'PlaceBid';
  payload: PlaceBidDTO;
  idempotencyKey: string;

  private auctionEngine: AuctionEngine;
  private bidProcessor: BidProcessor;
  private balanceManager: BalanceManager;
  private userRepository: UserRepository;

  constructor(payload: PlaceBidDTO) {
    this.payload = payload;
    this.idempotencyKey = payload.idempotencyKey;
    this.auctionEngine = new AuctionEngine();
    this.bidProcessor = new BidProcessor();
    this.balanceManager = new BalanceManager();
    this.userRepository = new UserRepository();
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
    const { auctionId, userId, amount, idempotencyKey } = this.payload;

    const existingBid = await this.bidProcessor.findBidByIdempotencyKey(idempotencyKey);
    if (existingBid) {
      return {
        success: true,
        data: existingBid,
      };
    }

    const auction = await this.auctionEngine.getAuction(auctionId);
    const user = await this.userRepository.findById(userId);
    const currentRound = auction!.rounds[auction!.currentRound];

    await this.balanceManager.reserve({
      userId,
      amount,
      refType: LedgerRefType.AUCTION,
      refId: auction!._id.toString(),
      commandId: idempotencyKey,
    });

    try {
      const bid = await this.bidProcessor.createBid({
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
      // Compensation: Release reserved balance if bid creation failed
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
        logger.error('Failed to release balance after bid creation failure', {
          userId,
          amount,
          auctionId,
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
