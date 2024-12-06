import dotenv from 'dotenv';
dotenv.config();

import { properties } from '@config/properties';
import connectDB from '@config/db';
import app from './app';
import logger from '@utils/logger';
import { startJobScheduler } from '@jobs/exchangeRate.job';

const PORT = properties.app.port;

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
