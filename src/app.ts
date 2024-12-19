import '@events/telegramBot.events';
import express from 'express';
import exchangeRateRoutes from '@routes/exchangeRateRoutes';

const app = express();

app.use(express.json());

app.use('/api/exchange-rates', exchangeRateRoutes);

export default app;
