import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// Severity levels
export type SeverityLevel = 'all' | 'high' | 'critical';

// Subscription interface
export interface ISubscription extends Document {
  email: string;
  healthCheckId?: mongoose.Types.ObjectId; // null means all health checks
  active: boolean;
  severity: SeverityLevel;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  verifyToken?: string;
  unsubscribeToken: string;
}

// Subscription schema
const subscriptionSchema = new Schema<ISubscription>({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  healthCheckId: {
    type: Schema.Types.ObjectId,
    ref: 'HealthCheck',
    default: null // null means all health checks
  },
  active: {
    type: Boolean,
    default: false // Inactive until verified
  },
  severity: {
    type: String,
    enum: ['all', 'high', 'critical'],
    default: 'all'
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifyToken: {
    type: String,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  unsubscribeToken: {
    type: String,
    default: () => crypto.randomBytes(32).toString('hex')
  }
}, {
  timestamps: true
});

// Unique index to prevent duplicate subscriptions
subscriptionSchema.index({ email: 1, healthCheckId: 1 }, { unique: true });
subscriptionSchema.index({ verifyToken: 1 }, { sparse: true });
subscriptionSchema.index({ unsubscribeToken: 1 });
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ active: 1, severity: 1 });

// Create model
export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

// Helper functions for subscription management

/**
 * Create a new subscription
 */
export async function createSubscription(
  email: string,
  healthCheckId?: string,
  severity: SeverityLevel = 'all'
): Promise<ISubscription> {
  try {
    // Convert healthCheckId to ObjectId if provided
    const healthCheckObjectId = healthCheckId 
      ? new mongoose.Types.ObjectId(healthCheckId) 
      : null;
    
    // Try to find an existing subscription
    const existingSubscription = await Subscription.findOne({
      email,
      healthCheckId: healthCheckObjectId
    });
    
    // If it exists and not verified, update the verify token
    if (existingSubscription && !existingSubscription.verifiedAt) {
      existingSubscription.verifyToken = crypto.randomBytes(32).toString('hex');
      existingSubscription.updatedAt = new Date();
      await existingSubscription.save();
      return existingSubscription;
    }
    
    // If it exists and is verified, return it
    if (existingSubscription) {
      return existingSubscription;
    }
    
    // Create new subscription
    return await Subscription.create({
      email,
      healthCheckId: healthCheckObjectId,
      severity,
      active: false,
      verifiedAt: null
    });
  } catch (error) {
    if ((error as any).code === 11000) { // Duplicate key error
      const existingSubscription = await Subscription.findOne({
        email,
        healthCheckId: healthCheckId ? new mongoose.Types.ObjectId(healthCheckId) : null
      });
      
      if (existingSubscription) {
        return existingSubscription;
      }
    }
    throw error;
  }
}

/**
 * Verify a subscription by token
 */
export async function verifySubscription(token: string): Promise<ISubscription | null> {
  const subscription = await Subscription.findOne({ verifyToken: token });
  
  if (!subscription) {
    return null;
  }
  
  subscription.active = true;
  subscription.verifiedAt = new Date();
  subscription.verifyToken = undefined;
  await subscription.save();
  
  return subscription;
}

/**
 * Unsubscribe by token
 */
export async function unsubscribe(token: string): Promise<ISubscription | null> {
  const subscription = await Subscription.findOne({ unsubscribeToken: token });
  
  if (!subscription) {
    return null;
  }
  
  subscription.active = false;
  await subscription.save();
  
  return subscription;
}

/**
 * Get all active subscribers for a specific health check
 */
export async function getSubscribersForHealthCheck(
  healthCheckId: string,
  severity: string
): Promise<string[]> {
  const severityValue = getSeverityValue(severity);
  
  const subscribers = await Subscription.find({
    $or: [
      { healthCheckId: new mongoose.Types.ObjectId(healthCheckId), active: true },
      { healthCheckId: null, active: true }
    ]
  });
  
  return subscribers
    .filter(sub => getSeverityValue(sub.severity) <= severityValue)
    .map(sub => sub.email);
}

/**
 * Get all active subscribers for global alerts
 */
export async function getGlobalSubscribers(severity: string): Promise<string[]> {
  const severityValue = getSeverityValue(severity);
  
  const subscribers = await Subscription.find({
    healthCheckId: null,
    active: true
  });
  
  return subscribers
    .filter(sub => getSeverityValue(sub.severity) <= severityValue)
    .map(sub => sub.email);
}

/**
 * Helper function to get numerical severity value
 */
function getSeverityValue(severity: string): number {
  switch (severity) {
    case 'critical': return 1;
    case 'high': return 2;
    case 'all': return 3;
    default: return 3;
  }
}