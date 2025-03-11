import logger from '../utils/logger';
import { HealthCheck } from '../models/HealthCheck';
import { HealthCheckResult } from '../models/HealthCheckResult';
import { checkApiHealth } from '../modules/healthChecks/apiCheck';
import { checkProcessHealth, executeCustomCommand, restartProcess } from '../modules/healthChecks/processCheck';
import { checkSystemHealth } from '../modules/healthChecks/systemCheck';
import { notificationService } from './notificationService';
import { getHealthCheckRepository } from '../repositories/factory';
import { getIncidentRepository } from '../repositories/factory';

interface HealthCheckExecutionResult {
  isHealthy: boolean;
  details: string;
  cpuUsage?: number;
  memoryUsage?: number;
  responseTime?: number;
}

interface ProcessCheckResult {
  isRunning: boolean;
  isHealthy: boolean;
  cpuUsage?: number;
  memoryUsage?: number;
  details: string;
}

class HealthCheckService {
  // Execute a single health check
  async executeHealthCheck(
    healthCheck: HealthCheck
  ): Promise<HealthCheckExecutionResult> {
    try {
      logger.info({ msg: `Executing health check: ${healthCheck.name}`, type: healthCheck.type });
      
      let result: HealthCheckExecutionResult;
      
      switch (healthCheck.type) {
        case 'API':
          result = await checkApiHealth(healthCheck);
          break;
        case 'PROCESS':
          result = await checkProcessHealth(healthCheck);
          break;
        case 'SERVICE':
          result = await executeCustomCommand(healthCheck);
          break;
        case 'SERVER':
          result = await checkSystemHealth();
          break;
        default:
          return {
            isHealthy: false,
            details: `Unknown health check type: ${healthCheck.type}`,
          };
      }
      
      // Save the result to database
      await this.saveHealthCheckResult(healthCheck.id, result);
      
      // Return the result
      return result;
    } catch (error) {
      logger.error({
        msg: `Error executing health check: ${healthCheck.name}`,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        isHealthy: false,
        details: `Error executing health check: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  // Save the health check result to the database
  private async saveHealthCheckResult(
    healthCheckId: string, 
    result: HealthCheckExecutionResult
  ): Promise<HealthCheckResult> {
    const healthCheckRepository = getHealthCheckRepository();
    
    return healthCheckRepository.saveResult({
      healthCheckId,
      status: result.isHealthy ? 'Healthy' : 'Unhealthy',
      details: result.details,
      cpuUsage: result.cpuUsage,
      memoryUsage: result.memoryUsage,
      responseTime: result.responseTime,
      createdAt: new Date()
    });
  }
  
  // Run all enabled health checks
  async runAllHealthChecks(): Promise<void> {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const incidentRepository = getIncidentRepository();
      
      // Get all enabled health checks
      const healthChecks = await healthCheckRepository.findAll({ enabled: true });
      
      logger.info({ msg: `Running ${healthChecks.length} health checks` });
      
      const results: { healthCheck: HealthCheck; result: HealthCheckExecutionResult }[] = [];
      const unhealthyChecks: { healthCheck: HealthCheck; result: HealthCheckExecutionResult }[] = [];
      
      // Execute all health checks
      for (const healthCheck of healthChecks) {
        const result = await this.executeHealthCheck(healthCheck);
        results.push({ healthCheck, result });
        
        if (!result.isHealthy) {
          unhealthyChecks.push({ healthCheck, result });
          
          // Get the last two results for this health check to detect new failures
          const historicalResults = await healthCheckRepository.getResultsByCheckId(healthCheck.id, 1, 2);
          
          if (historicalResults.results.length > 1) {
            const previousResult = historicalResults.results[1]; // The second result is the previous one
            const isNewFailure = previousResult.status === 'Healthy';
            
            if (isNewFailure) {
              await this.createIncident(healthCheck, result.details);
            }
          } else {
            // If we don't have enough historical data, treat as new failure
            await this.createIncident(healthCheck, result.details);
          }
        }
      }
      
      // Notify if there are unhealthy checks
      if (unhealthyChecks.length > 0) {
        await this.notifyUnhealthyChecks(unhealthyChecks);
      }
      
    } catch (error) {
      logger.error({
        msg: 'Error running health checks',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Create a new incident for an unhealthy check
  private async createIncident(
    healthCheck: HealthCheck, 
    details: string
  ): Promise<void> {
    try {
      const incidentRepository = getIncidentRepository();
      
      // Check if there's already an active incident for this health check
      const activeIncidents = await incidentRepository.findAll(1, 10, 'investigating');
      const existingIncident = activeIncidents.incidents.find(inc => inc.healthCheckId === healthCheck.id);
      
      if (existingIncident) {
        // Add an event to the existing incident
        await incidentRepository.addEvent({
          incidentId: existingIncident.id,
          message: `Still unhealthy: ${details}`,
          createdAt: new Date(),
        });
      } else {
        // Create a new incident
        const incident = await incidentRepository.create({
          healthCheckId: healthCheck.id,
          title: `${healthCheck.name} is unhealthy`,
          status: 'investigating',
          severity: 'high', // Default severity
          details,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Add the initial event
        await incidentRepository.addEvent({
          incidentId: incident.id,
          message: `Incident created: ${details}`,
          createdAt: new Date(),
        });
        
        logger.info({
          msg: 'Created new incident',
          incidentId: incident.id,
          healthCheck: healthCheck.name,
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Error creating incident',
        error: error instanceof Error ? error.message : String(error),
        healthCheck: healthCheck.name,
      });
    }
  }
  
  // Notify about unhealthy checks
  private async notifyUnhealthyChecks(
    unhealthyChecks: { healthCheck: HealthCheck; result: HealthCheckExecutionResult }[]
  ): Promise<void> {
    try {
      // Check if notifications are throttled
      const shouldNotify = await this.shouldSendNotification();
      
      if (!shouldNotify) {
        logger.info({ msg: 'Notifications are throttled, skipping' });
        return;
      }
      
      const unhealthyResults = unhealthyChecks.map(uc => ({
        name: uc.healthCheck.name,
        type: uc.healthCheck.type,
        status: 'Unhealthy',
        details: uc.result.details,
        lastChecked: new Date().toISOString(),
      }));
      
      // Send notifications
      await notificationService.sendHealthCheckNotification({
        subject: 'Health Check Alert - Unhealthy Services Detected',
        results: unhealthyResults,
        hasFailures: true,
      });
      
    } catch (error) {
      logger.error({
        msg: 'Error sending notifications for unhealthy checks',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Check if we should send a notification (throttling)
  private async shouldSendNotification(): Promise<boolean> {
    try {
      const notificationRepository = getHealthCheckRepository();
      
      // Get the last notification time
      const latestResults = await notificationRepository.getLatestResults();
      const lastNotification = latestResults.find(result => result.status === 'Unhealthy');
      
      if (!lastNotification) {
        return true; // No previous notification
      }
      
      // Default throttle settings
      const throttleMinutes = 60; // Default to 60 minutes
      
      // Check if enough time has passed since the last notification
      const throttleMs = throttleMinutes * 60 * 1000;
      const elapsedMs = Date.now() - lastNotification.createdAt.getTime();
      
      return elapsedMs > throttleMs;
    } catch (error) {
      logger.error({
        msg: 'Error checking notification throttling',
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Default to true in case of error
      return true;
    }
  }
  
  // Restart a service/process
  async restartService(healthCheckId: string): Promise<{ success: boolean; details: string }> {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const incidentRepository = getIncidentRepository();
      
      // Get the health check
      const healthCheck = await healthCheckRepository.findById(healthCheckId);
      
      if (!healthCheck) {
        return {
          success: false,
          details: 'Health check not found',
        };
      }
      
      // Check if restart command exists
      if (!healthCheck.restartCommand) {
        return {
          success: false,
          details: 'No restart command configured for this health check',
        };
      }
      
      // Execute restart
      const result = await restartProcess(healthCheck);
      
      // Find active incident for this health check
      const activeIncidents = await incidentRepository.findAll(1, 10, 'investigating');
      const activeIncident = activeIncidents.incidents.find(inc => inc.healthCheckId === healthCheckId);
      
      // Log the restart action if there's an active incident
      if (activeIncident) {
        await incidentRepository.addEvent({
          incidentId: activeIncident.id,
          message: `Manual restart initiated: ${result.details}`,
          createdAt: new Date(),
        });
      }
      
      return result;
    } catch (error) {
      logger.error({
        msg: 'Error restarting service',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId,
      });
      
      return {
        success: false,
        details: `Error restarting service: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  // Force a health check
  async forceHealthCheck(healthCheckId: string): Promise<HealthCheckExecutionResult> {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      
      const healthCheck = await healthCheckRepository.findById(healthCheckId);
      
      if (!healthCheck) {
        return {
          isHealthy: false,
          details: 'Health check not found',
        };
      }
      
      return this.executeHealthCheck(healthCheck);
    } catch (error) {
      logger.error({
        msg: 'Error forcing health check',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId,
      });
      
      return {
        isHealthy: false,
        details: `Error forcing health check: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

export const healthCheckService = new HealthCheckService();