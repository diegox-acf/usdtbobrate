import { Router } from 'express';
import exchangeRateController from '@controllers/exchangeRate.controller';

const router = Router();

router.get('/history', exchangeRateController.getExchangeRateHistory);

export default router;
