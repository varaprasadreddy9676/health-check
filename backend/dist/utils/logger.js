"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const environment_1 = require("../config/environment");
const transport = pino_1.default.transport({
    target: 'pino-pretty',
    options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
    },
});
const logger = (0, pino_1.default)({
    level: environment_1.environment.LOG_LEVEL || 'info',
    base: undefined,
}, environment_1.environment.NODE_ENV === 'production' ? undefined : transport);
exports.default = logger;
//# sourceMappingURL=logger.js.map