import axios from 'axios';
import logger from '../../utils/logger';
import { HealthCheck } from '../../models/HealthCheck';

interface ApiCheckResult {
  isHealthy: boolean;
  details: string;
  responseTime?: number;
}

export const checkApiHealth = async (
  healthCheck: HealthCheck
): Promise<ApiCheckResult> => {
  const startTime = Date.now();
  
  if (!healthCheck.endpoint) {
    return {
      isHealthy: false,
      details: 'No endpoint URL provided',
    };
  }
  
  try {
    const timeout = healthCheck.timeout || 5000;
    
    const response = await axios.get(healthCheck.endpoint, {
      timeout,
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Resolve only if the status code is less than 300
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      isHealthy: true,
      details: `API Health Check Passed. Status Code: ${response.status}`,
      responseTime,
    };
  } catch (error) {
    logger.error({
      msg: `API Health Check Failed for URL: ${healthCheck.endpoint}`,
      error: error instanceof Error ? error.message : String(error),
      name: healthCheck.name,
    });
    
    return {
      isHealthy: false,
      details: `API Health Check Failed: ${error instanceof Error ? error.message : String(error)}`,
      responseTime: Date.now() - startTime,
    };
  }
};