import mongoose from 'mongoose';
import { env } from './env';
import logger from '../utils/logger';

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...');
    
    await mongoose.connect(env.MONGODB_URI);
    
    mongoose.connection.on('error', (err) => {
      logger.error({ msg: 'MongoDB connection error', error: err });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (err) {
        logger.error({ msg: 'Error closing MongoDB connection', error: err });
        process.exit(1);
      }
    });
    
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error({ 
      msg: 'Failed to connect to MongoDB', 
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error({ 
      msg: 'Error closing MongoDB connection', 
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Check if MongoDB is connected
 */
export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}