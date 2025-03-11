/**
 * MongoDB seed script to initialize the database with default settings and sample data
 * Run with: node scripts/mongo-seed.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function seedDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/health_check_service';
  console.log(`Connecting to MongoDB at ${mongoUri}`);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Create default email config if it doesn't exist
    const emailConfigCollection = db.collection('emailConfig');
    const emailConfig = await emailConfigCollection.findOne({});
    
    if (!emailConfig) {
      await emailConfigCollection.insertOne({
        recipients: ['admin@example.com'],
        throttleMinutes: 60,
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created default email config');
    }
    
    // Create default Slack config if it doesn't exist
    const slackConfigCollection = db.collection('slackConfig');
    const slackConfig = await slackConfigCollection.findOne({});
    
    if (!slackConfig) {
      await slackConfigCollection.insertOne({
        webhookUrl: '',
        channel: '#alerts',
        throttleMinutes: 60,
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created default Slack config');
    }
    
    // Create sample health checks if none exist
    const healthChecksCollection = db.collection('healthChecks');
    const healthCheckCount = await healthChecksCollection.countDocuments();
    
    if (healthCheckCount === 0) {
      // Sample health checks
      const sampleHealthChecks = [
        {
          name: 'Example API',
          type: 'API',
          endpoint: 'https://api.example.com/health',
          timeout: 5000,
          checkInterval: 300,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          notifyOnFailure: true
        },
        {
          name: 'Example Process',
          type: 'PROCESS',
          processKeyword: 'node',
          checkInterval: 300,
          enabled: true,
          restartCommand: 'systemctl restart node-service',
          createdAt: new Date(),
          updatedAt: new Date(),
          notifyOnFailure: true
        },
        {
          name: 'Example Service',
          type: 'SERVICE',
          customCommand: 'systemctl status nginx',
          expectedOutput: 'active (running)',
          checkInterval: 300,
          enabled: true,
          restartCommand: 'systemctl restart nginx',
          createdAt: new Date(),
          updatedAt: new Date(),
          notifyOnFailure: true
        },
        {
          name: 'System Health',
          type: 'SERVER',
          checkInterval: 300,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          notifyOnFailure: true
        }
      ];
      
      await healthChecksCollection.insertMany(sampleHealthChecks);
      console.log('Created sample health checks');
    }
    
    // Create indexes for collections
    
    // Health checks indexes
    await healthChecksCollection.createIndex({ type: 1 });
    await healthChecksCollection.createIndex({ enabled: 1 });
    
    // Health check results indexes
    const healthCheckResultsCollection = db.collection('healthCheckResults');
    await healthCheckResultsCollection.createIndex({ healthCheckId: 1 });
    await healthCheckResultsCollection.createIndex({ createdAt: -1 });
    await healthCheckResultsCollection.createIndex({ status: 1 });
    
    // Incidents indexes
    const incidentsCollection = db.collection('incidents');
    await incidentsCollection.createIndex({ healthCheckId: 1 });
    await incidentsCollection.createIndex({ status: 1 });
    await incidentsCollection.createIndex({ createdAt: -1 });
    
    // Incident events indexes
    const incidentEventsCollection = db.collection('incidentEvents');
    await incidentEventsCollection.createIndex({ incidentId: 1 });
    await incidentEventsCollection.createIndex({ createdAt: -1 });
    
    // Notifications indexes
    const notificationsCollection = db.collection('notifications');
    await notificationsCollection.createIndex({ type: 1 });
    await notificationsCollection.createIndex({ status: 1 });
    await notificationsCollection.createIndex({ createdAt: -1 });
    
    console.log('Created database indexes');
    console.log('Database seeding completed successfully');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase().catch(console.error);