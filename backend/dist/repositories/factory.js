"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabases = initDatabases;
exports.getHealthCheckRepository = getHealthCheckRepository;
exports.getIncidentRepository = getIncidentRepository;
exports.getNotificationRepository = getNotificationRepository;
exports.closeDatabases = closeDatabases;
const mongodb_1 = require("mongodb");
const client_1 = require("@prisma/client");
// MongoDB implementations
const HealthCheckMongoRepository_1 = require("./implementations/mongodb/HealthCheckMongoRepository");
const IncidentMongoRepository_1 = require("./implementations/mongodb/IncidentMongoRepository");
const NotificationMongoRepository_1 = require("./implementations/mongodb/NotificationMongoRepository");
// Prisma (PostgreSQL) implementations 
// import { HealthCheckPrismaRepository } from './implementations/prisma/HealthCheckPrismaRepository';
// (We would import other Prisma implementations here)
// Database connection instances
let mongoClient = null;
let prismaClient = null;
// Repository instances
let healthCheckRepository = null;
let incidentRepository = null;
let notificationRepository = null;
// Initialize database clients based on configuration
async function initDatabases(dbType) {
    if (dbType === 'mongodb') {
        // Initialize MongoDB client
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/health_check_service';
        mongoClient = new mongodb_1.MongoClient(mongoUri);
        await mongoClient.connect();
        // Initialize repositories with MongoDB implementations
        healthCheckRepository = new HealthCheckMongoRepository_1.HealthCheckMongoRepository(mongoClient);
        incidentRepository = new IncidentMongoRepository_1.IncidentMongoRepository(mongoClient);
        notificationRepository = new NotificationMongoRepository_1.NotificationMongoRepository(mongoClient);
    }
    else if (dbType === 'postgresql') {
        // Initialize Prisma client
        prismaClient = new client_1.PrismaClient();
        await prismaClient.$connect();
        // Initialize repositories with Prisma implementations
        // healthCheckRepository = new HealthCheckPrismaRepository(prismaClient);
        // incidentRepository = new IncidentPrismaRepository(prismaClient);
        // notificationRepository = new NotificationPrismaRepository(prismaClient);
    }
    else {
        throw new Error(`Unsupported database type: ${dbType}`);
    }
}
// Factory methods to get repositories
function getHealthCheckRepository() {
    if (!healthCheckRepository) {
        throw new Error('Database not initialized. Call initDatabases() first.');
    }
    return healthCheckRepository;
}
function getIncidentRepository() {
    if (!incidentRepository) {
        throw new Error('Database not initialized. Call initDatabases() first.');
    }
    return incidentRepository;
}
function getNotificationRepository() {
    if (!notificationRepository) {
        throw new Error('Database not initialized. Call initDatabases() first.');
    }
    return notificationRepository;
}
// Clean up database connections
async function closeDatabases() {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
    }
    if (prismaClient) {
        await prismaClient.$disconnect();
        prismaClient = null;
    }
    // Reset repositories
    healthCheckRepository = null;
    incidentRepository = null;
    notificationRepository = null;
}
//# sourceMappingURL=factory.js.map