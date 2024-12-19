import { getExchangeRateHistory } from '@controllers/exchangeRate.controller';
import { Router } from 'express';

const router = Router();

router.get('/', getExchangeRateHistory);

export default router;
