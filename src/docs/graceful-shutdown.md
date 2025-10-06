# Production-Ready Graceful Shutdown

This document describes the production-ready graceful shutdown implementation for the application.

## Overview

The graceful shutdown system ensures that the application shuts down cleanly by:
1. Stopping acceptance of new connections
2. Stopping background services (schedulers, reminders)
3. Closing database connections
4. Draining active connections
5. Exiting with appropriate status codes

## Features

### ✅ Production-Ready Features

- **Signal Handling**: Handles `SIGTERM` and `SIGINT` signals
- **Timeout Protection**: Configurable timeout to prevent hanging shutdowns
- **Service Cleanup**: Stops all background services gracefully
- **Database Cleanup**: Properly disconnects from Prisma database
- **Connection Draining**: Waits for active requests to complete
- **Health Check Integration**: Health endpoint shows shutdown readiness
- **Structured Logging**: Comprehensive logging with emojis and timing
- **Error Handling**: Proper error handling and exit codes
- **Type Safety**: Full TypeScript interfaces for all services
- **Configuration**: Environment-based configuration

### 🔧 Configuration

Environment variables for fine-tuning shutdown behavior:

```bash
# Maximum time to wait for graceful shutdown (default: 30000ms)
SHUTDOWN_TIMEOUT=30000

# Time to wait for active connections to drain (default: 10000ms)
CONNECTION_DRAIN_TIMEOUT=10000

# Enable/disable connection draining (default: true)
ENABLE_CONNECTION_DRAINING=true

# Enable/disable database cleanup (default: true)
ENABLE_DATABASE_CLEANUP=true
```

### 📊 Health Check Integration

The health check endpoint (`/health`) now includes shutdown readiness:

```json
{
  "status": "healthy",
  "checks": {
    "shutdown": {
      "status": "ready",
      "ready": true
    }
  }
}
```

When shutting down, the status changes to:
```json
{
  "checks": {
    "shutdown": {
      "status": "shutting_down",
      "ready": false
    }
  }
}
```

## Usage

### Basic Usage

The graceful shutdown is automatically configured in the main application:

```typescript
import { gracefulShutdown, setServicesForShutdown } from './utils/gracefulShutdown';

// Set services for shutdown
setServicesForShutdown(services);

// Signal handlers are automatically set up
process.on("SIGTERM", async () => await gracefulShutdown(server));
process.on("SIGINT", async () => await gracefulShutdown(server));
```

### Service Integration

Services that need cleanup should implement the `ShutdownableService` interface:

```typescript
interface ShutdownableService {
  stop(): void | Promise<void>;
}
```

### Database Integration

The system automatically handles Prisma database disconnection:

```typescript
interface DatabaseService {
  $disconnect(): Promise<void>;
}
```

## Shutdown Process

1. **Signal Received**: `SIGTERM` or `SIGINT` received
2. **Duplicate Check**: Prevents multiple shutdown attempts
3. **Stop New Connections**: Server stops accepting new requests
4. **Stop Services**: Background services are stopped gracefully
5. **Database Cleanup**: Database connections are closed
6. **Connection Draining**: Wait for active requests to complete
7. **Exit**: Process exits with appropriate status code

## Logging

The shutdown process provides detailed logging:

```
🔄 Received shutdown signal, shutting down gracefully...
🚫 Stopping acceptance of new connections...
🔄 Stopping subscriptionSchedulerService...
✅ subscriptionSchedulerService stopped successfully
🔄 Stopping appointmentSchedulerService...
✅ appointmentSchedulerService stopped successfully
🔄 Closing database connections...
✅ Database connections closed successfully
🔄 Draining connections... (0 active, 1000ms elapsed)
✅ All active connections drained
✅ Graceful shutdown completed in 2500ms
```

## Error Handling

- **Service Errors**: Individual service errors are logged but don't stop shutdown
- **Database Errors**: Database errors are logged and may cause shutdown failure
- **Timeout**: If shutdown exceeds timeout, process is forcefully terminated
- **Exit Codes**: Proper exit codes (0 for success, 1 for errors)

## Production Deployment

### Docker

For Docker deployments, ensure proper signal handling:

```dockerfile
# Use exec form to ensure signals reach the process
CMD ["node", "dist/index.js"]
```

### Kubernetes

For Kubernetes deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
        terminationGracePeriodSeconds: 30
```

### Load Balancer

Configure your load balancer to:
1. Stop sending new requests when health check shows `shutdown.ready: false`
2. Wait for `CONNECTION_DRAIN_TIMEOUT` before removing from rotation
3. Respect the `SHUTDOWN_TIMEOUT` for maximum wait time

## Monitoring

Monitor shutdown behavior with:

- **Health Check**: `/health` endpoint shows shutdown readiness
- **Logs**: Structured logging with timing information
- **Metrics**: Track shutdown duration and success rates
- **Alerts**: Alert on failed shutdowns or excessive shutdown times

## Best Practices

1. **Test Shutdown**: Regularly test shutdown process in staging
2. **Monitor Timeouts**: Set appropriate timeouts for your workload
3. **Health Checks**: Use health checks to prevent traffic during shutdown
4. **Logging**: Monitor shutdown logs for issues
5. **Database**: Ensure database connections are properly closed
6. **Services**: All background services should implement proper stop methods

## Troubleshooting

### Common Issues

1. **Hanging Shutdown**: Increase `SHUTDOWN_TIMEOUT`
2. **Database Errors**: Check Prisma connection status
3. **Service Errors**: Verify all services implement `stop()` method
4. **Connection Draining**: Adjust `CONNECTION_DRAIN_TIMEOUT`

### Debug Mode

Enable debug logging to troubleshoot shutdown issues:

```bash
NODE_ENV=development
```

This will provide more detailed logging during the shutdown process.


