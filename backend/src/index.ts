import app from './app';
import { environment } from './config/environment';
import logger from './utils/logger';
import { healthCheckScheduler } from './jobs/healthCheckScheduler';
import { initializeDatabase, closeDatabase } from './config/database';

// Start the server
const startServer = async () => {
  try {
    // Connect to the database
    await initializeDatabase();
    logger.info('Connected to database');

    // Start the HTTP server
    const server = app.listen(environment.PORT, environment.HOST, () => {
      logger.info({
        msg: `Server started`,
        host: environment.HOST,
        port: environment.PORT,
        env: environment.NODE_ENV,
      });
    });

    // Start the health check scheduler
    await healthCheckScheduler.start();

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info({
        msg: `${signal} received, starting graceful shutdown`,
      });

      // Close the HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Disconnect from the database
      await closeDatabase();
      logger.info('Database connection closed');

      // Exit the process
      process.exit(0);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        msg: 'Unhandled promise rejection',
        reason,
        promise,
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
    });
    
    // Exit with error
    process.exit(1);
  }
};

// Start the server
startServer();