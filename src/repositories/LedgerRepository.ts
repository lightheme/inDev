import mongoose from 'mongoose';
import { LedgerDocument, LedgerModel } from '../models/Ledger.model';
import { LedgerEntry } from '../types/ledger.types';

export class LedgerRepository {
  async create(
    data: Omit<LedgerEntry, 'createdAt'>,
    session?: mongoose.ClientSession,
  ): Promise<LedgerDocument> {
    const entry = new LedgerModel({
      ...data,
      createdAt: new Date(),
    });

    return session ? entry.save({ session }) : entry.save();
  }

  async findByUser(
    userId: string,
    limit: number = 50,
    session?: mongoose.ClientSession,
  ): Promise<LedgerDocument[]> {
    const query = LedgerModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return session ? query.session(session) : query;
  }

  async findOperationsByUser(
    userId: string,
    session?: mongoose.ClientSession,
  ): Promise<LedgerDocument[]> {
    const query = LedgerModel.find({ userId }).sort({ createdAt: 1 });
    return session ? query.session(session) : query;
  }

  async existsByCommandId(
    commandId: string,
    session?: mongoose.ClientSession,
  ): Promise<boolean> {
    const query = LedgerModel.findOne({ commandId }).select('_id');
    const result = session ? await query.session(session) : await query;
    return !!result;
  }

  async findByCommandId(
    commandId: string,
    session?: mongoose.ClientSession,
  ): Promise<LedgerDocument | null> {
    const query = LedgerModel.findOne({ commandId });
    return session ? query.session(session) : query;
  }
}
