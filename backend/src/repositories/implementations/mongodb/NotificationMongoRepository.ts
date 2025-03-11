import { MongoClient, Collection, ObjectId } from 'mongodb';
import { NotificationRepository } from '../../interfaces/NotificationRepository';
import { Notification } from '../../../models/Notification';
import { EmailConfig } from '../../../models/EmailConfig';
import { SlackConfig } from '../../../models/SlackConfig';
import { Subscription, CreateSubscriptionDto, UpdateSubscriptionDto } from '../../../models/Subscription';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../utils/logger';

export class NotificationMongoRepository implements NotificationRepository {
    private client: MongoClient;
    private notificationsCollection: Collection;
    private emailConfigCollection: Collection;
    private slackConfigCollection: Collection;
    private subscriptionsCollection: Collection;
    private healthChecksCollection: Collection;


    constructor(client: MongoClient) {
        this.client = client;
        this.notificationsCollection = client.db().collection('notifications');
        this.emailConfigCollection = client.db().collection('emailConfig');
        this.slackConfigCollection = client.db().collection('slackConfig');
        this.subscriptionsCollection = client.db().collection('subscriptions');
        this.healthChecksCollection = client.db().collection('healthChecks');
    }

    // Create a new subscription
    async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
        try {
            const now = new Date();

            // Convert string ID to ObjectId for MongoDB if healthCheckId is provided
            let healthCheckId = data.healthCheckId ? new ObjectId(data.healthCheckId) : null;

            // Generate verify token
            const verifyToken = uuidv4();
            const unsubscribeToken = uuidv4();

            // Prepare data
            const subscriptionData = {
                email: data.email.toLowerCase().trim(),
                healthCheckId,
                active: false, // Inactive until verified
                severity: data.severity || 'all',
                createdAt: now,
                updatedAt: now,
                verifiedAt: null,
                verifyToken,
                unsubscribeToken
            };

            // Check if subscription already exists
            const existingSubscription = await this.subscriptionsCollection.findOne({
                email: subscriptionData.email,
                healthCheckId: subscriptionData.healthCheckId
            });

            if (existingSubscription) {
                // If already exists but not verified, update the verify token
                if (!existingSubscription.verifiedAt) {
                    await this.subscriptionsCollection.updateOne(
                        { _id: existingSubscription._id },
                        {
                            $set: {
                                verifyToken,
                                updatedAt: now
                            }
                        }
                    );
                }

                return this.toSubscription({
                    ...existingSubscription,
                    verifyToken: existingSubscription.verifiedAt ? null : verifyToken
                });
            }

            // Create new subscription
            const result = await this.subscriptionsCollection.insertOne(subscriptionData);

            return {
                id: result.insertedId.toString(),
                email: subscriptionData.email,
                healthCheckId: healthCheckId ? healthCheckId.toString() : null,
                active: subscriptionData.active,
                severity: subscriptionData.severity as 'all' | 'high' | 'critical',
                createdAt: now,
                updatedAt: now,
                verifiedAt: null,
                verifyToken,
                unsubscribeToken
            };
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB createSubscription',
                error: error instanceof Error ? error.message : String(error),
                data
            });
            throw error;
        }
    }

    // Find subscription by ID
    async findSubscriptionById(id: string): Promise<Subscription | null> {
        try {
            const doc = await this.subscriptionsCollection.findOne({ _id: new ObjectId(id) });
            if (!doc) {
                return null;
            }

            // Get health check info if there's a healthCheckId
            let healthCheck;
            if (doc.healthCheckId) {
                healthCheck = await this.healthChecksCollection.findOne(
                    { _id: doc.healthCheckId },
                    { projection: { name: 1, type: 1 } }
                );
            }

            return this.toSubscription({
                ...doc,
                healthCheck: healthCheck ? {
                    id: healthCheck._id.toString(),
                    name: healthCheck.name,
                    type: healthCheck.type
                } : undefined
            });
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB findSubscriptionById',
                error: error instanceof Error ? error.message : String(error),
                id
            });
            throw error;
        }
    }

    // Find subscription by token (verify or unsubscribe)
    async findSubscriptionByToken(token: string, tokenType: 'verify' | 'unsubscribe'): Promise<Subscription | null> {
        try {
            const tokenField = tokenType === 'verify' ? 'verifyToken' : 'unsubscribeToken';
            const doc = await this.subscriptionsCollection.findOne({ [tokenField]: token });
            if (!doc) {
                return null;
            }

            // Get health check info if there's a healthCheckId
            let healthCheck;
            if (doc.healthCheckId) {
                healthCheck = await this.healthChecksCollection.findOne(
                    { _id: doc.healthCheckId },
                    { projection: { name: 1, type: 1 } }
                );
            }

            return this.toSubscription({
                ...doc,
                healthCheck: healthCheck ? {
                    id: healthCheck._id.toString(),
                    name: healthCheck.name,
                    type: healthCheck.type
                } : undefined
            });
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB findSubscriptionByToken',
                error: error instanceof Error ? error.message : String(error),
                token,
                tokenType
            });
            throw error;
        }
    }

    // Find all subscriptions for an email
    async findSubscriptionsByEmail(email: string): Promise<Subscription[]> {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const docs = await this.subscriptionsCollection.find({
                email: normalizedEmail
            }).toArray();

            // Get health check info for each subscription
            const subscriptions = await Promise.all(
                docs.map(async (doc) => {
                    let healthCheck;
                    if (doc.healthCheckId) {
                        healthCheck = await this.healthChecksCollection.findOne(
                            { _id: doc.healthCheckId },
                            { projection: { name: 1, type: 1 } }
                        );
                    }

                    return this.toSubscription({
                        ...doc,
                        healthCheck: healthCheck ? {
                            id: healthCheck._id.toString(),
                            name: healthCheck.name,
                            type: healthCheck.type
                        } : undefined
                    });
                })
            );

            return subscriptions;
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB findSubscriptionsByEmail',
                error: error instanceof Error ? error.message : String(error),
                email
            });
            throw error;
        }
    }

    // Update subscription
    async updateSubscription(id: string, data: UpdateSubscriptionDto): Promise<Subscription> {
        try {
            const now = new Date();
            const updateData = {
                ...data,
                updatedAt: now
            };

            await this.subscriptionsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            const updated = await this.findSubscriptionById(id);
            if (!updated) {
                throw new Error(`Subscription with ID ${id} not found after update`);
            }

            return updated;
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB updateSubscription',
                error: error instanceof Error ? error.message : String(error),
                id,
                data
            });
            throw error;
        }
    }

    // Delete subscription
    async deleteSubscription(id: string): Promise<boolean> {
        try {
            const result = await this.subscriptionsCollection.deleteOne({ _id: new ObjectId(id) });
            return result.deletedCount > 0;
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB deleteSubscription',
                error: error instanceof Error ? error.message : String(error),
                id
            });
            throw error;
        }
    }

    // Verify subscription
    async verifySubscription(token: string): Promise<Subscription | null> {
        try {
            const subscription = await this.findSubscriptionByToken(token, 'verify');
            if (!subscription) {
                return null;
            }

            const now = new Date();
            await this.subscriptionsCollection.updateOne(
                { _id: new ObjectId(subscription.id) },
                {
                    $set: {
                        active: true,
                        verifiedAt: now,
                        verifyToken: null,
                        updatedAt: now
                    }
                }
            );

            return this.findSubscriptionById(subscription.id);
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB verifySubscription',
                error: error instanceof Error ? error.message : String(error),
                token
            });
            throw error;
        }
    }

    // Unsubscribe using token
    async unsubscribe(token: string): Promise<Subscription | null> {
        try {
            const subscription = await this.findSubscriptionByToken(token, 'unsubscribe');
            if (!subscription) {
                return null;
            }

            const now = new Date();
            await this.subscriptionsCollection.updateOne(
                { _id: new ObjectId(subscription.id) },
                {
                    $set: {
                        active: false,
                        updatedAt: now
                    }
                }
            );

            return this.findSubscriptionById(subscription.id);
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB unsubscribe',
                error: error instanceof Error ? error.message : String(error),
                token
            });
            throw error;
        }
    }

    // Get subscribers for a specific health check with minimum severity
    async getSubscribersForHealthCheck(healthCheckId: string, severity: string): Promise<string[]> {
        try {
            // Convert severity to numeric value for comparison
            const severityValue = this.getSeverityValue(severity);

            // Find subscribers for this specific health check
            const specificSubscribers = await this.subscriptionsCollection.find({
                $or: [
                    // Exact match for this health check
                    { healthCheckId: new ObjectId(healthCheckId), active: true },
                    // Global subscriptions (null healthCheckId)
                    { healthCheckId: null, active: true }
                ]
            }).toArray();

            // Filter by severity and extract emails
            return specificSubscribers
                .filter(sub => this.getSeverityValue(sub.severity) <= severityValue)
                .map(sub => sub.email);
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB getSubscribersForHealthCheck',
                error: error instanceof Error ? error.message : String(error),
                healthCheckId,
                severity
            });
            throw error;
        }
    }

    // Get subscribers for all health checks with minimum severity
    async getSubscribersForAllHealthChecks(severity: string): Promise<string[]> {
        try {
            // Convert severity to numeric value for comparison
            const severityValue = this.getSeverityValue(severity);

            // Find global subscribers (null healthCheckId)
            const globalSubscribers = await this.subscriptionsCollection.find({
                healthCheckId: null,
                active: true
            }).toArray();

            // Filter by severity and extract emails
            return globalSubscribers
                .filter(sub => this.getSeverityValue(sub.severity) <= severityValue)
                .map(sub => sub.email);
        } catch (error) {
            logger.error({
                msg: 'Error in MongoDB getSubscribersForAllHealthChecks',
                error: error instanceof Error ? error.message : String(error),
                severity
            });
            throw error;
        }
    }

    // Helper method to convert severity string to numeric value for comparison
    private getSeverityValue(severity: string): number {
        switch (severity) {
            case 'critical': return 1;
            case 'high': return 2;
            case 'all': return 3;
            default: return 3; // Default to "all"
        }
    }
    private toSubscription(doc: any): Subscription {
        return {
            id: doc._id.toString(),
            email: doc.email,
            healthCheckId: doc.healthCheckId ? doc.healthCheckId.toString() : null,
            active: doc.active,
            severity: doc.severity,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            verifiedAt: doc.verifiedAt,
            verifyToken: doc.verifyToken,
            unsubscribeToken: doc.unsubscribeToken,
            healthCheck: doc.healthCheck
        };
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