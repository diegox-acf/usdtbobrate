import mongoose, { Schema, Document } from 'mongoose';

export type AlertSensitivity = 'alta' | 'media' | 'baja';

export const SENSITIVITY_THRESHOLDS: Record<AlertSensitivity, number> = {
  alta: 1.5,
  media: 2.0,
  baja: 3.0,
};

export interface TelegramUser {
  chatId: number;
  targetPrice?: number;
  alertStepEnabled: boolean;
  alertHighRateEnabled: boolean;
  alertSensitivity?: AlertSensitivity;
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
  alertSensitivity: {
    type: String,
    enum: ['alta', 'media', 'baja'],
    default: 'media',
  },
});

export default mongoose.model<TelegramUser>('TelegramUser', telegramUserSchema);
