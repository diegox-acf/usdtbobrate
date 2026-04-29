import mongoose, { Schema } from 'mongoose';
import { TradeType } from '@utils/index';

export interface ExchangeRate {
  timestamp: number;
  rate: number;
  tradeType: TradeType;
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
  tradeType: {
    type: String,
    enum: ['SELL', 'BUY'],
    required: true,
  },
});

export default mongoose.model<ExchangeRate>('ExchangeRate', exchangeRateSchema);
