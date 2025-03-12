# Architecture Documentation

This document describes the architecture of the Health Check Service.

## System Architecture

The Health Check Service follows a layered architecture pattern:

```
┌─────────────┐
│  API Layer  │
├─────────────┤
│ Controllers │
├─────────────┤
│  Services   │
├─────────────┤
│Repositories │
├─────────────┤
│   Models    │
└─────────────┘
```

### Architecture Diagram

Here's a simplified architecture diagram of the system:

```
┌─────────┐         ┌───────────────┐
│  Client │ ───────▶│    API Layer  │
└─────────┘         └───────┬───────┘
                           │
                           ▼
┌───────────────────────────────────────┐
│             Service Layer             │
│  ┌─────────────┐    ┌──────────────┐  │
│  │Health Check │    │ Notification │  │
│  │  Service    │    │   Service    │  │
│  └──────┬──────┘    └──────┬───────┘  │
│         │                  │          │
│         │    ┌────────┐    │          │
│         └───▶│Scheduler│◀──┘          │
│              │ Service │              │
└──────────────┴────┬────┴──────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│          Repository Layer             │
│  ┌─────────────┐    ┌──────────────┐  │
│  │Health Check │    │ Notification │  │
│  │ Repository  │    │  Repository  │  │
│  └──────┬──────┘    └──────┬───────┘  │
└─────────┼─────────────────┼───────────┘
          │                 │
          ▼                 ▼
    ┌─────────────────────────────┐
    │           MongoDB           │
    └─────────────────────────────┘
```

## Components

### API Layer

The API layer consists of Express routes and controllers that handle HTTP requests and responses.

- **Routes**: Define API endpoints and map them to controller methods
- **Controllers**: Handle request validation, call appropriate services, and format responses

### Service Layer

The service layer contains the core business logic of the application.

- **Health Check Service**: Executes health checks based on their type and processes results
- **Notification Service**: Manages subscriptions and sends notifications when issues are detected
- **Scheduler Service**: Runs health checks at configured intervals

### Repository Layer

The repository layer handles data access and storage.

- **Health Check Repository**: Manages health check configurations and results
- **Notification Repository**: Manages notification records and subscription data

### Data Models

The data models define the structure of the data stored in the database.

- **HealthCheck**: Defines a health check configuration
- **Result**: Stores the results of health check executions
- **Notification**: Records of sent notifications
- **Subscription**: User subscriptions to health check notifications

## Data Flow

1. **Health Check Execution**:
   - Scheduler triggers health checks at configured intervals
   - Health Check Service executes the appropriate check type
   - Results are stored in the database via the repository
   - Notifications are sent if issues are detected

2. **Notification Flow**:
   - Health Check Service detects an issue
   - Notification Service determines who should be notified
   - Email is sent to subscribers
   - Notification record is stored in the database

## Key Design Decisions

### Singleton Pattern

Service and repository instances are implemented as singletons to ensure consistent state and reduce resource usage.

### Repository Pattern

The repository pattern is used to abstract data access logic, making it easier to change the underlying database in the future.

### Dependency Injection

Services depend on repositories, which are injected to promote loose coupling and testability.

### Factory Method Pattern

Repository factories are used to create the appropriate repository implementation based on configuration.

## External Dependencies

- **MongoDB**: Primary data store
- **Express**: Web framework for the API
- **Nodemailer**: Email sending service
- **Axios**: HTTP client for API health checks
- **Handlebars**: Template engine for email templates

## Security Considerations

- **Input Validation**: All API inputs are validated using express-validator
- **Helmet**: Security headers are added to all API responses
- **CORS**: Cross-Origin Resource Sharing is configured to restrict access
- **Environment Variables**: Sensitive configuration is stored in environment variables

## Scalability Considerations

- **Stateless Services**: Services are designed to be stateless, allowing horizontal scaling
- **Database Indexes**: Key fields are indexed for improved query performance
- **Pagination**: All list endpoints support pagination to handle large datasets
- **Throttling**: Notification throttling prevents email flooding during outages