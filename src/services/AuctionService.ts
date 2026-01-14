import { AuctionModel, AuctionDocument } from '../models/Auctions.model';
import { AuctionEngine } from '../core/AuctionEngine';
import { CreateAuctionDTO } from '../api/dto/create-auction.dto';
import { WinnerCalculator } from '../core/WinnerCalculator';

export class AuctionService {
  private auctionEngine: AuctionEngine;
  private winnerCalculator: WinnerCalculator;

  constructor() {
    this.auctionEngine = new AuctionEngine();
    this.winnerCalculator = new WinnerCalculator();
  }

  async createAuction(data: CreateAuctionDTO & { creatorId: string }): Promise<AuctionDocument> {
    return await this.auctionEngine.createAuction(data);
  }

  async getAuctions(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AuctionDocument[]> {
    const { status, page = 1, limit = 10 } = filters;
    
    const query: any = {};
    if (status) {
      query.status = status;
    }

    return await AuctionModel.find(query)
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creatorId', 'username firstName lastName');
  }

  async getAuctionById(auctionId: string): Promise<AuctionDocument | null> {
    return await AuctionModel.findById(auctionId)
      .populate('creatorId', 'username firstName lastName')
      .populate('rounds.winnerIds', 'username firstName lastName');
  }

  async startAuction(auctionId: string): Promise<void> {
    await this.auctionEngine.startAuction(auctionId);
  }

  async getLeaderboard(auctionId: string, roundNumber: number): Promise<any[]> {
    return await this.winnerCalculator.getRanking(auctionId, roundNumber);
  }
}
