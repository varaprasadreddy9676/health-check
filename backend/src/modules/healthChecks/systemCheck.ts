import os from 'os';
import logger from '../../utils/logger';

interface SystemCheckResult {
  cpuUsage: number;
  freeMemoryPercentage: number;
  totalMemory: number;
  freeMemory: number;
  isHealthy: boolean;
  details: string;
}

export const checkSystemHealth = async (): Promise<SystemCheckResult> => {
  try {
    // Get CPU load average (1 minute)
    const cpuUsage = os.loadavg()[0];
    
    // Get memory information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const freeMemoryPercentage = (freeMemory / totalMemory) * 100;
    
    // Define thresholds for health
    const cpuThreshold = 0.8; // 80% load
    const memoryThreshold = 20; // 20% free memory
    
    // Determine if the system is healthy
    const isHighCpu = cpuUsage > cpuThreshold;
    const isLowMemory = freeMemoryPercentage < memoryThreshold;
    const isHealthy = !isHighCpu && !isLowMemory;
    
    // Create details message
    let details = `CPU load: ${cpuUsage.toFixed(2)}, Free memory: ${freeMemoryPercentage.toFixed(2)}%`;
    if (isHighCpu) {
      details += ', High CPU usage detected';
    }
    if (isLowMemory) {
      details += ', Low memory detected';
    }
    
    logger.debug({
      msg: 'System health check',
      cpuUsage,
      freeMemoryPercentage,
      isHealthy,
    });
    
    return {
      cpuUsage,
      freeMemoryPercentage,
      totalMemory,
      freeMemory,
      isHealthy,
      details,
    };
  } catch (error) {
    logger.error({
      msg: 'Error checking system health',
      error: error instanceof Error ? error.message : String(error),
    });
    
    return {
      cpuUsage: -1,
      freeMemoryPercentage: -1,
      totalMemory: -1,
      freeMemory: -1,
      isHealthy: false,
      details: `Error checking system health: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};