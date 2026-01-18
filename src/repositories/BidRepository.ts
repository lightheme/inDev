import mongoose from 'mongoose';
import { BidModel, BidDocument } from '../models/Bid.model';
import { BidStatus } from '../types/bid.types';

export class BidRepository {
  async create(
    data: {
      auctionId: mongoose.Types.ObjectId | string;
      userId: mongoose.Types.ObjectId | string;
      roundNumber: number;
      amount: number;
      idempotencyKey: string;
      status?: BidStatus;
      placedAt?: Date;
    },
    session?: mongoose.ClientSession,
  ): Promise<BidDocument> {
    const bid = new BidModel({
      auctionId: data.auctionId,
      userId: data.userId,
      roundNumber: data.roundNumber,
      amount: data.amount,
      status: data.status ?? BidStatus.ACTIVE,
      idempotencyKey: data.idempotencyKey,
      placedAt: data.placedAt ?? new Date(),
    });

    return session ? bid.save({ session }) : bid.save();
  }

  async findById(
    bidId: string,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument | null> {
    const query = BidModel.findById(bidId);
    return session ? query.session(session) : query;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument | null> {
    const query = BidModel.findOne({ idempotencyKey });
    return session ? query.session(session) : query;
  }

  async findActiveByUserRound(
    userId: string,
    auctionId: string,
    roundNumber: number,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument[]> {
    const query = BidModel.find({
      userId,
      auctionId,
      roundNumber,
      status: BidStatus.ACTIVE,
    });
    return session ? query.session(session) : query;
  }

  async findActiveByAuctionRound(
    auctionId: string,
    roundNumber: number,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument[]> {
    const query = BidModel.find({
      auctionId,
      roundNumber,
      status: BidStatus.ACTIVE,
    });
    return session ? query.session(session) : query;
  }

  async findByAuctionRound(
    auctionId: string,
    roundNumber: number,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument[]> {
    const query = BidModel.find({
      auctionId,
      roundNumber,
    });
    return session ? query.session(session) : query;
  }

  async findActiveByAuctionRoundSorted(
    auctionId: string,
    roundNumber: number,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument[]> {
    const query = BidModel.find({
      auctionId,
      roundNumber,
      status: BidStatus.ACTIVE,
    }).sort({
      amount: -1,
      placedAt: 1,
    });
    return session ? query.session(session) : query;
  }

  async findActiveByAuctionRoundWithUser(
    auctionId: string,
    roundNumber: number,
    session?: mongoose.ClientSession,
  ): Promise<any[]> {
    const query = BidModel.find({
      auctionId,
      roundNumber,
      status: BidStatus.ACTIVE,
    })
      .populate('userId', 'username firstName lastName')
      .lean();
    return session ? query.session(session) : query;
  }

  async findActiveByUserInRounds(
    userId: string,
    rounds: Array<{ auctionId: string; roundNumber: number }>,
    session?: mongoose.ClientSession,
  ): Promise<BidDocument[]> {
    if (rounds.length === 0) return [];

    const orClauses = rounds.map((round) => ({
      auctionId: round.auctionId,
      roundNumber: round.roundNumber,
    }));

    const query = BidModel.find({
      userId,
      status: BidStatus.ACTIVE,
      $or: orClauses,
    });

    return session ? query.session(session) : query;
  }

  async save(bid: BidDocument, session?: mongoose.ClientSession): Promise<BidDocument> {
    return session ? bid.save({ session }) : bid.save();
  }

  async updatePlacedAtForUserRound(
    auctionId: string,
    userId: string,
    roundNumber: number,
    placedAt: Date,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    const query = BidModel.updateOne(
      { auctionId, userId, roundNumber },
      { $set: { placedAt } },
    );
    if (session) {
      await query.session(session);
      return;
    }
    await query;
  }
}
