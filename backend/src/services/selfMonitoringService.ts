import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import logger from '../utils/logger';
import { isDatabaseAvailable } from '../repositories/factory';
import { localFileStorage } from '../utils/localFileStorage';

// Convert exec to Promise
const execPromise = util.promisify(exec);

interface SystemStatus {
  uptime: number;
  timestamp: string;
  databaseConnected: boolean;
  services: {
    name: string;
    status: 'ok' | 'degraded' | 'failing';
    details?: string;
  }[];
  system: {
    cpuUsage: number;
    memoryTotal: number;
    memoryFree: number;
    loadAverage: number[];
    freeSpace?: number;
  };
  schedulerStatus: {
    activeJobs: number;
    lastRunTimestamp?: string;
  };
  statusHistory: {
    timestamp: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: string;
  }[];
}

/**
 * Self-monitoring service for the health check application
 * Monitors the health of the application itself and its components
 */
class SelfMonitoringService {
  private static readonly MAX_HISTORY_LENGTH = 100;
  private systemStatus: SystemStatus;
  private statusHistoryFile = 'self_monitoring_history';
  private lastStatusCheck: number = 0;
  private readonly STATUS_CHECK_INTERVAL = 60000; // 1 minute
  
  constructor() {
    // Initialize system status
    this.systemStatus = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      databaseConnected: false,
      services: [
        {
          name: 'Health Check Service',
          status: 'ok'
        }
      ],
      system: {
        cpuUsage: 0,
        memoryTotal: os.totalmem(),
        memoryFree: os.freemem(),
        loadAverage: os.loadavg()
      },
      schedulerStatus: {
        activeJobs: 0
      },
      statusHistory: []
    };
    
