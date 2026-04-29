import dotenv from 'dotenv';
dotenv.config();

import { properties } from '@config/properties';
import connectDB from '@config/db';
import telegramBot from '@config/telegramBot';
import app from './app';
import logger from '@utils/logger';
import { startJobScheduler } from '@jobs/exchangeRate.job';
import { startDailySummaryJob } from '@jobs/dailySummary.job';

const PORT = +properties.app.port;
const HOST = properties.app.host;

const registerBotCommands = async () => {
  await telegramBot.setMyCommands([
    { command: 'start', description: 'Abrir el menú principal' },
    { command: 'subscribe', description: 'Suscribirse a las alertas' },
    { command: 'unsubscribe', description: 'Cancelar suscripción' },
    { command: 'sell', description: 'Ver precio de venta actual' },
    { command: 'buy', description: 'Ver precio de compra actual' },
    { command: 'settings', description: 'Configurar preferencias' },
    { command: 'target', description: 'Establecer precio objetivo (ej: /target 7.20)' },
    { command: 'cleartarget', description: 'Eliminar precio objetivo' },
  ]);
  logger.info('Telegram bot commands registered');
};

const startServer = async () => {
  try {
    await connectDB();
    await registerBotCommands();

    app.listen(PORT, HOST, () => {
      logger.info(`Server running on: ${HOST}:${PORT}`);
    });
    startJobScheduler();
    startDailySummaryJob();
  } catch (error) {
    logger.error('Unable to start the server', error);
    process.exit(1);
  }
};

startServer();
