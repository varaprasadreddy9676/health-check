import pino from 'pino';
import { env } from '../config/env';

// Configure pino logger
const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Base properties for every log message
  base: {
    env: env.NODE_ENV,
  },
  // Default serializers
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

export default logger;