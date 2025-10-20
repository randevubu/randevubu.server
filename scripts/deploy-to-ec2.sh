#!/bin/bash

# RandevuBu Server - AWS EC2 Deployment Script
# This script automates the deployment process on a fresh Ubuntu EC2 instance

set -e  # Exit on any error

echo "=========================================="
echo "  RandevuBu Server - EC2 Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_step() {
    echo -e "\n${YELLOW}==>${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Step 1: System Update
print_step "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Step 2: Install Node.js
print_step "Step 2: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# Step 3: Install PostgreSQL
print_step "Step 3: Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL installed"
else
    print_success "PostgreSQL already installed"
fi

# Step 4: Install Redis
print_step "Step 4: Installing Redis..."
if ! command -v redis-cli &> /dev/null; then
    sudo apt install -y redis-server
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    print_success "Redis installed"
else
    print_success "Redis already installed"
fi

# Step 5: Install Nginx
print_step "Step 5: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Step 6: Install PM2
print_step "Step 6: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Step 7: Setup PostgreSQL Database
print_step "Step 7: Setting up PostgreSQL database..."
read -p "Enter database name [randevubu]: " DB_NAME
DB_NAME=${DB_NAME:-randevubu}

read -p "Enter database user [randevubu_user]: " DB_USER
DB_USER=${DB_USER:-randevubu_user}

read -sp "Enter database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    print_error "Database password cannot be empty"
    exit 1
fi

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

print_success "Database created: $DB_NAME"

# Step 8: Configure Redis
print_step "Step 8: Configuring Redis..."
read -sp "Enter Redis password: " REDIS_PASSWORD
echo ""

if [ -z "$REDIS_PASSWORD" ]; then
    print_warning "Redis password not set - skipping Redis password configuration"
else
    # Backup original config
    sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

    # Set password
    sudo sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf

    # Ensure Redis binds to localhost only
    sudo sed -i "s/bind 127.0.0.1/bind 127.0.0.1/" /etc/redis/redis.conf

    sudo systemctl restart redis-server
    print_success "Redis configured with password"
fi

# Step 9: Setup Application
print_step "Step 9: Setting up application..."
read -p "Enter your Git repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    print_error "Repository URL cannot be empty"
    exit 1
fi

APP_DIR="/home/$USER/randevubu-server"

if [ -d "$APP_DIR" ]; then
    print_warning "Application directory already exists at $APP_DIR"
    read -p "Remove and re-clone? (y/N): " REMOVE
    if [ "$REMOVE" = "y" ] || [ "$REMOVE" = "Y" ]; then
        rm -rf "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR"
        print_success "Repository cloned"
    fi
else
    git clone "$REPO_URL" "$APP_DIR"
    print_success "Repository cloned"
fi

cd "$APP_DIR"

# Install dependencies
print_step "Installing dependencies..."
npm install --production
print_success "Dependencies installed"

# Build application
print_step "Building application..."
npm run build
print_success "Application built"

# Step 10: Create Environment File
print_step "Step 10: Creating environment file..."

cat > .env <<EOF
# Database Configuration
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"

# JWT Configuration
JWT_ACCESS_SECRET="$(openssl rand -base64 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cookie Configuration
COOKIE_SECRET="$(openssl rand -base64 32)"
COOKIE_DOMAIN=""

# API Configuration
API_VERSION="v1"
PORT=3000
NODE_ENV="production"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Security
BCRYPT_ROUNDS=12

# Redis Configuration
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="$REDIS_PASSWORD"

# Logging
LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# CORS Configuration - UPDATE THIS WITH YOUR DOMAIN
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# File Upload Configuration
MAX_FILE_SIZE="10MB"
UPLOAD_PATH="uploads/"

# Business Configuration
DEFAULT_TIMEZONE="Europe/Istanbul"
DEFAULT_LANGUAGE="tr"
DEFAULT_CURRENCY="TRY"

# Pagination Defaults
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Session Configuration
SESSION_SECRET="$(openssl rand -base64 32)"
SESSION_EXPIRES_IN="24h"

# NOTE: Update these with your actual values:
# - AWS credentials (if using S3)
# - SMTP settings (if using email)
# - Payment gateway credentials
# - Google Places API key
# - Your domain for CORS and cookies
EOF

print_success "Environment file created at $APP_DIR/.env"
print_warning "IMPORTANT: Edit .env file to add your API keys and domain settings"

# Step 11: Run Database Migrations
print_step "Step 11: Running database migrations..."
npx prisma migrate deploy
npx prisma generate
print_success "Database migrations completed"

# Step 12: Seed Database
print_step "Step 12: Seeding database..."
npm run db:seed-rbac || print_warning "RBAC seeding failed or already seeded"
npm run db:seed-subscription-plans || print_warning "Subscription plans seeding failed or already seeded"
print_success "Database seeding completed"

# Step 13: Setup PM2
print_step "Step 13: Setting up PM2..."

# Create logs directory
mkdir -p logs

# Create PM2 ecosystem file
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'randevubu-api',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '400M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=400'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
print_success "Application started with PM2"

# Setup PM2 startup
print_step "Setting up PM2 startup script..."
pm2 startup systemd -u $USER --hp /home/$USER
print_warning "Copy and run the command above if it was displayed"

# Step 14: Setup Swap (for 1GB RAM)
print_step "Step 14: Setting up swap space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_success "2GB swap space created"
else
    print_success "Swap file already exists"
fi

# Step 15: Configure Firewall
print_step "Step 15: Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    print_success "Firewall configured"
else
    sudo apt install -y ufw
    sudo ufw --force enable
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    print_success "Firewall installed and configured"
fi

# Final Summary
echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
print_success "Application is running on http://localhost:3000"
echo ""
echo "Next Steps:"
echo "1. Edit .env file to add your API keys and domain:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Configure Nginx reverse proxy (see docs/AWS_T3_MICRO_DEPLOYMENT.md)"
echo ""
echo "3. Setup SSL with Let's Encrypt:"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo "4. Check application status:"
echo "   pm2 status"
echo "   pm2 logs randevubu-api"
echo ""
echo "Useful Commands:"
echo "  pm2 list                    - List all processes"
echo "  pm2 logs randevubu-api      - View logs"
echo "  pm2 restart randevubu-api   - Restart app"
echo "  pm2 monit                   - Monitor resources"
echo ""
echo "Full documentation: $APP_DIR/docs/AWS_T3_MICRO_DEPLOYMENT.md"
echo ""
print_warning "Don't forget to configure your DNS to point to this server's IP!"
echo ""
