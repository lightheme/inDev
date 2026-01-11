import mongoose, { Schema, Document } from "mongoose";
import { BidStatus, Bid } from "../types/bid.types";

export interface BidDocument extends Omit<Bid, 'id' | 'auctionId' | 'userId'>, Document {
    auctionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
}

const BidSchema = new Schema<BidDocument>({
  auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roundNumber: { type: Number, required: true },
  amount: { type: Number, required: true, min: 0 },
  placedAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: Object.values(BidStatus), default: BidStatus.ACTIVE },
  idempotencyKey: { type: String, required: true, unique: true }
});

BidSchema.index({ auctionId: 1, roundNumber: 1, amount: -1, placedAt: 1 });
BidSchema.index({ auctionId: 1, userId: 1, roundNumber: 1 });
BidSchema.index({ idempotencyKey: 1 }, { unique: true });

export const BidModel = mongoose.model<BidDocument>('Bid', BidSchema);
