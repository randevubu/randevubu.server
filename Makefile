# RandevuBu Server - Production-Ready Makefile
#
# 🚀 Quick Start:
#   make setup          - First time setup (copies .env, builds, starts everything)
#   make dev            - Daily development (starts containers, shows logs)
#   make prod-up        - Start production environment
#   make down           - Stop everything
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
.PHONY: prod-up prod-down prod-logs prod-shell prod-status
.PHONY: security-scan backup-db backup-redis backup-all
.PHONY: ssl-setup ssl-dev ssl-renew
.PHONY: metrics monitoring

.DEFAULT_GOAL := help

help: ## Show available commands
	@echo "🚀 RandevuBu Server Commands:"
	@echo ""
	@echo "📦 Development Setup & Start:"
	@echo "  setup          - First time setup (only run once)"
	@echo "  dev            - Start full development with all tools"
	@echo "  dev-minimal    - Start minimal development (app + db + redis)"
	@echo "  up             - Start basic containers only"
	@echo "  down           - Stop all containers"
	@echo ""
	@echo "🔍 Development:"
	@echo "  logs           - View application logs"
	@echo "  logs-codes     - View logs filtered for verification codes"
	@echo "  logs-all       - View all service logs"
	@echo "  shell          - Access container shell"
	@echo "  status         - Show container status"
	@echo ""
	@echo "🗄️ Database:"
	@echo "  db-setup       - Complete database setup (migrate + generate + seed)"
	@echo "  db-migrate     - Run database migrations"
	@echo "  db-generate    - Generate Prisma client"
	@echo "  db-seed-rbac   - Setup RBAC system (roles & permissions)"
	@echo "  db-seed-subscription-plans - Seed subscription plans only"
	@echo "  db-seed-business - Seed business data (types, businesses)"
	@echo "  db-seed-customers - Seed customers and appointments"
	@echo "  db-shell       - Access PostgreSQL shell"
	@echo "  db-studio      - Open Prisma Studio (database GUI)"
	@echo ""
	@echo "🚀 Production:"
	@echo "  prod-up        - Start production environment"
	@echo "  prod-down      - Stop production environment"
	@echo "  prod-logs      - View production logs"
	@echo "  prod-shell     - Access production container"
	@echo "  prod-status    - Show production container status"
	@echo ""
	@echo "🔒 Security:"
	@echo "  security-scan  - Run comprehensive security scan"
	@echo "  ssl-setup      - Setup SSL certificates with Let's Encrypt"
	@echo "  ssl-dev        - Generate development SSL certificates"
	@echo "  ssl-renew      - Renew SSL certificates"
	@echo ""
	@echo "💾 Backup & Recovery:"
	@echo "  backup-db      - Backup database"
	@echo "  backup-redis   - Backup Redis"
	@echo "  backup-all     - Comprehensive backup (DB + Redis)"
	@echo ""
	@echo "📊 Monitoring:"
	@echo "  metrics        - View Prometheus metrics"
	@echo "  monitoring     - Open monitoring dashboard"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test           - Run tests"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  clean          - Stop and remove everything"
	@echo ""

# 📦 DEVELOPMENT SETUP & START
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

dev: ## Start full development environment with all tools
	@echo "🚀 Starting full development environment..."
	@if [ ! -f .env ]; then cp .env.development .env && echo "✅ Created .env from development template"; fi
	@docker compose -f docker-compose.dev.yml up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 10
	@echo "✅ Development environment ready!"
	@echo "🌐 API: http://localhost:3001"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3000 (admin/admin)"
	@echo "📧 Mailhog: http://localhost:8025"
	@echo "🔴 Redis Commander: http://localhost:8081"
	@echo "🗄️ Prisma Studio: http://localhost:5555"
	@echo ""
	@echo "📝 Showing application logs (Ctrl+C to exit):"
	@docker compose -f docker-compose.dev.yml logs -f app

up: ## Start basic containers (app + database only)
	@docker compose up -d
	@echo "✅ Basic services started at http://localhost:3001"

