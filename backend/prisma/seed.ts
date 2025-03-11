import { PrismaClient } from '@prisma/client';
import { environment } from '../src/config/environment';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default email config if it doesn't exist
  const emailConfig = await prisma.emailConfig.findFirst();
  if (!emailConfig) {
    await prisma.emailConfig.create({
      data: {
        recipients: ['admin@example.com'],
        throttleMinutes: 60,
        enabled: false,
      },
    });
    console.log('Created default email config');
  }

  // Create default Slack config if it doesn't exist
  const slackConfig = await prisma.slackConfig.findFirst();
  if (!slackConfig) {
    await prisma.slackConfig.create({
      data: {
        webhookUrl: '',
        channel: '#alerts',
        throttleMinutes: 60,
        enabled: false,
      },
    });
    console.log('Created default Slack config');
  }

  // Create sample health checks if none exist
  const healthCheckCount = await prisma.healthCheck.count();
  if (healthCheckCount === 0) {
    // Create sample API health check
    await prisma.healthCheck.create({
      data: {
        name: 'Example API',
        type: 'API',
        endpoint: 'https://api.example.com/health',
        timeout: 5000,
        checkInterval: 300,
        enabled: true,
      },
    });

    // Create sample process health check
    await prisma.healthCheck.create({
      data: {
        name: 'Example Process',
        type: 'PROCESS',
        processKeyword: 'node',
        checkInterval: 300,
        enabled: true,
        restartCommand: 'systemctl restart node-service',
      },
    });

    // Create sample service health check
    await prisma.healthCheck.create({
      data: {
        name: 'Example Service',
        type: 'SERVICE',
        customCommand: 'systemctl status nginx',
        expectedOutput: 'active (running)',
        checkInterval: 300,
        enabled: true,
        restartCommand: 'systemctl restart nginx',
      },
    });

    // Create system health check
    await prisma.healthCheck.create({
      data: {
        name: 'System Health',
        type: 'SERVER',
        checkInterval: 300,
        enabled: true,
      },
    });

    console.log('Created sample health checks');
  }

  console.log('Database seeding completed');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });