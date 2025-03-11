"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkApiHealth = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../../utils/logger"));
const checkApiHealth = async (healthCheck) => {
    const startTime = Date.now();
    if (!healthCheck.endpoint) {
        return {
            isHealthy: false,
            details: 'No endpoint URL provided',
        };
    }
    try {
        const timeout = healthCheck.timeout || 5000;
        const response = await axios_1.default.get(healthCheck.endpoint, {
            timeout,
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Resolve only if the status code is less than 300
            }
        });
        const responseTime = Date.now() - startTime;
        return {
            isHealthy: true,
            details: `API Health Check Passed. Status Code: ${response.status}`,
            responseTime,
        };
    }
    catch (error) {
        logger_1.default.error({
            msg: `API Health Check Failed for URL: ${healthCheck.endpoint}`,
            error: error instanceof Error ? error.message : String(error),
            name: healthCheck.name,
        });
        return {
            isHealthy: false,
            details: `API Health Check Failed: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: Date.now() - startTime,
        };
    }
};
exports.checkApiHealth = checkApiHealth;
//# sourceMappingURL=apiCheck.js.map