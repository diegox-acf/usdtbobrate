import { Request, Response } from 'express';

import { generateExchangeRateHistoryEntry } from '@services/exchangeRate.service';

const getExchangeRateHistory = async (req: Request, res: Response) => {
  try {
    const history = await generateExchangeRateHistoryEntry();
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

export default { getExchangeRateHistory };
