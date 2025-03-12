# API Documentation

This document describes the Health Check Service API endpoints, request/response formats, and usage examples.

## Base URL

All API URLs in this documentation are relative to the base URL:

```
http://localhost:3000/api
```

## Authentication

The API currently does not implement authentication. This should be implemented before production use.

## Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "details": [ ... ] // Optional validation errors
  }
}
```

## Health Check Endpoints

### Get All Health Checks

Retrieves all health check configurations.

- **URL:** `/healthchecks`
- **Method:** `GET`
- **Query Parameters:**
  - `type` (optional): Filter by type (API, PROCESS, SERVICE, SERVER)
  - `enabled` (optional): Filter by enabled status (true, false)

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610c85",
      "name": "API Server",
      "type": "API",
      "enabled": true,
      "checkInterval": 300,
      "endpoint": "https://api.example.com/health",
      "timeout": 5000,
      "notifyOnFailure": true,
      "createdAt": "2023-01-15T12:00:00.000Z",
      "updatedAt": "2023-01-15T12:00:00.000Z"
    },
    {
      "id": "60d21b4667d0d8992e610c86",
      "name": "Web Server",
      "type": "PROCESS",
      "enabled": true,
      "checkInterval": 60,
      "processKeyword": "nginx",
      "notifyOnFailure": true,
      "createdAt": "2023-01-15T12:00:00.000Z",
      "updatedAt": "2023-01-15T12:00:00.000Z"
    }
  ]
}
```

### Get Health Check by ID

Retrieves a specific health check by ID.

- **URL:** `/healthchecks/:id`
- **Method:** `GET`
- **URL Parameters:**
  - `id`: Health check ID

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "API Server",
    "type": "API",
    "enabled": true,
    "checkInterval": 300,
    "endpoint": "https://api.example.com/health",
    "timeout": 5000,
    "notifyOnFailure": true,
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
}
```

### Create Health Check

Creates a new health check.

- **URL:** `/healthchecks`
- **Method:** `POST`
- **Content Type:** `application/json`
- **Request Body:**
  - `name`: Health check name (required)
  - `type`: Health check type (required) - API, PROCESS, SERVICE, SERVER
  - `enabled`: Whether the health check is enabled (optional, default: true)
  - `checkInterval`: Check interval in seconds (optional, default: 300)
  - `notifyOnFailure`: Whether to send notifications on failure (optional, default: true)
  - Type-specific fields:
    - API type:
      - `endpoint`: URL to check (required)
      - `timeout`: Timeout in milliseconds (optional, default: 5000)
    - PROCESS type:
      - `processKeyword`: Process name or keyword (required)
      - `port`: Port to check (optional)
    - SERVICE type:
      - `customCommand`: Command to execute (required)
      - `expectedOutput`: Expected output text (optional)
    - All types:
      - `restartCommand`: Command to restart the service (optional)

**Request Example (API Type):**

```json
{
  "name": "API Server",
  "type": "API",
  "enabled": true,
  "checkInterval": 300,
  "endpoint": "https://api.example.com/health",
  "timeout": 5000,
  "notifyOnFailure": true
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "API Server",
    "type": "API",
    "enabled": true,
    "checkInterval": 300,
    "endpoint": "https://api.example.com/health",
    "timeout": 5000,
    "notifyOnFailure": true,
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
}
```

### Update Health Check

Updates an existing health check.

- **URL:** `/healthchecks/:id`
- **Method:** `PUT`
- **URL Parameters:**
  - `id`: Health check ID
- **Content Type:** `application/json`
- **Request Body:** Same as Create Health Check

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "API Server (Updated)",
    "type": "API",
    "enabled": true,
    "checkInterval": 300,
    "endpoint": "https://api.example.com/health",
    "timeout": 5000,
    "notifyOnFailure": true,
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:01:00.000Z"
  }
}
```

### Delete Health Check

Deletes a health check.

- **URL:** `/healthchecks/:id`
- **Method:** `DELETE`
- **URL Parameters:**
  - `id`: Health check ID

**Response Example:**

```json
{
  "success": true,
  "data": {
    "message": "Health check deleted successfully"
  }
}
```

### Toggle Health Check

Toggles the enabled status of a health check.

