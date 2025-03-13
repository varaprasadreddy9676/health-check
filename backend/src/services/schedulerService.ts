import { healthCheckRepository } from '../repositories/healthCheckRepository';
import { healthCheckService } from './healthCheckService';
import { IHealthCheck } from '../models/HealthCheck';
import logger from '../utils/logger';

export class SchedulerService {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private batchModeEnabled: boolean = true;

  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('Scheduler is already running');
        return;
      }
      
      logger.info('Starting health check scheduler');
      
      // Run all health checks in batch mode immediately at startup
      if (this.batchModeEnabled) {
        await healthCheckService.runAllHealthChecks();
      } else {
        await this.scheduleAllHealthChecks();
      }
      
      // Set up periodic batch check every 5 minutes 
      // (adjust this interval based on your requirements)
      const batchCheckInterval = 5 * 60 * 1000; // 5 minutes
      
      if (this.batchModeEnabled) {
        setInterval(async () => {
          await healthCheckService.runAllHealthChecks();
        }, batchCheckInterval);
      } else {
        // If not using batch mode, refresh scheduled tasks every 5 minutes
        setInterval(async () => {
          await this.refreshScheduledTasks();
        }, batchCheckInterval);
      }
      
      this.isRunning = true;
      logger.info(`Health check scheduler started in ${this.batchModeEnabled ? 'batch' : 'individual'} mode`);
    } catch (error) {
      logger.error({
        msg: 'Failed to start health check scheduler',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    logger.info('Stopping health check scheduler');
    
    for (const [id, task] of this.scheduledTasks.entries()) {
      clearInterval(task);
      this.scheduledTasks.delete(id);
    }
    
    this.isRunning = false;
    logger.info('Health check scheduler stopped');
  }

  // This method schedules individual health checks (used in non-batch mode)
  private async scheduleAllHealthChecks(): Promise<void> {
    try {
      const healthChecks = await healthCheckRepository.findAll({ enabled: true });
      logger.info(`Scheduling ${healthChecks.length} health checks`);
      
      for (const healthCheck of healthChecks) {
        this.scheduleHealthCheck(healthCheck);
      }
    } catch (error) {
      logger.error({
        msg: 'Error scheduling health checks',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private scheduleHealthCheck(healthCheck: IHealthCheck): void {
    try {
      if (this.scheduledTasks.has(healthCheck.id)) {
        clearInterval(this.scheduledTasks.get(healthCheck.id)!);
        this.scheduledTasks.delete(healthCheck.id);
      }
      
      if (!healthCheck.enabled) {
        return;
      }
      
      const intervalSeconds = Math.max(healthCheck.checkInterval || 300, 10);
      const intervalMs = intervalSeconds * 1000;
      
      const task = setInterval(async () => {
        try {
          await healthCheckService.executeHealthCheck(healthCheck);
        } catch (error) {
          logger.error({
            msg: 'Error executing scheduled health check',
            error: error instanceof Error ? error.message : String(error),
            healthCheckId: healthCheck.id,
            name: healthCheck.name
          });
        }
      }, intervalMs);
      
      this.scheduledTasks.set(healthCheck.id, task);
      
      logger.info({
        msg: 'Health check scheduled',
        id: healthCheck.id,
        name: healthCheck.name,
        intervalSeconds
      });
      
      // Execute the check immediately after scheduling
      setTimeout(async () => {
        try {
          await healthCheckService.executeHealthCheck(healthCheck);
        } catch (error) {
          logger.error({
            msg: 'Error executing initial health check',
            error: error instanceof Error ? error.message : String(error),
            healthCheckId: healthCheck.id,
            name: healthCheck.name
          });
        }
      }, 1000);
    } catch (error) {
      logger.error({
        msg: 'Error scheduling health check',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: healthCheck.id,
        name: healthCheck.name
      });
    }
  }

  private async refreshScheduledTasks(): Promise<void> {
    try {
      logger.info('Refreshing scheduled health checks');
      
      const healthChecks = await healthCheckRepository.findAll();
      const currentIds = new Set(healthChecks.map(check => check.id));
      
      // Remove tasks for health checks that no longer exist
      for (const [id, task] of this.scheduledTasks.entries()) {
        if (!currentIds.has(id)) {
          clearInterval(task);
          this.scheduledTasks.delete(id);
          logger.info({
            msg: 'Removed scheduled task for deleted health check',
            id
          });
        }
      }
      
      // Add or update tasks for current health checks
      for (const healthCheck of healthChecks) {
        if (healthCheck.enabled) {
          this.scheduleHealthCheck(healthCheck);
        } else if (this.scheduledTasks.has(healthCheck.id)) {
          clearInterval(this.scheduledTasks.get(healthCheck.id)!);
          this.scheduledTasks.delete(healthCheck.id);
          logger.info({
            msg: 'Removed scheduled task for disabled health check',
            id: healthCheck.id,
            name: healthCheck.name
          });
        }
      }
      
      logger.info(`Scheduled tasks refreshed. Active tasks: ${this.scheduledTasks.size}`);
    } catch (error) {
      logger.error({
        msg: 'Error refreshing scheduled tasks',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  enableBatchMode(enabled: boolean = true): void {
    this.batchModeEnabled = enabled;
    logger.info(`Batch mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  getActiveTaskCount(): number {
    return this.scheduledTasks.size;
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  isBatchModeEnabled(): boolean {
    return this.batchModeEnabled;
  }
}

export const schedulerService = new SchedulerService();