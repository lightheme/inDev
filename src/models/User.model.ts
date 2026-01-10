import mongoose, { Schema, Document } from "mongoose";

export interface UserDocument extends Document {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    balance: number;
    reservedBalance: number;
    createdAt: Date;
};

const UserSchema = new Schema<UserDocument>({
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    balance: { type: Number, default: 0, min: 0 },
    reservedBalance: { type: Number, default: 0, min: 0 }
}, {
    timestamps: true
});

UserSchema.virtual('availableBalance').get(function() {
    return this.balance - this.reservedBalance;
});

// Если нужна конвертация в JSON
UserSchema.set('toJSON', { virtuals: true });

export const User = mongoose.model<UserDocument>('User', UserSchema);

