import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import { HealthCheckRepository } from './interfaces/HealthCheckRepository';
import { IncidentRepository } from './interfaces/IncidentRepository';
import { NotificationRepository } from './interfaces/NotificationRepository';

// MongoDB implementations
import { HealthCheckMongoRepository } from './implementations/mongodb/HealthCheckMongoRepository';
import { IncidentMongoRepository } from './implementations/mongodb/IncidentMongoRepository';
import { NotificationMongoRepository } from './implementations/mongodb/NotificationMongoRepository';

// In-memory fallback implementations
import { HealthCheckMemoryRepository } from './implementations/memory/HealthCheckMemoryRepository';
// We'd need to implement these for full resilience
// import { IncidentMemoryRepository } from './implementations/memory/IncidentMemoryRepository';
// import { NotificationMemoryRepository } from './implementations/memory/NotificationMemoryRepository';

// Database connection instances
let mongoClient: MongoClient | null = null;
let prismaClient: PrismaClient | null = null;

// Repository instances
let healthCheckRepository: HealthCheckRepository | null = null;
let incidentRepository: IncidentRepository | null = null;
let notificationRepository: NotificationRepository | null = null;

// Fallback repositories (in-memory)
let healthCheckMemoryRepository: HealthCheckMemoryRepository | null = null;
// let incidentMemoryRepository: IncidentMemoryRepository | null = null;
// let notificationMemoryRepository: NotificationMemoryRepository | null = null;

// Track database connection state
let isDatabaseConnected = false;
let lastSyncAttempt = 0;
const SYNC_INTERVAL = 60000; // 1 minute

// Initialize database clients based on configuration
export async function initDatabases(dbType: 'mongodb' | 'postgresql') {
  try {
    // Always initialize in-memory repositories as fallbacks
    healthCheckMemoryRepository = new HealthCheckMemoryRepository();
    // incidentMemoryRepository = new IncidentMemoryRepository();
    // notificationMemoryRepository = new NotificationMemoryRepository();
    
    // Set initial repositories to in-memory
    healthCheckRepository = healthCheckMemoryRepository;
    
    // For now, without memory implementations for these, we'll just have null values
    // When database connects, we'll initialize these properly
    
    // Try to connect to the actual database
    await connectToDatabase(dbType);
    
    // Start a background task to check DB connection
    startDbConnectionMonitor(dbType);
  } catch (error) {
    console.error('Failed to initialize databases:', error);
    console.log('Operating in fallback mode with in-memory repositories');
  }
}

// Connect to the database
async function connectToDatabase(dbType: 'mongodb' | 'postgresql'): Promise<boolean> {
  try {
    if (dbType === 'mongodb') {
      // Initialize MongoDB client
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/health_check_service';
      mongoClient = new MongoClient(mongoUri);
      await mongoClient.connect();
      
      // Initialize repositories with MongoDB implementations
      const primaryHealthCheckRepo = new HealthCheckMongoRepository(mongoClient);
      
      // Use type assertion to fix the TypeScript error
      healthCheckRepository = createResilientRepository<HealthCheckRepository>(
        primaryHealthCheckRepo, 
        healthCheckMemoryRepository as HealthCheckRepository
      );
      
      // Without memory implementations yet, just use direct MongoDB repositories
      incidentRepository = new IncidentMongoRepository(mongoClient);
      notificationRepository = new NotificationMongoRepository(mongoClient);
      
      console.log('Connected to MongoDB database');
    } 
    else if (dbType === 'postgresql') {
      // Initialize Prisma client
      prismaClient = new PrismaClient();
      await prismaClient.$connect();
      
      // Initialize repositories with Prisma implementations
      // These would need to be implemented
      console.log('Connected to PostgreSQL database');
    }
    else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }
    
    isDatabaseConnected = true;
    
    // If we had data in memory, sync it to the database
    await syncMemoryToDB();
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    isDatabaseConnected = false;
    return false;
  }
}

