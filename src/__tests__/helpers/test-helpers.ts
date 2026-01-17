import mongoose from 'mongoose';
import { UserModel, UserDocument } from '../../models/User.model';
import { AuctionModel, AuctionDocument } from '../../models/Auctions.model';
import { BidModel, BidDocument } from '../../models/Bid.model';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { BidStatus } from '../../types/bid.types';

export class TestHelpers {
  static async createUser(data: {
    telegramId: number;
    balance?: number;
    reservedBalance?: number;
    username?: string;
  }): Promise<UserDocument> {
    const user = new UserModel({
      telegramId: data.telegramId,
      balance: data.balance ?? 1000,
      reservedBalance: data.reservedBalance ?? 0,
      username: data.username,
    });
    return await user.save();
  }

  static async createAuction(data: {
    creatorId: mongoose.Types.ObjectId;
    title?: string;
    totalGifts?: number;
    status?: AuctionStatus;
    rounds?: any[];
    currentRound?: number;
  }): Promise<AuctionDocument> {
    const auction = new AuctionModel({
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
    return await auction.save();
  }

  static async createBid(data: {
    auctionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    roundNumber: number;
    amount: number;
    status?: BidStatus;
    idempotencyKey?: string;
  }): Promise<BidDocument> {
    const bid = new BidModel({
      auctionId: data.auctionId,
      userId: data.userId,
      roundNumber: data.roundNumber,
      amount: data.amount,
      status: data.status ?? BidStatus.ACTIVE,
      idempotencyKey: data.idempotencyKey ?? `test-key-${Date.now()}-${Math.random()}`,
      placedAt: new Date(),
    });
    return await bid.save();
  }

  static generateIdempotencyKey(): string {
    return `test-key-${Date.now()}-${Math.random()}`;
  }
}
