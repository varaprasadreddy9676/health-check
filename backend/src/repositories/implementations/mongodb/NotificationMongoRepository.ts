import { MongoClient, Collection, ObjectId } from 'mongodb';
import { NotificationRepository } from '../../interfaces/NotificationRepository';
import { Notification } from '../../../models/Notification';
import { EmailConfig } from '../../../models/EmailConfig';
import { SlackConfig } from '../../../models/SlackConfig';
import logger from '../../../utils/logger';

export class NotificationMongoRepository implements NotificationRepository {
  private client: MongoClient;
  private notificationsCollection: Collection;
  private emailConfigCollection: Collection;
  private slackConfigCollection: Collection;
  
  constructor(client: MongoClient) {
    this.client = client;
    this.notificationsCollection = client.db().collection('notifications');
    this.emailConfigCollection = client.db().collection('emailConfig');
    this.slackConfigCollection = client.db().collection('slackConfig');
  }
  
  // Convert MongoDB document to Notification model
  private toNotification(doc: any): Notification {
    return {
      id: doc._id.toString(),
      type: doc.type,
      subject: doc.subject,
      content: doc.content,
      recipients: doc.recipients,
      status: doc.status,
      createdAt: doc.createdAt
    };
  }
  
  // Convert MongoDB document to EmailConfig model
  private toEmailConfig(doc: any): EmailConfig {
    return {
      id: doc._id.toString(),
      recipients: doc.recipients,
      throttleMinutes: doc.throttleMinutes,
      enabled: doc.enabled,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
  
  // Convert MongoDB document to SlackConfig model
  private toSlackConfig(doc: any): SlackConfig {
    return {
      id: doc._id.toString(),
      webhookUrl: doc.webhookUrl,
      channel: doc.channel,
      throttleMinutes: doc.throttleMinutes,
      enabled: doc.enabled,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
  
  // Find all notifications with pagination
  async findAll(
    page: number = 1,
    limit: number = 20,
    type?: string
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const filter: any = {};
      
      if (type) {
        filter.type = type;
      }
      
      const [notifications, total] = await Promise.all([
        this.notificationsCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.notificationsCollection.countDocuments(filter)
      ]);
      
      return {
        notifications: notifications.map(doc => this.toNotification(doc)),
        total
      };
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB findAll notifications',
        error: error instanceof Error ? error.message : String(error),
        page,
        limit,
        type
      });
      throw error;
    }
  }
  
  // Create a new notification
  async create(notification: Omit<Notification, 'id'>): Promise<Notification> {
    try {
      const doc = {
        ...notification,
        createdAt: new Date()
      };
      
      const result = await this.notificationsCollection.insertOne(doc);
      
      return {
        id: result.insertedId.toString(),
        ...notification,
        createdAt: doc.createdAt
      };
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB create notification',
        error: error instanceof Error ? error.message : String(error),
        notification
      });
      throw error;
    }
  }
  
  // Get email configuration
  async getEmailConfig(): Promise<EmailConfig | null> {
    try {
      const doc = await this.emailConfigCollection.findOne({});
      
      if (!doc) {
        return null;
      }
      
      return this.toEmailConfig(doc);
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB getEmailConfig',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  // Update email configuration
  async updateEmailConfig(data: Partial<EmailConfig>): Promise<EmailConfig> {
    try {
      const now = new Date();
      
      // Check if a configuration already exists
      const existingConfig = await this.emailConfigCollection.findOne({});
      
      let result;
      
      if (existingConfig) {
        // Update existing configuration
        await this.emailConfigCollection.updateOne(
          { _id: existingConfig._id },
          {
            $set: {
              ...data,
              updatedAt: now
            }
          }
        );
        
        result = await this.emailConfigCollection.findOne({ _id: existingConfig._id });
      } else {
        // Create new configuration
        const insertResult = await this.emailConfigCollection.insertOne({
          recipients: data.recipients || [],
          throttleMinutes: data.throttleMinutes || 60,
          enabled: data.enabled !== undefined ? data.enabled : false,
          createdAt: now,
          updatedAt: now
        });
        
        result = await this.emailConfigCollection.findOne({ _id: insertResult.insertedId });
      }
      
      if (!result) {
        throw new Error('Failed to retrieve email configuration after update');
      }
      
      return this.toEmailConfig(result);
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB updateEmailConfig',
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }
  
  // Get Slack configuration
  async getSlackConfig(): Promise<SlackConfig | null> {
    try {
      const doc = await this.slackConfigCollection.findOne({});
      
      if (!doc) {
        return null;
      }
      
      return this.toSlackConfig(doc);
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB getSlackConfig',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  // Update Slack configuration
  async updateSlackConfig(data: Partial<SlackConfig>): Promise<SlackConfig> {
    try {
      const now = new Date();
      
      // Check if a configuration already exists
      const existingConfig = await this.slackConfigCollection.findOne({});
      
      let result;
      
      if (existingConfig) {
        // Update existing configuration
        await this.slackConfigCollection.updateOne(
          { _id: existingConfig._id },
          {
            $set: {
              ...data,
              updatedAt: now
            }
          }
        );
        
        result = await this.slackConfigCollection.findOne({ _id: existingConfig._id });
      } else {
        // Create new configuration
        const insertResult = await this.slackConfigCollection.insertOne({
          webhookUrl: data.webhookUrl || '',
          channel: data.channel || undefined,
          throttleMinutes: data.throttleMinutes || 60,
          enabled: data.enabled !== undefined ? data.enabled : false,
          createdAt: now,
          updatedAt: now
        });
        
        result = await this.slackConfigCollection.findOne({ _id: insertResult.insertedId });
      }
      
      if (!result) {
        throw new Error('Failed to retrieve Slack configuration after update');
      }
      
      return this.toSlackConfig(result);
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB updateSlackConfig',
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }
  
  // Get last notification time for throttling
  async getLastNotificationTime(type: string): Promise<Date | null> {
    try {
      const lastNotification = await this.notificationsCollection.findOne(
        {
          type,
          status: 'sent'
        },
        {
          sort: { createdAt: -1 },
          projection: { createdAt: 1 }
        }
      );
      
      return lastNotification ? lastNotification.createdAt : null;
    } catch (error) {
      logger.error({
        msg: 'Error in MongoDB getLastNotificationTime',
        error: error instanceof Error ? error.message : String(error),
        type
      });
      throw error;
    }
  }
}