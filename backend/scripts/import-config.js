// MongoDB config import script
// Run with: node scripts/import-config.js

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/health_check_service';

async function importConfig() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Read the config file
    const configPath = process.argv[2] || path.join(__dirname, './config.json');
    console.log(`Reading config file from: ${configPath}`);
    
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const checks = configData.checks;
    
    console.log(`Found ${checks.length} health checks in config file`);
    
    // First, clear existing health checks if requested
    if (process.argv.includes('--clear')) {
      console.log('Clearing existing health checks...');
      await db.collection('healthChecks').deleteMany({});
    }
    
    // Prepare health checks for MongoDB
    const now = new Date();
    const healthChecks = checks.map(check => {
      // Fix any type values that end with an underscore
      const type = check.type.endsWith('_') 
        ? check.type.substring(0, check.type.length - 1) 
        : check.type;
      
      // Basic structure for all health checks
      const healthCheck = {
        name: check.name,
        type: type,
        enabled: true,
        checkInterval: 300, // Default to 5 minutes
        notifyOnFailure: true,
        createdAt: now,
        updatedAt: now
      };
      
      // Add type-specific fields
      if (type === 'API') {
        healthCheck.endpoint = check.endpoint;
        healthCheck.timeout = 5000; // Default timeout in ms
      } 
      else if (type === 'PROCESS') {
        healthCheck.processKeyword = check.processKeyword;
        
        if (check.port) {
          healthCheck.port = parseInt(check.port);
        }
        
        if (check.memoryThreshold) {
          healthCheck.memoryThreshold = parseInt(check.memoryThreshold);
        }
        
        if (check.cpuThreshold) {
          healthCheck.cpuThreshold = parseInt(check.cpuThreshold);
        }
      } 
      else if (type === 'SERVICE') {
        healthCheck.customCommand = check.customCommand;
        healthCheck.expectedOutput = check.expectedOutput;
        
        if (check.port) {
          healthCheck.port = parseInt(check.port);
        }
        
        if (check.memoryThreshold) {
          healthCheck.memoryThreshold = parseInt(check.memoryThreshold);
        }
        
        if (check.cpuThreshold) {
          healthCheck.cpuThreshold = parseInt(check.cpuThreshold);
        }
      }
      
      return healthCheck;
    });
    
    // Insert health checks
    if (healthChecks.length > 0) {
      const result = await db.collection('healthChecks').insertMany(healthChecks);
      console.log(`Successfully imported ${result.insertedCount} health checks into MongoDB`);
    } else {
      console.log('No health checks to import');
    }
    
    console.log('Import completed');
  } catch (error) {
    console.error('Error importing config:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the import function
importConfig().catch(console.error);