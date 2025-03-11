"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.closeDatabase = closeDatabase;
const factory_1 = require("../repositories/factory");
const environment_1 = require("./environment");
const logger_1 = __importDefault(require("../utils/logger"));
// Initialize database connections
async function initializeDatabase() {
    try {
        const dbType = environment_1.environment.DATABASE_TYPE;
        logger_1.default.info(`Initializing ${dbType} database connection`);
        await (0, factory_1.initDatabases)(dbType);
        logger_1.default.info(`${dbType} database connection established`);
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Failed to initialize database',
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
// Close database connections
async function closeDatabase() {
    try {
        logger_1.default.info('Closing database connections');
        await (0, factory_1.closeDatabases)();
        logger_1.default.info('Database connections closed');
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Error closing database connections',
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
//# sourceMappingURL=database.js.map