dev-minimal: ## Start minimal development (app + database + redis only)
	@echo "🚀 Starting minimal development environment..."
	@if [ ! -f .env ]; then cp .env.development .env && echo "✅ Created .env from development template"; fi
	@docker compose up -d
	@echo "✅ Minimal development ready at http://localhost:3001"

down: ## Stop all containers
	@docker compose down
	@docker compose -f docker-compose.dev.yml down
	@echo "✅ All services stopped"

# 🔍 DEVELOPMENT
logs: ## View application logs
	@if docker compose -f docker-compose.dev.yml ps app >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml logs -f app; \
	else \
		docker compose logs -f app; \
	fi

logs-codes: ## View logs filtered for verification codes (great for testing!)
	@echo "🔍 Watching for verification codes..."
	@echo "📱 Send a phone verification request to see codes here"
	@echo "⏹️  Press Ctrl+C to exit"
	@if docker compose -f docker-compose.dev.yml ps app >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml logs -f app | grep -E "(SMS Code|verification code|code.*sent|code.*verified)"; \
	else \
		docker compose logs -f app | grep -E "(SMS Code|verification code|code.*sent|code.*verified)"; \
	fi

logs-all: ## View all service logs
	@if docker compose -f docker-compose.dev.yml ps >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml logs -f; \
	else \
		docker compose logs -f; \
	fi

shell: ## Access application container
	@if docker compose -f docker-compose.dev.yml ps app >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml exec app sh; \
	else \
		docker compose exec app sh; \
	fi

status: ## Show container status
	@if docker compose -f docker-compose.dev.yml ps >/dev/null 2>&1; then \
		echo "📊 Full Development Environment Status:"; \
		docker compose -f docker-compose.dev.yml ps; \
	else \
		echo "📊 Basic Environment Status:"; \
		docker compose ps; \
	fi

# 🗄️ DATABASE
db-migrate: ## Run database migrations
	@if docker compose -f docker-compose.dev.yml ps app >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml exec app npx prisma migrate deploy; \
	else \
		docker compose exec app npx prisma migrate deploy; \
	fi
	@echo "✅ Database migrations completed"

db-generate: ## Generate Prisma client
	@if docker compose -f docker-compose.dev.yml ps app >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml exec app npx prisma generate; \
	else \
		docker compose exec app npx prisma generate; \
	fi
	@echo "✅ Prisma client generated"

db-seed: ## Seed database with default data
	@if docker compose -f docker-compose.dev.yml ps app >/dev/null 2>&1; then \
		docker compose -f docker-compose.dev.yml exec app npm run db:seed; \
	else \
		docker compose exec app npm run db:seed; \
	fi
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

# 🚀 PRODUCTION
prod-up: ## Start production environment
	@echo "🚀 Starting production environment..."
	@if [ ! -f .env ]; then echo "❌ .env file not found. Copy .env.production to .env and configure it."; exit 1; fi
	@docker compose -f docker-compose.prod.yml up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 30
	@echo "✅ Production services started"
	@echo "🌐 Application: https://localhost"
	@echo "📊 Metrics: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3001"

prod-down: ## Stop production environment
	@docker compose -f docker-compose.prod.yml down
	@echo "✅ Production services stopped"

prod-logs: ## View production logs
	@docker compose -f docker-compose.prod.yml logs -f app

prod-logs-all: ## View all production service logs
	@docker compose -f docker-compose.prod.yml logs -f

prod-shell: ## Access production application container
	@docker compose -f docker-compose.prod.yml exec app sh

prod-status: ## Show production container status
	@docker compose -f docker-compose.prod.yml ps

# 🔒 SECURITY
security-scan: ## Run comprehensive security scan
	@echo "🔒 Running security scan..."
	@chmod +x scripts/security-scan.sh
	@bash scripts/security-scan.sh
	@echo "✅ Security scan completed. Check security-scan-results/ for details."

