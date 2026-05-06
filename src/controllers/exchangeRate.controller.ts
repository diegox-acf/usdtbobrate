import { Request, Response } from 'express';
import {
  getExchangeRateHistory as getExchangeRates,
  getExchangeRateHistoryFiltered,
} from '@services/exchangeRate.service';
import { TradeType } from '@utils/index';

export const getExchangeRateHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.query.limit !== undefined) {
      const limit = Math.min(parseInt(String(req.query.limit), 10) || 100, 500);
      const tradeType = req.query.tradeType as TradeType | undefined;
      const history = await getExchangeRateHistoryFiltered(limit, tradeType);
      res.json(history);
      return;
    }
    const history = await getExchangeRates();
    res.json(history);
  } catch {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