- **URL:** `/healthchecks/:id/toggle`
- **Method:** `PATCH`
- **URL Parameters:**
  - `id`: Health check ID

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "API Server",
    "type": "API",
    "enabled": false,
    "checkInterval": 300,
    "endpoint": "https://api.example.com/health",
    "timeout": 5000,
    "notifyOnFailure": true,
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:02:00.000Z"
  }
}
```

### Force Health Check

Forces an immediate health check execution.

- **URL:** `/healthchecks/:id/force-check`
- **Method:** `POST`
- **URL Parameters:**
  - `id`: Health check ID

**Response Example:**

```json
{
  "success": true,
  "data": {
    "isHealthy": true,
    "status": "Healthy",
    "details": "API check passed. Status: 200",
    "responseTime": 123,
    "timestamp": "2023-01-15T12:03:00.000Z"
  }
}
```

### Restart Service

Restarts a service using the configured restart command.

- **URL:** `/healthchecks/:id/restart`
- **Method:** `POST`
- **URL Parameters:**
  - `id`: Health check ID

**Response Example:**

```json
{
  "success": true,
  "data": {
    "details": "Restart command executed. Output: Service restarted",
    "timestamp": "2023-01-15T12:04:00.000Z"
  }
}
```

### Get Health Check Metrics

Gets metrics about health checks.

- **URL:** `/healthchecks/metrics`
- **Method:** `GET`

**Response Example:**

```json
{
  "success": true,
  "data": {
    "total": 10,
    "enabled": 8,
    "unhealthy": 2,
    "byType": {
      "API": 4,
      "PROCESS": 3,
      "SERVICE": 2,
      "SERVER": 1
    }
  }
}
```

## Result Endpoints

### Get Latest Results

Gets the latest result for each health check.

- **URL:** `/results/latest`
- **Method:** `GET`

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610d85",
      "healthCheckId": "60d21b4667d0d8992e610c85",
      "status": "Healthy",
      "details": "API check passed. Status: 200",
      "responseTime": 123,
      "createdAt": "2023-01-15T12:00:30.000Z",
      "healthCheck": {
        "name": "API Server",
        "type": "API"
      }
    },
    {
      "id": "60d21b4667d0d8992e610d86",
      "healthCheckId": "60d21b4667d0d8992e610c86",
      "status": "Unhealthy",
      "details": "Process not running",
      "createdAt": "2023-01-15T12:00:30.000Z",
      "healthCheck": {
        "name": "Web Server",
        "type": "PROCESS"
      }
    }
  ]
}
```

### Get Historical Results

Gets historical results for a specific health check with pagination.

