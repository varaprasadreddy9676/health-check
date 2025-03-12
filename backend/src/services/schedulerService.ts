import { healthCheckRepository } from '../repositories/healthCheckRepository';
import { healthCheckService } from './healthCheckService';
import { IHealthCheck } from '../models/HealthCheck';
import logger from '../utils/logger';

// Scheduler service to run health checks at the configured intervals
export class SchedulerService {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  
  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('Scheduler is already running');
        return;
      }
      
      logger.info('Starting health check scheduler');
      
      // Schedule all enabled health checks
      await this.scheduleAllHealthChecks();
      
      // Set up periodic refresh to detect configuration changes
      setInterval(async () => {
        await this.refreshScheduledTasks();
      }, 5 * 60 * 1000); // Refresh every 5 minutes
      
      this.isRunning = true;
      logger.info('Health check scheduler started');
    } catch (error) {
      logger.error({
        msg: 'Failed to start health check scheduler',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    logger.info('Stopping health check scheduler');
    
    // Cancel all scheduled tasks
    for (const [id, task] of this.scheduledTasks.entries()) {
      clearInterval(task);
      this.scheduledTasks.delete(id);
    }
    
    this.isRunning = false;
    logger.info('Health check scheduler stopped');
  }
  
  /**
   * Schedule all enabled health checks
   */
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
  
  /**
   * Schedule a single health check
   */
  private scheduleHealthCheck(healthCheck: IHealthCheck): void {
    try {
      // Clear existing task if it exists
      if (this.scheduledTasks.has(healthCheck.id)) {
        clearInterval(this.scheduledTasks.get(healthCheck.id)!);
        this.scheduledTasks.delete(healthCheck.id);
      }
      
      // Skip if check is disabled
      if (!healthCheck.enabled) {
        return;
      }
      
      // Get check interval (minimum 10 seconds)
      const intervalSeconds = Math.max(healthCheck.checkInterval || 300, 10);
      const intervalMs = intervalSeconds * 1000;
      
      // Schedule periodic health check
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
      
      // Run the check immediately
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
  
  /**
   * Refresh scheduled tasks based on current configuration
   */
  private async refreshScheduledTasks(): Promise<void> {
    try {
      logger.info('Refreshing scheduled health checks');
      
      // Get all health checks
      const healthChecks = await healthCheckRepository.findAll();
      
      // Remove tasks for deleted health checks
      const currentIds = new Set(healthChecks.map(check => check.id));
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
      
      // Update tasks based on enabled status
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
  
  /**
   * Get the number of active scheduled tasks
   */
  getActiveTaskCount(): number {
    return this.scheduledTasks.size;
  }
  
  /**
   * Check if the scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();