import mongoose from "mongoose";
import { LedgerService } from "../ledger/LedgerService";
import { BidDocument, BidModel } from "../models/Bid.model"; 
import { BidStatus } from "../types/bid.types";
import { LedgerEntryTypes, LedgerRefType } from "../types/ledger.types";

export class BidProcessor {
    private ledgerService: LedgerService;

    constructor() {
        this.ledgerService = new LedgerService;
    }

    async createBid(
        data: {
            auctionId: mongoose.Types.ObjectId,
            userId: mongoose.Types.ObjectId,
            roundNumber: number,
            amount: number,
            idempotencyKey: string
        }
    ): Promise<BidDocument> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const bid = new BidModel({
                auctionId: data.auctionId,
                userId: data.userId,
                roundNumber: data.roundNumber,
                amount: data.amount,
                status: BidStatus.ACTIVE,
                idempotencyKey: data.idempotencyKey,
                placedAt: new Date()
            });

            await bid.save({ session });

            await this.ledgerService.recordOperation({
                userId: data.userId.toString(),
                type: LedgerEntryTypes.RESERVE,
                amount: data.amount,
                refType: LedgerRefType.BID,
                refId: bid._id.toString(),
                commandId: "bid"
            }, session);

            await session.commitTransaction();

            return bid;
        } catch(error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async findBidByIdempotencyKey(idempotencyKey: string): Promise<BidDocument | null> {
        return await BidModel.findOne({ idempotencyKey });
    }

    async getUserBidsForRound(userId: string, auctionId: string, roundNumber: number): Promise<BidDocument[]> {
        return await BidModel.find({
            userId,
            auctionId,
            roundNumber,
            status: BidStatus.ACTIVE
        });
    }

    async getTotalBidAmount(userId: string, auctionId: string, roundNumber: number): Promise<number> {
        const bids = await this.getUserBidsForRound(userId, auctionId, roundNumber);
        return bids.reduce((sum, bid) => sum + bid.amount, 0);
    }
}
