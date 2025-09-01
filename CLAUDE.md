# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Start development environment (Docker-based)
make dev                    # Start containers and show logs
make setup                  # First-time setup (only run once)

# Direct npm commands (inside container)
npm run dev                 # Start development server with nodemon
npm start                   # Start production server
npm run build               # TypeScript compilation
```

### Database Operations
```bash
# Database setup and seeding
make db-setup              # Complete database setup (migrate + generate + seed)
make db-migrate           # Run Prisma migrations
make db-seed-rbac         # Setup RBAC system (roles & permissions)
make db-seed-business     # Seed business types and subscription plans
make db-seed-customers    # Seed customers and appointments

# Database utilities
make db-shell             # Access PostgreSQL shell
make db-studio           # Open Prisma Studio (database GUI)
npx prisma generate      # Generate Prisma client
```

### Docker Operations
```bash
make up                   # Start containers in background
make down                 # Stop containers
make logs                 # View application logs
make shell               # Access container shell
make status              # Show container status
```

## Architecture Overview

### Dependency Injection Pattern
The codebase uses a container-based dependency injection system with three main layers:

1. **RepositoryContainer** (`src/repositories/index.ts`) - Database access layer using Prisma
2. **ServiceContainer** (`src/services/index.ts`) - Business logic layer
3. **ControllerContainer** (`src/controllers/index.ts`) - HTTP request handling layer

### Key Components

**Authentication & Authorization:**
- Phone-based authentication with SMS verification
- JWT tokens with refresh token rotation
- Role-based access control (RBAC) system
- Multi-tenant business context middleware

**Core Business Logic:**
- Business management with subscription plans
- Service catalog and appointment scheduling
- Business closure management with analytics
- Payment integration using Iyzico
- User behavior tracking and reporting

**Database:**
- PostgreSQL with Prisma ORM
- Multi-tenant architecture with business context
- Comprehensive audit logging
- Phone verification system

### Project Structure
```
src/
├── config/           # Environment and Swagger configuration
├── controllers/      # HTTP request handlers
├── services/         # Business logic layer
├── repositories/     # Database access layer
├── middleware/       # Express middleware (auth, RBAC, validation)
├── routes/           # API route definitions (v1/)
├── schemas/          # Zod validation schemas
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and helpers
```

## Development Workflow

### Making Changes
1. All business logic should go in services
2. Database queries should be in repositories
3. HTTP handling should be in controllers
4. Use existing RBAC middleware for permission checks
5. Follow existing patterns for error handling and validation

### Authentication Context
Most endpoints require authentication and business context:
- Use `authenticateUser` middleware for auth
- Use `requireBusinessAccess` middleware for business-scoped operations
- Business context is automatically attached via `attachBusinessContext` middleware

### Database Changes
1. Create Prisma migrations: `npx prisma migrate dev`
2. Update seed files if needed
3. Regenerate client: `npx prisma generate`

## API Documentation
- Development server: http://localhost:3001
- Swagger UI: http://localhost:3001/api-docs
- Health check: http://localhost:3001/health

## Environment Setup
Copy `.env.example` to `.env` and configure database URLs and API keys before running `make setup`.