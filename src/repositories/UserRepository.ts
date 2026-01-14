import { UserModel, UserDocument } from '../models/User.model';
import mongoose from 'mongoose';

export class UserRepository {
  async findById(userId: string): Promise<UserDocument | null> {
    return await UserModel.findById(userId);
  }

  async findByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return await UserModel.findOne({ telegramId });
  }

  async create(data: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserDocument> {
    const user = new UserModel({
      telegramId: data.telegramId,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      balance: 0,
      reservedBalance: 0
    });

    return await user.save();
  }

  async updateBalance(
    userId: string,
    balance: number,
    reservedBalance: number,
    session?: mongoose.ClientSession
  ): Promise<UserDocument | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { balance, reservedBalance },
      { new: true, session }
    );
  }

  async incrementBalance(
    userId: string,
    amount: number,
    session?: mongoose.ClientSession
  ): Promise<UserDocument | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { balance: amount } },
      { new: true, session }
    );
  }

  async incrementReservedBalance(
    userId: string,
    amount: number,
    session?: mongoose.ClientSession
  ): Promise<UserDocument | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { reservedBalance: amount } },
      { new: true, session }
    );
  }

  async findByIdWithSession(
    userId: string,
    session: mongoose.ClientSession
  ): Promise<UserDocument | null> {
    return await UserModel.findById(userId).session(session);
  }
}
