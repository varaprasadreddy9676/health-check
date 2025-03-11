## Architecture

This application is built with a database-agnostic architecture using the repository pattern:

1. **Repository Pattern**: All database operations are abstracted through repository interfaces.

2. **Database Flexibility**: The system can work with either MongoDB or PostgreSQL (with minor modifications) by changing the DATABASE_TYPE environment variable.

3. **Domain Models**: Domain models are separate from database schemas.

4. **Services**: Business logic is contained in services that use repositories, not direct database access.

### Switching Database Types

To switch between MongoDB and PostgreSQL:

1. Set `DATABASE_TYPE` environment variable to either `mongodb` or `postgresql`
2. Configure the appropriate connection string (`MONGODB_URI` or `DATABASE_URL`)
3. Implement the repository interface for your desired database type

The current implementation has MongoDB repositories fully implemented.# Health Check Service

A modern, modular health check service for monitoring APIs, processes, and services.

## Features

- **Health Checks**: Monitor APIs, processes, and services using customizable checks
- **Incident Management**: Track and manage incidents with timeline events
- **Notification System**: Send alerts via email and Slack with throttling support
- **REST API**: Comprehensive API for frontend integration
- **Restart Capability**: Restart services directly from the UI or API
- **Historical Data**: Store and visualize historical health check data
- **Status Page**: Generate a status page for public or internal use

## Technologies

- **Backend**: Node.js with TypeScript, Express
- **Database**: MongoDB (database-agnostic architecture with repository pattern)
- **Scheduling**: node-cron
- **Notifications**: Email (Nodemailer) and Slack
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js 18 or later
- MongoDB 6.0 or later
- Docker & Docker Compose (optional)

### Installation

#### Using Docker

1. Clone the repository
   ```bash
   git clone https://github.com/your-org/health-check-service.git
   cd health-check-service
   ```

2. Create a `.env` file with your configuration (see `.env.example`)

3. Start the containers
   ```bash
   docker-compose up -d
   ```

#### Manual Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-org/health-check-service.git
   cd health-check-service
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration (see `.env.example`)

4. Set up the database
   ```bash
   npm run mongo:seed
   ```

5. Build the application
   ```bash
   npm run build
   ```

6. Start the application
   ```bash
   npm start
   ```

### Development

1. Install dependencies
   ```bash
   npm install
   ```

2. Start the development server
   ```bash
   npm run dev
   ```

## API Documentation

### Health Check APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/healthchecks` | GET | List all health check configurations |
| `/api/healthchecks` | POST | Create new health check config |
| `/api/healthchecks/{id}` | GET | Get single configuration |
| `/api/healthchecks/{id}` | PUT | Update configuration |
| `/api/healthchecks/{id}` | DELETE | Delete configuration |
| `/api/healthchecks/{id}/toggle` | PATCH | Enable/disable check |

### Health Check Results APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/results/latest` | GET | Latest results for all checks |
| `/api/results/{checkId}` | GET | Historical results for specific check |
| `/api/results` | GET | Filterable historical data |
| `/api/results/metrics` | GET | Aggregated metrics |

### Incident Management APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/incidents` | GET | List all incidents |
| `/api/incidents/active` | GET | List active incidents |
| `/api/incidents/{id}` | PUT | Update incident |
| `/api/incidents/{id}/resolve` | POST | Resolve incident |

### Notification APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | GET | Notification history |
| `/api/notifications/settings/email` | GET | Get email notification settings |
| `/api/notifications/settings/email` | PUT | Update email settings |
| `/api/notifications/settings/slack` | GET | Get Slack notification settings |
| `/api/notifications/settings/slack` | PUT | Update Slack settings |

### System Actions APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/actions/{checkId}/restart` | POST | Execute restart command |
| `/api/actions/{checkId}/force-check` | POST | Force immediate check |

### Status Page APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status/summary` | GET | Current system status |
| `/api/status/components` | GET | Status components |
| `/api/status/history` | GET | Status history |

## Configuration

Configuration is done via environment variables. See `.env.example` for available options.

## License

This project is licensed under the MIT License - see the LICENSE file for details.