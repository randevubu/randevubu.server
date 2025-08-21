# Docker Setup for RandevuBu Server

This guide explains how to run the RandevuBu Server using Docker with best practices.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose V2 (included with Docker Desktop)

## Quick Start

### Development Environment

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   ```

3. **View logs:**
   ```bash
   docker compose logs -f app
   ```

4. **Run database migrations:**
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

5. **Access the application:**
   - API: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health
   - PgAdmin (optional): http://localhost:8080

### Production Environment

1. **Create production environment file:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Start production services:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

## Available Services

### Core Services
- **app**: Main Node.js application
- **postgres**: PostgreSQL database
- **redis**: Redis cache

### Optional Services
- **pgadmin**: Database administration tool (dev only)
- **nginx**: Reverse proxy (production only)

## Docker Commands

### Basic Operations
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Rebuild and start
docker compose up --build -d

# View logs
docker compose logs -f [service_name]

# Execute commands in container
docker compose exec app npm run [script]
docker compose exec postgres psql -U postgres -d randevubu
```

### Database Operations
```bash
# Run migrations
docker compose exec app npx prisma migrate deploy

# Generate Prisma client
docker compose exec app npx prisma generate

# Reset database
docker compose exec app npx prisma migrate reset

# Access database directly
docker compose exec postgres psql -U postgres -d randevubu
```

### Development Workflow
```bash
# Install new package
docker compose exec app npm install [package_name]

# Run tests
docker compose exec app npm test

# Build application
docker compose exec app npm run build

# TypeScript compilation
docker compose exec app npm run build
```

## Environment Variables

Key environment variables for Docker:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (Docker internal)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/randevubu?schema=public

# Redis (Docker internal)
REDIS_URL=redis://redis:6379
```

## Production Considerations

### Security
- Use non-root user in containers ✅
- Implement health checks ✅
- Use secrets for sensitive data
- Enable SSL/TLS in production

### Performance
- Multi-stage builds for smaller images ✅
- Resource limits configured ✅
- Connection pooling enabled
- Caching strategies implemented

### Monitoring
- Health check endpoints ✅
- Logging configuration ✅
- Metrics collection ready
- Error tracking integration

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3000
   # Change port in docker-compose.yml
   ```

2. **Database connection issues:**
   ```bash
   # Check if PostgreSQL is healthy
   docker compose ps postgres
   # View PostgreSQL logs
   docker compose logs postgres
   ```

3. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

4. **Build cache issues:**
   ```bash
   # Clear Docker build cache
   docker system prune -a
   # Rebuild without cache
   docker compose build --no-cache
   ```

### Performance Tuning

1. **Database optimization:**
   - Adjust PostgreSQL configuration
   - Optimize queries and indexes
   - Configure connection pooling

2. **Application optimization:**
   - Use production builds
   - Enable compression
   - Implement caching strategies

3. **Container optimization:**
   - Use Alpine Linux images ✅
   - Minimize layers in Dockerfile ✅
   - Use .dockerignore effectively ✅

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Image Target | development | production |
| Source Code | Volume mounted | Copied into image |
| Dependencies | All (including dev) | Production only |
| Process Manager | nodemon | node |
| Debugging | Enabled | Disabled |
| SSL | Not required | Required |
| Replicas | 1 | 2+ |
| Resource Limits | Relaxed | Strict |

## Maintenance

### Regular Tasks
```bash
# Update images
docker compose pull

# Clean up unused resources
docker system prune

# Backup database
docker compose exec postgres pg_dump -U postgres randevubu > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres randevubu < backup.sql
```

### Monitoring Commands
```bash
# Container resource usage
docker stats

# Container health status
docker compose ps

# Application logs
docker compose logs -f --tail=100 app
```

This Docker setup follows industry best practices for security, performance, and maintainability.