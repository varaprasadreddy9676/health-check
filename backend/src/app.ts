import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { AppError, HTTP_STATUS } from './utils/error';
import logger from './utils/logger';
import { env } from './config/env';

// Create Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging middleware
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev')); // Log HTTP requests in development
} else {
  app.use(morgan('combined')); // More verbose logging in production
}

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug({
    msg: 'Request received',
    method: req.method,
    path: req.url,
    ip: req.ip,
  });
  next();
});

// API Routes
app.use('/api', routes);

// Root health check
app.get('/health', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn({
    msg: 'Route not found',
    method: req.method,
    path: req.url,
  });
  
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
});

// Error handler
app.use((err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    msg: 'Error caught by middleware',
    error: err.message,
    stack: err.stack,
    path: req.url,
    method: req.method,
  });
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
      },
    });
  }
  
  // Default error response
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      message: 'Internal server error',
    },
  });
});

export default app;