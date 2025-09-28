# RandevuBu Server - Makefile
# 
# 🚀 Quick Start:
#   make setup     - First time setup (copies .env, builds, starts everything)
#   make dev       - Daily development (starts containers, shows logs)
#   make down      - Stop everything
#
# 📝 Development Workflow:
#   1. make setup          (only once)
#   2. make dev            (start working)
#   3. make logs           (check logs)
#   4. make shell          (access container)
#   5. make down           (stop when done)
#
# 🔧 Common Tasks:
#   make db-setup          - Complete database setup
#   make db-migrate        - Run database migrations
#   make db-seed-rbac      - Setup RBAC system
#   make db-shell          - Access database
#   make test              - Run tests
#   make clean             - Clean up everything

.PHONY: help setup dev up down logs logs-codes logs-all shell db-migrate db-shell test clean

.DEFAULT_GOAL := help

help: ## Show available commands
	@echo "🚀 RandevuBu Server Commands:"
	@echo ""
	@echo "📦 Setup & Start:"
	@echo "  setup      - First time setup (only run once)"
	@echo "  dev        - Start development environment"
	@echo "  up         - Start containers"
	@echo "  down       - Stop containers"
	@echo ""
	@echo "🔍 Development:"
	@echo "  logs       - View application logs"
	@echo "  logs-codes - View logs filtered for verification codes"
	@echo "  logs-all   - View all service logs"
	@echo "  shell      - Access container shell"
	@echo "  status     - Show container status"
	@echo ""
	@echo "🗄️ Database:"
	@echo "  db-setup     - Complete database setup (migrate + generate + seed)"
	@echo "  db-migrate   - Run database migrations"
	@echo "  db-generate  - Generate Prisma client"
	@echo "  db-seed-rbac - Setup RBAC system (roles & permissions)"
	@echo "  db-seed-subscription-plans - Seed subscription plans only"
	@echo "  db-seed-business - Seed business data (types, businesses)"
	@echo "  db-seed-customers - Seed customers and appointments"
	@echo "  db-shell     - Access PostgreSQL shell"
	@echo "  db-studio    - Open Prisma Studio (database GUI)"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test       - Run tests"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  clean      - Stop and remove everything"
	@echo ""

# 📦 SETUP & START
setup: ## First time setup - creates .env, builds, starts, migrates
	@echo "🚀 Setting up RandevuBu Server..."
	@if [ ! -f .env ]; then cp .env.example .env && echo "✅ Created .env file"; fi
	@docker compose build
	@docker compose up -d
	@echo "⏳ Waiting for services..."
	@sleep 10
	@docker compose exec app npx prisma migrate deploy
	@echo ""
	@echo "✅ Setup complete!"
	@echo "🌐 API: http://localhost:3001"
	@echo "📚 Docs: http://localhost:3001/api-docs"

dev: ## Start development environment and show logs
	@echo "🚀 Starting development environment..."
	@docker compose up -d
	@echo "📝 Showing application logs (Ctrl+C to exit):"
	@docker compose logs -f app

up: ## Start containers in background
	@docker compose up -d
	@echo "✅ Services started at http://localhost:3001"

down: ## Stop all containers
	@docker compose down
	@echo "✅ Services stopped"

# 🔍 DEVELOPMENT
logs: ## View application logs
	@docker compose logs -f app

logs-codes: ## View logs filtered for verification codes (great for testing!)
	@echo "🔍 Watching for verification codes..."
	@echo "📱 Send a phone verification request to see codes here"
	@echo "⏹️  Press Ctrl+C to exit"
	@docker compose logs -f app | grep -E "(SMS Code|verification code|code.*sent|code.*verified)"

logs-all: ## View all service logs (app + database + redis)
	@docker compose logs -f

shell: ## Access application container
	@docker compose exec app sh

status: ## Show container status
	@docker compose ps

# 🗄️ DATABASE
db-migrate: ## Run database migrations
	@docker compose exec app npx prisma migrate deploy
	@echo "✅ Database migrations completed"

db-generate: ## Generate Prisma client
	@docker compose exec app npx prisma generate
	@echo "✅ Prisma client generated"

db-seed: ## Seed database with default data
	@docker compose exec app npm run db:seed
	@echo "✅ Database seeded"

db-seed-rbac: ## Seed RBAC system (roles, permissions)
	@docker compose exec app npm run db:seed-rbac
	@echo "✅ RBAC system seeded"

db-seed-subscription-plans: ## Seed subscription plans only
	@docker compose exec app npm run db:seed-subscription-plans
	@echo "✅ Subscription plans seeded"

db-seed-business: ## Seed business data (types, subscription plans)
	@docker compose exec app npm run db:seed-business
	@echo "✅ Business data seeded"

db-seed-customers: ## Seed customers and appointments data
	@docker compose exec app npm run db:seed-customers
	@echo "✅ Customers and appointments seeded"

db-seed-discounts: ## Seed discount codes
	@docker compose exec app ts-node prisma/seed-discount-codes.ts
	@echo "✅ Discount codes seeded"

db-reset: ## Reset database and reseed
	@docker compose exec app npx prisma migrate reset --force
	@docker compose exec app npm run db:seed
	@echo "✅ Database reset and seeded"

db-setup: ## Complete database setup (migrate + generate + seed)
	@echo "🗄️ Setting up database..."
	@docker compose exec app npx prisma migrate deploy
	@docker compose exec app npx prisma generate
	@docker compose exec app npm run db:seed
	@echo "✅ Database setup completed"

db-shell: ## Access PostgreSQL shell
	@docker compose exec postgres psql -U postgres -d randevubu

db-studio: ## Open Prisma Studio (database GUI)
	@echo "🚀 Starting Prisma Studio..."
	@echo "🌐 Opening at http://localhost:5555"
	@docker compose exec app npx prisma studio

# 🧪 TESTING
test: ## Run tests
	@docker compose exec app npm test

# 🧹 CLEANUP
clean: ## Stop containers and clean up
	@docker compose down -v
	@docker system prune -f
	@echo "✅ Cleanup completed"

# 🚀 PRODUCTION (optional)
prod-up: ## Start production environment
	@docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started"

prod-down: ## Stop production environment
	@docker compose -f docker-compose.prod.yml down

prod-logs: ## View production logs
	@docker compose -f docker-compose.prod.yml logs -f app

prod-logs-all: ## View all production service logs
	@docker compose -f docker-compose.prod.yml logs -f