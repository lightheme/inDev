import { BalanceManager } from '../core/BalanceManager';
import { LedgerRefType } from '../types/ledger.types';
import { UserRepository } from '../repositories/UserRepository';
import type { UserDocument } from '../models/User.model';

export class UserService {
  private balanceManager: BalanceManager;
  private userRepository: UserRepository;

  constructor() {
    this.balanceManager = new BalanceManager();
    this.userRepository = new UserRepository();
  }

  async getUserById(userId: string): Promise<UserDocument | null> {
    return await this.userRepository.findById(userId);
  }

  async topUpBalance(userId: string, amount: number, commandId: string): Promise<UserDocument> {
    await this.balanceManager.topup({
      userId,
      amount,
      refType: LedgerRefType.USER,
      refId: userId,
      commandId,
    });

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
