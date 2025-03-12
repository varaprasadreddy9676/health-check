import { 
    Notification, 
    INotification, 
    NotificationType,
    getEmailConfig,
    updateEmailConfig,
    shouldThrottleEmail,
    updateLastSentTime
  } from '../models/Notification';
  import {
    Subscription,
    ISubscription,
    createSubscription,
    verifySubscription,
    unsubscribe,
    getSubscribersForHealthCheck,
    getGlobalSubscribers,
    SeverityLevel
  } from '../models/Subscription';
  import mongoose from 'mongoose';
  import logger from '../utils/logger';
  
  // Repository for notification operations
  export class NotificationRepository {
    /**
     * Save a notification record
     */
    async createNotification(data: {
      type: NotificationType;
      subject: string;
      content: string;
      recipients: string[];
      status: 'sent' | 'failed';
    }): Promise<INotification> {
      try {
        const notification = new Notification(data);
        return await notification.save();
      } catch (error) {
        logger.error({
          msg: 'Error creating notification record',
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
    
    /**
     * Get notification history with pagination
     */
    async getNotificationHistory(
      page = 1,
      limit = 20,
      type?: NotificationType
    ): Promise<{ notifications: INotification[]; total: number }> {
      try {
        const query = type ? { type } : {};
        const skip = (page - 1) * limit;
        
        const [notifications, total] = await Promise.all([
          Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          Notification.countDocuments(query)
        ]);
        
        return { notifications, total };
      } catch (error) {
        logger.error({
          msg: 'Error getting notification history',
          error: error instanceof Error ? error.message : String(error),
          page,
          limit
        });
        throw error;
      }
    }
    
    /**
     * Get email configuration
     */
    async getEmailConfig() {
      try {
        return await getEmailConfig();
      } catch (error) {
        logger.error({
          msg: 'Error getting email configuration',
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
    
    /**
     * Update email configuration
     */
    async updateEmailConfig(data: {
      recipients?: string[];
      throttleMinutes?: number;
      enabled?: boolean;
    }) {
      try {
        return await updateEmailConfig(data);
      } catch (error) {
        logger.error({
          msg: 'Error updating email configuration',
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
    
    /**
     * Check if email notifications should be throttled
     */
    async shouldThrottleEmail(): Promise<boolean> {
      try {
        return await shouldThrottleEmail();
      } catch (error) {
        logger.error({
          msg: 'Error checking email throttling',
          error: error instanceof Error ? error.message : String(error)
        });
        return false; // Default to not throttling on error
      }
    }
    
    /**
     * Update last email sent time
     */
    async updateLastSentTime(): Promise<void> {
      try {
        await updateLastSentTime();
      } catch (error) {
        logger.error({
          msg: 'Error updating last sent time',
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
    
    /**
     * Create a subscription
     */
    async createSubscription(
      email: string,
      healthCheckId?: string,
      severity: SeverityLevel = 'all'
    ): Promise<ISubscription> {
      try {
        return await createSubscription(email, healthCheckId, severity);
      } catch (error) {
        logger.error({
          msg: 'Error creating subscription',
          error: error instanceof Error ? error.message : String(error),
          email,
          healthCheckId
        });
        throw error;
      }
    }
    
    /**
     * Get subscriptions by email
     */
    async getSubscriptionsByEmail(email: string): Promise<ISubscription[]> {
      try {
        return await Subscription.find({ email: email.toLowerCase() })
          .populate('healthCheckId', 'name type')
          .sort({ createdAt: -1 });
      } catch (error) {
        logger.error({
          msg: 'Error getting subscriptions by email',
          error: error instanceof Error ? error.message : String(error),
          email
        });
        throw error;
      }
    }
    
    /**
     * Verify a subscription
     */
    async verifySubscription(token: string): Promise<ISubscription | null> {
      try {
        return await verifySubscription(token);
      } catch (error) {
        logger.error({
          msg: 'Error verifying subscription',
          error: error instanceof Error ? error.message : String(error),
          token
        });
        throw error;
      }
    }
    
    /**
     * Unsubscribe
     */
    async unsubscribe(token: string): Promise<ISubscription | null> {
      try {
        return await unsubscribe(token);
      } catch (error) {
        logger.error({
          msg: 'Error unsubscribing',
          error: error instanceof Error ? error.message : String(error),
          token
        });
        throw error;
      }
    }
    
    /**
     * Update subscription
     */
    async updateSubscription(
      id: string,
      data: { active?: boolean; severity?: SeverityLevel }
    ): Promise<ISubscription | null> {
      try {
        return await Subscription.findByIdAndUpdate(
          id,
          { $set: data },
          { new: true, runValidators: true }
        );
      } catch (error) {
        logger.error({
          msg: 'Error updating subscription',
          error: error instanceof Error ? error.message : String(error),
          id,
          data
        });
        throw error;
      }
    }
    
    /**
     * Delete subscription
     */
    async deleteSubscription(id: string): Promise<boolean> {
      try {
        const result = await Subscription.deleteOne({ _id: id });
        return result.deletedCount > 0;
      } catch (error) {
        logger.error({
          msg: 'Error deleting subscription',
          error: error instanceof Error ? error.message : String(error),
          id
        });
        throw error;
      }
    }
    
    /**
     * Get subscribers for a specific health check
     */
    async getSubscribersForHealthCheck(
      healthCheckId: string,
      severity: string
    ): Promise<string[]> {
      try {
        return await getSubscribersForHealthCheck(healthCheckId, severity);
      } catch (error) {
        logger.error({
          msg: 'Error getting subscribers for health check',
          error: error instanceof Error ? error.message : String(error),
          healthCheckId,
          severity
        });
        return [];
      }
    }
    
    /**
     * Get global subscribers
     */
    async getGlobalSubscribers(severity: string): Promise<string[]> {
      try {
        return await getGlobalSubscribers(severity);
      } catch (error) {
        logger.error({
          msg: 'Error getting global subscribers',
          error: error instanceof Error ? error.message : String(error),
          severity
        });
        return [];
      }
    }
    
    /**
     * Find a subscription by verify token
     */
    async findSubscriptionByVerifyToken(token: string): Promise<ISubscription | null> {
      try {
        return await Subscription.findOne({ verifyToken: token });
      } catch (error) {
        logger.error({
          msg: 'Error finding subscription by verify token',
          error: error instanceof Error ? error.message : String(error),
          token
        });
        throw error;
      }
    }
    
    /**
     * Find a subscription by unsubscribe token
     */
    async findSubscriptionByUnsubscribeToken(token: string): Promise<ISubscription | null> {
      try {
        return await Subscription.findOne({ unsubscribeToken: token });
      } catch (error) {
        logger.error({
          msg: 'Error finding subscription by unsubscribe token',
          error: error instanceof Error ? error.message : String(error),
          token
        });
        throw error;
      }
    }
    
    /**
     * Find a subscription by ID
     */
    async findSubscriptionById(id: string): Promise<ISubscription | null> {
      try {
        return await Subscription.findById(id).populate('healthCheckId', 'name type');
      } catch (error) {
        logger.error({
          msg: 'Error finding subscription by ID',
          error: error instanceof Error ? error.message : String(error),
          id
        });
        throw error;
      }
    }
  }
  
  // Export singleton instance
  export const notificationRepository = new NotificationRepository();