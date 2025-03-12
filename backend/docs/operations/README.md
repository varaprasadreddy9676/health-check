# Operations Guide

This document provides guidance for deploying, running, and maintaining the Health Check Service in production.

## Deployment

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- SMTP server for email notifications
- SSL certificate for HTTPS

### Deployment Options

#### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t health-check-service .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env health-check-service
   ```

#### Docker Compose

```bash
docker-compose up -d
```

#### Kubernetes

Example kubectl command:
```bash
kubectl apply -f kubernetes/deployment.yaml
```

#### Traditional Deployment

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd health-check-service
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Set up environment variables or create a `.env` file.

5. Start the application:
   ```bash
   npm start
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development, production) | `development` |
| `PORT` | HTTP port | `3000` |
| `HOST` | Host address | `0.0.0.0` |
| `BASE_URL` | Base URL for links in emails | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/health_check_service` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use TLS for SMTP | `false` |
| `SMTP_USER` | SMTP server username | |
| `SMTP_PASS` | SMTP server password | |
| `EMAIL_FROM` | Sender email address | `healthcheck@example.com` |
| `LOG_LEVEL` | Logging level | `info` |
| `DEFAULT_CHECK_INTERVAL` | Default check interval in seconds | `300` |
| `EMAIL_THROTTLE_MINUTES` | Email throttling in minutes | `60` |

## Monitoring

### Health Endpoints

- **API Health**: `GET /api/health`
- **System Status**: `GET /api/status/health`

Example health check response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2023-01-15T12:00:00.000Z",
  "database": "connected",
  "scheduler": "running",
  "activeJobs": 10,
  "message": "All systems operational"
}
```

### Logs

The application uses Pino for logging. In production, logs are output in JSON format for easy parsing by log aggregation tools.

Example log entry:
```json
{
  "level": 30,
  "time": 1673232000000,
  "pid": 12345,
  "hostname": "server-1",
  "msg": "Health check completed",
  "id": "60d21b4667d0d8992e610c85",
  "name": "API Server",
  "status": "Healthy",
  "isHealthy": true
}
```

### Metrics

The following metrics endpoints are available:

- **Health Check Metrics**: `GET /api/healthchecks/metrics`
- **Status Summary**: `GET /api/status/summary`

These endpoints provide metrics on:
- Total number of health checks
- Number of enabled health checks
- Number of unhealthy checks
- Distribution by type
- Overall system status

## Database Management

### Backup

It's recommended to set up regular backups of the MongoDB database. Example using `mongodump`:

```bash
mongodump --uri="mongodb://localhost:27017/health_check_service" --out=/backup/path
```

### Restore

To restore from a backup:

```bash
mongorestore --uri="mongodb://localhost:27017/health_check_service" /backup/path
```

### Indexes

The application creates necessary indexes automatically, but you can manually create them if needed:

```javascript
db.healthChecks.createIndex({ type: 1 });
db.healthChecks.createIndex({ enabled: 1 });
db.healthCheckResults.createIndex({ healthCheckId: 1 });
db.healthCheckResults.createIndex({ createdAt: -1 });
db.healthCheckResults.createIndex({ status: 1 });
db.healthCheckResults.createIndex({ healthCheckId: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ status: 1 });
db.notifications.createIndex({ createdAt: -1 });
db.subscriptions.createIndex({ email: 1, healthCheckId: 1 }, { unique: true });
db.subscriptions.createIndex({ verifyToken: 1 }, { sparse: true });
db.subscriptions.createIndex({ unsubscribeToken: 1 });
db.subscriptions.createIndex({ email: 1 });
db.subscriptions.createIndex({ active: 1, severity: 1 });
```

## Maintenance

### Updating

1. Pull the latest code:
   ```bash
   git pull origin main
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Restart the service.

### Scaling

The service is designed to be horizontally scalable:

- **Multiple instances**: You can run multiple instances behind a load balancer.
- **Stateless design**: The application doesn't store any state in memory that can't be recovered.

### Troubleshooting

#### Service Not Starting

1. Check environment variables
2. Verify MongoDB connection
3. Check logs for errors
4. Ensure the port is not in use

#### Health Checks Not Running

1. Check if the scheduler service is running
2. Verify that health checks are enabled
3. Check logs for errors in health check execution

#### Email Notifications Not Being Sent

1. Verify SMTP configuration
2. Check if email notifications are enabled in the database
3. Verify that there are recipients configured
4. Check if throttling is preventing notifications
5. Check logs for email-related errors

## Security

### SSL/TLS

In production, always use HTTPS. You can set up an Nginx reverse proxy with SSL:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Authentication

For production use, implement authentication. Options include:

- Basic Authentication
- JWT-based authentication
- OAuth2 integration
- Integration with an identity provider

### Regular Updates

Regularly update dependencies to address security vulnerabilities:

```bash
npm audit
npm audit fix
```

## Disaster Recovery

### Recovery Steps

1. Restore the MongoDB database from the latest backup
2. Deploy the application with the same configuration
3. Verify the health of the system using the health endpoints
4. Check that scheduled health checks are running

### Data Retention

Consider implementing a data retention policy for results and notifications:

```javascript
// Example: Delete results older than 90 days
db.healthCheckResults.deleteMany({ createdAt: { $lt: new Date(Date.now() - 90*24*60*60*1000) } });

// Example: Delete notifications older than 30 days
db.notifications.deleteMany({ createdAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) } });
```