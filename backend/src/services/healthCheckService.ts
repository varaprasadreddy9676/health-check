import axios from 'axios';
import { exec } from 'child_process';
import os from 'os';
import util from 'util';
import { IHealthCheck } from '../models/HealthCheck';
import { ResultStatus } from '../models/Result';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import { notificationService } from './notificationService';
import logger from '../utils/logger';

// Convert exec to Promise
const execPromise = util.promisify(exec);

// Health check result interface
export interface HealthCheckResult {
  isHealthy: boolean;
  status: ResultStatus;
  details: string;
  memoryUsage?: number;
  cpuUsage?: number;
  responseTime?: number;
}

// Health check service
export class HealthCheckService {
  /**
   * Execute a health check based on its type
   */
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
        default:
          result = {
            isHealthy: false,
            status: 'Unhealthy',
            details: `Unknown health check type: ${healthCheck.type}`
          };
      }
      
      // Save result to database
      await healthCheckRepository.saveResult({
        healthCheckId: healthCheck.id,
        status: result.status,
        details: result.details,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        responseTime: result.responseTime
      });
      
      // Handle unhealthy result
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
      
      // Save error result
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
      
      // Handle unhealthy result
      if (healthCheck.notifyOnFailure) {
        await this.handleUnhealthyResult(healthCheck, errorResult);
      }
      
      return errorResult;
    }
  }
  
  /**
   * Execute API health check
   */
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
    } catch (error: any) { // Using any for specific axios error handling
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
  
  /**
   * Execute process health check
   */
  private async executeProcessHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      if (healthCheck.port) {
        try {
          await execPromise(`nc -z localhost ${healthCheck.port}`);
          return {
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
      }
      
      if (!healthCheck.processKeyword) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: 'No process keyword provided'
        };
      }
      
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
      
      // Extract process info from the first matching line
      const [pid, cpu, memory, ...commandArray] = lines[0].split(/\s+/);
      const command = commandArray.join(' ');
      
      return {
        isHealthy: true,
        status: 'Healthy',
        details: `PID: ${pid}, Command: ${command}`,
        cpuUsage: parseFloat(cpu),
        memoryUsage: parseFloat(memory)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error checking process: ${errorMessage}`
      };
    }
  }
  
  /**
   * Execute service health check
   */
  private async executeServiceHealthCheck(healthCheck: IHealthCheck): Promise<HealthCheckResult> {
    try {
      if (!healthCheck.customCommand) {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: 'No custom command provided'
        };
      }
      
      const { stdout } = await execPromise(healthCheck.customCommand);
      const response = stdout.trim();
      
      if (healthCheck.expectedOutput && response.includes(healthCheck.expectedOutput)) {
        return {
          isHealthy: true,
          status: 'Healthy',
          details: `Command executed successfully. Response matches expected output.`
        };
      } else if (!healthCheck.expectedOutput) {
        // If no expected output is provided, just check if command executes without error
        return {
          isHealthy: true,
          status: 'Healthy',
          details: `Command executed successfully. Response: ${response}`
        };
      } else {
        return {
          isHealthy: false,
          status: 'Unhealthy',
          details: `Expected output not found. Response: ${response}`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isHealthy: false,
        status: 'Unhealthy',
        details: `Error executing command: ${errorMessage}`
      };
    }
  }
  
  /**
   * Execute server health check
   */
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
  
  /**
   * Handle unhealthy result
   */
  private async handleUnhealthyResult(healthCheck: IHealthCheck, result: HealthCheckResult): Promise<void> {
    try {
      // Notify about the issue
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
  
  /**
   * Force a health check to run immediately
   */
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
  
  /**
   * Restart a service
   */
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
      
      // Execute restart command
      const { stdout, stderr } = await execPromise(healthCheck.restartCommand);
      
      logger.info({
        msg: `Service restart executed`,
        id: healthCheck.id,
        name: healthCheck.name,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
      
      // Re-run health check after restart
      setTimeout(async () => {
        await this.executeHealthCheck(healthCheck);
      }, 5000);
      
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
  
  /**
   * Run all enabled health checks
   */
  async runAllHealthChecks(): Promise<void> {
    try {
      const healthChecks = await healthCheckRepository.findAll({ enabled: true });
      
      logger.info({ msg: `Running ${healthChecks.length} health checks` });
      
      // Run health checks in parallel with a concurrency limit
      const concurrencyLimit = 5;
      const chunks = [];
      
      for (let i = 0; i < healthChecks.length; i += concurrencyLimit) {
        chunks.push(healthChecks.slice(i, i + concurrencyLimit));
      }
      
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(healthCheck => this.executeHealthCheck(healthCheck))
        );
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
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();