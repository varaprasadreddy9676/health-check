import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import { HealthCheckRepository } from './interfaces/HealthCheckRepository';
import { IncidentRepository } from './interfaces/IncidentRepository';
import { NotificationRepository } from './interfaces/NotificationRepository';

// MongoDB implementations
import { HealthCheckMongoRepository } from './implementations/mongodb/HealthCheckMongoRepository';
import { IncidentMongoRepository } from './implementations/mongodb/IncidentMongoRepository';
import { NotificationMongoRepository } from './implementations/mongodb/NotificationMongoRepository';

// Prisma (PostgreSQL) implementations 
// import { HealthCheckPrismaRepository } from './implementations/prisma/HealthCheckPrismaRepository';
// (We would import other Prisma implementations here)

// Database connection instances
let mongoClient: MongoClient | null = null;
let prismaClient: PrismaClient | null = null;

// Repository instances
let healthCheckRepository: HealthCheckRepository | null = null;
let incidentRepository: IncidentRepository | null = null;
let notificationRepository: NotificationRepository | null = null;

// Initialize database clients based on configuration
export async function initDatabases(dbType: 'mongodb' | 'postgresql') {
  if (dbType === 'mongodb') {
    // Initialize MongoDB client
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/health_check_service';
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    // Initialize repositories with MongoDB implementations
    healthCheckRepository = new HealthCheckMongoRepository(mongoClient);
    incidentRepository = new IncidentMongoRepository(mongoClient);
    notificationRepository = new NotificationMongoRepository(mongoClient);
  } 
  else if (dbType === 'postgresql') {
    // Initialize Prisma client
    prismaClient = new PrismaClient();
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
export function getHealthCheckRepository(): HealthCheckRepository {
  if (!healthCheckRepository) {
    throw new Error('Database not initialized. Call initDatabases() first.');
  }
  return healthCheckRepository;
}

export function getIncidentRepository(): IncidentRepository {
  if (!incidentRepository) {
    throw new Error('Database not initialized. Call initDatabases() first.');
  }
  return incidentRepository;
}

export function getNotificationRepository(): NotificationRepository {
  if (!notificationRepository) {
    throw new Error('Database not initialized. Call initDatabases() first.');
  }
  return notificationRepository;
}

// Clean up database connections
export async function closeDatabases() {
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