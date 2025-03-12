import mongoose, { Document, Schema } from 'mongoose';

// Health Check Types
export type HealthCheckType = 'API' | 'PROCESS' | 'SERVICE' | 'SERVER';

// Health Check interface
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
  
  // Process specific fields
  processKeyword?: string;
  port?: number;
  
  // Service specific fields
  customCommand?: string;
  expectedOutput?: string;
  
  // Restart capability
  restartCommand?: string;
}

// Health Check schema
const healthCheckSchema = new Schema<IHealthCheck>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['API', 'PROCESS', 'SERVICE', 'SERVER'],
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  checkInterval: {
    type: Number,
    default: 300, // Default: 5 minutes (in seconds)
    min: 10       // Minimum: 10 seconds
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
    default: 5000 // Default: 5 seconds (in milliseconds)
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
  
  // Restart capability
  restartCommand: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
healthCheckSchema.index({ type: 1 });
healthCheckSchema.index({ enabled: 1 });
healthCheckSchema.index({ name: 1, type: 1 }, { unique: true }); // Add unique compound index for name and type

// Pre-save validation
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
  
  next();
});

// Create model
export const HealthCheck = mongoose.model<IHealthCheck>('HealthCheck', healthCheckSchema);