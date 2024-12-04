import logger from '@utils/logger';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    const mongoDBUri = process.env.MONGODB_URI;
    const connection = await mongoose.connect(mongoDBUri);
    logger.info(`Connected to MongoDB: ${connection.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`);
    throw new Error('Failed to connect to MongoDB');
  }
};

export default connectDB;
