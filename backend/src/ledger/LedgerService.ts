import { LedgerEntry, LedgerEntryTypes } from '../types/ledger.types';
import mongoose from 'mongoose';
import { LedgerRepository } from '../repositories/LedgerRepository';
import type { LedgerDocument } from '../models/Ledger.model';

export class LedgerService {
  private ledgerRepository: LedgerRepository;

  constructor() {
    this.ledgerRepository = new LedgerRepository();
  }

  async recordOperation(
    data: Omit<LedgerEntry, 'createdAt'>,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    await this.ledgerRepository.create(data, session);
  }

  async getUserLedger(userId: string, limit: number = 50): Promise<LedgerDocument[]> {
    return await this.ledgerRepository.findByUser(userId, limit);
  }

  async calculateBalance(userId: string): Promise<{
    balance: number;
    reservedBalance: number;
  }> {
    const operations = await this.ledgerRepository.findOperationsByUser(userId);

    let balance = 0;
    let reservedBalance = 0;

    for (const op of operations) {
      switch (op.type) {
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

    return { balance, reservedBalance };
  }

  async existsByCommandId(commandId: string, session: mongoose.ClientSession): Promise<boolean> {
    return await this.ledgerRepository.existsByCommandId(commandId, session);
  }
}
