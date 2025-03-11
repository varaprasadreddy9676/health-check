"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSystemHealth = void 0;
const os_1 = __importDefault(require("os"));
const logger_1 = __importDefault(require("../../utils/logger"));
const checkSystemHealth = async () => {
    try {
        // Get CPU load average (1 minute)
        const cpuUsage = os_1.default.loadavg()[0];
        // Get memory information
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const freeMemoryPercentage = (freeMemory / totalMemory) * 100;
        // Define thresholds for health
        const cpuThreshold = 0.8; // 80% load
        const memoryThreshold = 20; // 20% free memory
        // Determine if the system is healthy
        const isHighCpu = cpuUsage > cpuThreshold;
        const isLowMemory = freeMemoryPercentage < memoryThreshold;
        const isHealthy = !isHighCpu && !isLowMemory;
        // Create details message
        let details = `CPU load: ${cpuUsage.toFixed(2)}, Free memory: ${freeMemoryPercentage.toFixed(2)}%`;
        if (isHighCpu) {
            details += ', High CPU usage detected';
        }
        if (isLowMemory) {
            details += ', Low memory detected';
        }
        logger_1.default.debug({
            msg: 'System health check',
            cpuUsage,
            freeMemoryPercentage,
            isHealthy,
        });
        return {
            cpuUsage,
            freeMemoryPercentage,
            totalMemory,
            freeMemory,
            isHealthy,
            details,
        };
    }
    catch (error) {
        logger_1.default.error({
            msg: 'Error checking system health',
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            cpuUsage: -1,
            freeMemoryPercentage: -1,
            totalMemory: -1,
            freeMemory: -1,
            isHealthy: false,
            details: `Error checking system health: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
};
exports.checkSystemHealth = checkSystemHealth;
//# sourceMappingURL=systemCheck.js.map