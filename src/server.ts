import dotenv from 'dotenv';
dotenv.config();

import { properties } from '@config/properties';
import connectDB from '@config/db';
import app from './app';
import logger from '@utils/logger';
import { startJobScheduler } from '@jobs/exchangeRate.job';

const PORT = +properties.app.port;
const HOST = properties.app.host;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, properties.app.host, () => {
      logger.info(`Server running on: ${HOST}:${PORT}`);
    });
    startJobScheduler();
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

startServer();