- **URL:** `/results/:id`
- **Method:** `GET`
- **URL Parameters:**
  - `id`: Health check ID
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Results per page (default: 20)

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610d85",
      "healthCheckId": "60d21b4667d0d8992e610c85",
      "status": "Healthy",
      "details": "API check passed. Status: 200",
      "responseTime": 123,
      "createdAt": "2023-01-15T12:00:30.000Z"
    },
    {
      "id": "60d21b4667d0d8992e610d84",
      "healthCheckId": "60d21b4667d0d8992e610c85",
      "status": "Healthy",
      "details": "API check passed. Status: 200",
      "responseTime": 115,
      "createdAt": "2023-01-15T11:55:30.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

## Notification Endpoints

### Get Notification History

Gets notification history with pagination.

- **URL:** `/notifications`
- **Method:** `GET`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Results per page (default: 20)
  - `type` (optional): Notification type (email)

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610e85",
      "type": "email",
      "subject": "Health Check Alert: Web Server is Unhealthy",
      "recipients": ["admin@example.com"],
      "status": "sent",
      "createdAt": "2023-01-15T12:01:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

### Get Email Settings

Gets email notification settings.

- **URL:** `/notifications/settings/email`
- **Method:** `GET`

**Response Example:**

```json
{
  "success": true,
  "data": {
    "recipients": ["admin@example.com", "ops@example.com"],
    "throttleMinutes": 60,
    "enabled": true,
    "lastSentAt": "2023-01-15T12:01:00.000Z"
  }
}
```

### Update Email Settings

Updates email notification settings.

- **URL:** `/notifications/settings/email`
- **Method:** `PUT`
- **Content Type:** `application/json`
- **Request Body:**
  - `recipients`: Array of email addresses (required)
  - `throttleMinutes`: Throttle period in minutes (optional, default: 60)
  - `enabled`: Whether email notifications are enabled (required)

**Request Example:**

```json
{
  "recipients": ["admin@example.com", "ops@example.com"],
  "throttleMinutes": 30,
  "enabled": true
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "recipients": ["admin@example.com", "ops@example.com"],
    "throttleMinutes": 30,
    "enabled": true,
    "lastSentAt": "2023-01-15T12:01:00.000Z"
  }
}
```

### Create Subscription

Creates a new notification subscription.

- **URL:** `/notifications/subscriptions`
- **Method:** `POST`
- **Content Type:** `application/json`
- **Request Body:**
  - `email`: Subscriber email address (required)
  - `healthCheckId`: Health check ID (optional, null for all health checks)
  - `severity`: Minimum severity level to notify (optional, default: "all")
    - Values: "all", "high", "critical"

**Request Example:**

```json
{
  "email": "user@example.com",
  "healthCheckId": "60d21b4667d0d8992e610c85",
  "severity": "high"
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610f85",
    "email": "user@example.com",
    "healthCheckId": "60d21b4667d0d8992e610c85",
    "active": false,
    "verified": false,
    "severity": "high"
  }
}
```

### Get Subscriptions by Email

Gets all subscriptions for an email address.

- **URL:** `/notifications/subscriptions/email/:email`
- **Method:** `GET`
- **URL Parameters:**
  - `email`: Subscriber email address

**Response Example:**

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "subscriptions": [
      {
        "id": "60d21b4667d0d8992e610f85",
        "healthCheckId": "60d21b4667d0d8992e610c85",
        "healthCheckName": "API Server",
        "active": true,
        "verified": true,
        "severity": "high"
      },
      {
        "id": "60d21b4667d0d8992e610f86",
        "healthCheckId": null,
        "healthCheckName": "All health checks",
        "active": true,
        "verified": true,
        "severity": "critical"
      }
    ]
  }
}
```

### Update Subscription

Updates a subscription.

- **URL:** `/notifications/subscriptions/:id`
- **Method:** `PUT`
- **URL Parameters:**
  - `id`: Subscription ID
- **Content Type:** `application/json`
- **Request Body:**
  - `active`: Whether the subscription is active (optional)
  - `severity`: Minimum severity level to notify (optional)
    - Values: "all", "high", "critical"

**Request Example:**

```json
{
  "active": true,
  "severity": "all"
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610f85",
    "email": "user@example.com",
    "healthCheckId": "60d21b4667d0d8992e610c85",
    "healthCheckName": "API Server",
    "active": true,
    "verified": true,
    "severity": "all"
  }
}
```

### Delete Subscription

Deletes a subscription.

- **URL:** `/notifications/subscriptions/:id`
- **Method:** `DELETE`
- **URL Parameters:**
  - `id`: Subscription ID

**Response Example:**

```json
{
  "success": true,
  "data": {
    "message": "Subscription deleted successfully"
  }
}
```

### Verify Subscription

Verifies a subscription using a token.

- **URL:** `/notifications/subscriptions/verify/:token`
- **Method:** `GET`
- **URL Parameters:**
  - `token`: Verification token

**Response Example:**

```json
{
  "success": true,
  "data": {
    "message": "Subscription verified successfully",
    "subscription": {
      "id": "60d21b4667d0d8992e610f85",
      "email": "user@example.com",
      "healthCheckId": "60d21b4667d0d8992e610c85",
      "active": true,
      "verified": true,
      "severity": "high"
    }
  }
}
```

### Unsubscribe

Unsubscribes using a token.

- **URL:** `/notifications/subscriptions/unsubscribe/:token`
- **Method:** `GET`
- **URL Parameters:**
  - `token`: Unsubscribe token

**Response Example:**

```json
{
  "success": true,
  "data": {
    "message": "Successfully unsubscribed",
    "subscription": {
      "id": "60d21b4667d0d8992e610f85",
      "email": "user@example.com",
      "healthCheckId": "60d21b4667d0d8992e610c85",
      "active": false,
      "verified": true,
      "severity": "high"
    }
  }
}
```

### Get Health Checks for Subscription

Gets all health checks available for subscription.

- **URL:** `/notifications/subscriptions/health-checks`
- **Method:** `GET`

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": null,
      "name": "All Health Checks",
      "type": "GLOBAL"
    },
    {
      "id": "60d21b4667d0d8992e610c85",
      "name": "API Server",
      "type": "API"
    },
    {
      "id": "60d21b4667d0d8992e610c86",
      "name": "Web Server",
      "type": "PROCESS"
    }
  ]
}
```

## Status Endpoints

### Get System Health

Gets the overall system health status.

- **URL:** `/status/health`
- **Method:** `GET`

**Response Example:**

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

### Get Status Summary

Gets a summary of the health check status.

- **URL:** `/status/summary`
- **Method:** `GET`

**Response Example:**

```json
{
  "success": true,
  "data": {
    "status": "partial_outage",
    "unhealthyCount": 2,
    "totalChecks": 10,
    "enabledChecks": 8,
    "byType": {
      "API": 4,
      "PROCESS": 3,
      "SERVICE": 2,
      "SERVER": 1
    },
    "lastUpdated": "2023-01-15T12:00:00.000Z"
  }
}
```

### Get Component Status

Gets the status of all health check components.

- **URL:** `/status/components`
- **Method:** `GET`

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610c85",
      "name": "API Server",
      "type": "API",
      "status": "Healthy",
      "details": "API check passed. Status: 200",
      "lastChecked": "2023-01-15T12:00:30.000Z",
      "enabled": true
    },
    {
      "id": "60d21b4667d0d8992e610c86",
      "name": "Web Server",
      "type": "PROCESS",
      "status": "Unhealthy",
      "details": "Process not running",
      "lastChecked": "2023-01-15T12:00:30.000Z",
      "enabled": true
    }
  ]
}
```