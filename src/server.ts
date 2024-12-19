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
    logger.debug(
      'Starting server with properties:',
      JSON.stringify(properties, null, 2)
    );
    await connectDB();

    app.listen(PORT, HOST, () => {
      logger.info(`Server running on: ${HOST}:${PORT}`);
    });

    startJobScheduler();
  } catch (error) {
    logger.error('Unable to start the server', error);
    process.exit(1);
  }
};

startServer();
