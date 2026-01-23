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

  async getOrCreateUser(telegramData: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<UserDocument> {
    let user = await this.userRepository.findByTelegramId(telegramData.id);

    if (!user) {
      user = await this.userRepository.create({
        telegramId: telegramData.id,
        username: telegramData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
      });
    } else {
      const updates: Partial<UserDocument> = {};
      if (telegramData.username && telegramData.username !== user.username) {
        updates.username = telegramData.username;
      }
      if (telegramData.first_name && telegramData.first_name !== user.firstName) {
        updates.firstName = telegramData.first_name;
      }
      if (telegramData.last_name && telegramData.last_name !== user.lastName) {
        updates.lastName = telegramData.last_name;
      }
      if (Object.keys(updates).length > 0) {
        Object.assign(user, updates);
        user = await this.userRepository.save(user);
      }
    }

    return user;
  }

  async getOrCreateDevUser(data: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserDocument> {
    let user = await this.userRepository.findByTelegramId(data.telegramId);

    if (!user) {
      user = await this.userRepository.create({
        telegramId: data.telegramId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        isDev: true,
      });
    } else if (!user.isDev) {
      user.isDev = true;
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async getUserById(userId: string): Promise<UserDocument | null> {
    return await this.userRepository.findById(userId);
  }

  async getUserByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return await this.userRepository.findByTelegramId(telegramId);
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
