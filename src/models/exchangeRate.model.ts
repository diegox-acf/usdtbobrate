import mongoose, { Schema } from 'mongoose';

export interface ExchangeRate {
  timestamp: number;
  rate: number;
}

const exchangeRateSchema = new Schema<ExchangeRate>({
  timestamp: {
    type: Number,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
});

export default mongoose.model<ExchangeRate>('ExchangeRate', exchangeRateSchema);
