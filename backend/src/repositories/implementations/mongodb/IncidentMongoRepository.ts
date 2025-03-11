import { MongoClient, Collection, ObjectId } from 'mongodb';
import { IncidentRepository } from '../../interfaces/IncidentRepository';
import { Incident } from '../../../models/Incident';
import { IncidentEvent } from '../../../models/IncidentEvent';
import logger from '../../../utils/logger';

export class IncidentMongoRepository implements IncidentRepository {
  private client: MongoClient;
  private incidentsCollection: Collection;
  private eventsCollection: Collection;
  private healthChecksCollection: Collection;
  
  constructor(client: MongoClient) {
    this.client = client;
    this.incidentsCollection = client.db().collection('incidents');
    this.eventsCollection = client.db().collection('incidentEvents');
    this.healthChecksCollection = client.db().collection('healthChecks');
  }
  
  // Convert MongoDB document to Incident model
  private toIncident(doc: any): Incident {
    return {
      id: doc._id.toString(),
      healthCheckId: doc.healthCheckId,
      title: doc.title,
      status: doc.status,
      severity: doc.severity,
      details: doc.details,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      resolvedAt: doc.resolvedAt,
      healthCheck: doc.healthCheck,
      events: doc.events?.map(this.toIncidentEvent)
    };
  }
  
  // Convert MongoDB document to IncidentEvent model
  private toIncidentEvent(doc: any): IncidentEvent {
    return {
      id: doc._id.toString(),
      incidentId: doc.incidentId,
      message: doc.message,
      createdAt: doc.createdAt,
      incident: doc.incident
    };
  }
  
  // Find all incidents with pagination
  async findAll(page: number = 1, limit: number = 10, status?: string): Promise<{
    incidents: Incident[];
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const filter: any = {};
      
      if (status) {
        filter.status = status;
      }
      
      const [incidents, total] = await Promise.all([
        this.incidentsCollection
          .aggregate([
            { $match: filter },
            {
              $lookup: {
                from: 'healthChecks',
                localField: 'healthCheckId',
                foreignField: '_id',
                as: 'healthCheckData'
              }
            },
            { $unwind: { path: '$healthCheckData', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                healthCheckId: 1,
                title: 1,
                status: 1,
                severity: 1,
                details: 1,
                createdAt: 1,
                updatedAt: 1,
                resolvedAt: 1,
                healthCheck: {
                  name: '$healthCheckData.name',
                  type: '$healthCheckData.type'
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ])
          .toArray(),
        this.incidentsCollection.countDocuments(filter)
      ]);
      
      return {
        incidents: incidents.map(doc => this.toIncident(doc)),
        total
      };
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB findAll incidents',
        error: error instanceof Error ? error.message : String(error),
        page,
        limit,
        status
      });
      throw error;
    }
  }
  
