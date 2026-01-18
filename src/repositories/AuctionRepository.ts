import mongoose from 'mongoose';
import { AuctionModel, AuctionDocument } from '../models/Auctions.model';
import { AuctionStatus } from '../types/auction.types';

export class AuctionRepository {
  async findById(
    auctionId: string,
    session?: mongoose.ClientSession,
  ): Promise<AuctionDocument | null> {
    const query = AuctionModel.findById(auctionId);
    return session ? query.session(session) : query;
  }

  async findByIdWithDetails(
    auctionId: string,
    session?: mongoose.ClientSession,
  ): Promise<AuctionDocument | null> {
    const query = AuctionModel.findById(auctionId)
      .populate('creatorId', 'username firstName lastName')
      .populate('rounds.winnerIds', 'username firstName lastName');
    return session ? query.session(session) : query;
  }

  async list(
    filters: { status?: AuctionStatus | string; page?: number; limit?: number },
    session?: mongoose.ClientSession,
  ): Promise<AuctionDocument[]> {
    const { status, page = 1, limit = 10 } = filters;
    const queryFilter: Record<string, unknown> = {};
    if (status) {
      queryFilter.status = status;
    }

    const query = AuctionModel.find(queryFilter)
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creatorId', 'username firstName lastName');

    return session ? query.session(session) : query;
  }

  async create(
    data: {
      creatorId: mongoose.Types.ObjectId | string;
      title: string;
      totalGifts: number;
      status: AuctionStatus;
      rounds: AuctionDocument['rounds'];
      currentRound: number;
      createdAt?: Date;
    },
    session?: mongoose.ClientSession,
  ): Promise<AuctionDocument> {
    const auction = new AuctionModel({
      ...data,
      createdAt: data.createdAt ?? new Date(),
    });

    return session ? auction.save({ session }) : auction.save();
  }

  async save(
    auction: AuctionDocument,
    session?: mongoose.ClientSession,
  ): Promise<AuctionDocument> {
    return session ? auction.save({ session }) : auction.save();
  }
}

