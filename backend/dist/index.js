"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const environment_1 = require("./config/environment");
const logger_1 = __importDefault(require("./utils/logger"));
const healthCheckScheduler_1 = require("./jobs/healthCheckScheduler");
const database_1 = require("./config/database");
// Start the server
const startServer = async () => {
    try {
        // Connect to the database
        await (0, database_1.initializeDatabase)();
        logger_1.default.info('Connected to database');
        // Start the HTTP server
        const server = app_1.default.listen(environment_1.environment.PORT, environment_1.environment.HOST, () => {
            logger_1.default.info({
                msg: `Server started`,
                host: environment_1.environment.HOST,
                port: environment_1.environment.PORT,
                env: environment_1.environment.NODE_ENV,
            });
        });
        // Start the health check scheduler
        await healthCheckScheduler_1.healthCheckScheduler.start();
        // Handle graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger_1.default.info({
                msg: `${signal} received, starting graceful shutdown`,
            });
            // Close the HTTP server
            server.close(() => {
                logger_1.default.info('HTTP server closed');
            });
            // Disconnect from the database
            await (0, database_1.closeDatabase)();
            logger_1.default.info('Database connection closed');
            // Exit the process
            process.exit(0);
        };
        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.default.error({
                msg: 'Unhandled promise rejection',
                reason,
                promise,
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.default.error({
                msg: 'Uncaught exception',
                error: error.message,
                stack: error.stack,
            });
            // Exit with error
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Failed to start server',
            error: error instanceof Error ? error.message : String(error),
        });
        // Exit with error
        process.exit(1);
    }
};
// Start the server
startServer();
//# sourceMappingURL=index.js.map