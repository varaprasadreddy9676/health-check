# Health Check Service Documentation

This folder contains documentation for the Health Check Service project. This includes architecture diagrams, API documentation, and guides for development and operations.

## Table of Contents

- [Architecture](./architecture/README.md) - System architecture, design patterns, and data models
- [API](./api/README.md) - API documentation, endpoints, and examples
- [Development](./development/README.md) - Development setup, guidelines, and workflows
- [Operations](./operations/README.md) - Deployment, monitoring, and maintenance

## Project Overview

The Health Check Service is a monitoring system designed to check the health of various components:

- **API Endpoints**: Monitor HTTP endpoints for availability and response times
- **Processes**: Check if specific processes are running
- **Services**: Execute custom commands to verify service status
- **System**: Monitor server resources like CPU, memory, and disk space

The service includes notification capabilities to alert stakeholders when issues are detected.

## Key Features

- Multiple health check types (API, Process, Service, System)
- Scheduled health checks with configurable intervals
- Email notifications with throttling
- Subscription management for targeted notifications
- API for integration with other systems
- Dashboard for monitoring status

## Getting Started

To learn more about the system, start with the [Architecture Documentation](./architecture/README.md) to understand the overall system design, then explore the [API Documentation](./api/README.md) to understand how to interact with the system.