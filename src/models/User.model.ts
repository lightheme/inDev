import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  reservedBalance: number;
  createdAt: Date;
  availableBalance: number;
}

const UserSchema = new Schema<UserDocument>({
  telegramId: { type: Number, required: true, unique: true, index: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  balance: { type: Number, default: 0, min: 0 },
  reservedBalance: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.virtual('availableBalance').get(function () {
  return this.balance - this.reservedBalance;
});

// Если нужна конвертация в JSON
UserSchema.set('toJSON', { virtuals: true });

UserSchema.index({ telegramId: 1 }, { unique: true });

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
