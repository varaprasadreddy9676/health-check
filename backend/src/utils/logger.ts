import pino from 'pino';
import { environment } from '../config/environment';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
});

const logger = pino(
  {
    level: environment.LOG_LEVEL || 'info',
    base: undefined,
  },
  environment.NODE_ENV === 'production' ? undefined : transport
);

export default logger;