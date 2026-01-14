import { LedgerDocument, LedgerModel } from "../models/Ledger.model";
import { LedgerEntry, LedgerEntryTypes } from "../types/ledger.types";
import mongoose from "mongoose";

export class LedgerService {
    async recordOperation(
        data: Omit<LedgerEntry, 'createdAt'>,
        session?: mongoose.ClientSession 
    ): Promise<void> {
        const ledgerEntry = new LedgerModel({
            ...data,
            createdAt: new Date()
        })

        if(session) {
            await ledgerEntry.save({ session });
        } else {
            await ledgerEntry.save();
        }
    }

    async getUserLedger(userId: string, limit: number = 50): Promise<LedgerDocument[]> {
        return await LedgerModel.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    async calculateBalance(userId: string): Promise<{
        balance: number;
        reservedBalance: number;
    }> {
        const operations = await LedgerModel.find({ userId }).sort({createdAt: 1});
        
        let balance = 0;
        let reservedBalance = 0;

        for(const op of operations) {
            switch(op.type) {
                case LedgerEntryTypes.TOPUP:
                    balance += op.amount;
                    break;
                case LedgerEntryTypes.REFUND:
                    reservedBalance -= op.amount;
                    break;
                case LedgerEntryTypes.RESERVE:
                    reservedBalance += op.amount;
                    break;
                 case LedgerEntryTypes.CHARGE:
                    balance -= op.amount;
                    reservedBalance -= op.amount;
                    break;           
            }
        }

        return { balance, reservedBalance }
    }

    async existsByCommandId(
        commandId: string,
        session: mongoose.ClientSession
    ): Promise<boolean> {
        return !!(await LedgerModel
            .findOne({ commandId })
            .session(session)
            .select('_id')
        );
    }
}
