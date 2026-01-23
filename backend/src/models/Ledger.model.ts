import mongoose, { Document, Schema, model } from 'mongoose';
import { LedgerEntry, LedgerRefType, LedgerEntryTypes } from '../types/ledger.types';

export interface LedgerDocument extends Omit<LedgerEntry, 'userId' | 'refId'>, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  refId: mongoose.Types.ObjectId;
}

const LedgerSchema = new Schema<LedgerDocument>({
  userId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, enum: Object.values(LedgerEntryTypes), required: true },
  amount: { type: Number, required: true },
  refType: { type: String, enum: Object.values(LedgerRefType), required: true },
  refId: { type: Schema.Types.ObjectId, required: true },
  commandId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

LedgerSchema.index({ commandId: 1 }, { unique: true });
LedgerSchema.index({ userId: 1, createdAt: -1 });

export const LedgerModel = model<LedgerDocument>('Ledger', LedgerSchema);
