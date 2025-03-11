import cron from 'node-cron';
import logger from '../utils/logger';
import { healthCheckService } from '../services/healthCheckService';
import { getHealthCheckRepository } from '../repositories/factory';
import { HealthCheck } from '../models/HealthCheck';
import { localFileStorage } from '../utils/localFileStorage';
import { isDatabaseAvailable } from '../repositories/factory';

class HealthCheckScheduler {
  private defaultInterval = '*/5 * * * *'; // Default: every 5 minutes
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;
  
  // Cache of health checks to use when database is unavailable
  private cachedHealthChecks: HealthCheck[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor() {
    logger.info('Health check scheduler initialized');
  }

  // Start the scheduler
  async start() {
    try {
      logger.info('Starting health check scheduler');
      
      // Load cached health checks from file system if available
      await this.loadCachedHealthChecks();
      
      // Initialize all health check jobs
      await this.initializeJobs();
      
      // Schedule a job to refresh health checks every 15 minutes
      cron.schedule('*/15 * * * *', async () => {
        logger.info('Refreshing health check jobs');
        await this.refreshJobs();
      });
      
      // Schedule a job to save health checks to local storage periodically
      cron.schedule('*/30 * * * *', async () => {
        if (isDatabaseAvailable()) {
          await this.updateCachedHealthChecks();
        }
      });
      
      // Job to run all health checks at once
      // This runs every 30 minutes as a fallback
      cron.schedule('*/30 * * * *', async () => {
        if (!this.isRunning) {
          this.isRunning = true;
          try {
            logger.info('Running all health checks');
            await healthCheckService.runAllHealthChecks();
          } catch (error) {
            logger.error({
              msg: 'Error running all health checks',
              error: error instanceof Error ? error.message : String(error),
            });
          } finally {
            this.isRunning = false;
          }
        } else {
          logger.info('Health checks already running, skipping');
        }
      });
      
      logger.info('Health check scheduler started');
    } catch (error) {
      logger.error({
        msg: 'Failed to start health check scheduler',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Load cached health checks from local storage
  private async loadCachedHealthChecks() {
    try {
      const cachedData = await localFileStorage.load<{
        healthChecks: HealthCheck[],
        timestamp: number
      }>('healthChecks');
      
      if (cachedData && cachedData.healthChecks && cachedData.healthChecks.length > 0) {
        this.cachedHealthChecks = cachedData.healthChecks;
        this.lastCacheUpdate = cachedData.timestamp;
        
        logger.info({
          msg: `Loaded ${this.cachedHealthChecks.length} cached health checks from local storage`,
          lastUpdated: new Date(this.lastCacheUpdate).toISOString()
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Error loading cached health checks',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Update the cached health checks
  private async updateCachedHealthChecks() {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const healthChecks = await healthCheckRepository.findAll();
      
      // Only update if we got data
      if (healthChecks && healthChecks.length > 0) {
        this.cachedHealthChecks = healthChecks;
        this.lastCacheUpdate = Date.now();
        
        // Save to local storage
        await localFileStorage.save('healthChecks', {
          healthChecks: this.cachedHealthChecks,
          timestamp: this.lastCacheUpdate
        });
        
        logger.info({
          msg: `Updated ${healthChecks.length} cached health checks`
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Error updating cached health checks',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Initialize individual health check jobs
  private async initializeJobs() {
    try {
      let healthChecks: HealthCheck[] = [];
      
      try {
        // Try to get health checks from database
        const healthCheckRepository = getHealthCheckRepository();
        healthChecks = await healthCheckRepository.findAll({ enabled: true });
        
        // If successful, update the cache
        if (healthChecks.length > 0) {
          this.cachedHealthChecks = healthChecks;
          this.lastCacheUpdate = Date.now();
          
          // Save to local storage
          await localFileStorage.save('healthChecks', {
            healthChecks: this.cachedHealthChecks,
            timestamp: this.lastCacheUpdate
          });
        }
      } catch (error) {
        logger.error({
          msg: 'Error fetching health checks from database, using cached data',
          error: error instanceof Error ? error.message : String(error),
        });
        
        // Use cached health checks if database is unavailable
        if (this.cachedHealthChecks.length > 0) {
          healthChecks = this.cachedHealthChecks.filter(check => check.enabled);
          logger.info(`Using ${healthChecks.length} cached health checks`);
        }
      }
      
      // Schedule jobs for each health check
      for (const healthCheck of healthChecks) {
        this.scheduleHealthCheck(healthCheck);
      }
      
      logger.info(`Initialized ${healthChecks.length} health check jobs`);
    } catch (error) {
      logger.error({
        msg: 'Error initializing health check jobs',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Schedule a single health check
  private scheduleHealthCheck(healthCheck: HealthCheck) {
    try {
      // Convert interval from seconds to cron expression
      // Default is to use the default cron schedule (every 5 minutes)
      let cronExpression = this.defaultInterval;
      
      // If check interval is specified and valid, use it
      if (healthCheck.checkInterval && healthCheck.checkInterval >= 60) {
        // For intervals of minutes, use simple */n expression
        if (healthCheck.checkInterval % 60 === 0) {
          const minutes = healthCheck.checkInterval / 60;
          cronExpression = `*/${minutes} * * * *`;
        } else {
          // For more complex intervals, just stick with the default
          logger.warn({
            msg: `Health check interval not divisible by 60, using default interval`,
            healthCheckId: healthCheck.id,
            interval: healthCheck.checkInterval,
          });
        }
      }
      
      // Stop existing job if it exists
      if (this.cronJobs.has(healthCheck.id)) {
        const job = this.cronJobs.get(healthCheck.id);
        if (job) {
          job.stop();
        }
        this.cronJobs.delete(healthCheck.id);
      }
      
      // Create new job with error handling
      const job = cron.schedule(cronExpression, async () => {
        try {
          logger.info({
            msg: `Running scheduled health check`,
            healthCheckId: healthCheck.id,
            name: healthCheck.name,
          });
          
          // Execute the health check with resilience
          await this.executeHealthCheckWithRetry(healthCheck.id);
        } catch (error) {
          logger.error({
            msg: 'Error executing scheduled health check',
            error: error instanceof Error ? error.message : String(error),
            healthCheckId: healthCheck.id,
          });
        }
      });
      
      // Store the job
      this.cronJobs.set(healthCheck.id, job);
      
      logger.info({
        msg: `Scheduled health check`,
        healthCheckId: healthCheck.id,
        name: healthCheck.name,
        cronExpression,
      });
    } catch (error) {
      logger.error({
        msg: 'Error scheduling health check',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: healthCheck.id,
      });
    }
  }

  // Execute health check with retry logic
  private async executeHealthCheckWithRetry(healthCheckId: string, maxRetries = 3): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await healthCheckService.forceHealthCheck(healthCheckId);
        return; // Success
      } catch (error) {
        retries++;
        
        if (retries >= maxRetries) {
          logger.error({
            msg: 'Health check failed after max retries',
            error: error instanceof Error ? error.message : String(error),
            healthCheckId,
            retries
          });
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        logger.warn({
          msg: `Health check failed, retrying in ${delay}ms`,
          healthCheckId,
          retryCount: retries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Refresh all health check jobs
  private async refreshJobs() {
    try {
      let healthChecks: HealthCheck[] = [];
      let usingCachedData = false;
      
      try {
        // Try to get health checks from database
        const healthCheckRepository = getHealthCheckRepository();
        healthChecks = await healthCheckRepository.findAll();
        
        // If successful, update the cache
        if (healthChecks.length > 0) {
          this.cachedHealthChecks = healthChecks;
          this.lastCacheUpdate = Date.now();
          
          // Save to local storage
          await localFileStorage.save('healthChecks', {
            healthChecks: this.cachedHealthChecks,
            timestamp: this.lastCacheUpdate
          });
        }
      } catch (error) {
        logger.error({
          msg: 'Error fetching health checks from database for refresh, using cached data',
          error: error instanceof Error ? error.message : String(error),
        });
        
        // Use cached health checks if database is unavailable
        if (this.cachedHealthChecks.length > 0) {
          healthChecks = this.cachedHealthChecks;
          usingCachedData = true;
          logger.info(`Using ${healthChecks.length} cached health checks for refresh`);
        }
      }
      
      // Create a set of current health check IDs
      const currentIds = new Set(healthChecks.map(hc => hc.id));
      
      // Stop jobs for health checks that no longer exist
      for (const [id, job] of this.cronJobs.entries()) {
        if (!currentIds.has(id)) {
          job.stop();
          this.cronJobs.delete(id);
          logger.info({
            msg: `Removed job for deleted health check`,
            healthCheckId: id,
          });
        }
      }
      
      // Update or create jobs for current health checks
      for (const healthCheck of healthChecks) {
        if (healthCheck.enabled) {
          this.scheduleHealthCheck(healthCheck);
        } else if (this.cronJobs.has(healthCheck.id)) {
          // Stop job for disabled health checks
          const job = this.cronJobs.get(healthCheck.id);
          if (job) {
            job.stop();
          }
          this.cronJobs.delete(healthCheck.id);
          logger.info({
            msg: `Stopped job for disabled health check`,
            healthCheckId: healthCheck.id,
            name: healthCheck.name,
          });
        }
      }
      
      logger.info(`Refreshed health check jobs, active jobs: ${this.cronJobs.size}${usingCachedData ? ' (using cached data)' : ''}`);
    } catch (error) {
      logger.error({
        msg: 'Error refreshing health check jobs',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Get current active job count (for monitoring)
  public getActiveJobCount(): number {
    return this.cronJobs.size;
  }
}

export const healthCheckScheduler = new HealthCheckScheduler();