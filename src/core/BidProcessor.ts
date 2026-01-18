import mongoose from 'mongoose';
import { BidStatus } from '../types/bid.types';
import { BidRepository } from '../repositories/BidRepository';
import type { BidDocument } from '../models/Bid.model';

export class BidProcessor {
  private bidRepository: BidRepository;

  constructor() {
    this.bidRepository = new BidRepository();
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

      const bid = await this.bidRepository.create(
        {
          auctionId: data.auctionId,
          userId: data.userId,
          roundNumber: data.roundNumber,
          amount: data.amount,
          status: BidStatus.ACTIVE,
          idempotencyKey: data.idempotencyKey,
          placedAt: new Date(),
        },
        session,
      );

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

      await this.bidRepository.save(bid, session);

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
    return await this.bidRepository.findByIdempotencyKey(idempotencyKey);
  }

  async getUserBidsForRound(
    userId: string,
    auctionId: string,
    roundNumber: number,
  ): Promise<BidDocument[]> {
    return await this.bidRepository.findActiveByUserRound(userId, auctionId, roundNumber);
  }

  async findBidById(
    bidId: string,
    session?: mongoose.ClientSession | null,
  ): Promise<BidDocument | null> {
    return await this.bidRepository.findById(bidId, session ?? undefined);
  }

  async getTotalBidAmount(userId: string, auctionId: string, roundNumber: number): Promise<number> {
    const bids = await this.getUserBidsForRound(userId, auctionId, roundNumber);
    return bids.reduce((sum, bid) => sum + bid.amount, 0);
  }
}