  // Find active incidents
  async findActive(): Promise<Incident[]> {
    try {
      const activeDocs = await this.incidentsCollection
        .aggregate([
          {
            $match: {
              status: { $in: ['investigating', 'identified', 'monitoring'] }
            }
          },
          {
            $lookup: {
              from: 'healthChecks',
              localField: 'healthCheckId',
              foreignField: '_id',
              as: 'healthCheckData'
            }
          },
          { $unwind: { path: '$healthCheckData', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              healthCheckId: 1,
              title: 1,
              status: 1,
              severity: 1,
              details: 1,
              createdAt: 1,
              updatedAt: 1,
              resolvedAt: 1,
              healthCheck: {
                name: '$healthCheckData.name',
                type: '$healthCheckData.type'
              }
            }
          },
          { $sort: { createdAt: -1 } }
        ])
        .toArray();
      
      return activeDocs.map(doc => this.toIncident(doc));
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB findActive incidents',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  // Find incident by ID
  async findById(id: string): Promise<Incident | null> {
    try {
      const doc = await this.incidentsCollection.findOne({ _id: new ObjectId(id) });
      
      if (!doc) {
        return null;
      }
      
      // Get the health check data
      const healthCheck = await this.healthChecksCollection.findOne(
        { _id: new ObjectId(doc.healthCheckId) },
        { projection: { name: 1, type: 1 } }
      );
      
      const result = this.toIncident({
        ...doc,
        healthCheck: healthCheck ? { name: healthCheck.name, type: healthCheck.type } : undefined
      });
      
      return result;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB findById incident',
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
  
  // Create new incident
  async create(incident: Omit<Incident, 'id'>): Promise<Incident> {
    try {
      const now = new Date();
      
      // Convert string ID to ObjectId for MongoDB
      let healthCheckId: any = incident.healthCheckId;
      try {
        healthCheckId = new ObjectId(incident.healthCheckId);
      } catch (error) {
        // If conversion fails, keep the original ID (it might already be an ObjectId)
        logger.warn({
          msg: 'Could not convert healthCheckId to ObjectId, using as-is',
          healthCheckId: incident.healthCheckId
        });
      }
      
      const insertResult = await this.incidentsCollection.insertOne({
        healthCheckId,
        title: incident.title,
        status: incident.status,
        severity: incident.severity,
        details: incident.details,
        createdAt: now,
        updatedAt: now,
        resolvedAt: incident.resolvedAt
      });
      
      return {
        id: insertResult.insertedId.toString(),
        ...incident,
        createdAt: now,
        updatedAt: now
      } as Incident;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB create incident',
        error: error instanceof Error ? error.message : String(error),
        incident
      });
      throw error;
    }
  }
  
  // Update incident
  async update(id: string, data: Partial<Incident>): Promise<Incident> {
    try {
      const now = new Date();
      const updateData = {
        ...data,
        updatedAt: now
      };
      
      await this.incidentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error(`Incident with ID ${id} not found after update`);
      }
      
      return updated;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB update incident',
        error: error instanceof Error ? error.message : String(error),
        id,
        data
      });
      throw error;
    }
  }
  
  // Get incident events
  async getEvents(incidentId: string): Promise<IncidentEvent[]> {
    try {
      const events = await this.eventsCollection
        .find({ incidentId: new ObjectId(incidentId) })
        .sort({ createdAt: -1 })
        .toArray();
      
      return events.map(doc => this.toIncidentEvent(doc));
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB getEvents',
        error: error instanceof Error ? error.message : String(error),
        incidentId
      });
      throw error;
    }
  }
  
  // Add incident event
  async addEvent(event: Omit<IncidentEvent, 'id'>): Promise<IncidentEvent> {
    try {
      // Convert string ID to ObjectId for MongoDB
      let incidentId: any = event.incidentId;
      try {
        incidentId = new ObjectId(event.incidentId);
      } catch (error) {
        // If conversion fails, keep the original ID
        logger.warn({
          msg: 'Could not convert incidentId to ObjectId, using as-is',
          incidentId: event.incidentId
        });
      }
      
      const insertResult = await this.eventsCollection.insertOne({
        incidentId,
        message: event.message,
        createdAt: new Date()
      });
      
      return {
        id: insertResult.insertedId.toString(),
        ...event,
        createdAt: new Date()
      } as IncidentEvent;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB addEvent',
        error: error instanceof Error ? error.message : String(error),
        event
      });
      throw error;
    }
  }
  
  // Get incident metrics
  async getMetrics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    mttr: number;
  }> {
    try {
      const [total, active, resolved] = await Promise.all([
        this.incidentsCollection.countDocuments(),
        this.incidentsCollection.countDocuments({
          status: { $in: ['investigating', 'identified', 'monitoring'] }
        }),
        this.incidentsCollection.countDocuments({
          status: 'resolved'
        })
      ]);
      
      // Calculate MTTR for incidents resolved in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const resolvedIncidents = await this.incidentsCollection
        .find({
          status: 'resolved',
          resolvedAt: { $ne: null, $gte: thirtyDaysAgo },
          createdAt: { $gte: thirtyDaysAgo }
        })
        .toArray();
      
      let mttr = 0;
      if (resolvedIncidents.length > 0) {
        const totalResolutionMinutes = resolvedIncidents.reduce((total, incident) => {
          if (incident.resolvedAt) {
            const resolutionTimeMs = incident.resolvedAt.getTime() - incident.createdAt.getTime();
            return total + (resolutionTimeMs / (1000 * 60)); // Convert to minutes
          }
          return total;
        }, 0);
        
        mttr = totalResolutionMinutes / resolvedIncidents.length;
      }
      
      return {
        total,
        active,
        resolved,
        mttr
      };
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB getMetrics',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getHistory(days: number): Promise<{ date: string; count: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const results = await this.incidentsCollection.aggregate(pipeline).toArray();

    return results.map(result => ({
      date: result._id,
      count: result.count
    }));
  }
}