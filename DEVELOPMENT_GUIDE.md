# 🚀 RandevuBu Development Guide

## 🎯 Development Setup Options

### Option 1: Basic Development (Recommended for daily work)
```bash
# Quick start with basic services
make setup
make dev
```

### Option 2: Full Development Environment (With monitoring & debugging tools)
```bash
# Copy development environment
cp .env.development .env

# Start full development stack
docker compose -f docker-compose.dev.yml up -d

# View logs
make dev:logs
```

## 🛠️ Development Tools Included

### 📊 **Monitoring & Debugging**
- **Prometheus**: http://localhost:9090 - Metrics collection
- **Grafana**: http://localhost:3000 - Visual dashboards (admin/admin)
- **Health Check**: http://localhost:3001/health - Application health
- **Metrics Endpoint**: http://localhost:3001/metrics - Raw metrics

### 🗄️ **Database Tools**
- **Prisma Studio**: http://localhost:5555 - Database GUI (`make db-studio`)
- **Direct PostgreSQL**: `make db-shell` - Database console
- **Redis Commander**: http://localhost:8081 - Redis GUI

### 📧 **Email Testing**
- **Mailhog UI**: http://localhost:8025 - Email testing interface
- **SMTP Server**: localhost:1025 - For application email sending

### 🐛 **Debugging Features**
- **Node.js Debugger**: Port 9229 exposed for IDE debugging
- **Interactive TTY**: `make shell` - Access container shell
- **Real-time Logs**: `make logs` - Follow application logs

## 📋 Development Commands

### Daily Development
```bash
# Start development environment
make dev                    # Basic development mode
make dev:full              # Full development with all tools

# Database operations
make db-setup              # Setup database completely
make db-migrate            # Run migrations
make db-seed-rbac          # Seed RBAC system
make db-studio             # Open database GUI

# Monitoring & debugging
make logs                  # View application logs
make logs-codes           # View SMS verification codes
npm run health            # Check application health
npm run metrics           # View metrics
```

### Advanced Development
```bash
# Development with debugging
npm run dev:debug         # Start with Node.js debugger
npm run dev:watch         # Start with log watching

# Testing & quality
npm run typecheck         # TypeScript type checking
npm test                  # Run tests (when implemented)

# Container operations
make shell                # Access application container
make status               # Check container status
```

## 🔧 Development Features

### **Hot Reloading**
- ✅ **Nodemon** - Automatic restarts on file changes
- ✅ **Volume mounting** - Real-time code updates
- ✅ **TypeScript compilation** - Automatic TS compilation

### **Database Development**
- ✅ **Prisma Studio** - Visual database management
- ✅ **Live migrations** - Automatic migration on changes
- ✅ **Seed data** - Pre-populated development data
- ✅ **Query logging** - Debug SQL queries

### **Redis Development**
- ✅ **Redis Commander** - Visual Redis management
- ✅ **Persistence** - Data survives container restarts
- ✅ **Monitoring** - Redis metrics in Grafana

### **Email Development**
- ✅ **Mailhog** - Local email testing
- ✅ **SMTP capture** - All emails captured locally
- ✅ **Email preview** - Visual email testing

## 🐛 Debugging Setup

### **VS Code Debugging**
Add to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Docker",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### **Chrome DevTools**
1. Start with debugging: `npm run dev:debug`
2. Open Chrome: `chrome://inspect`
3. Click "Open dedicated DevTools for Node"

## 📊 Monitoring in Development

### **Metrics Available**
- HTTP request metrics (duration, status codes)
- Database query performance
- Business metrics (appointments, users, payments)
- System metrics (memory, CPU usage)
- Custom application metrics

### **Grafana Dashboards**
Pre-configured dashboards for:
- Application Performance Monitoring
- Database Performance
- Business KPIs
- System Resource Usage

## 🔍 Useful Development URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **API Server** | http://localhost:3001 | Main application |
| **API Docs** | http://localhost:3001/api-docs | Swagger documentation |
| **Health Check** | http://localhost:3001/health | Application health |
| **Metrics** | http://localhost:3001/metrics | Prometheus metrics |
| **Prisma Studio** | http://localhost:5555 | Database GUI |
| **Grafana** | http://localhost:3000 | Monitoring dashboards |
| **Prometheus** | http://localhost:9090 | Metrics collection |
| **Redis Commander** | http://localhost:8081 | Redis management |
| **Mailhog** | http://localhost:8025 | Email testing |

## 🔄 Development Workflow

### **1. Daily Startup**
```bash
# Start development environment
make dev

# In another terminal, monitor logs
make logs
```

### **2. Database Changes**
```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# View changes in Prisma Studio
make db-studio
```

### **3. Testing Features**
```bash
# Check health endpoint
npm run health

# View metrics
npm run metrics

# Test email functionality via Mailhog
open http://localhost:8025
```

### **4. Debugging Issues**
```bash
# Access container shell
make shell

# View detailed logs
make logs-all

# Check specific service logs
docker compose logs postgres
docker compose logs redis
```

## ⚙️ Environment Configuration

### **Development vs Production**
- **Security**: Relaxed in development for easier debugging
- **Logging**: Verbose in development, structured in production
- **Rate Limiting**: Higher limits in development
- **CORS**: Permissive in development
- **External Services**: Mocked/sandboxed in development

### **Environment Files**
- `.env.development` - Development settings
- `.env.example` - Template for all environments
- `.env.production` - Production template

## 🚨 Common Development Issues

### **Port Conflicts**
```bash
# Check what's using ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :5432

# Stop conflicting services
make down
```

### **Database Connection Issues**
```bash
# Reset database
make db-reset

# Check database status
make db-shell
```

### **Container Issues**
```bash
# Rebuild containers
make clean
make setup

# Check container logs
docker compose logs app
```

### **Permission Issues**
```bash
# Fix node_modules permissions
docker compose exec app chown -R node:node /app/node_modules
```

## 📚 Additional Resources

- **Prisma Documentation**: https://prisma.io/docs
- **Redis Commands**: https://redis.io/commands
- **Prometheus Queries**: https://prometheus.io/docs/prometheus/latest/querying/
- **Grafana Dashboards**: https://grafana.com/docs/

---

## 🎉 Happy Development!

Your development environment includes:
- 🔄 **Hot reloading** for instant feedback
- 📊 **Full monitoring** like production
- 🐛 **Complete debugging** tools
- 🗄️ **Database management** GUI
- 📧 **Email testing** with Mailhog
- 🔍 **Redis inspection** tools

Ready to build amazing features! 🚀