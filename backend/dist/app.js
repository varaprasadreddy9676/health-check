"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
// Create Express application
const app = (0, express_1.default)();
// Apply middleware
app.use((0, helmet_1.default)()); // Security headers
app.use((0, cors_1.default)()); // CORS handling
app.use(express_1.default.json()); // Parse JSON bodies
app.use(express_1.default.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Request logging middleware
app.use((req, res, next) => {
    logger_1.default.info({
        msg: 'Request received',
        method: req.method,
        path: req.path,
        ip: req.ip,
    });
    next();
});
// API routes
app.use('/api', routes_1.default);
// Health check for the app itself
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});
// Handle 404 errors
app.use(errorMiddleware_1.notFoundHandler);
// Error handler
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map