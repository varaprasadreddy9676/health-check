import logger from '../utils/logger';
import { healthCheckService } from '../services/healthCheckService';
import { getHealthCheckRepository } from '../repositories/factory';
import { HealthCheck } from '../models/HealthCheck';
import { localFileStorage } from '../utils/localFileStorage';

class HealthCheckScheduler {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private cachedHealthChecks: HealthCheck[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour
  private defaultInterval = 300; // 5 minutes in seconds

  constructor() {
    logger.info('Health check scheduler initialized');
  }

  async start() {
    try {
      logger.info('Starting health check scheduler');
      
      // Load cached health checks
      await this.loadCachedHealthChecks();
      
      // Initialize scheduled tasks
      await this.initializeJobs();
      
      // Schedule periodic refresh of health checks
      setInterval(async () => {
        logger.info('Refreshing health check jobs');
        await this.refreshJobs();
      }, 15 * 60 * 1000); // 15 minutes
      
      // Schedule periodic update of cached health checks
      setInterval(async () => {
        await this.updateCachedHealthChecks();
      }, 30 * 60 * 1000); // 30 minutes
      
      logger.info('Health check scheduler started');
    } catch (error) {
      logger.error({
        msg: 'Failed to start health check scheduler',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

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

  private async updateCachedHealthChecks() {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const healthChecks = await healthCheckRepository.findAll();
      
      if (healthChecks && healthChecks.length > 0) {
        this.cachedHealthChecks = healthChecks;
        this.lastCacheUpdate = Date.now();
        
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

  private async initializeJobs() {
    try {
      let healthChecks: HealthCheck[] = [];
      
      try {
        // Try to get health checks from database
        const healthCheckRepository = getHealthCheckRepository();
        healthChecks = await healthCheckRepository.findAll({ enabled: true });
        
        if (healthChecks.length > 0) {
          this.cachedHealthChecks = healthChecks;
          this.lastCacheUpdate = Date.now();
          
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
        
        if (this.cachedHealthChecks.length > 0) {
          healthChecks = this.cachedHealthChecks.filter(check => check.enabled);
          logger.info(`Using ${healthChecks.length} cached health checks`);
        }
      }
      
      // Create scheduled tasks for each health check
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

  private scheduleHealthCheck(healthCheck: HealthCheck) {
    try {
      // Clear existing task if it exists
      if (this.scheduledTasks.has(healthCheck.id)) {
        clearInterval(this.scheduledTasks.get(healthCheck.id)!);
        this.scheduledTasks.delete(healthCheck.id);
      }
      
      // Calculate interval in milliseconds
      const intervalSeconds = healthCheck.checkInterval || this.defaultInterval;
      const intervalMs = intervalSeconds * 1000;
      
      // Schedule the task
      const task = setInterval(async () => {
        try {
          logger.info({
            msg: `Running scheduled health check`,
            healthCheckId: healthCheck.id,
            name: healthCheck.name,
          });
          
          await this.executeHealthCheckWithRetry(healthCheck.id);
        } catch (error) {
          logger.error({
            msg: 'Error executing scheduled health check',
            error: error instanceof Error ? error.message : String(error),
            healthCheckId: healthCheck.id,
          });
        }
      }, intervalMs);
      
      // Store the task
      this.scheduledTasks.set(healthCheck.id, task);
      
      logger.info({
        msg: `Scheduled health check`,
        healthCheckId: healthCheck.id,
        name: healthCheck.name,
        intervalSeconds,
      });
    } catch (error) {
      logger.error({
        msg: 'Error scheduling health check',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: healthCheck.id,
      });
    }
  }

  private async executeHealthCheckWithRetry(healthCheckId: string, maxRetries = 3): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await healthCheckService.forceHealthCheck(healthCheckId);
        return;
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

  private async refreshJobs() {
    try {
      let healthChecks: HealthCheck[] = [];
      let usingCachedData = false;
      
      try {
        // Try to get health checks from database
        const healthCheckRepository = getHealthCheckRepository();
        healthChecks = await healthCheckRepository.findAll();
        
        if (healthChecks.length > 0) {
          this.cachedHealthChecks = healthChecks;
          this.lastCacheUpdate = Date.now();
          
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
        
        if (this.cachedHealthChecks.length > 0) {
          healthChecks = this.cachedHealthChecks;
          usingCachedData = true;
          logger.info(`Using ${healthChecks.length} cached health checks for refresh`);
        }
      }
      
      // Get current health check IDs
      const currentIds = new Set(healthChecks.map(hc => hc.id));
      
      // Remove tasks for deleted health checks
      for (const [id, task] of this.scheduledTasks.entries()) {
        if (!currentIds.has(id)) {
          clearInterval(task);
          this.scheduledTasks.delete(id);
          logger.info({
            msg: `Removed job for deleted health check`,
            healthCheckId: id,
          });
        }
      }
      
      // Update or add tasks for current health checks
      for (const healthCheck of healthChecks) {
        if (healthCheck.enabled) {
          this.scheduleHealthCheck(healthCheck);
        } else if (this.scheduledTasks.has(healthCheck.id)) {
          clearInterval(this.scheduledTasks.get(healthCheck.id)!);
          this.scheduledTasks.delete(healthCheck.id);
          logger.info({
            msg: `Stopped job for disabled health check`,
            healthCheckId: healthCheck.id,
            name: healthCheck.name,
          });
        }
      }
      
      logger.info(`Refreshed health check jobs, active jobs: ${this.scheduledTasks.size}${usingCachedData ? ' (using cached data)' : ''}`);
    } catch (error) {
      logger.error({
        msg: 'Error refreshing health check jobs',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public getActiveJobCount(): number {
    return this.scheduledTasks.size;
  }
}

export const healthCheckScheduler = new HealthCheckScheduler();