// Monitor database connection and attempt reconnection
function startDbConnectionMonitor(dbType: 'mongodb' | 'postgresql') {
  setInterval(async () => {
    if (!isDatabaseConnected) {
      console.log('Attempting to reconnect to database...');
      const connected = await connectToDatabase(dbType);
      
      if (connected) {
        console.log('Successfully reconnected to database');
      } else {
        console.log('Database reconnection failed, continuing with in-memory repositories');
      }
    } else {
      // Check if we need to sync memory to DB
      await syncMemoryToDB();
    }
  }, 30000); // Check every 30 seconds
}

// Sync in-memory data to database if needed
async function syncMemoryToDB() {
  const now = Date.now();
  
  // Only attempt sync if enough time has passed since last attempt
  if (now - lastSyncAttempt < SYNC_INTERVAL) {
    return;
  }
  
  lastSyncAttempt = now;
  
  try {
    if (isDatabaseConnected && healthCheckMemoryRepository && healthCheckMemoryRepository.isDirty()) {
      console.log('Syncing in-memory data to database...');
      
      // Get all data from memory
      const memoryData = healthCheckMemoryRepository.getAllData();
      
      // Sync health checks
      for (const check of memoryData.healthChecks) {
        // This is simplified - would need more logic to handle updates vs inserts
        // and to ensure we don't overwrite newer DB data with older memory data
        // We need to remove the id since it might conflict with existing data
        const { id, ...checkData } = check;
        await healthCheckRepository!.create(checkData as any);
      }
      
      // Sync results
      for (const result of memoryData.results) {
        // Remove id to avoid conflicts
        const { id, ...resultData } = result;
        await healthCheckRepository!.saveResult(resultData as any);
      }
      
      // Reset dirty flag
      healthCheckMemoryRepository.resetDirtyFlag();
      
      console.log('Sync completed successfully');
    }
  } catch (error) {
    console.error('Error during memory-to-DB sync:', error);
  }
}

// Create a resilient repository that falls back to memory if the primary fails
// Fix the TypeScript error by adding a constraint to the type parameter
function createResilientRepository<T extends object>(
  primaryRepo: T,
  fallbackRepo: T
): T {
  // Create a proxy that wraps all method calls
  return new Proxy(primaryRepo, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      
      // If not a function, just return the property
      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }
      
      // Return a wrapped function that has fallback behavior
      return async function(...args: any[]) {
        try {
          if (!isDatabaseConnected) {
            throw new Error('Database is not connected');
          }
          
          // Try the primary repository first
          return await originalMethod.apply(target, args);
        } catch (error) {
          console.warn(`Primary repository method ${String(prop)} failed, using fallback:`, error);
          
          // If primary fails, use the fallback repository
          const fallbackMethod = Reflect.get(fallbackRepo, prop, receiver);
          if (typeof fallbackMethod === 'function') {
            return fallbackMethod.apply(fallbackRepo, args);
          } else {
            throw new Error(`Fallback method ${String(prop)} not found`);
          }
        }
      };
    }
  }) as T;
}

// Factory methods to get repositories
export function getHealthCheckRepository(): HealthCheckRepository {
  if (!healthCheckRepository) {
    throw new Error('Database not initialized. Call initDatabases() first.');
  }
  return healthCheckRepository;
}

// In repositories/factory.ts
export function getIncidentRepository(): IncidentRepository {
  if (!incidentRepository) {
    console.error('CRITICAL: Incident repository is NOT initialized!');
    throw new Error('Database not initialized. Call initDatabases() first.');
  }
  
  // Add a log to verify the repository is being used
  console.log('Incident Repository retrieved:', 
    typeof incidentRepository.findAll === 'function' ? 'Valid Repository' : 'INVALID Repository'
  );
  
  return incidentRepository;
}

export function getNotificationRepository(): NotificationRepository {
  if (!notificationRepository) {
    throw new Error('Database not initialized. Call initDatabases() first.');
  }
  return notificationRepository;
}

// Check database connection status
export function isDatabaseAvailable(): boolean {
  return isDatabaseConnected;
}

// Clean up database connections
export async function closeDatabases() {
  try {
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
    
    // Reset fallback repositories
    healthCheckMemoryRepository = null;
    
    isDatabaseConnected = false;
    
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}