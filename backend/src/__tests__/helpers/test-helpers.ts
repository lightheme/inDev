import mongoose from 'mongoose';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { BidStatus } from '../../types/bid.types';
import { UserRepository } from '../../repositories/UserRepository';
import { AuctionRepository } from '../../repositories/AuctionRepository';
import { BidRepository } from '../../repositories/BidRepository';
import type { UserDocument } from '../../models/User.model';
import type { AuctionDocument } from '../../models/Auctions.model';
import type { BidDocument } from '../../models/Bid.model';

export class TestHelpers {
  private static userRepository = new UserRepository();
  private static auctionRepository = new AuctionRepository();
  private static bidRepository = new BidRepository();

  static async createUser(data: {
    balance?: number;
    reservedBalance?: number;
    username?: string;
    login?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    isDev?: boolean;
  }): Promise<UserDocument> {
    return await this.userRepository.create({
      login: data.login,
      email: data.email,
      balance: data.balance ?? 1000,
      reservedBalance: data.reservedBalance ?? 0,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      isDev: data.isDev ?? false,
    });
  }

  static async createAuction(data: {
    creatorId: mongoose.Types.ObjectId;
    title?: string;
    totalGifts?: number;
    status?: AuctionStatus;
    rounds?: any[];
    currentRound?: number;
  }): Promise<AuctionDocument> {
    return await this.auctionRepository.create({
      creatorId: data.creatorId,
      title: data.title ?? 'Test Auction',
      totalGifts: data.totalGifts ?? 3,
      status: data.status ?? AuctionStatus.ACTIVE,
      rounds: data.rounds ?? [
        {
          roundNumber: 1,
          giftsToDistribute: 1,
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          duration: 60,
          status: RoundStatus.ACTIVE,
          winnerIds: [],
        },
      ],
      currentRound: data.currentRound ?? 0,
    });
  }

  static async createBid(data: {
    auctionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    roundNumber: number;
    amount: number;
    status?: BidStatus;
    idempotencyKey?: string;
  }): Promise<BidDocument> {
    return await this.bidRepository.create({
      auctionId: data.auctionId,
      userId: data.userId,
      roundNumber: data.roundNumber,
      amount: data.amount,
      status: data.status ?? BidStatus.ACTIVE,
      idempotencyKey: data.idempotencyKey ?? `test-key-${Date.now()}-${Math.random()}`,
      placedAt: new Date(),
    });
  }

  static generateIdempotencyKey(): string {
    return `test-key-${Date.now()}-${Math.random()}`;
  }
}
