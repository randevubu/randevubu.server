# 🚀 RandevuBu Server - Production Ready

## 📋 Unified Docker Setup

This project provides both **development** and **production** Docker configurations with nginx handling load balancing and reverse proxy functionality.

## 🏗️ Architecture

```
Internet → Nginx (Load Balancer + Reverse Proxy) → App Instances (1,2,3)
                ↓
            Redis Cache (Shared)
                ↓
            PostgreSQL (Optional)
```

## 🚀 Quick Start

### Development Setup

```bash
# 1. Set up development environment
cp env.example .env
# Edit with your development values

# 2. Start development environment
./dev.sh

# OR manually
docker-compose -f docker-compose.dev.yml up -d
```

### Production Setup

```bash
# 1. Set up production environment
cp env.production.example .env.production
# Edit with your production values

# 2. Deploy production stack
./deploy.sh

# OR manually
docker-compose -f docker-compose.production.yml up -d
```

## 📊 What's Included

### ✅ **Development Configuration**

- **`docker-compose.dev.yml`** - Development setup
- Single app instance with hot reload
- Direct database access (PostgreSQL + Redis)
- Simple nginx proxy
- Prisma Studio access
- Debug-friendly logging

### ✅ **Production Configuration**

- **`docker-compose.production.yml`** - Production setup
- 3 App instances (load balanced)
- Nginx (load balancer + reverse proxy)
- Redis cache (shared)
- PostgreSQL (optional)
- Monitoring stack (Prometheus + Grafana)

### ✅ **Unified Nginx Configuration**

- **`nginx/nginx.conf`** - Single config for all functionality
- Load balancing across 3 app instances
- Load balancer with smart routing
- Rate limiting by endpoint type
- Response caching (static + dynamic)
- Security headers and attack protection

### ✅ **Production Features**

- **Load Balancing**: 3 app instances with health checks
- **Load Balancer**: Traffic distribution, rate limiting, caching
- **Security**: Headers, attack blocking, file protection
- **Monitoring**: Health checks, metrics, dashboards
- **High Availability**: Automatic failover

## 🔧 Configuration Files

### Development

- **`docker-compose.dev.yml`** - Development configuration
- **`nginx/nginx-dev.conf`** - Simple nginx for dev
- **`dev.sh`** - Development startup script
- **`env.example`** - Development environment template

### Production

- **`docker-compose.production.yml`** - Production configuration
- **`nginx/nginx.conf`** - Unified nginx configuration
- **`deploy.sh`** - Production deployment script
- **`env.production.example`** - Production environment template
- **`README-PRODUCTION.md`** - Detailed production guide

## 📈 Monitoring Endpoints

- **Application**: `http://localhost`
- **Health Check**: `http://localhost/health`
- **Nginx Status**: `http://localhost/nginx-status`
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3000`

## 🛠️ Management Commands

### Development

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart services
docker-compose -f docker-compose.dev.yml restart

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build -d
```

### Production

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart services
docker-compose -f docker-compose.production.yml restart

# Stop services
docker-compose -f docker-compose.production.yml down

# Update services
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## 🔒 Security Features

### Rate Limiting by Endpoint

- **Authentication**: 5 req/s (strict)
- **Payments**: 2 req/s (very strict)
- **API**: 10 req/s (moderate)
- **General**: 20 req/s (relaxed)

### Security Headers

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: Comprehensive policy

### Attack Protection

- Blocks WordPress admin access
- Blocks .env, .log, .sql files
- Blocks suspicious user agents
- Connection limiting (20 per IP)

## 📊 Performance Features

### Caching Strategy

- **Static Data**: 1 hour cache
- **Dynamic Data**: 10 minutes cache
- **Authentication Data**: No cache (security)
- **Payment Data**: No cache (security)

### Load Balancing

- **Least Connection**: Routes to server with fewest connections
- **Health Checks**: Automatic failover for failed instances
- **Session Affinity**: Maintains user sessions for auth

## 🎯 Benefits of Unified Approach

1. **Single Point of Management** - One file to rule them all
2. **Cost Effective** - No separate load balancer or reverse proxy needed
3. **High Performance** - Nginx is extremely fast and efficient
4. **Easy Scaling** - Add more app instances easily
5. **Production Ready** - Enterprise-grade security and monitoring

## 🔄 Git Workflow & Commit Standards

This project uses **automated Git hooks** to ensure code quality and consistent commit messages.

### Pre-commit Hooks (Automatic)

When you commit, the following checks run automatically:

1. **TypeScript Type Checking** - Ensures no type errors
2. **Code Formatting** - Runs Prettier on staged files
3. **Prisma Schema Formatting** - Formats schema.prisma

### Commit Message Standards (Enforced)

All commits must follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

Examples:
feat(auth): add two-factor authentication
fix(appointments): resolve timezone issue
refactor(services): migrate to dependency injection
docs(readme): update installation steps
```

**Common Types:**

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `test` - Adding/updating tests
- `chore` - Tooling, configs, etc.

**📖 Full Guide:** See [docs/commit-conventions.md](./docs/commit-conventions.md) for detailed guidelines and examples.

**⚠️ Note:** Commits that don't follow the format will be rejected automatically.

---

## 📚 Documentation

- **`README-PRODUCTION.md`** - Comprehensive production guide
- **`nginx/ssl/README.md`** - SSL setup instructions
- **`CACHE_STRATEGY.md`** - Caching implementation details

## ✅ Production Readiness

Your application is now production-ready with:

- ✅ **Load Balancing** (3 app instances)
- ✅ **Load Balancer** (traffic distribution, rate limiting, caching)
- ✅ **Security** (headers, attack protection)
- ✅ **Monitoring** (health checks, metrics)
- ✅ **High Availability** (automatic failover)

## 🚀 Deployment

### Development

```bash
# 1. Set up development environment
cp env.example .env
# Edit with your values

# 2. Start development environment
./dev.sh
```

### Production

```bash
# 1. Set up production environment
cp env.production.example .env.production
# Edit with your values

# 2. Deploy production stack
./deploy.sh
```

Your application is now ready for both development and production with enterprise-grade security, performance, and monitoring! 🎉
