import mongoose, { Schema, Document } from "mongoose";
import { AuctionStatus, RoundStatus, Round, Auction } from "../types/auction.types";

export interface AuctionDocument extends Omit<Auction, 'id' | 'creatorId' | 'rounds'>, Document {
    creatorId: mongoose.Types.ObjectId;
    rounds: Array<Omit<Round, 'winnerIds'> & { winnerIds: mongoose.Types.ObjectId[] }>; 
}

const RoundSchema = new Schema({
    roundNumber: { type: Number, required: true },
    giftsToDistribute: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    extendedTime: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(RoundStatus), default: RoundStatus.PENDING },
    winnerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const AuctionSchema = new Schema<AuctionDocument>({
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    totalGifts: { type: Number, required: true },
    status: { type: String, enum: Object.values(AuctionStatus), default: AuctionStatus.DRAFT },
    rounds: [RoundSchema],
    currentRound: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

AuctionSchema.index({ status: 1, 'rounds.status': 1 });
AuctionSchema.index({ createdAt: -1 });

export const AuctionModel = mongoose.model<AuctionDocument>('Auction', AuctionSchema);

