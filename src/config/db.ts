import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import logger from '@utils/logger';
import mongoose from 'mongoose';
import { properties } from '@config/properties';

const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    const mongoDBUri = properties.mongo.uri;
    const connection = await mongoose.connect(mongoDBUri);
    logger.info(`Connected to MongoDB: ${connection.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`);
    throw new Error('Failed to connect to MongoDB');
  }
};

export default connectDB;
