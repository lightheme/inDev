import { UserModel, UserDocument } from '../models/User.model';
import mongoose from 'mongoose';

export class UserRepository {
  async findById(
    userId: string,
    session?: mongoose.ClientSession,
  ): Promise<UserDocument | null> {
    const query = UserModel.findById(userId);
    return session ? query.session(session) : query;
  }

  async findByTelegramId(
    telegramId: number,
    session?: mongoose.ClientSession,
  ): Promise<UserDocument | null> {
    const query = UserModel.findOne({ telegramId });
    return session ? query.session(session) : query;
  }

  async create(
    data: {
      telegramId: number;
      username?: string;
      firstName?: string;
      lastName?: string;
    },
    session?: mongoose.ClientSession,
  ): Promise<UserDocument> {
    const user = new UserModel({
      telegramId: data.telegramId,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      balance: 0,
      reservedBalance: 0,
    });

    return session ? user.save({ session }) : user.save();
  }

  async updateBalance(
    userId: string,
    balance: number,
    reservedBalance: number,
    session?: mongoose.ClientSession,
  ): Promise<UserDocument | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { balance, reservedBalance },
      { new: true, session },
    );
  }

  async incrementBalance(
    userId: string,
    amount: number,
    session?: mongoose.ClientSession,
  ): Promise<UserDocument | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { balance: amount } },
      { new: true, session, runValidators: true, context: 'query'},
    );
  }

  async incrementReservedBalance(
    userId: string,
    amount: number,
    session?: mongoose.ClientSession,
  ): Promise<UserDocument | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { reservedBalance: amount } },
      { new: true, session, runValidators: true, context: 'query' },
    );
  }
}
