import { Request, Response } from 'express';
import { getExchangeRateHistory as getExchangeRates } from '@services/exchangeRate.service';

export const getExchangeRateHistory = async (req: Request, res: Response) => {
  try {
    const history = await getExchangeRates();
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};
