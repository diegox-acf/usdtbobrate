import '@events/telegramBot.events';
import express from 'express';
import path from 'path';
import exchangeRateRoutes from '@routes/exchangeRateRoutes';

const app = express();

app.use(express.json());
app.use('/api/exchange-rates', exchangeRateRoutes);

app.use('/app', express.static(path.join(__dirname, '../webapp/dist')));
app.get('/app/*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../webapp/dist/index.html'))
);

export default app;
