import axios from 'axios';
import { exec } from 'child_process';
import os from 'os';
import util from 'util';
import { IHealthCheck } from '../models/HealthCheck';
import { ResultStatus } from '../models/Result';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import { notificationService } from './notificationService';
import { env } from '../config/env';
import { sendEmail } from '../config/email';
import { renderHealthCheckAlertEmail } from '../utils/emailTemplates';
import { notificationRepository } from '../repositories/notificationRepository';
import logger from '../utils/logger';
import fs from 'fs';
import readline from 'readline';

const statPromise = util.promisify(fs.stat);
const existsPromise = util.promisify(fs.exists);

const execPromise = util.promisify(exec);

// Define LogDetails interface
export interface LogDetails {
  lastModified?: Date;
  sizeBytes?: number;
  matchedErrorPatterns?: string[];
  isFresh?: boolean;
}

// Update HealthCheckResult interface to include logDetails
export interface HealthCheckResult {
  isHealthy: boolean;
  status: ResultStatus;
  details: string;
  memoryUsage?: number;
  cpuUsage?: number;
  responseTime?: number;
  logDetails?: LogDetails;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  status: ResultStatus;
  details: string;
  memoryUsage?: number;
  cpuUsage?: number;
  responseTime?: number;
}

export class HealthCheckService {
  async executeHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      logger.info({
        msg: `Executing health check`,
        id: healthCheck.id,
        name: healthCheck.name,
        type: healthCheck.type
      });
      
      let result: HealthCheckResult;
      
      switch (healthCheck.type) {
        case 'API':
          result = await this.executeApiHealthCheck(healthCheck);
          break;
        case 'PROCESS':
          result = await this.executeProcessHealthCheck(healthCheck);
          break;
        case 'SERVICE':
          result = await this.executeServiceHealthCheck(healthCheck);
          break;
        case 'SERVER':
          result = await this.executeServerHealthCheck();
          break;
        case 'LOG':
          result = await this.executeLogHealthCheck(healthCheck);
          break;
        default:
          result = {
            isHealthy: false,
            status: 'Unhealthy',
            details: `Unknown health check type: ${healthCheck.type}`
          };
      }
      
      await healthCheckRepository.saveResult({
        healthCheckId: healthCheck.id,
        status: result.status,
        details: result.details,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        responseTime: result.responseTime
      });
      
      if (!result.isHealthy && healthCheck.notifyOnFailure) {
        await this.handleUnhealthyResult(healthCheck, result);
      }
      
