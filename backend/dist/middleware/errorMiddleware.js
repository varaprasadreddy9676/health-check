"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const error_1 = require("../utils/error");
const logger_1 = __importDefault(require("../utils/logger"));
// Error handler middleware
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger_1.default.error({
        msg: 'Error caught by middleware',
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    // Handle operational errors
    if (err instanceof error_1.AppError && err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.name,
                message: err.message,
            },
        });
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'DATABASE_ERROR',
                message: 'A database error occurred',
            },
        });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: err.message,
            },
        });
    }
    // For all other errors, return a generic server error
    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        },
    });
};
exports.errorHandler = errorHandler;
// Not found middleware
const notFoundHandler = (req, res, next) => {
    logger_1.default.warn({
        msg: 'Route not found',
        path: req.path,
        method: req.method,
    });
    return res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.path} not found`,
        },
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorMiddleware.js.map