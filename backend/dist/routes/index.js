"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthCheckRoutes_1 = __importDefault(require("./healthCheckRoutes"));
const healthCheckResultRoutes_1 = __importDefault(require("./healthCheckResultRoutes"));
const incidentRoutes_1 = __importDefault(require("./incidentRoutes"));
const notificationRoutes_1 = __importDefault(require("./notificationRoutes"));
const actionRoutes_1 = __importDefault(require("./actionRoutes"));
const statusRoutes_1 = __importDefault(require("./statusRoutes"));
const router = (0, express_1.Router)();
// API Routes
router.use('/healthchecks', healthCheckRoutes_1.default);
router.use('/results', healthCheckResultRoutes_1.default);
router.use('/incidents', incidentRoutes_1.default);
router.use('/notifications', notificationRoutes_1.default);
router.use('/actions', actionRoutes_1.default);
router.use('/status', statusRoutes_1.default);
// Health endpoint for the API itself
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        },
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map