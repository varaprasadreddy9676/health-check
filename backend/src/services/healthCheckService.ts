import logger from '../utils/logger';
import { HealthCheck } from '../models/HealthCheck';
import { HealthCheckResult } from '../models/HealthCheckResult';
import { checkApiHealth } from '../modules/healthChecks/apiCheck';
import { checkProcessHealth, executeCustomCommand, restartProcess } from '../modules/healthChecks/processCheck';
import { checkSystemHealth } from '../modules/healthChecks/systemCheck';
import { notificationService } from './notificationService';
import { getHealthCheckRepository } from '../repositories/factory';
import { getIncidentRepository } from '../repositories/factory';
import { getNotificationRepository } from '../repositories/factory';

interface HealthCheckExecutionResult {
  isHealthy: boolean;
  details: string;
  cpuUsage?: number;
  memoryUsage?: number;
  responseTime?: number;
}

class HealthCheckService {
  // Execute a single health check
  async executeHealthCheck(healthCheck: HealthCheck): Promise<HealthCheckExecutionResult> {
    try {
      logger.info({ 
        msg: `Executing health check: ${healthCheck.name}`, 
        type: healthCheck.type,
        healthCheckId: healthCheck.id
      });
      
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
      
      // Log the result
      logger.info({
        msg: `Health check result`,
        healthCheckId: healthCheck.id,
        name: healthCheck.name,
        isHealthy: result.isHealthy,
        details: result.details
      });
      
      // Save the result to the database
      const savedResult = await this.saveHealthCheckResult(healthCheck.id, result);
      
      logger.info({
        msg: "Health check result saved",
        resultId: savedResult.id,
        healthCheckId: healthCheck.id
      });
      
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

  // Save health check result
  private async saveHealthCheckResult(healthCheckId: string, result: HealthCheckExecutionResult): Promise<HealthCheckResult> {
    try {
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
    } catch (error) {
      logger.error({
        msg: 'Error saving health check result',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId
      });
      throw error;
    }
  }

  // Handle a failed health check
  private async handleFailedHealthCheck(healthCheck: HealthCheck, details: string): Promise<void> {
    try {
      // 1. Create or update incident
      await this.createIncident(healthCheck, details);
      
      // 2. Send notification if needed
      const shouldNotify = await this.shouldSendNotification();
      if (shouldNotify) {
        const result = { 
          isHealthy: false, 
          details: details 
        };
        await this.sendNotification(healthCheck, result);
      }
    } catch (error) {
      logger.error({
        msg: 'Error handling failed health check',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: healthCheck.id,
        healthCheckName: healthCheck.name
      });
    }
  }

  // Create or update an incident
  private async createIncident(healthCheck: HealthCheck, details: string): Promise<void> {
    try {
      logger.info({
        msg: 'Creating/updating incident',
        healthCheckId: healthCheck.id,
        healthCheckName: healthCheck.name
      });
      
      const incidentRepository = getIncidentRepository();
      
      // Check for existing incident
      const activeIncidents = await incidentRepository.findAll(1, 10, 'investigating');
      const existingIncident = activeIncidents.incidents.find(inc => inc.healthCheckId === healthCheck.id);
      
      if (existingIncident) {
        // Update existing incident
        await incidentRepository.addEvent({
          incidentId: existingIncident.id,
          message: `Still unhealthy: ${details}`,
          createdAt: new Date(),
        });
        
        logger.info({
          msg: 'Updated existing incident',
          incidentId: existingIncident.id,
          healthCheckId: healthCheck.id
        });
      } else {
        // Create new incident
        const incident = await incidentRepository.create({
          healthCheckId: healthCheck.id,
          title: `${healthCheck.name} is unhealthy`,
          status: 'investigating',
          severity: 'high',
          details,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Add first event
        await incidentRepository.addEvent({
          incidentId: incident.id,
          message: `Incident created: ${details}`,
          createdAt: new Date(),
        });
        
        logger.info({
          msg: 'Created new incident',
          incidentId: incident.id,
          healthCheckId: healthCheck.id
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Error creating/updating incident',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: healthCheck.id,
        healthCheckName: healthCheck.name
      });
    }
  }

  // Send notification for an unhealthy check
  private async sendNotification(healthCheck: HealthCheck, result: HealthCheckExecutionResult): Promise<void> {
    try {
      logger.info({
        msg: 'Sending notification',
        healthCheckId: healthCheck.id,
        healthCheckName: healthCheck.name
      });
      
      const notificationData = {
        subject: `Health Check Alert - ${healthCheck.name} is unhealthy`,
        results: [{
          name: healthCheck.name,
          type: healthCheck.type,
          status: 'Unhealthy',
          details: result.details,
          lastChecked: new Date().toISOString(),
          healthCheckId: healthCheck.id,
          severity: 'high'
        }],
        hasFailures: true,
      };
      
      await notificationService.sendHealthCheckNotification(notificationData);
      
      logger.info({
        msg: 'Notification sent successfully',
        healthCheckId: healthCheck.id
      });
    } catch (error) {
      logger.error({
        msg: 'Error sending notification',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: healthCheck.id
      });
    }
  }

  // Check if we should send a notification (simple throttling)
  private async shouldSendNotification(): Promise<boolean> {
    try {
      const notificationRepository = getNotificationRepository();
      const lastNotificationTime = await notificationRepository.getLastNotificationTime('email');
      
      if (!lastNotificationTime) {
        logger.info('No previous notification found, sending notification');
        return true;
      }
      
      const throttleMinutes = 60; // 1 hour
      const throttleMs = throttleMinutes * 60 * 1000;
      const elapsedMs = Date.now() - lastNotificationTime.getTime();
      
      const shouldSend = elapsedMs > throttleMs;
      
      logger.info({
        msg: 'Notification throttle check',
        lastNotificationTime: lastNotificationTime.toISOString(),
        elapsedMinutes: Math.floor(elapsedMs / 60000),
        throttleMinutes: throttleMinutes,
        shouldSend: shouldSend
      });
      
      return shouldSend;
    } catch (error) {
      logger.error({
        msg: 'Error checking notification throttling',
        error: error instanceof Error ? error.message : String(error),
      });
      return true; // If we can't check, default to sending
    }
  }

  // Method called by scheduler to execute a health check
  async forceHealthCheck(healthCheckId: string): Promise<HealthCheckExecutionResult> {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const healthCheck = await healthCheckRepository.findById(healthCheckId);
      
      if (!healthCheck) {
        logger.error({
          msg: 'Health check not found',
          healthCheckId
        });
        return {
          isHealthy: false,
          details: 'Health check not found',
        };
      }
      
      const result = await this.executeHealthCheck(healthCheck);
      
      // If unhealthy, handle it
      if (!result.isHealthy) {
        await this.handleFailedHealthCheck(healthCheck, result.details);
      }
      
      return result;
    } catch (error) {
      logger.error({
        msg: 'Error in forceHealthCheck',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId,
      });
      return {
        isHealthy: false,
        details: `Error forcing health check: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Execute all health checks (for manual runs or testing)
  async runAllHealthChecks(): Promise<void> {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const healthChecks = await healthCheckRepository.findAll({ enabled: true });
      
      logger.info({ msg: `Running ${healthChecks.length} health checks` });
      
      for (const healthCheck of healthChecks) {
        try {
          const result = await this.executeHealthCheck(healthCheck);
          
          if (!result.isHealthy) {
            await this.handleFailedHealthCheck(healthCheck, result.details);
          }
        } catch (error) {
          logger.error({
            msg: 'Error processing health check in runAllHealthChecks',
            error: error instanceof Error ? error.message : String(error),
            healthCheckId: healthCheck.id,
            healthCheckName: healthCheck.name
          });
        }
      }
      
      logger.info({ msg: 'All health checks completed' });
    } catch (error) {
      logger.error({
        msg: 'Error running all health checks',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Restart a service (used by the API)
  async restartService(healthCheckId: string): Promise<{ success: boolean; details: string }> {
    try {
      const healthCheckRepository = getHealthCheckRepository();
      const healthCheck = await healthCheckRepository.findById(healthCheckId);
      
      if (!healthCheck) {
        return {
          success: false,
          details: 'Health check not found',
        };
      }
      
      if (!healthCheck.restartCommand) {
        return {
          success: false,
          details: 'No restart command configured for this health check',
        };
      }
      
      const result = await restartProcess(healthCheck);
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
}

export const healthCheckService = new HealthCheckService();