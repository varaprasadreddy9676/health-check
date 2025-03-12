# Development Guide

This document provides information for developers working on the Health Check Service.

## Getting Started

### Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Environment Setup

1. Clone the repository:
   ```
   git clone [repository-url]
   cd health-check-service
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values.

### Running the Application

#### Development Mode

```
npm run dev
```

This starts the application with hot-reloading enabled.

#### Production Mode

```
npm run build
npm start
```

### Running Tests

```
npm test
```

## Project Structure

```
health-check-service/
├── docs/                 # Documentation
├── src/                  # Source code
│   ├── config/           # Configuration
│   ├── controllers/      # Request handlers
│   ├── models/           # Data models
│   ├── repositories/     # Data access
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── templates/        # Email templates
│   ├── utils/            # Utility functions
│   ├── app.ts            # Express application
│   └── index.ts          # Application entry point
├── .env.example          # Example environment variables
├── package.json          # Package configuration
└── tsconfig.json         # TypeScript configuration
```

## Development Workflow

### Making Changes

1. Create a new branch for your feature or bug fix:
   ```
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding guidelines.

3. Test your changes locally.

4. Commit your changes:
   ```
   git commit -m "feat: add your feature description"
   ```

5. Push your branch and create a pull request.

### Code Style

We follow these coding conventions:

- Use TypeScript for type safety
- Follow ESLint rules
- Use async/await for asynchronous code
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use descriptive variable names
- Add JSDoc comments for functions and classes

### Error Handling

- Use the `AppError` class for application errors
- Log all errors with appropriate context
- Return consistent error responses from the API

## Adding New Features

### Adding a New Health Check Type

1. Update the `HealthCheckType` type in `src/models/HealthCheck.ts`
2. Add validation rules in `healthCheckController.validateHealthCheck`
3. Create a new module in `src/modules/healthChecks/` for the check implementation
4. Update the `executeHealthCheck` method in `healthCheckService.ts`

### Adding a New Notification Channel

1. Update the `NotificationType` type in `src/models/Notification.ts`
2. Add a new configuration model if needed
3. Add new repository methods for the channel
4. Update the `notificationService.ts` to support the new channel
5. Add API endpoints for configuration

## Debugging

### Logging

The application uses Pino for logging. Log levels can be configured using the `LOG_LEVEL` environment variable:

- `error`: Only errors
- `warn`: Errors and warnings
- `info`: Errors, warnings, and info (default)
- `debug`: All of the above plus debug messages
- `trace`: Very verbose logging

Example of using the logger:

```typescript
import logger from '../utils/logger';

try {
  // Some operation
} catch (error) {
  logger.error({
    msg: 'Error description',
    error: error instanceof Error ? error.message : String(error),
    context: 'Additional context'
  });
}
```

### Common Issues

#### "Cannot connect to MongoDB"

1. Check if MongoDB is running
2. Verify the `MONGODB_URI` in your `.env` file
3. Ensure network connectivity to the MongoDB server

#### "Email notifications not being sent"

1. Check the email configuration in your `.env` file
2. Verify the `EmailConfig` in the database
3. Check the logs for email-related errors

## Performance Considerations

- **Database Indexes**: Ensure all necessary indexes are created
- **Throttling**: Use notification throttling to prevent flooding
- **Pagination**: Use pagination for large result sets
- **Caching**: Consider caching frequently accessed data

## Security Best Practices

- **Input Validation**: Validate all user inputs
- **Environment Variables**: Store sensitive information in environment variables
- **Authentication**: Add authentication before production use
- **Rate Limiting**: Consider adding rate limiting to the API
- **HTTPS**: Use HTTPS in production