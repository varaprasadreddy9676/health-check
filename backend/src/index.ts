import app from './app';
import { env, validateEnv } from './config/env';
import { connectDB } from './config/db';
import { verifyEmailConfig } from './config/email';
import { createTemplateFiles } from './utils/emailTemplates';
import { schedulerService } from './services/schedulerService';
import logger from './utils/logger';
import { settingRepository } from './repositories/settingRepository';

// Validate environment variables
validateEnv();

// Start the server
const startServer = async () => {
  try {
    // Create email templates
    createTemplateFiles();
    
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    await settingRepository.initializeSettings();
   logger.info('Settings initialized');
    // Verify email configuration
    const emailConfigured = await verifyEmailConfig();
    logger.info(`Email service ${emailConfigured ? 'configured' : 'not configured properly'}`);
    
    // Create HTTP server
    const server = app.listen(env.PORT, env.HOST, () => {
      logger.info(`Server started on ${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode`);
    });
    
    // Start health check scheduler
    await schedulerService.start();
    logger.info('Health check scheduler started');
    
    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
      
      // Stop the scheduler
      schedulerService.stop();
      logger.info('Health check scheduler stopped');
      
      // Close server
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Exit process
      setTimeout(() => {
        logger.info('Exiting process');
        process.exit(0);
      }, 1000);
    };
    
    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        msg: 'Unhandled promise rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error({
        msg: 'Uncaught exception',
        error: error.message,
        stack: error.stack,
      });
      
      // Exit with error
      process.exit(1);
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to start server',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

// Start server
startServer();