    // Load status history from disk
    this.loadStatusHistory();
  }

  /**
   * Start the self-monitoring service
   */
  public async start(): Promise<void> {
    logger.info('Starting self-monitoring service');
    
    // Perform initial status check
    await this.checkStatus();
    
    // Schedule regular status checks
    setInterval(async () => {
      await this.checkStatus();
    }, this.STATUS_CHECK_INTERVAL);
  }

  /**
   * Check the status of the application and its components
   */
  private async checkStatus(): Promise<void> {
    try {
      const now = Date.now();
      
      // Skip if not enough time has passed
      if (now - this.lastStatusCheck < this.STATUS_CHECK_INTERVAL) {
        return;
      }
      
      this.lastStatusCheck = now;
      
      // Update timestamp
      this.systemStatus.timestamp = new Date().toISOString();
      
      // Update uptime
      this.systemStatus.uptime = process.uptime();
      
      // Check database connection
      this.systemStatus.databaseConnected = isDatabaseAvailable();
      
      // Update system info
      this.systemStatus.system = {
        cpuUsage: await this.getCpuUsage(),
        memoryTotal: os.totalmem(),
        memoryFree: os.freemem(),
        loadAverage: os.loadavg(),
        freeSpace: await this.getDiskFreeSpace()
      };
      
      // Check services
      await this.checkServices();
      
      // Update scheduler status (this would need to access the scheduler)
      // this.systemStatus.schedulerStatus.activeJobs = healthCheckScheduler.getActiveJobCount();
      
      // Determine overall status
      const overallStatus = this.determineOverallStatus();
      
      // Add to history
      this.addStatusToHistory(overallStatus);
      
      // Save status history to disk
      await this.saveStatusHistory();
      
      logger.debug({
        msg: 'Self-monitoring status updated',
        status: overallStatus.status
      });
    } catch (error) {
      logger.error({
        msg: 'Error checking self-monitoring status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCpuUsage(): Promise<number> {
    try {
      // Use the 'ps' command to get CPU usage of current process
      const { stdout } = await execPromise(`ps -p ${process.pid} -o %cpu`);
      const lines = stdout.trim().split('\n');
      
      // Parse CPU usage from output (second line)
      if (lines.length >= 2) {
        const cpuUsage = parseFloat(lines[1]);
        return isNaN(cpuUsage) ? 0 : cpuUsage;
      }
      
      return 0;
    } catch (error) {
      logger.error({
        msg: 'Error getting CPU usage',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Get free disk space
   */
  private async getDiskFreeSpace(): Promise<number | undefined> {
    try {
      // Use the 'df' command to get disk space info for current directory
      const { stdout } = await execPromise('df -k . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      // Parse free space from output (4th column)
      if (parts.length >= 4) {
        const freeSpace = parseInt(parts[3], 10) * 1024; // Convert KB to bytes
        return isNaN(freeSpace) ? undefined : freeSpace;
      }
      
      return undefined;
    } catch (error) {
      logger.error({
        msg: 'Error getting disk free space',
        error: error instanceof Error ? error.message : String(error)
      });
      return undefined;
    }
  }

  /**
   * Check the status of services
   */
  private async checkServices(): Promise<void> {
    // Health Check Service status
    const healthCheckService = this.systemStatus.services.find(s => s.name === 'Health Check Service');
    if (healthCheckService) {
      // Check if database is connected
      if (!this.systemStatus.databaseConnected) {
        healthCheckService.status = 'degraded';
        healthCheckService.details = 'Database connection is down, using fallback storage';
      } else {
        healthCheckService.status = 'ok';
        healthCheckService.details = undefined;
      }
    }
  }

  /**
   * Determine overall status based on components
   */
  private determineOverallStatus(): { status: 'healthy' | 'degraded' | 'unhealthy', details?: string } {
    // Check for failing services
    const failingServices = this.systemStatus.services.filter(s => s.status === 'failing');
    if (failingServices.length > 0) {
      return {
        status: 'unhealthy',
        details: `${failingServices.length} services are failing`
      };
    }
    
    // Check for degraded services
    const degradedServices = this.systemStatus.services.filter(s => s.status === 'degraded');
    if (degradedServices.length > 0) {
      return {
        status: 'degraded',
        details: `${degradedServices.length} services are degraded`
      };
    }
    
    // Check database connection
    if (!this.systemStatus.databaseConnected) {
      return {
        status: 'degraded',
        details: 'Database connection is down, using fallback storage'
      };
    }
    
    // Check memory usage (if less than 10% free)
    const memoryPercentFree = (this.systemStatus.system.memoryFree / this.systemStatus.system.memoryTotal) * 100;
    if (memoryPercentFree < 10) {
      return {
        status: 'degraded',
        details: `Low memory: ${memoryPercentFree.toFixed(1)}% free`
      };
    }
    
    // Check disk space (if less than 10% free and we have disk info)
    if (this.systemStatus.system.freeSpace !== undefined && this.getDiskTotalSpace()) {
      const diskPercentFree = (this.systemStatus.system.freeSpace / this.getDiskTotalSpace()!) * 100;
      if (diskPercentFree < 10) {
        return {
          status: 'degraded',
          details: `Low disk space: ${diskPercentFree.toFixed(1)}% free`
        };
      }
    }
    
    // Everything is healthy
    return { status: 'healthy' };
  }

  /**
   * Get total disk space (estimate based on free space and df output)
   */
  private getDiskTotalSpace(): number | undefined {
    try {
      // This is just an estimate and would need to be replaced with actual df parsing
      if (this.systemStatus.system.freeSpace === undefined) {
        return undefined;
      }
      
      // Assume we're using about 70% of disk space (very rough estimate)
      return this.systemStatus.system.freeSpace / 0.3;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Add current status to history
   */
  private addStatusToHistory(status: { status: 'healthy' | 'degraded' | 'unhealthy', details?: string }): void {
    this.systemStatus.statusHistory.push({
      timestamp: new Date().toISOString(),
      status: status.status,
      details: status.details
    });
    
    // Trim history to max length
    if (this.systemStatus.statusHistory.length > SelfMonitoringService.MAX_HISTORY_LENGTH) {
      this.systemStatus.statusHistory = this.systemStatus.statusHistory.slice(
        this.systemStatus.statusHistory.length - SelfMonitoringService.MAX_HISTORY_LENGTH
      );
    }
  }

  /**
   * Save status history to disk
   */
  private async saveStatusHistory(): Promise<void> {
    await localFileStorage.save(this.statusHistoryFile, this.systemStatus.statusHistory);
  }

  /**
   * Load status history from disk
   */
  private async loadStatusHistory(): Promise<void> {
    const history = await localFileStorage.load<{ timestamp: string; status: 'healthy' | 'degraded' | 'unhealthy'; details?: string }[]>(
      this.statusHistoryFile
    );
    
    if (history) {
      this.systemStatus.statusHistory = history;
    }
  }

  /**
   * Get current system status
   */
  public getStatus(): SystemStatus {
    return { ...this.systemStatus };
  }
}

// Create singleton
export const selfMonitoringService = new SelfMonitoringService();