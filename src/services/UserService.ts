import { UserModel, UserDocument } from '../models/User.model';
import { BalanceManager } from '../core/BalanceManager';
import { LedgerRefType } from '../types/ledger.types';

export class UserService {
  private balanceManager: BalanceManager;

  constructor() {
    this.balanceManager = new BalanceManager();
  }

  async getOrCreateUser(telegramData: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<UserDocument> {
    let user = await UserModel.findOne({ telegramId: telegramData.id });
    
    if (!user) {
      user = new UserModel({
        telegramId: telegramData.id,
        username: telegramData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
        balance: 0,
        reservedBalance: 0
      });
      await user.save();
    }
    
    return user;
  }

  async getUserById(userId: string): Promise<UserDocument | null> {
    return await UserModel.findById(userId);
  }

  async getUserByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return await UserModel.findOne({ telegramId });
  }

  async topUpBalance(userId: string, amount: number): Promise<UserDocument> {
    await this.balanceManager.topup({ userId, amount, refType: LedgerRefType.USER, refId: userId, commandId: 'waitforcmd2' });
    
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
}
