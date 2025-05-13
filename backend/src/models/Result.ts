import mongoose, { Document, Schema } from 'mongoose';

export type ResultStatus = 'Healthy' | 'Unhealthy';

export interface IResult extends Document {
  healthCheckId: mongoose.Types.ObjectId;
  status: ResultStatus;
  details?: string;
  memoryUsage?: number;
  cpuUsage?: number;
  responseTime?: number;
  logDetails?: {
    lastModified?: Date;
    sizeBytes?: number;
    matchedErrorPatterns?: string[];
    isFresh?: boolean;
  };
  createdAt: Date;
}

const resultSchema = new Schema<IResult>({
  healthCheckId: {
    type: Schema.Types.ObjectId,
    ref: 'HealthCheck',
    required: true
  },
  status: {
    type: String,
    enum: ['Healthy', 'Unhealthy'],
    required: true
  },
  details: {
    type: String,
    trim: true
  },
  memoryUsage: {
    type: Number,
    min: 0
  },
  cpuUsage: {
    type: Number,
    min: 0
  },
  responseTime: {
    type: Number,
    min: 0
  },
  logDetails: {
    lastModified: {
      type: Date
    },
    sizeBytes: {
      type: Number,
      min: 0
    },
    matchedErrorPatterns: {
      type: [String]
    },
    isFresh: {
      type: Boolean
    }
  }
}, {
  timestamps: true
});

resultSchema.index({ healthCheckId: 1 });
resultSchema.index({ createdAt: -1 });
resultSchema.index({ status: 1 });
resultSchema.index({ healthCheckId: 1, createdAt: -1 });

export const Result = mongoose.model<IResult>('Result', resultSchema);