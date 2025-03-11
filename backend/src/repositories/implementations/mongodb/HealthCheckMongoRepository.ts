import { MongoClient, Collection, ObjectId } from 'mongodb';
import { HealthCheckRepository } from '../../interfaces/HealthCheckRepository';
import { HealthCheck } from '../../../models/HealthCheck';
import { HealthCheckResult } from '../../../models/HealthCheckResult';
import logger from '../../../utils/logger';

export class HealthCheckMongoRepository implements HealthCheckRepository {
  private client: MongoClient;
  private healthChecksCollection: Collection;
  private healthCheckResultsCollection: Collection;
  
  constructor(client: MongoClient) {
    this.client = client;
    this.healthChecksCollection = client.db().collection('healthChecks');
    this.healthCheckResultsCollection = client.db().collection('healthCheckResults');
  }
  
  // Convert MongoDB document to HealthCheck model
  private toHealthCheck(doc: any): HealthCheck {
    return {
      id: doc._id.toString(),
      name: doc.name,
      type: doc.type,
      enabled: doc.enabled,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      checkInterval: doc.checkInterval,
      endpoint: doc.endpoint,
      timeout: doc.timeout,
      processKeyword: doc.processKeyword,
      port: doc.port,
      customCommand: doc.customCommand,
      expectedOutput: doc.expectedOutput,
      restartCommand: doc.restartCommand,
      notifyOnFailure: doc.notifyOnFailure || true
    };
  }
  
  // Convert MongoDB document to HealthCheckResult model
  private toHealthCheckResult(doc: any): HealthCheckResult {
    return {
      id: doc._id.toString(),
      healthCheckId: doc.healthCheckId,
      status: doc.status,
      details: doc.details,
      memoryUsage: doc.memoryUsage,
      cpuUsage: doc.cpuUsage,
      responseTime: doc.responseTime,
      createdAt: doc.createdAt,
      healthCheck: doc.healthCheck
    };
  }
  
  // Health Check operations
  async findAll(filter: any = {}): Promise<HealthCheck[]> {
    try {
      const docs = await this.healthChecksCollection.find(filter).toArray();
      return docs.map(doc => this.toHealthCheck(doc));
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB findAll health checks',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  async findById(id: string): Promise<HealthCheck | null> {
    try {
      const doc = await this.healthChecksCollection.findOne({ _id: new ObjectId(id) });
      return doc ? this.toHealthCheck(doc) : null;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB findById health check',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
  
  async create(data: Omit<HealthCheck, 'id'>): Promise<HealthCheck> {
    try {
      const now = new Date();
      const insertResult = await this.healthChecksCollection.insertOne({
        ...data,
        createdAt: now,
        updatedAt: now
      });
      
      return {
        id: insertResult.insertedId.toString(),
        ...data,
        createdAt: now,
        updatedAt: now
      } as HealthCheck;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB create health check',
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }
  
  async update(id: string, data: Partial<HealthCheck>): Promise<HealthCheck> {
    try {
      const now = new Date();
      const updateData = {
        ...data,
        updatedAt: now
      };
      
      await this.healthChecksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error(`Health check with ID ${id} not found after update`);
      }
      
      return updated;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB update health check',
        error: error instanceof Error ? error.message : String(error),
        id,
        data
      });
      throw error;
    }
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.healthChecksCollection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB delete health check',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
  
  // Health Check Result operations
  async saveResult(result: Omit<HealthCheckResult, 'id'>): Promise<HealthCheckResult> {
    try {
      const insertResult = await this.healthCheckResultsCollection.insertOne({
        ...result,
        createdAt: new Date()
      });
      
      return {
        id: insertResult.insertedId.toString(),
        ...result,
        createdAt: result.createdAt || new Date()
      } as HealthCheckResult;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB save health check result',
        error: error instanceof Error ? error.message : String(error),
        result
      });
      throw error;
    }
  }
  
  async getLatestResults(): Promise<HealthCheckResult[]> {
    try {
      // Pipeline to get the latest result for each health check
      const pipeline = [
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
            from: "healthChecks",
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
            "healthCheck.type": 1
          }
        }
      ];
      
      const results = await this.healthCheckResultsCollection.aggregate(pipeline).toArray();
      
      return results.map(doc => ({
        id: doc._id.toString(),
        healthCheckId: doc.healthCheckId,
        status: doc.status,
        details: doc.details,
        memoryUsage: doc.memoryUsage,
        cpuUsage: doc.cpuUsage,
        responseTime: doc.responseTime,
        createdAt: doc.createdAt,
        healthCheck: doc.healthCheck ? {
          name: doc.healthCheck.name,
          type: doc.healthCheck.type
        } : undefined
      }));
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB get latest results',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  async getResultsByCheckId(checkId: string, page: number = 1, limit: number = 20): Promise<{
    results: HealthCheckResult[];
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      
      const [results, total] = await Promise.all([
        this.healthCheckResultsCollection
          .find({ healthCheckId: checkId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.healthCheckResultsCollection.countDocuments({ healthCheckId: checkId })
      ]);
      
      return {
        results: results.map(doc => this.toHealthCheckResult(doc)),
        total
      };
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB get results by check ID',
        error: error instanceof Error ? error.message : String(error),
        checkId
      });
      throw error;
    }
  }
}