import { HealthCheck, IHealthCheck, HealthCheckType } from '../models/HealthCheck';
import { Result, IResult, ResultStatus } from '../models/Result';
import mongoose from 'mongoose';
import logger from '../utils/logger';

// Filter interface for health checks
export interface HealthCheckFilter {
  type?: HealthCheckType;
  enabled?: boolean;
}

// Repository for health check operations
export class HealthCheckRepository {
  /**
   * Find all health checks with optional filtering
   */
  async findAll(filter: HealthCheckFilter = {}): Promise<IHealthCheck[]> {
    try {
      return await HealthCheck.find(filter).sort({ name: 1 });
    } catch (error) {
      logger.error({
        msg: 'Error finding health checks',
        error: error instanceof Error ? error.message : String(error),
        filter
      });
      throw error;
    }
  }
  
  /**
   * Find a health check by ID
   */
  async findById(id: string): Promise<IHealthCheck | null> {
    try {
      return await HealthCheck.findById(id);
    } catch (error) {
      logger.error({
        msg: 'Error finding health check by ID',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
  
  /**
   * Create a new health check
   */
  async create(data: Partial<IHealthCheck>): Promise<IHealthCheck> {
    try {
      return await HealthCheck.create(data);
    } catch (error) {
      logger.error({
        msg: 'Error creating health check',
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }
  
  /**
   * Update a health check
   */
  async update(id: string, data: Partial<IHealthCheck>): Promise<IHealthCheck | null> {
    try {
      return await HealthCheck.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
    } catch (error) {
      logger.error({
        msg: 'Error updating health check',
        error: error instanceof Error ? error.message : String(error),
        id,
        data
      });
      throw error;
    }
  }
  
  /**
   * Delete a health check
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await HealthCheck.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error({
        msg: 'Error deleting health check',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
  
  /**
   * Toggle health check enabled status
   */
  async toggle(id: string): Promise<IHealthCheck | null> {
    try {
      const healthCheck = await HealthCheck.findById(id);
      
      if (!healthCheck) {
        return null;
      }
      
      healthCheck.enabled = !healthCheck.enabled;
      await healthCheck.save();
      
      return healthCheck;
    } catch (error) {
      logger.error({
        msg: 'Error toggling health check',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
  
  /**
   * Save a health check result
   */
  async saveResult(data: {
    healthCheckId: string;
    status: ResultStatus;
    details?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    responseTime?: number;
  }): Promise<IResult> {
    try {
      const result = new Result({
        healthCheckId: new mongoose.Types.ObjectId(data.healthCheckId),
        status: data.status,
        details: data.details,
        memoryUsage: data.memoryUsage,
        cpuUsage: data.cpuUsage,
        responseTime: data.responseTime
      });
      
      return await result.save();
    } catch (error) {
      logger.error({
        msg: 'Error saving health check result',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: data.healthCheckId
      });
      throw error;
    }
  }
  
  /**
   * Get latest results for all health checks
   */
  async getLatestResults(): Promise<any[]> {
    try {
      const results = await Result.aggregate([
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: "$healthCheckId",
            latestResult: { $first: "$$ROOT" }
          }
        },
        {
          $replaceRoot: { newRoot: "$latestResult" }
        },
        {
          $lookup: {
            from: "healthchecks",
            localField: "healthCheckId",
            foreignField: "_id",
            as: "healthCheck"
          }
        },
        {
          $unwind: {
            path: "$healthCheck",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            healthCheckId: 1,
            status: 1,
            details: 1,
            memoryUsage: 1,
            cpuUsage: 1,
            responseTime: 1,
            createdAt: 1,
            "healthCheck.name": 1,
            "healthCheck.type": 1,
            "healthCheck.enabled": 1
          }
        }
      ]);
      
      return results.map(result => ({
        id: result._id.toString(),
        healthCheckId: result.healthCheckId.toString(),
        status: result.status,
        details: result.details,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        responseTime: result.responseTime,
        createdAt: result.createdAt,
        healthCheck: result.healthCheck ? {
          name: result.healthCheck.name,
          type: result.healthCheck.type,
          enabled: result.healthCheck.enabled
        } : null
      }));
    } catch (error) {
      logger.error({
        msg: 'Error getting latest results',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get results for a specific health check with pagination
   */
  async getResultsByHealthCheckId(
    healthCheckId: string,
    page = 1,
    limit = 20
  ): Promise<{ results: IResult[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [results, total] = await Promise.all([
        Result.find({ healthCheckId: new mongoose.Types.ObjectId(healthCheckId) })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Result.countDocuments({ healthCheckId: new mongoose.Types.ObjectId(healthCheckId) })
      ]);
      
      return { results, total };
    } catch (error) {
      logger.error({
        msg: 'Error getting results by health check ID',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId,
        page,
        limit
      });
      throw error;
    }
  }
  
  /**
   * Get health check metrics
   */
async getMetrics(): Promise<{
  total: number;
  enabled: number;
  unhealthy: number;
  byType: Record<HealthCheckType, number>;
}> {
  try {
    const [total, enabled, latestResults] = await Promise.all([
      HealthCheck.countDocuments(),
      HealthCheck.countDocuments({ enabled: true }),
      this.getLatestResults()
    ]);
    
    const unhealthy = latestResults.filter(r => r.status === 'Unhealthy').length;
    
    // Update this to include the LOG type
    const byType: Record<HealthCheckType, number> = {
      API: 0,
      PROCESS: 0,
      SERVICE: 0,
      SERVER: 0,
      LOG: 0 // Add this line
    };
    
    const typeCountsArray = await HealthCheck.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);
    
    typeCountsArray.forEach(item => {
      if (item._id in byType) {
        byType[item._id as HealthCheckType] = item.count;
      }
    });
    
    return {
      total,
      enabled,
      unhealthy,
      byType
    };
  } catch (error) {
    logger.error({
      msg: 'Error getting health check metrics',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

  async findResultById(id: string): Promise<IResult | null> {
    try {
      return await Result.findById(id);
    } catch (error) {
      logger.error({
        msg: 'Error finding result by ID',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
}

// Export singleton instance
export const healthCheckRepository = new HealthCheckRepository();