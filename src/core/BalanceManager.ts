import { UserModel } from "../models/User.model";
import { LedgerService } from "../ledger/LedgerService";
import { LedgerEntryTypes } from "../types/ledger.types";
import mongoose from "mongoose";
import { BalanceOperationDTO } from "../api/dto/balance-operation.dto";

export class BalanceManager {
    private ledgerService: LedgerService;

    constructor() {
        this.ledgerService = new LedgerService();
    }

    private async withTransaction<T>(
        fn: (session: mongoose.ClientSession) => Promise<T>
    ): Promise<T> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const result = await fn(session);
            await session.commitTransaction();
            return result;
        } catch(error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    private validate(dto: BalanceOperationDTO) {
        if(dto.amount <= 0) {
            throw new Error('Amount must be positive');
        }
    }

    private async loadUser(userId: string, session: mongoose.ClientSession) {
            const user = await UserModel.findById(userId).session(session);
            if(!user) throw new Error('User not found');
            return user;
    }

    private async ensureNotProcessed(
        commandId: string,
        session: mongoose.ClientSession
    ): Promise<boolean> {
        return await this.ledgerService.existsByCommandId(commandId, session);
    }

    async reserve(dto: BalanceOperationDTO): Promise<void> {
        await this.withTransaction(async (session) => {
            this.validate(dto);
            if(await this.ensureNotProcessed(dto.commandId, session)) return;
            
            const user = await this.loadUser(dto.userId, session);
            if(user.availableBalance < dto.amount) {
                throw new Error('Insufficient balance');
            }

            user.reservedBalance += dto.amount;
            await user.save({ session });

            await this.ledgerService.recordOperation(
                {
                    ...dto,
                    type: LedgerEntryTypes.RESERVE
                },
                session
            );
        });
    }

    async charge(dto: BalanceOperationDTO): Promise<void> {
        await this.withTransaction(async (session) => {
            this.validate(dto);
            if(await this.ensureNotProcessed(dto.commandId, session)) return;
            
            const user = await this.loadUser(dto.userId, session);           
    
            if (user.reservedBalance < dto.amount) {
                throw new Error('Insufficient reserved balance');
            }
    
            if (user.balance < dto.amount) {
                throw new Error('Insufficient balance');
            }
    
            user.reservedBalance -= dto.amount;
            user.balance -= dto.amount;
            await user.save({ session });
    
            await this.ledgerService.recordOperation(
                {
                    ...dto,
                    type: LedgerEntryTypes.CHARGE
                },
                session
            );
      });
    }

    async topup(dto: BalanceOperationDTO): Promise<void> {
        await this.withTransaction(async (session) => {
            this.validate(dto);
            if(await this.ensureNotProcessed(dto.commandId, session)) return;
            
            const user = await this.loadUser(dto.userId, session);           

            user.balance += dto.amount;
            await user.save({ session });

            await this.ledgerService.recordOperation(
                {
                    ...dto,
                    type: LedgerEntryTypes.TOPUP
                },
                session
            );
        });
    }

    async release(dto: BalanceOperationDTO): Promise<void> {
        await this.withTransaction(async (session) => {
            this.validate(dto);
            if(await this.ensureNotProcessed(dto.commandId, session)) return;

            const user = await this.loadUser(dto.userId, session);           

            if(user.reservedBalance < dto.amount) {
                throw new Error('Insufficient balance');
            }

            user.reservedBalance -= dto.amount;
            await user.save({ session });

            await this.ledgerService.recordOperation(
                {
                    ...dto,
                    type: LedgerEntryTypes.REFUND
                },
                session
            );
        });
    }

  async hasAvailableBalance(userId: string, amount: number): Promise<boolean> {
    const user = await UserModel.findById(userId);
    if (!user) return false;

    const availableBalance = user.balance - user.reservedBalance;
    return availableBalance >= amount;
  }
}
