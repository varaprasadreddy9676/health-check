import mongoose, { Document, Schema } from 'mongoose';

// Result Status enum
export type ResultStatus = 'Healthy' | 'Unhealthy';

// Result interface
export interface IResult extends Document {
  healthCheckId: mongoose.Types.ObjectId;
  status: ResultStatus;
  details?: string;
  memoryUsage?: number;
  cpuUsage?: number;
  responseTime?: number;
  createdAt: Date;
}

// Result schema
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
  }
}, {
  timestamps: true
});

// Indexes
resultSchema.index({ healthCheckId: 1 });
resultSchema.index({ createdAt: -1 });
resultSchema.index({ status: 1 });
resultSchema.index({ healthCheckId: 1, createdAt: -1 });

// Create model
export const Result = mongoose.model<IResult>('Result', resultSchema);