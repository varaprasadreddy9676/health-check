// Create a new file: models/Setting.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

settingSchema.index({ key: 1 });

export const Setting = mongoose.model<ISetting>('Setting', settingSchema);

// Default settings to initialize the database
export const defaultSettings: Record<string, { value: any; description: string }> = {
    'default.checkInterval': {
      value: 300,
      description: 'Default check interval in seconds for new health checks'
    },
    'ui.theme': {
      value: 'light',
      description: 'UI theme (light/dark)'
    },
    'ui.timezone': {
      value: 'UTC',
      description: 'Display timezone for dates and times'
    },
    'notification.defaultSeverity': {
      value: 'high',
      description: 'Default severity level for notifications'
    }
  };