import { HealthCheckRepository } from '../../interfaces/HealthCheckRepository';
import { HealthCheck } from '../../../models/HealthCheck';
import { HealthCheckResult } from '../../../models/HealthCheckResult';
import logger from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory implementation of the HealthCheckRepository
 * Used as a fallback when the database is not available
 */
export class HealthCheckMemoryRepository implements HealthCheckRepository {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private healthCheckResults: Map<string, HealthCheckResult[]> = new Map();
  private latestResults: Map<string, HealthCheckResult> = new Map();
  
  // Cache invalidation flag
  private dirtyCache: boolean = false;

  constructor() {
    logger.info('Initializing in-memory health check repository');
  }

  // Initialize with existing data (if available)
  public initialize(healthChecks: HealthCheck[], results: HealthCheckResult[]): void {
    // Store health checks by ID
    healthChecks.forEach(check => {
      this.healthChecks.set(check.id, { ...check });
    });

    // Group results by health check ID
    results.forEach(result => {
      const results = this.healthCheckResults.get(result.healthCheckId) || [];
      results.push({ ...result });
      this.healthCheckResults.set(result.healthCheckId, results);
      
      // Update latest result
      const existing = this.latestResults.get(result.healthCheckId);
      if (!existing || new Date(result.createdAt) > new Date(existing.createdAt)) {
        this.latestResults.set(result.healthCheckId, { ...result });
      }
    });

    logger.info(`In-memory repository initialized with ${this.healthChecks.size} checks and ${results.length} results`);
  }

  // Mark that the database needs to be updated when it becomes available
  private markDirty(): void {
    this.dirtyCache = true;
  }

  // Check if cache needs to be synced with database
  public isDirty(): boolean {
    return this.dirtyCache;
  }

  // Reset dirty flag after syncing
  public resetDirtyFlag(): void {
    this.dirtyCache = false;
  }

  // Health Check operations
  async findAll(filter: any = {}): Promise<HealthCheck[]> {
    try {
      // Convert Map to array
      let checks = Array.from(this.healthChecks.values());
      
      // Apply filters
      if (filter) {
        if (filter.type) {
          checks = checks.filter(check => check.type === filter.type);
        }
        if (filter.enabled !== undefined) {
          checks = checks.filter(check => check.enabled === filter.enabled);
        }
      }
      
      return checks;
    } catch (error) {
      logger.error({
        msg: 'Error in memory findAll health checks',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async findById(id: string): Promise<HealthCheck | null> {
    try {
      const check = this.healthChecks.get(id);
      return check ? { ...check } : null;
    } catch (error) {
      logger.error({
        msg: 'Error in memory findById health check',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      return null;
    }
  }

  async create(data: Omit<HealthCheck, 'id'>): Promise<HealthCheck> {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const healthCheck: HealthCheck = {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
        notifyOnFailure: data.notifyOnFailure !== undefined ? data.notifyOnFailure : true
      };
      
      this.healthChecks.set(id, healthCheck);
      this.markDirty();
      
      return { ...healthCheck };
    } catch (error) {
      logger.error({
        msg: 'Error in memory create health check',
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }

  async update(id: string, data: Partial<HealthCheck>): Promise<HealthCheck> {
    try {
      const check = this.healthChecks.get(id);
      
      if (!check) {
        throw new Error(`Health check with ID ${id} not found`);
      }
      
      const updatedCheck: HealthCheck = {
        ...check,
        ...data,
        updatedAt: new Date()
      };
      
      this.healthChecks.set(id, updatedCheck);
      this.markDirty();
      
      return { ...updatedCheck };
    } catch (error) {
      logger.error({
        msg: 'Error in memory update health check',
        error: error instanceof Error ? error.message : String(error),
        id,
        data
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = this.healthChecks.delete(id);
      
      if (result) {
        // Clean up related results
        this.healthCheckResults.delete(id);
        this.latestResults.delete(id);
        this.markDirty();
      }
      
      return result;
    } catch (error) {
      logger.error({
        msg: 'Error in memory delete health check',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      return false;
    }
  }

  // Health Check Result operations
  async saveResult(result: Omit<HealthCheckResult, 'id'>): Promise<HealthCheckResult> {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const healthCheckResult: HealthCheckResult = {
        id,
        ...result,
        createdAt: result.createdAt || now
      };
      
      // Save to historical results
      const results = this.healthCheckResults.get(result.healthCheckId) || [];
      results.push(healthCheckResult);
      
      // Limit to last 100 results per health check to prevent memory issues
      if (results.length > 100) {
        results.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        results.splice(100);
      }
      
      this.healthCheckResults.set(result.healthCheckId, results);
      
      // Update latest result
      this.latestResults.set(result.healthCheckId, healthCheckResult);
      
      this.markDirty();
      
      return { ...healthCheckResult };
    } catch (error) {
      logger.error({
        msg: 'Error in memory save health check result',
        error: error instanceof Error ? error.message : String(error),
        result
      });
      throw error;
    }
  }

  async getLatestResults(): Promise<HealthCheckResult[]> {
    try {
      // Add health check info to latest results
      return Array.from(this.latestResults.values()).map(result => {
        const healthCheck = this.healthChecks.get(result.healthCheckId);
        return {
          ...result,
          healthCheck: healthCheck ? {
            name: healthCheck.name,
            type: healthCheck.type
          } : undefined
        };
      });
    } catch (error) {
      logger.error({
        msg: 'Error in memory get latest results',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async getResultsByCheckId(checkId: string, page: number = 1, limit: number = 20): Promise<{
    results: HealthCheckResult[];
    total: number;
  }> {
    try {
      const allResults = this.healthCheckResults.get(checkId) || [];
      
      // Sort by createdAt (newest first)
      const sortedResults = [...allResults].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedResults = sortedResults.slice(start, end);
      
      return {
        results: paginatedResults,
        total: allResults.length
      };
    } catch (error) {
      logger.error({
        msg: 'Error in memory get results by check ID',
        error: error instanceof Error ? error.message : String(error),
        checkId
      });
      return {
        results: [],
        total: 0
      };
    }
  }

  // Get all health checks and results for synchronization
  getAllData(): { 
    healthChecks: HealthCheck[]; 
    results: HealthCheckResult[];
  } {
    return {
      healthChecks: Array.from(this.healthChecks.values()),
      results: Array.from(this.latestResults.values())
    };
  }
}