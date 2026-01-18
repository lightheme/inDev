import { AuctionEngine } from '../core/AuctionEngine';
import { CreateAuctionDTO } from '../api/dto/create-auction.dto';
import { WinnerCalculator } from '../core/WinnerCalculator';
import { AuctionRepository } from '../repositories/AuctionRepository';
import type { AuctionDocument } from '../models/Auctions.model';

export class AuctionService {
  private auctionEngine: AuctionEngine;
  private winnerCalculator: WinnerCalculator;
  private auctionRepository: AuctionRepository;

  constructor() {
    this.auctionEngine = new AuctionEngine();
    this.winnerCalculator = new WinnerCalculator();
    this.auctionRepository = new AuctionRepository();
  }

  async createAuction(data: CreateAuctionDTO & { creatorId: string }): Promise<AuctionDocument> {
    return await this.auctionEngine.createAuction(data);
  }

  async getAuctions(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AuctionDocument[]> {
    return await this.auctionRepository.list(filters);
  }

  async getAuctionById(auctionId: string): Promise<AuctionDocument | null> {
    return await this.auctionRepository.findByIdWithDetails(auctionId);
  }

  async startAuction(auctionId: string): Promise<void> {
    await this.auctionEngine.startAuction(auctionId);
  }

  async getLeaderboard(auctionId: string, roundNumber: number): Promise<any[]> {
    return await this.winnerCalculator.getRanking(auctionId, roundNumber);
  }
}
