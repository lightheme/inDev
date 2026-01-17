import { Command } from '../../types/command.types';
import { CommandResult } from '../../types/command.types';
import { CreateAuctionDTO } from '../../api/dto/create-auction.dto';
import { AuctionEngine } from '../../core/AuctionEngine';
import { AppError } from '../../utils/errors';

export class CreateAuctionCommand implements Command {
  type = 'CreateAuction';
  payload: CreateAuctionDTO & { creatorId: string };
  idempotencyKey: string;

  private auctionEngine: AuctionEngine;

  constructor(payload: CreateAuctionDTO & { creatorId: string; idempotencyKey: string }) {
    this.payload = payload;
    this.idempotencyKey = payload.idempotencyKey;
    this.auctionEngine = new AuctionEngine();
  }

  async validate(): Promise<boolean> {
    const { totalGifts, giftsPerRound } = this.payload;

    if (totalGifts <= 0) {
      throw new AppError('Total gifts must be positive', 400);
    }

    const totalGiftsInRounds = giftsPerRound.reduce((sum, g) => sum + g, 0);
    if (totalGiftsInRounds !== totalGifts) {
      throw new AppError('Gifts per round must match total gifts', 400);
    }

    return true;
  }

  async execute(): Promise<CommandResult> {
    const auction = await this.auctionEngine.createAuction(this.payload);

    return {
      success: true,
      data: auction,
    };
  }
}
