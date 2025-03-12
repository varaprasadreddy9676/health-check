# Data Models

This document describes the data models used in the Health Check Service.

## Overview

The Health Check Service uses MongoDB as its primary data store, with the following collections:

- **healthChecks**: Stores health check configurations
- **healthCheckResults**: Stores the results of health check executions
- **notifications**: Records of sent notifications
- **emailConfig**: Email notification settings
- **subscriptions**: User subscriptions to health check notifications

## Health Check Model

The HealthCheck model defines a health check configuration.

### Schema

```typescript
{
  id: string;                  // MongoDB ObjectID
  name: string;                // Name of the health check
  type: string;                // Type: API, PROCESS, SERVICE, SERVER
  enabled: boolean;            // Whether the health check is enabled
  checkInterval: number;       // Interval in seconds between checks
  notifyOnFailure: boolean;    // Whether to send notifications on failure
  
  // API specific fields
  endpoint?: string;           // URL to check (for API type)
  timeout?: number;            // Timeout in milliseconds (for API type)
  
  // Process specific fields
  processKeyword?: string;     // Process name or keyword (for PROCESS type)
  port?: number;               // Port to check (for PROCESS type)
  
  // Service specific fields
  customCommand?: string;      // Command to execute (for SERVICE type)
  expectedOutput?: string;     // Expected output text (for SERVICE type)
  
  // Restart capability
  restartCommand?: string;     // Command to restart the service
  
  // Timestamps
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last update timestamp
}
```

### Indexes

- `{ type: 1 }`: For filtering by type
- `{ enabled: 1 }`: For filtering by enabled status

## Result Model

The Result model stores the results of health check executions.

### Schema

```typescript
{
  id: string;                  // MongoDB ObjectID
  healthCheckId: string;       // Reference to health check
  status: string;              // Status: Healthy, Unhealthy
  details?: string;            // Details about the result
  memoryUsage?: number;        // Memory usage percentage (for PROCESS and SERVER types)
  cpuUsage?: number;           // CPU usage percentage (for PROCESS and SERVER types)
  responseTime?: number;       // Response time in milliseconds (for API type)
  createdAt: Date;             // Timestamp when the check was executed
}
```

### Indexes

- `{ healthCheckId: 1 }`: For filtering by health check
- `{ createdAt: -1 }`: For sorting by timestamp (newest first)
- `{ status: 1 }`: For filtering by status
- `{ healthCheckId: 1, createdAt: -1 }`: For efficient pagination of a specific health check's results

## Notification Model

The Notification model records sent notifications.

### Schema

```typescript
{
  id: string;                  // MongoDB ObjectID
  type: string;                // Type: email, slack (future)
  subject: string;             // Notification subject
  content: string;             // Notification content (HTML for email)
  recipients: string[];        // Array of recipient email addresses
  status: string;              // Status: sent, failed
  createdAt: Date;             // Timestamp when the notification was sent
}
```

### Indexes

- `{ type: 1 }`: For filtering by type
- `{ status: 1 }`: For filtering by status
- `{ createdAt: -1 }`: For sorting by timestamp (newest first)

## Email Config Model

The EmailConfig model stores email notification settings.

### Schema

```typescript
{
  id: string;                  // MongoDB ObjectID
  recipients: string[];        // Default recipients for notifications
  throttleMinutes: number;     // Throttle period in minutes
  enabled: boolean;            // Whether email notifications are enabled
  lastSentAt?: Date;           // Timestamp of the last sent notification
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last update timestamp
}
```

This is a singleton collection (only one document).

## Subscription Model

The Subscription model stores user subscriptions to health check notifications.

### Schema

```typescript
{
  id: string;                    // MongoDB ObjectID
  email: string;                 // Subscriber email address
  healthCheckId?: string;        // Reference to health check (null for all)
  active: boolean;               // Whether the subscription is active
  severity: string;              // Minimum severity: all, high, critical
  verifiedAt?: Date;             // Timestamp when the subscription was verified
  verifyToken?: string;          // Verification token
  unsubscribeToken: string;      // Unsubscribe token
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}
```

### Indexes

- `{ email: 1, healthCheckId: 1 }`: For uniqueness and filtering
- `{ verifyToken: 1 }`: For looking up by verification token
- `{ unsubscribeToken: 1 }`: For looking up by unsubscribe token
- `{ email: 1 }`: For filtering by email
- `{ active: 1, severity: 1 }`: For filtering active subscriptions by severity

## Relationships

### Health Check to Results

- One-to-many relationship
- Health check has many results
- Implemented with a foreign key (`healthCheckId`) in the Result model

### Health Check to Subscriptions

- One-to-many relationship
- Health check has many subscriptions
- Implemented with a foreign key (`healthCheckId`) in the Subscription model
- Null `healthCheckId` indicates a subscription to all health checks

## Data Flow Examples

### Health Check Execution Flow

1. Scheduler triggers a health check
2. Health check is executed
3. Result is saved to the `healthCheckResults` collection
4. If unhealthy and `notifyOnFailure` is true:
   - Relevant subscribers are determined based on `healthCheckId` and `severity`
   - Notification is sent
   - Notification record is saved to the `notifications` collection

### Subscription Flow

1. User creates a subscription
2. Subscription is saved to the `subscriptions` collection with `active: false`
3. Verification email is sent
4. User clicks verification link
5. Subscription is updated with `active: true` and `verifiedAt: Date`
6. Confirmation email is sent