ssl-setup: ## Setup SSL certificates with Let's Encrypt
	@read -p "Enter your domain name: " domain; \
	chmod +x scripts/setup-letsencrypt.sh; \
	bash scripts/setup-letsencrypt.sh $$domain

ssl-dev: ## Generate development SSL certificates
	@echo "🔒 Generating development SSL certificates..."
	@chmod +x scripts/generate-dev-certs.sh
	@bash scripts/generate-dev-certs.sh
	@echo "✅ Development SSL certificates generated"

ssl-renew: ## Renew SSL certificates
	@echo "🔄 Renewing SSL certificates..."
	@if [ -f scripts/renew-ssl.sh ]; then \
		chmod +x scripts/renew-ssl.sh; \
		bash scripts/renew-ssl.sh; \
	else \
		echo "❌ SSL renewal script not found"; \
	fi

# 💾 BACKUP & RECOVERY
backup-db: ## Backup database
	@echo "💾 Starting database backup..."
	@chmod +x scripts/backup-database.sh
	@bash scripts/backup-database.sh
	@echo "✅ Database backup completed"

backup-redis: ## Backup Redis
	@echo "💾 Starting Redis backup..."
	@chmod +x scripts/backup-redis.sh
	@bash scripts/backup-redis.sh
	@echo "✅ Redis backup completed"

backup-all: ## Comprehensive backup (database + Redis)
	@echo "💾 Starting comprehensive backup..."
	@chmod +x scripts/backup-all.sh
	@bash scripts/backup-all.sh
	@echo "✅ Comprehensive backup completed"

# 📊 MONITORING
metrics: ## View Prometheus metrics
	@echo "📊 Opening Prometheus metrics..."
	@if command -v open >/dev/null 2>&1; then \
		open http://localhost:9090; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:9090; \
	else \
		echo "🌐 Prometheus: http://localhost:9090"; \
	fi

monitoring: ## Open monitoring dashboard
	@echo "📈 Opening monitoring dashboard..."
	@if command -v open >/dev/null 2>&1; then \
		open http://localhost:3001; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:3001; \
	else \
		echo "🌐 Grafana: http://localhost:3001"; \
	fi

# 🧪 TESTING
test: ## Run tests
	@docker compose exec app npm test

# 🧹 CLEANUP
clean: ## Stop containers and clean up
	@docker compose down -v
	@docker compose -f docker-compose.prod.yml down -v
	@docker system prune -f
	@echo "✅ Cleanup completed"

# 🔧 ADVANCED PRODUCTION TASKS
prod-rebuild: ## Rebuild and restart production services
	@echo "🔄 Rebuilding production services..."
	@docker compose -f docker-compose.prod.yml down
	@docker compose -f docker-compose.prod.yml build --no-cache
	@docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services rebuilt and restarted"

prod-health: ## Check production health
	@echo "🏥 Checking production health..."
	@curl -f http://localhost/health && echo "✅ Application healthy" || echo "❌ Application unhealthy"
	@curl -f http://localhost:9090/-/healthy && echo "✅ Prometheus healthy" || echo "❌ Prometheus unhealthy"

prod-deploy: ssl-dev prod-up prod-health ## Full production deployment
	@echo "🚀 Production deployment completed!"

# 📋 INFORMATION
info: ## Show system information
	@echo "📋 RandevuBu System Information:"
	@echo ""
	@echo "🐳 Docker:"
	@docker --version
	@docker compose version
	@echo ""
	@echo "📊 Container Status:"
	@docker compose ps
	@echo ""
	@echo "💾 Volumes:"
	@docker volume ls | grep randevubu
	@echo ""
	@echo "🌐 Networks:"
	@docker network ls | grep randevubu
	@echo ""

# 🔄 MAINTENANCE
maintenance: ## Run maintenance tasks
	@echo "🔧 Running maintenance tasks..."
	@echo "🧹 Cleaning up old logs..."
	@find ./logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
	@echo "🧹 Cleaning up Docker system..."
	@docker system prune -f
	@echo "✅ Maintenance completed"