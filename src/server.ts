import connectDB from '@config/db';
import dotenv from 'dotenv';

import app from './app';
import logger from '@utils/logger';
import { startJobScheduler } from '@jobs/exchangeRate.job';
import { generateExchangeRateHistoryEntry } from '@services/exchangeRate.service';

const PORT = process.env.PORT || 3000;

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Server running on port: ${PORT}`);
    });
    startJobScheduler();
  } catch (error) {
    logger.error('Unable to start the server');
    process.exit(1);
  }
};

startServer();
