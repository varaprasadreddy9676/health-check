import { Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { healthCheckRepository } from '../repositories/healthCheckRepository';
import logger from '../utils/logger';

// Result Controller
export class ResultController {
  /**
   * Validation rules for getting results
   */
  validateGetResults = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['Healthy', 'Unhealthy']).withMessage('Status must be either Healthy or Unhealthy'),
    query('from').optional().isISO8601().withMessage('From date must be in ISO format'),
    query('to').optional().isISO8601().withMessage('To date must be in ISO format'),
  ];
  
  /**
   * Get latest results for all health checks
   */
  async getLatest(req: Request, res: Response): Promise<Response> {
    try {
      const latestResults = await healthCheckRepository.getLatestResults();
      
      return res.status(200).json({
        success: true,
        data: latestResults
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting latest results',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve latest results'
        }
      });
    }
  }
  
  /**
   * Get historical results for a specific health check
   */
  async getHistoricalByHealthCheckId(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      // Validate that health check exists
      const healthCheck = await healthCheckRepository.findById(id);
      
      if (!healthCheck) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Health check with ID ${id} not found`
          }
        });
      }
      
      // Get paginated results
      const { results, total } = await healthCheckRepository.getResultsByHealthCheckId(
        id,
        Number(page),
        Number(limit)
      );
      
      return res.status(200).json({
        success: true,
        data: results,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error({
        msg: 'Error getting historical results',
        error: error instanceof Error ? error.message : String(error),
        healthCheckId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve historical results'
        }
      });
    }
  }
  // In ResultController class
async getLogDetails(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const result = await healthCheckRepository.findResultById(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Result with ID ${id} not found`
        }
      });
    }
    
    if (!result.logDetails) {
      return res.status(404).json({
        success: false,
        error: {
          message: `No log details available for this result`
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result.logDetails
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting log details',
      error: error instanceof Error ? error.message : String(error),
      resultId: req.params.id
    });
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve log details'
      }
    });
  }
}
}

// Export controller instance
export const resultController = new ResultController();