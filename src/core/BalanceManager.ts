import { LedgerService } from '../ledger/LedgerService';
import { LedgerEntryTypes } from '../types/ledger.types';
import mongoose from 'mongoose';
import { BalanceOperationDTO } from '../api/dto/balance-operation.dto';
import { UserRepository } from '../repositories/UserRepository';

export class BalanceManager {
  private ledgerService: LedgerService;
  private userRepository: UserRepository;

  constructor() {
    this.ledgerService = new LedgerService();
    this.userRepository = new UserRepository();
  }

  private async withTransaction<T>(
    fn: (session: mongoose.ClientSession) => Promise<T>,
  ): Promise<T> {
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  private validate(dto: BalanceOperationDTO) {
    if (dto.amount <= 0) {
      throw new Error('Amount must be positive');
    }
  }

  private async loadUser(userId: string, session: mongoose.ClientSession) {
    const user = await this.userRepository.findById(userId, session);
    if (!user) throw new Error('User not found');
    return user;
  }

  private async ensureNotProcessed(
    commandId: string,
    session: mongoose.ClientSession,
  ): Promise<boolean> {
    return await this.ledgerService.existsByCommandId(commandId, session);
  }

  async reserve(dto: BalanceOperationDTO): Promise<void> {
    await this.withTransaction(async (session) => {
      this.validate(dto);
      if (await this.ensureNotProcessed(dto.commandId, session)) return;

      const user = await this.loadUser(dto.userId, session);
      if (user.availableBalance < dto.amount) {
        throw new Error('Insufficient balance');
      }

      user.reservedBalance = Number(dto.amount) + Number(user.reservedBalance);
      await this.userRepository.save(user, session);

      await this.ledgerService.recordOperation(
        {
          ...dto,
          type: LedgerEntryTypes.RESERVE,
        },
        session,
      );
    });
  }

  async charge(dto: BalanceOperationDTO): Promise<void> {
    await this.withTransaction(async (session) => {
      this.validate(dto);
      if (await this.ensureNotProcessed(dto.commandId, session)) return;

      const user = await this.loadUser(dto.userId, session);

      if (user.reservedBalance < dto.amount) {
        throw new Error('Insufficient reserved balance');
      }

      if (user.balance < dto.amount) {
        throw new Error('Insufficient balance');
      }

      user.reservedBalance = Number(user.reservedBalance) - Number(dto.amount);
      user.balance = Number(user.balance) - Number(dto.amount);
      await this.userRepository.save(user, session);

      await this.ledgerService.recordOperation(
        {
          ...dto,
          type: LedgerEntryTypes.CHARGE,
        },
        session,
      );
    });
  }

  async topup(dto: BalanceOperationDTO): Promise<void> {
    await this.withTransaction(async (session) => {
      this.validate(dto);
      if (await this.ensureNotProcessed(dto.commandId, session)) return;

      const user = await this.loadUser(dto.userId, session);

      user.balance = Number(dto.amount) + Number(user.balance);
      await this.userRepository.save(user, session);

      await this.ledgerService.recordOperation(
        {
          ...dto,
          type: LedgerEntryTypes.TOPUP,
        },
        session,
      );
    });
  }

  async release(dto: BalanceOperationDTO): Promise<void> {
    await this.withTransaction(async (session) => {
      this.validate(dto);
      if (await this.ensureNotProcessed(dto.commandId, session)) return;

      const user = await this.loadUser(dto.userId, session);

      if (user.reservedBalance < dto.amount) {
        throw new Error('Insufficient reserved balance to release');
      }

      user.reservedBalance = Number(user.reservedBalance) - Number(dto.amount);
      await this.userRepository.save(user, session);

      await this.ledgerService.recordOperation(
        {
          ...dto,
          type: LedgerEntryTypes.REFUND,
        },
        session,
      );
    });
  }

  async hasAvailableBalance(userId: string, amount: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;

    const availableBalance = Number(user.balance) - Number(user.reservedBalance);
    return availableBalance >= amount;
  }
}
