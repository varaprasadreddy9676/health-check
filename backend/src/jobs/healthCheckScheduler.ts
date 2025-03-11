import cron from 'node-cron';
import logger from '../utils/logger';
import { healthCheckService } from '../services/healthCheckService';
import { getHealthCheckRepository } from '../repositories/factory';
import { HealthCheck } from '../models/HealthCheck';

class HealthCheckScheduler {
  private defaultInterval = '*/5 * * * *'; // Default: every 5 minutes
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  constructor() {
    logger.info('Health check scheduler initialized');
  }

  // Start the scheduler
  async start() {
    try {
      logger.info('Starting health check scheduler');
      
      // Initialize all health check jobs
      await this.initializeJobs();
      
      // Schedule a job to refresh health checks every hour
      // This ensures any newly added checks are scheduled
      cron.schedule('0 * * * *', async () => {
        logger.info('Refreshing health check jobs');
        await this.refreshJobs();
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

  // Initialize individual health check jobs
  private async initializeJobs() {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      
      // Get all enabled health checks
      const healthChecks = await healthCheckRepository.findAll({ enabled: true });
      
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
      
      // Create new job
      const job = cron.schedule(cronExpression, async () => {
        try {
          logger.info({
            msg: `Running scheduled health check`,
            healthCheckId: healthCheck.id,
            name: healthCheck.name,
          });
          
          await healthCheckService.forceHealthCheck(healthCheck.id);
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

  // Refresh all health check jobs
  private async refreshJobs() {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      
      // Get all health checks
      const healthChecks = await healthCheckRepository.findAll();
      
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
      
      logger.info(`Refreshed health check jobs, active jobs: ${this.cronJobs.size}`);
    } catch (error) {
      logger.error({
        msg: 'Error refreshing health check jobs',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const healthCheckScheduler = new HealthCheckScheduler();