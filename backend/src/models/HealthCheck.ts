import mongoose, { Document, Schema } from 'mongoose';
import { env } from '../config/env';

export type HealthCheckType = 'API' | 'PROCESS' | 'SERVICE' | 'SERVER' | 'LOG';

export interface IHealthCheck extends Document {
  name: string;
  type: HealthCheckType;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  checkInterval: number;
  notifyOnFailure: boolean;
  
  // API specific fields
  endpoint?: string;
  timeout?: number;
  expectedStatusCode?: number;
  expectedResponseContent?: string;
  
  // Process specific fields
  processKeyword?: string;
  port?: number;
  
  // Service specific fields
  customCommand?: string;
  expectedOutput?: string;
  
  // Log monitoring fields
  logFilePath?: string;
  logFreshnessPeriod?: number; // minutes
  logErrorPatterns?: string[];
  logMaxSizeMB?: number;
  
  // Restart capability
  restartCommand?: string;
  restartThreshold?: number; // number of consecutive failures before restart
  
  // Failure tracking
  consecutiveFailures?: number;
  lastSuccessTime?: Date;
}

const healthCheckSchema = new Schema<IHealthCheck>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['API', 'PROCESS', 'SERVICE', 'SERVER', 'LOG'],
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  checkInterval: {
    type: Number,
    default: env.DEFAULT_CHECK_INTERVAL,
    min: 10
  },
  notifyOnFailure: {
    type: Boolean,
    default: true
  },
  // API specific fields
  endpoint: {
    type: String,
    trim: true
  },
  timeout: {
    type: Number,
    default: 5000
  },
  expectedStatusCode: {
    type: Number
  },
  expectedResponseContent: {
    type: String
  },
  // Process specific fields
  processKeyword: {
    type: String,
    trim: true
  },
  port: {
    type: Number,
    min: 1,
    max: 65535
  },
  // Service specific fields
  customCommand: {
    type: String,
    trim: true
  },
  expectedOutput: {
    type: String,
    trim: true
  },
  // Log monitoring fields
  logFilePath: {
    type: String,
    trim: true
  },
  logFreshnessPeriod: {
    type: Number,
    min: 1
  },
  logErrorPatterns: {
    type: [String]
  },
  logMaxSizeMB: {
    type: Number,
    min: 1
  },
  // Restart capability
  restartCommand: {
    type: String,
    trim: true
  },
  restartThreshold: {
    type: Number,
    default: 3,
    min: 1
  },
  // Failure tracking
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  lastSuccessTime: {
    type: Date
  }
}, {
  timestamps: true
});

healthCheckSchema.index({ type: 1 });
healthCheckSchema.index({ enabled: 1 });
healthCheckSchema.index({ name: 1, type: 1 }, { unique: true });

healthCheckSchema.pre('save', function(next) {
  if (this.type === 'API' && !this.endpoint) {
    return next(new Error('Endpoint is required for API type health checks'));
  }
  
  if (this.type === 'PROCESS' && !this.processKeyword && !this.port) {
    return next(new Error('Process keyword or port is required for PROCESS type health checks'));
  }
  
  if (this.type === 'SERVICE' && !this.customCommand) {
    return next(new Error('Custom command is required for SERVICE type health checks'));
  }
  
  if (this.type === 'LOG' && !this.logFilePath) {
    return next(new Error('Log file path is required for LOG type health checks'));
  }
  
  next();
});

export const HealthCheck = mongoose.model<IHealthCheck>('HealthCheck', healthCheckSchema);