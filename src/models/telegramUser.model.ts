import mongoose, { Schema, Document } from 'mongoose';

export interface TelegramUser {
  chatId: number;
  targetPrice?: number;
}

const telegramUserSchema = new Schema<TelegramUser>({
  chatId: {
    type: Number,
    required: true,
    unique: true,
  },
  targetPrice: {
    type: Number,
    required: false,
  },
});

export default mongoose.model<TelegramUser>('TelegramUser', telegramUserSchema);
