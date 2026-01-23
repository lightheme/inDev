import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  telegramId?: number;
  login?: string;
  email?: string;
  passwordHash?: string;
  role?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isDev?: boolean;
  balance: number;
  reservedBalance: number;
  createdAt: Date;
  availableBalance: number;
}

const UserSchema = new Schema<UserDocument>({
  telegramId: { type: Number, unique: true, index: true, sparse: true },
  login: { type: String, unique: true, sparse: true, index: true },
  email: { type: String, unique: true, sparse: true, index: true },
  passwordHash: { type: String },
  role: { type: String, default: 'user' },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  isDev: { type: Boolean, default: false },
  balance: { type: Number, default: 0, min: 0 },
  reservedBalance: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.virtual('availableBalance').get(function () {
  return this.balance - this.reservedBalance;
});

// Если нужна конвертация в JSON
UserSchema.set('toJSON', { virtuals: true });

UserSchema.index({ telegramId: 1 }, { unique: true, sparse: true });
UserSchema.index({ login: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
