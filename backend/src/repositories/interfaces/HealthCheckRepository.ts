import { HealthCheck } from '../../models/HealthCheck';
import { HealthCheckResult } from '../../models/HealthCheckResult';

export interface HealthCheckRepository {
  // Health Check operations
  findAll(filter?: any): Promise<HealthCheck[]>;
  findById(id: string): Promise<HealthCheck | null>;
  create(data: Omit<HealthCheck, 'id'>): Promise<HealthCheck>;
  update(id: string, data: Partial<HealthCheck>): Promise<HealthCheck>;
  delete(id: string): Promise<boolean>;
  
  // Health Check Result operations
  saveResult(result: Omit<HealthCheckResult, 'id'>): Promise<HealthCheckResult>;
  getLatestResults(): Promise<HealthCheckResult[]>;
  getResultsByCheckId(checkId: string, page?: number, limit?: number): Promise<{
    results: HealthCheckResult[];
    total: number;
  }>;
}