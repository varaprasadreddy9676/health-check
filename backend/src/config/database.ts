import { initDatabases, closeDatabases, getHealthCheckRepository, getIncidentRepository } from '../repositories/factory';
import { environment } from './environment';
import logger from '../utils/logger';

// Initialize database connections
export async function initializeDatabase() {
    try {
        const dbType = 'mongodb';
     // const dbType = environment.DATABASE_TYPE as 'mongodb' | 'postgresql';
      logger.info(`Initializing ${dbType} database connection`);
      
      console.log('Database Type:', dbType);
      
      await initDatabases(dbType);
      
      // Verify repositories are initialized
      try {
        const healthCheckRepo = getHealthCheckRepository();
        const incidentRepo = getIncidentRepository();
        
        console.log('Health Check Repository initialized:', !!healthCheckRepo);
        console.log('Incident Repository initialized:', !!incidentRepo);
      } catch (repoError) {
        console.error('Repository initialization error:', repoError);
      }
      
      logger.info(`${dbType} database connection established`);
    } catch (error) {
      logger.error({
        msg: 'Failed to initialize database',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

// Close database connections
export async function closeDatabase() {
  try {
    logger.info('Closing database connections');
    await closeDatabases();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error({
      msg: 'Error closing database connections',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}