      logger.info({
        msg: `Health check completed`,
        id: healthCheck.id,
        name: healthCheck.name,
        status: result.status,
        isHealthy: result.isHealthy
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: HealthCheckResult = {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error executing health check: ${errorMessage}`
      };
      
      await healthCheckRepository.saveResult({
        healthCheckId: healthCheck.id,
        status: errorResult.status,
        details: errorResult.details
      });
      
      logger.error({
        msg: `Health check error`,
        id: healthCheck.id,
        name: healthCheck.name,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (healthCheck.notifyOnFailure) {
        await this.handleUnhealthyResult(healthCheck, errorResult);
      }
      
      return errorResult;
    }
  }

  /**
   * Execute health check without sending notifications
   */
  async executeHealthCheckWithoutNotification(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      logger.info({
        msg: `Executing health check`,
        id: healthCheck.id,
        name: healthCheck.name,
        type: healthCheck.type
      });
      
      let result: HealthCheckResult;
      
      switch (healthCheck.type) {
        case 'API':
          result = await this.executeApiHealthCheck(healthCheck);
          break;
        case 'PROCESS':
          result = await this.executeProcessHealthCheck(healthCheck);
          break;
        case 'SERVICE':
          result = await this.executeServiceHealthCheck(healthCheck);
          break;
        case 'SERVER':
          result = await this.executeServerHealthCheck();
          break;
        default:
          result = {
            isHealthy: false,
            status: 'Unhealthy',
            details: `Unknown health check type: ${healthCheck.type}`
          };
      }
      
      await healthCheckRepository.saveResult({
        healthCheckId: healthCheck.id,
        status: result.status,
        details: result.details,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        responseTime: result.responseTime
      });
      
      logger.info({
        msg: `Health check completed`,
        id: healthCheck.id,
        name: healthCheck.name,
        status: result.status,
        isHealthy: result.isHealthy
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: HealthCheckResult = {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error executing health check: ${errorMessage}`
      };
      
      await healthCheckRepository.saveResult({
        healthCheckId: healthCheck.id,
        status: errorResult.status,
        details: errorResult.details
      });
      
      logger.error({
        msg: `Health check error`,
        id: healthCheck.id,
        name: healthCheck.name,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return errorResult;
    }
  }

  private async executeApiHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      if (!healthCheck.endpoint) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: 'No endpoint URL provided'
        };
      }
      const startTime = Date.now();
      const timeout = healthCheck.timeout || 5000;
      const response = await axios.get(healthCheck.endpoint, {
        timeout,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: true,
        status: 'Healthy',
        details: `API check passed. Status: ${response.status}`,
        responseTime
      };
    } catch (error: any) {
      let details = 'API check failed';
      if (error.code === 'ECONNABORTED') {
        details = `API check timed out after ${healthCheck.timeout}ms`;
      } else if (error.response) {
        details = `API check failed with status ${error.response.status}`;
      } else if (error.request) {
        details = `API check failed. No response received: ${error.message}`;
      } else {
        details = `API check failed: ${error.message}`;
      }
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details,
        responseTime: error.responseTime
      };
    }
  }

  private async executeProcessHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      let result: HealthCheckResult;
      
      if (healthCheck.port) {
        try {
          await execPromise(`nc -z localhost ${healthCheck.port}`);
          result = {
            isHealthy: true,
            status: 'Healthy',
            details: `Port ${healthCheck.port} is open`
          };
        } catch (error) {
          return {
            isHealthy: false,
            status: 'Unhealthy',
            details: `Port ${healthCheck.port} is not open`
          };
        }
      } else if (healthCheck.processKeyword) {
        const commandToExecute = `ps -eo pid,%cpu,%mem,command | grep -E "${healthCheck.processKeyword}" | grep -v grep`;
        const { stdout } = await execPromise(commandToExecute);
        const lines = stdout.trim().split('\n');
        
        if (lines.length === 0 || lines[0] === '') {
          return {
            isHealthy: false,
            status: 'Unhealthy',
            details: `Process with keyword "${healthCheck.processKeyword}" not found`
          };
        }
        
        const [pid, cpu, memory, ...commandArray] = lines[0].split(/\s+/);
        const command = commandArray.join(' ');
        result = {
          isHealthy: true,
          status: 'Healthy',
          details: `PID: ${pid}, Command: ${command}`,
          cpuUsage: parseFloat(cpu),
          memoryUsage: parseFloat(memory)
        };
      } else {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: 'No process keyword or port provided'
        };
      }
      
      // If process is healthy and log file path is provided, also check logs
      if (result.isHealthy && healthCheck.logFilePath) {
        return await this.checkAssociatedLogs(result, healthCheck);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error checking process: ${errorMessage}`
      };
    }
  }
  
  private async executeServiceHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      if (!healthCheck.customCommand) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: 'No custom command provided'
        };
      }
      
      let result: HealthCheckResult;
      const { stdout } = await execPromise(healthCheck.customCommand);
      const response = stdout.trim();
      
      if (healthCheck.expectedOutput && !response.includes(healthCheck.expectedOutput)) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `Expected output not found. Response: ${response}`
        };
      }
      
      result = {
        isHealthy: true,
        status: 'Healthy',
        details: healthCheck.expectedOutput
          ? `Command executed successfully. Response matches expected output.`
          : `Command executed successfully. Response: ${response}`
      };
      
      // If service is healthy and log file path is provided, also check logs
      if (result.isHealthy && healthCheck.logFilePath) {
        return await this.checkAssociatedLogs(result, healthCheck);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error executing command: ${errorMessage}`
      };
    }
  }
  private async executeServerHealthCheck(): Promise<HealthCheckResult> {
    try {
      const cpuUsage = os.loadavg()[0];
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const freeMemoryPercentage = (freeMemory / totalMemory) * 100;
      const cpuThreshold = 0.8;
      const memoryThreshold = 20;
      const isHighCpu = cpuUsage > cpuThreshold;
      const isLowMemory = freeMemoryPercentage < memoryThreshold;
      const isHealthy = !isHighCpu && !isLowMemory;
      let details = `CPU load: ${cpuUsage.toFixed(2)}, Free memory: ${freeMemoryPercentage.toFixed(2)}%`;
      if (isHighCpu) {
        details += ', High CPU usage detected';
      }
      if (isLowMemory) {
        details += ', Low memory detected';
      }
      return {
        isHealthy,
        status: isHealthy ? 'Healthy' : 'Unhealthy',
        details,
        cpuUsage,
        memoryUsage: 100 - freeMemoryPercentage
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error checking system health: ${errorMessage}`
      };
    }
  }

  private async handleUnhealthyResult(healthCheck: IHealthCheck, result: HealthCheckResult): Promise<void> {
    try {
      await notificationService.sendHealthCheckAlert({
        healthCheckId: healthCheck.id,
        name: healthCheck.name,
        type: healthCheck.type,
        status: result.status,
        details: result.details,
        cpuUsage: result.cpuUsage,
        memoryUsage: result.memoryUsage,
        responseTime: result.responseTime
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Error handling unhealthy result',
        error: errorMessage,
        healthCheckId: healthCheck.id
      });
    }
  }

  async forceHealthCheck(id: string): Promise<HealthCheckResult> {
    const healthCheck = await healthCheckRepository.findById(id);
    if (!healthCheck) {
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Health check with ID ${id} not found`
      };
    }
    return await this.executeHealthCheck(healthCheck);
  }

  async restartService(id: string): Promise<{ success: boolean, details: string }> {
    try {
      const healthCheck = await healthCheckRepository.findById(id);
      if (!healthCheck) {
        return {
          success: false,
          details: `Health check with ID ${id} not found`
        };
      }
      
      if (!healthCheck.restartCommand) {
        return {
          success: false,
          details: 'No restart command configured for this health check'
        };
      }
      
      const { stdout, stderr } = await execPromise(healthCheck.restartCommand);
      logger.info({
        msg: `Service restart executed`,
        id: healthCheck.id,
        name: healthCheck.name,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
      
      // Check service health after a delay to allow it to start up
      setTimeout(async () => {
        try {
          const result = await this.executeHealthCheckWithoutNotification(healthCheck);
          
          // If service has recovered, send a recovery notification
          if (result.isHealthy) {
            await this.sendRecoveryNotifications([{
              healthCheck,
              result: {
                ...result,
                details: `${result.details} (Auto-recovered after restart)`
              }
            }]);
            
            logger.info({
              msg: `Service auto-recovered after restart`,
              id: healthCheck.id,
              name: healthCheck.name
            });
          }
        } catch (error) {
          logger.error({
            msg: 'Error checking health after restart',
            error: error instanceof Error ? error.message : String(error),
            id: healthCheck.id,
            name: healthCheck.name
          });
        }
      }, 10000); // Wait 10 seconds for service to restart
      
      return {
        success: true,
        details: `Restart command executed. Output: ${stdout.trim()}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Error restarting service',
        error: errorMessage,
        id
      });
      return {
        success: false,
        details: `Error restarting service: ${errorMessage}`
      };
    }
  }

  async sendRecoveryNotifications(
    recoveredChecks: Array<{ healthCheck: IHealthCheck; result: HealthCheckResult }>
  ): Promise<void> {
    try {
      await this.sendConsolidatedNotifications(recoveredChecks, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: 'Error sending recovery notifications',
        error: errorMessage
      });
    }
  }

  /**
   * Runs all health checks and consolidates notifications
   */
async runAllHealthChecks(): Promise<void> {
  try {
    const healthChecks = await healthCheckRepository.findAll({ enabled: true });
    logger.info({ msg: `Running ${healthChecks.length} health checks` });
    
    // Execute all health checks and collect unhealthy results
    const unhealthyResults: Array<{
      healthCheck: IHealthCheck;
      result: HealthCheckResult;
    }> = [];
    
    // Track previously unhealthy checks that are now healthy for recovery notifications
    const recoveredChecks: Array<{
      healthCheck: IHealthCheck;
      result: HealthCheckResult;
    }> = [];
    
    // Run checks with concurrency limit
    const concurrencyLimit = 5;
    const chunks = [];
    for (let i = 0; i < healthChecks.length; i += concurrencyLimit) {
      chunks.push(healthChecks.slice(i, i + concurrencyLimit));
    }
    
    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (healthCheck) => {
          try {
            // Don't send notifications yet - we'll do that after collecting all results
            const result = await this.executeHealthCheckWithoutNotification(healthCheck);
            
            // Get previous result to check if this is a recovery
            const previousResults = await healthCheckRepository.getResultsByHealthCheckId(
              healthCheck.id, 
              1, 
              1
            );
            
            const previousStatus = previousResults.results.length > 0 ? previousResults.results[0].status : null;
            
            if (!result.isHealthy && healthCheck.notifyOnFailure) {
              unhealthyResults.push({ healthCheck, result });
              
              // Auto-restart if command is available
              if (healthCheck.restartCommand) {
                logger.info({
                  msg: `Auto-restarting unhealthy service`,
                  id: healthCheck.id,
                  name: healthCheck.name
                });
                
                // Execute restart command
                await this.restartService(healthCheck.id);
              }
            } 
            // Track recovery: previously unhealthy, now healthy
            else if (result.isHealthy && previousStatus === 'Unhealthy') {
              recoveredChecks.push({ healthCheck, result });
            }
            
            return result;
          } catch (error) {
            logger.error({
              msg: 'Error executing health check in batch',
              error: error instanceof Error ? error.message : String(error),
              healthCheckId: healthCheck.id,
              name: healthCheck.name
            });
            return null;
          }
        })
      );
    }
    
    // Send notifications for unhealthy checks
    if (unhealthyResults.length > 0) {
      await this.sendConsolidatedNotifications(unhealthyResults, false);
    }
    
    // Send recovery notifications
    if (recoveredChecks.length > 0) {
      await this.sendRecoveryNotifications(recoveredChecks);
    }
    
    logger.info({ msg: 'All health checks completed' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Error running all health checks',
      error: errorMessage
    });
  }
}

async sendConsolidatedNotifications(
  checkResults: Array<{ healthCheck: IHealthCheck; result: HealthCheckResult }>,
  isRecovery: boolean = false
): Promise<void> {
  try {
    // Check if notifications should be throttled
    const shouldThrottle = await notificationRepository.shouldThrottleEmail();
    if (shouldThrottle) {
      logger.info({ msg: 'Email notifications throttled' });
      return;
    }
    
    // 1. Get all global subscribers first
    const emailConfig = await notificationRepository.getEmailConfig();
    
    // Prepare a map to track recipients and the checks they should be notified about
    const recipientMap = new Map<string, {
      checks: Array<{
        healthCheck: IHealthCheck;
        result: HealthCheckResult;
      }>;
      isGlobal: boolean;
    }>();
    
    // 2. Handle global subscribers (those who subscribed to all checks)
    // This includes both explicitly global subscribers and the default email config recipients
    const globalSeverity = checkResults.some(
      r => r.healthCheck.type === 'SERVER' || (r.result.responseTime && r.result.responseTime > 10000)
    ) ? 'critical' : 'high';
    
    const globalSubscribers = await notificationRepository.getGlobalSubscribers(globalSeverity);
    
    // Add global subscribers
    for (const email of globalSubscribers) {
      recipientMap.set(email, {
        checks: [...checkResults], // All checks for global subscribers
        isGlobal: true
      });
    }
    
    // Add default recipients from email config if no global subscribers
    if (globalSubscribers.length === 0 && emailConfig.enabled && emailConfig.recipients.length > 0) {
      for (const email of emailConfig.recipients) {
        recipientMap.set(email, {
          checks: [...checkResults], // All checks for default recipients
          isGlobal: true
        });
      }
    }
    
    // 3. Handle specific subscribers for each check
    for (const { healthCheck, result } of checkResults) {
      const severity = healthCheck.type === 'SERVER' || (result.responseTime && result.responseTime > 10000)
        ? 'critical'
        : 'high';
        
      const specificSubscribers = await notificationRepository.getSubscribersForHealthCheck(
        healthCheck.id, 
        severity
      );
      
      for (const email of specificSubscribers) {
        // Skip if already added as a global subscriber
        if (recipientMap.has(email) && recipientMap.get(email)!.isGlobal) {
          continue;
        }
        
        if (!recipientMap.has(email)) {
          recipientMap.set(email, {
            checks: [],
            isGlobal: false
          });
        }
        
        recipientMap.get(email)!.checks.push({ healthCheck, result });
      }
    }
    
    // 4. Send emails to all recipients
    if (recipientMap.size === 0) {
      logger.info({ 
        msg: `No recipients for ${isRecovery ? 'recovery' : 'unhealthy'} notifications` 
      });
      return;
    }
    
    // Update last sent time to implement throttling
    await notificationRepository.updateLastSentTime();
    
    // Send an email to each recipient with their relevant checks
    for (const [email, { checks }] of recipientMap.entries()) {
      let subject: string;
      
      if (isRecovery) {
        if (checks.length === 1) {
          subject = `Recovery Alert: ${checks[0].healthCheck.name} is now Healthy`;
        } else {
          subject = `Recovery Alert: ${checks.length} services have recovered`;
        }
      } else {
        if (checks.length === 1) {
          subject = `Health Check Alert: ${checks[0].healthCheck.name} is ${checks[0].result.status}`;
        } else {
          subject = `Health Check Alert: ${checks.length} services are Unhealthy`;
        }
      }
      
      const html = renderHealthCheckAlertEmail({
        subject,
        results: checks.map(({ healthCheck, result }) => ({
          name: healthCheck.name,
          type: healthCheck.type,
          status: result.status,
          details: result.details,
          cpuUsage: result.cpuUsage,
          memoryUsage: result.memoryUsage,
          responseTime: result.responseTime
        })),
        timestamp: new Date(),
        currentYear: new Date().getFullYear(),
        dashboardUrl: `${env.BASE_URL}/dashboard`,
        serviceName: checks.length === 1 ? checks[0].healthCheck.name : undefined,
        hasSuccessfulRecovery: isRecovery
      });
      
      const emailSent = await sendEmail(email, subject, html);
      
      if (emailSent) {
        await notificationRepository.createNotification({
          type: 'email',
          subject,
          content: html,
          recipients: [email],
          status: 'sent'
        });
        
        logger.info({
          msg: `${isRecovery ? 'Recovery' : 'Health check'} alert email sent`,
          email,
          checkCount: checks.length
        });
      } else {
        await notificationRepository.createNotification({
          type: 'email',
          subject,
          content: html,
          recipients: [email],
          status: 'failed'
        });
        
        logger.error({
          msg: `Failed to send ${isRecovery ? 'recovery' : 'health check'} alert email`,
          email,
          checkCount: checks.length
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: `Error sending ${isRecovery ? 'recovery' : 'unhealthy'} notifications`,
      error: errorMessage
    });
  }
}

// Modified function to handle log checks for process and service health checks
private async checkAssociatedLogs(result: HealthCheckResult, healthCheck: IHealthCheck): Promise<HealthCheckResult> {
  if (!healthCheck.logFilePath) {
    return result;
  }
  
  try {
    // Check file exists
    const fileExists = await existsPromise(healthCheck.logFilePath);
    if (!fileExists) {
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `${result.details} | Log file does not exist at path: ${healthCheck.logFilePath}`,
      };
    }

    // Get file stats
    const stats = await statPromise(healthCheck.logFilePath);
    const logDetails: LogDetails = {
      lastModified: stats.mtime,
      sizeBytes: stats.size,
      matchedErrorPatterns: [],
      isFresh: true
    };

    // Check file freshness if configured
    if (healthCheck.logFreshnessPeriod) {
      const lastModifiedTime = stats.mtime.getTime();
      const currentTime = new Date().getTime();
      const freshnessThreshold = healthCheck.logFreshnessPeriod * 60 * 1000; // Convert minutes to ms
      
      if (currentTime - lastModifiedTime > freshnessThreshold) {
        logDetails.isFresh = false;
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `${result.details} | Log file has not been updated in the last ${healthCheck.logFreshnessPeriod} minutes`,
          logDetails
        };
      }
    }

    // Check for error patterns
    if (healthCheck.logErrorPatterns && healthCheck.logErrorPatterns.length > 0) {
      const matchedPatterns = await this.checkLogForPatterns(
        healthCheck.logFilePath, 
        healthCheck.logErrorPatterns
      );
      
      if (matchedPatterns.length > 0) {
        logDetails.matchedErrorPatterns = matchedPatterns;
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `${result.details} | Error pattern(s) found in log file: ${matchedPatterns.join(', ')}`,
          logDetails
        };
      }
    }

    // Check file size limit
    if (healthCheck.logMaxSizeMB) {
      const maxSizeBytes = healthCheck.logMaxSizeMB * 1024 * 1024;
      if (stats.size > maxSizeBytes) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `${result.details} | Log file size (${Math.round(stats.size / (1024 * 1024))} MB) exceeds maximum (${healthCheck.logMaxSizeMB} MB)`,
          logDetails
        };
      }
    }

    // If we get here, log check passed
    result.logDetails = logDetails;
    result.details = `${result.details} | Log check passed`;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isHealthy: false,
      status: 'Unhealthy',
      details: `${result.details} | Error checking log file: ${errorMessage}`
    };
  }
}

private async checkLogForPatterns(filePath: string, patterns: string[]): Promise<string[]> {
  // For large files, we only want to read the last N lines
  const MAX_LINES_TO_READ = 1000;
  const matchedPatterns: string[] = [];
  
  try {
    // Read last lines of file efficiently
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const lines: string[] = [];
    let lineCount = 0;
    
    for await (const line of rl) {
      lines.push(line);
      lineCount++;
      
      // Keep only the last MAX_LINES_TO_READ lines
      if (lines.length > MAX_LINES_TO_READ) {
        lines.shift();
      }
    }
    
    // Check for patterns in the latest lines
    const combinedContent = lines.join('\n');
    for (const pattern of patterns) {
      if (combinedContent.includes(pattern)) {
        matchedPatterns.push(pattern);
      }
    }
    
    return matchedPatterns;
  } catch (error) {
    logger.error({
      msg: 'Error checking log file for patterns',
      error: error instanceof Error ? error.message : String(error),
      filePath
    });
    return [];
  }
}

private async executeLogHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
  if (!healthCheck.logFilePath) {
    return {
      isHealthy: false,
      status: 'Unhealthy',
      details: 'No log file path provided'
    };
  }

  try {
    // Check file exists
    const fileExists = await existsPromise(healthCheck.logFilePath);
    if (!fileExists) {
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Log file does not exist at path: ${healthCheck.logFilePath}`
      };
    }

    // Get file stats
    const stats = await statPromise(healthCheck.logFilePath);
    const logDetails: LogDetails = {
      lastModified: stats.mtime,
      sizeBytes: stats.size,
      matchedErrorPatterns: [],
      isFresh: true
    };

    // Check file freshness if configured
    if (healthCheck.logFreshnessPeriod) {
      const lastModifiedTime = stats.mtime.getTime();
      const currentTime = new Date().getTime();
      const freshnessThreshold = healthCheck.logFreshnessPeriod * 60 * 1000; // Convert minutes to ms
      
      if (currentTime - lastModifiedTime > freshnessThreshold) {
        logDetails.isFresh = false;
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `Log file has not been updated in the last ${healthCheck.logFreshnessPeriod} minutes`,
          logDetails
        };
      }
    }

    // Check for error patterns
    if (healthCheck.logErrorPatterns && healthCheck.logErrorPatterns.length > 0) {
      const matchedPatterns = await this.checkLogForPatterns(
        healthCheck.logFilePath, 
        healthCheck.logErrorPatterns
      );
      
      if (matchedPatterns.length > 0) {
        logDetails.matchedErrorPatterns = matchedPatterns;
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `Error pattern(s) found in log file: ${matchedPatterns.join(', ')}`,
          logDetails
        };
      }
    }

    // Check file size limit
    if (healthCheck.logMaxSizeMB) {
      const maxSizeBytes = healthCheck.logMaxSizeMB * 1024 * 1024;
      if (stats.size > maxSizeBytes) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `Log file size (${Math.round(stats.size / (1024 * 1024))} MB) exceeds maximum (${healthCheck.logMaxSizeMB} MB)`,
          logDetails
        };
      }
    }

    return {
      isHealthy: true,
      status: 'Healthy',
      details: `Log file check passed`,
      logDetails
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isHealthy: false,
      status: 'Unhealthy',
      details: `Error checking log file: ${errorMessage}`
    };
  }
}
}

export const healthCheckService = new HealthCheckService();