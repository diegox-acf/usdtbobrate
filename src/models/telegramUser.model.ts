import mongoose, { Schema, Document } from 'mongoose';

export interface TelegramUser {
  chatId: number;
  targetPrice?: number;
  alertStepEnabled: boolean;
  alertHighRateEnabled: boolean;
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
  alertStepEnabled: {
    type: Boolean,
    default: true,
  },
  alertHighRateEnabled: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model<TelegramUser>('TelegramUser', telegramUserSchema);
