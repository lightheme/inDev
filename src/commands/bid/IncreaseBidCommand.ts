import { Command } from '../../types/command.types';
import { CommandResult } from '../../types/command.types';
import { IncreaseBidDTO } from '../../api/dto/increase-bid.dto';
import { AuctionEngine } from '../../core/AuctionEngine';
import { BidProcessor } from '../../core/BidProcessor';
import { BalanceManager } from '../../core/BalanceManager';
import { AppError } from '../../utils/errors';
import { LedgerRefType } from '../../types/ledger.types';
import { UserRepository } from '../../repositories/UserRepository';

export class IncreaseBidCommand implements Command {
  type = 'PlaceBid';
  payload: IncreaseBidDTO;
  idempotencyKey: string;

  private auctionEngine: AuctionEngine;
  private bidProcessor: BidProcessor;
  private balanceManager: BalanceManager;
  private userRepository: UserRepository;

  constructor(payload: IncreaseBidDTO) {
    this.payload = { 
        ...payload,
        amount: Number(payload.amount)
    };
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
    const { bidId, auctionId, userId, amount, idempotencyKey } = this.payload;
    console.log(amount);
    const auction = await this.auctionEngine.getAuction(auctionId);
    const user = await this.userRepository.findById(userId);
    const currentRound = auction!.rounds[auction!.currentRound];

    await this.balanceManager.reserve({ userId, amount, refType: LedgerRefType.AUCTION, refId: auction!._id.toString(), commandId: idempotencyKey });

    try {
      const bid = await this.bidProcessor.increaseBid({
        bidId,  
        auctionId: auction!._id,
        userId: user!._id,
        roundNumber: currentRound.roundNumber,
        amount,
        idempotencyKey
      });

      const shouldExtend = await this.auctionEngine.checkAntiSniping(
        auctionId,
        auction!.currentRound
      );

      if (shouldExtend) {
        await this.auctionEngine.extendRound(auctionId, auction!.currentRound);
      }

      return {
        success: true,
        data: bid
      };
    } catch (error: any) {
      await this.balanceManager.release({ userId, amount, refType: LedgerRefType.AUCTION, refId: auction!._id.toString(), commandId: "Pleasesetidempotency" });
      throw error;
    }
  }
}
