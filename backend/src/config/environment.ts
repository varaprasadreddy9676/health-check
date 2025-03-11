import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const environment = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // Database
  DATABASE_TYPE: process.env.DATABASE_TYPE || 'postgresql', // 'postgresql' or 'mongodb'
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/health_check_db?schema=public',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/health_check_service',
  
  // Email settings
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'healthcheck@example.com',
  
  // Slack settings
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Health check settings
  DEFAULT_CHECK_INTERVAL: parseInt(process.env.DEFAULT_CHECK_INTERVAL || '300', 10),
  
  // Email throttling (in minutes)
  EMAIL_THROTTLE_MINUTES: parseInt(process.env.EMAIL_THROTTLE_MINUTES || '60', 10),
  
  // Slack throttling (in minutes)
  SLACK_THROTTLE_MINUTES: parseInt(process.env.SLACK_THROTTLE_MINUTES || '60', 10),
};