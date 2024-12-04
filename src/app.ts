import express from 'express';
import exchangeRateRoutes from '@routes/exchangeRateRoutes';
import dotenv from 'dotenv';

dotenv.config();

import '@events/telegramBot.events';

const app = express();

app.use(express.json());

app.use('/api/exchange-rate/history', exchangeRateRoutes);

export default app;
