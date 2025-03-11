import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';
import routes from './routes';
import logger from './utils/logger';

// Create Express application
const app = express();

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS handling
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    msg: 'Request received',
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// API routes
app.use('/api', routes);

// Health check for the app itself
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Handle 404 errors
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;