import mongoose, { Document, Schema, Model } from 'mongoose';

// Notification Type enum
export type NotificationType = 'email' | 'slack';

// Notification Status enum
export type NotificationStatus = 'sent' | 'failed';

// Notification interface
export interface INotification extends Document {
  type: NotificationType;
  subject: string;
  content: string;
  recipients: string[];
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Email Config interface
export interface IEmailConfig extends Document {
  recipients: string[];
  throttleMinutes: number;
  enabled: boolean;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification schema
const notificationSchema = new Schema<INotification>({
  type: {
    type: String,
    enum: ['email', 'slack'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  recipients: {
    type: [String],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed'],
    required: true
  }
}, {
  timestamps: true
});

// Email Config schema
const emailConfigSchema = new Schema<IEmailConfig>({
  recipients: {
    type: [String],
    default: []
  },
  throttleMinutes: {
    type: Number,
    default: 60,
    min: 1
  },
  enabled: {
    type: Boolean,
    default: false
  },
  lastSentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ createdAt: -1 });

// Create models
export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export const EmailConfig = mongoose.model<IEmailConfig>('EmailConfig', emailConfigSchema);

// Instead of storing as a static property, we use a module-level variable
let cachedEmailConfig: IEmailConfig | null = null;

// Method to get the email config, lazily loading and caching it
export async function getEmailConfig(): Promise<IEmailConfig> {
  if (cachedEmailConfig) {
    return cachedEmailConfig;
  }
  
  let config = await EmailConfig.findOne();
  
  if (!config) {
    // Create a default config if none exists
    config = await EmailConfig.create({
      recipients: [],
      throttleMinutes: 60,
      enabled: false
    });
  }
  
  cachedEmailConfig = config;
  return config;
}

// Method to update the email config
export async function updateEmailConfig(data: Partial<IEmailConfig>): Promise<IEmailConfig> {
  const config = await getEmailConfig();
  
  Object.assign(config, data);
  await config.save();
  
  // Update the cached value
  cachedEmailConfig = config;
  
  return config;
}

// Method to check if an email should be throttled
export async function shouldThrottleEmail(): Promise<boolean> {
  const config = await getEmailConfig();
  
  if (!config.lastSentAt) {
    return false;
  }
  
  const now = new Date();
  const timeSinceLastEmail = now.getTime() - config.lastSentAt.getTime();
  const throttleTime = config.throttleMinutes * 60 * 1000; // Convert to milliseconds
  
  return timeSinceLastEmail < throttleTime;
}

// Method to update the last sent time
export async function updateLastSentTime(): Promise<void> {
  const config = await getEmailConfig();
  
  config.lastSentAt = new Date();
  await config.save();
  
  // Update the cached value
  cachedEmailConfig = config;
}