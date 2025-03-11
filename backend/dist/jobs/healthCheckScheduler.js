"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = __importDefault(require("../utils/logger"));
const healthCheckService_1 = require("../services/healthCheckService");
const factory_1 = require("../repositories/factory");
class HealthCheckScheduler {
    constructor() {
        this.defaultInterval = '*/5 * * * *'; // Default: every 5 minutes
        this.cronJobs = new Map();
        this.isRunning = false;
        logger_1.default.info('Health check scheduler initialized');
    }
    // Start the scheduler
    async start() {
        try {
            logger_1.default.info('Starting health check scheduler');
            // Initialize all health check jobs
            await this.initializeJobs();
            // Schedule a job to refresh health checks every hour
            // This ensures any newly added checks are scheduled
            node_cron_1.default.schedule('0 * * * *', async () => {
                logger_1.default.info('Refreshing health check jobs');
                await this.refreshJobs();
            });
            // Job to run all health checks at once
            // This runs every 30 minutes as a fallback
            node_cron_1.default.schedule('*/30 * * * *', async () => {
                if (!this.isRunning) {
                    this.isRunning = true;
                    try {
                        logger_1.default.info('Running all health checks');
                        await healthCheckService_1.healthCheckService.runAllHealthChecks();
                    }
                    catch (error) {
                        logger_1.default.error({
                            msg: 'Error running all health checks',
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                    finally {
                        this.isRunning = false;
                    }
                }
                else {
                    logger_1.default.info('Health checks already running, skipping');
                }
            });
            logger_1.default.info('Health check scheduler started');
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Failed to start health check scheduler',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Initialize individual health check jobs
    async initializeJobs() {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            // Get all enabled health checks
            const healthChecks = await healthCheckRepository.findAll({ enabled: true });
            for (const healthCheck of healthChecks) {
                this.scheduleHealthCheck(healthCheck);
            }
            logger_1.default.info(`Initialized ${healthChecks.length} health check jobs`);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error initializing health check jobs',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Schedule a single health check
    scheduleHealthCheck(healthCheck) {
        try {
            // Convert interval from seconds to cron expression
            // Default is to use the default cron schedule (every 5 minutes)
            let cronExpression = this.defaultInterval;
            // If check interval is specified and valid, use it
            if (healthCheck.checkInterval && healthCheck.checkInterval >= 60) {
                // For intervals of minutes, use simple */n expression
                if (healthCheck.checkInterval % 60 === 0) {
                    const minutes = healthCheck.checkInterval / 60;
                    cronExpression = `*/${minutes} * * * *`;
                }
                else {
                    // For more complex intervals, just stick with the default
                    logger_1.default.warn({
                        msg: `Health check interval not divisible by 60, using default interval`,
                        healthCheckId: healthCheck.id,
                        interval: healthCheck.checkInterval,
                    });
                }
            }
            // Stop existing job if it exists
            if (this.cronJobs.has(healthCheck.id)) {
                const job = this.cronJobs.get(healthCheck.id);
                if (job) {
                    job.stop();
                }
                this.cronJobs.delete(healthCheck.id);
            }
            // Create new job
            const job = node_cron_1.default.schedule(cronExpression, async () => {
                try {
                    logger_1.default.info({
                        msg: `Running scheduled health check`,
                        healthCheckId: healthCheck.id,
                        name: healthCheck.name,
                    });
                    await healthCheckService_1.healthCheckService.forceHealthCheck(healthCheck.id);
                }
                catch (error) {
                    logger_1.default.error({
                        msg: 'Error executing scheduled health check',
                        error: error instanceof Error ? error.message : String(error),
                        healthCheckId: healthCheck.id,
                    });
                }
            });
            // Store the job
            this.cronJobs.set(healthCheck.id, job);
            logger_1.default.info({
                msg: `Scheduled health check`,
                healthCheckId: healthCheck.id,
                name: healthCheck.name,
                cronExpression,
            });
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error scheduling health check',
                error: error instanceof Error ? error.message : String(error),
                healthCheckId: healthCheck.id,
            });
        }
    }
    // Refresh all health check jobs
    async refreshJobs() {
        try {
            const healthCheckRepository = (0, factory_1.getHealthCheckRepository)();
            // Get all health checks
            const healthChecks = await healthCheckRepository.findAll();
            // Create a set of current health check IDs
            const currentIds = new Set(healthChecks.map(hc => hc.id));
            // Stop jobs for health checks that no longer exist
            for (const [id, job] of this.cronJobs.entries()) {
                if (!currentIds.has(id)) {
                    job.stop();
                    this.cronJobs.delete(id);
                    logger_1.default.info({
                        msg: `Removed job for deleted health check`,
                        healthCheckId: id,
                    });
                }
            }
            // Update or create jobs for current health checks
            for (const healthCheck of healthChecks) {
                if (healthCheck.enabled) {
                    this.scheduleHealthCheck(healthCheck);
                }
                else if (this.cronJobs.has(healthCheck.id)) {
                    // Stop job for disabled health checks
                    const job = this.cronJobs.get(healthCheck.id);
                    if (job) {
                        job.stop();
                    }
                    this.cronJobs.delete(healthCheck.id);
                    logger_1.default.info({
                        msg: `Stopped job for disabled health check`,
                        healthCheckId: healthCheck.id,
                        name: healthCheck.name,
                    });
                }
            }
            logger_1.default.info(`Refreshed health check jobs, active jobs: ${this.cronJobs.size}`);
        }
        catch (error) {
            logger_1.default.error({
                msg: 'Error refreshing health check jobs',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
exports.healthCheckScheduler = new HealthCheckScheduler();
//# sourceMappingURL=healthCheckScheduler.js.map