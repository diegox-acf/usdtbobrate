import mongoose, { Schema, Document } from 'mongoose';

export interface TelegramUser {
  chatId: number;
}

const telegramUserSchema = new Schema<TelegramUser>({
  chatId: {
    type: Number,
    required: true,
    unique: true,
  },
});

export default mongoose.model<TelegramUser>('TelegramUser', telegramUserSchema);
