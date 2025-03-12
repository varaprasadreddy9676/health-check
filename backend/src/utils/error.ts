/**
 * Custom application error class
 */
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    
    constructor(message: string, statusCode: number, isOperational = true) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      
      // Maintain proper stack trace for debugging
      Error.captureStackTrace(this, this.constructor);
      
      // Set the prototype explicitly
      Object.setPrototypeOf(this, AppError.prototype);
    }
  }
  
  /**
   * Common HTTP error status codes
   */
  export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  };
  
  /**
   * Factory functions for common errors
   */
  export const createError = {
    badRequest: (message: string) => new AppError(message, HTTP_STATUS.BAD_REQUEST),
    unauthorized: (message: string) => new AppError(message, HTTP_STATUS.UNAUTHORIZED),
    forbidden: (message: string) => new AppError(message, HTTP_STATUS.FORBIDDEN),
    notFound: (message: string) => new AppError(message, HTTP_STATUS.NOT_FOUND),
    conflict: (message: string) => new AppError(message, HTTP_STATUS.CONFLICT),
    internal: (message: string) => new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false),
  };