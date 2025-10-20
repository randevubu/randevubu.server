# AWS t3.micro Deployment Guide

Complete guide to deploy RandevuBu Server on AWS EC2 t3.micro instance.
Created Files

  1. Full Deployment Guide

  docs/AWS_T3_MICRO_DEPLOYMENT.md - Complete step-by-step guide covering:
  - EC2 instance setup
  - Installing all dependencies (Node.js, PostgreSQL, Redis, Nginx)
  - Database configuration
  - PM2 process management
  - Nginx reverse proxy setup
  - SSL/HTTPS with Let's Encrypt
  - Monitoring, backups, and maintenance
  - Troubleshooting tips
  - Performance optimization for 1GB RAM

  2. Automated Deployment Script

  scripts/deploy-to-ec2.sh - One-command deployment that:
  - Installs all required software
  - Configures PostgreSQL and Redis
  - Sets up your application
  - Creates secure environment variables
  - Starts the app with PM2
  - Configures firewall and swap space

  3. Quick Start Guide

  QUICK_START_AWS.md - Fast reference for:
  - Quick commands
  - Common operations
  - Troubleshooting
  - Security checklist

  How to Deploy

  Option 1: Automated (Recommended)

  # 1. Connect to your EC2 instance
  ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP

  # 2. Run deployment script
  git clone YOUR_REPO_URL randevubu-server
  cd randevubu-server
  chmod +x scripts/deploy-to-ec2.sh
  ./scripts/deploy-to-ec2.sh

  Option 2: Manual

  Follow the step-by-step guide in docs/AWS_T3_MICRO_DEPLOYMENT.md

  Important Notes for t3.micro (1GB RAM)

  Your production Docker setup runs 3 app instances, which is too much for t3.micro. I've optimized the       
  deployment to:
  - Run 1 app instance with PM2
  - Configure 2GB swap space (critical for 1GB RAM)
  - Limit memory usage to 400MB per process
  - Use Node.js cluster mode for efficiency

  Before You Deploy

  Make sure you have:
  1. ✅ AWS EC2 t3.micro instance running Ubuntu 22.04
  2. ✅ Elastic IP allocated and attached
  3. ✅ Security groups configured (ports 22, 80, 443)
  4. ✅ SSH key (.pem file) downloaded
  5. ✅ Domain name (optional, for SSL)

  After Deployment

  You'll need to update your .env file with:
  - AWS S3 credentials (for file uploads)
  - SMTP settings (for emails)
  - Payment gateway keys (Iyzico)
  - Google Places API key
  - Your domain name (for CORS)

  Key Commands

  pm2 status                  # Check app status
  pm2 logs randevubu-api      # View logs
  pm2 restart randevubu-api   # Restart app
  htop                        # Monitor resources

  Would you like me to help you with any specific part of the deployment, such as:
  - Creating the Nginx configuration?
  - Setting up SSL certificates?
  - Optimizing for even lower memory usage?
  - Setting up automated backups?


## Instance Specs
- **Type**: t3.micro
- **vCPUs**: 2
- **Memory**: 1 GB RAM
- **Storage**: EBS (recommended 20GB+)

---

## Table of Contents
1. [Initial Setup](#1-initial-setup)
2. [Connect to Your Instance](#2-connect-to-your-instance)
3. [Install Dependencies](#3-install-dependencies)
4. [Deploy Your Application](#4-deploy-your-application)
5. [Configure Database](#5-configure-database)
6. [Setup Process Manager](#6-setup-process-manager)
7. [Configure Nginx](#7-configure-nginx)
8. [SSL/HTTPS Setup](#8-ssl-https-setup)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)

---

## 1. Initial Setup

### AWS Console Steps
1. Launch EC2 t3.micro instance
2. Choose **Ubuntu 22.04 LTS** (recommended)
3. Configure Security Group:
   ```
   - SSH (22): Your IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - Custom TCP (3000): 0.0.0.0/0 (temporary, will remove later)
   ```
4. Download your `.pem` key file
5. Allocate an **Elastic IP** and associate it with your instance

---

## 2. Connect to Your Instance

### From Windows (using PowerShell or Git Bash)
```bash
# Set correct permissions for your key
icacls "path\to\your-key.pem" /inheritance:r
icacls "path\to\your-key.pem" /grant:r "%username%:R"

# Connect
ssh -i "path\to\your-key.pem" ubuntu@YOUR_ELASTIC_IP
```

### From Linux/Mac
```bash
chmod 400 your-key.pem
ssh -i "path/to/your-key.pem" ubuntu@YOUR_ELASTIC_IP
```

---

## 3. Install Dependencies

### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js (v20.x LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
npm --version
```

### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### Install Docker & Docker Compose (Optional - if using Docker)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo apt install -y docker-compose

# Verify
docker --version
docker-compose --version
```

---

## 4. Deploy Your Application

### Option A: Without Docker (Recommended for t3.micro - uses less memory)

#### 1. Clone Your Repository
```bash
cd /home/ubuntu
git clone YOUR_REPOSITORY_URL randevubu-server
cd randevubu-server
```

#### 2. Install Dependencies
```bash
npm install --production
```

#### 3. Build the Application
```bash
npm run build
```

#### 4. Create Environment File
```bash
cp .env.example .env
nano .env
```

Update these critical values:
```bash
# Database
DATABASE_URL="postgresql://randevubu_user:YOUR_SECURE_PASSWORD@localhost:5432/randevubu?schema=public"

# JWT Secrets (generate strong secrets)
JWT_ACCESS_SECRET="your-strong-secret-here"
JWT_REFRESH_SECRET="your-strong-refresh-secret-here"

# Cookie
COOKIE_SECRET="your-cookie-secret"
COOKIE_DOMAIN="yourdomain.com"

# Environment
NODE_ENV="production"
PORT=3000

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="your_redis_password"

# AWS S3 (if using)
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket"

# CORS
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# API
API_VERSION="v1"

# Google Places API
GOOGLE_PLACES_API_KEY="your-google-api-key"
```

### Option B: With Docker (Uses more memory)

#### 1. Clone Repository
```bash
cd /home/ubuntu
git clone YOUR_REPOSITORY_URL randevubu-server
cd randevubu-server
```

#### 2. Create Production Environment
```bash
cp .env.example .env.production
nano .env.production
# Update values similar to Option A
```

#### 3. Optimize for t3.micro
Edit `docker-compose.production.yml` to run only 1 app instance:
```bash
nano docker-compose.production.yml
```

Comment out app2 and app3 services, adjust memory limits for app1:
```yaml
app1:
  deploy:
    resources:
      limits:
        memory: 400M
        cpus: '0.8'
```

#### 4. Start Services
```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## 5. Configure Database

### Setup PostgreSQL

#### 1. Create Database User and Database
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE USER randevubu_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
CREATE DATABASE randevubu OWNER randevubu_user;
GRANT ALL PRIVILEGES ON DATABASE randevubu TO randevubu_user;
\c randevubu
GRANT ALL ON SCHEMA public TO randevubu_user;
\q
```

#### 2. Configure PostgreSQL for Remote Access (if needed)
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
# Change: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host randevubu randevubu_user 127.0.0.1/32 md5

sudo systemctl restart postgresql
```

#### 3. Run Migrations
```bash
cd /home/ubuntu/randevubu-server
npx prisma migrate deploy
npx prisma generate
```

#### 4. Seed Database
```bash
npm run db:seed-rbac
npm run db:seed-subscription-plans
```

### Setup Redis

#### 1. Configure Redis with Password
```bash
sudo nano /etc/redis/redis.conf
```

Find and update:
```
requirepass your_redis_password
bind 127.0.0.1
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

#### 2. Test Redis
```bash
redis-cli -a your_redis_password ping
# Should return: PONG
```

---

## 6. Setup Process Manager (PM2)

### Create PM2 Ecosystem File
```bash
cd /home/ubuntu/randevubu-server
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'randevubu-api',
    script: './dist/index.js',
    instances: 1,  // Only 1 instance for t3.micro
    exec_mode: 'cluster',
    max_memory_restart: '400M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
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
```

### Start Application with PM2
```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs randevubu-api
```

### Useful PM2 Commands
```bash
pm2 list                  # List all processes
pm2 logs                  # View logs
pm2 restart randevubu-api # Restart app
pm2 stop randevubu-api    # Stop app
pm2 delete randevubu-api  # Remove from PM2
pm2 monit                 # Monitor CPU/Memory
```

---

## 7. Configure Nginx

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/randevubu
```

Add this configuration:
```nginx
upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (will add certificates later)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/randevubu-access.log;
    error_log /var/log/nginx/randevubu-error.log;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://api_backend/health;
    }
}
```

### Enable the Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/randevubu /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 8. SSL/HTTPS Setup

### Using Let's Encrypt (Free SSL)

#### 1. Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Stop Nginx temporarily
```bash
sudo systemctl stop nginx
```

#### 3. Obtain SSL Certificate
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts and enter your email.

#### 4. Update Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/randevubu
```

Uncomment these lines and update domain:
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

#### 5. Start Nginx
```bash
sudo nginx -t
sudo systemctl start nginx
```

#### 6. Setup Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
# Verify it's there:
sudo systemctl list-timers | grep certbot
```

---

## 9. Monitoring & Maintenance

### Setup Swap (Important for 1GB RAM)
```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

### Monitor System Resources
```bash
# Real-time monitoring
htop

# Memory usage
free -h

# Disk usage
df -h

# PM2 monitoring
pm2 monit
```

### Setup Automatic Backups

#### Database Backup Script
```bash
mkdir -p /home/ubuntu/backups
nano /home/ubuntu/backup-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="randevubu"
DB_USER="randevubu_user"

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_backup_$TIMESTAMP.sql.gz"
```

Make executable and schedule:
```bash
chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (runs daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backups/backup.log 2>&1
```

### Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/randevubu
```

Add:
```
/home/ubuntu/randevubu-server/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Useful Maintenance Commands
```bash
# Check application logs
pm2 logs randevubu-api --lines 100

# Check Nginx logs
sudo tail -f /var/log/nginx/randevubu-access.log
sudo tail -f /var/log/nginx/randevubu-error.log

# Check system logs
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
sudo journalctl -u redis-server -f

# Restart services
pm2 restart randevubu-api
sudo systemctl restart nginx
sudo systemctl restart postgresql
sudo systemctl restart redis-server

# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
pm2 status
```

---

## Deployment Checklist

- [ ] EC2 instance launched with t3.micro
- [ ] Elastic IP allocated and associated
- [ ] Security groups configured
- [ ] SSH access working
- [ ] All dependencies installed
- [ ] Database created and configured
- [ ] Redis configured with password
- [ ] Application code deployed
- [ ] Environment variables set
- [ ] Database migrated and seeded
- [ ] PM2 configured and running
- [ ] Nginx configured
- [ ] SSL certificates installed
- [ ] Domain DNS pointing to Elastic IP
- [ ] Swap space configured
- [ ] Backups scheduled
- [ ] Log rotation configured
- [ ] Application accessible via HTTPS

---

## Updating Your Application

### Pull Latest Changes
```bash
cd /home/ubuntu/randevubu-server
git pull origin main
```

### Install New Dependencies (if any)
```bash
npm install --production
```

### Build Application
```bash
npm run build
```

### Run Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

### Restart Application
```bash
pm2 restart randevubu-api
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs randevubu-api

# Check if port is in use
sudo netstat -tlnp | grep 3000

# Check environment variables
pm2 env 0
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U randevubu_user -d randevubu -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql -n 50
```

### Redis Connection Issues
```bash
# Test Redis
redis-cli -a your_redis_password ping

# Check Redis status
sudo systemctl status redis-server

# Check logs
sudo journalctl -u redis-server -n 50
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### Out of Memory
```bash
# Check memory usage
free -h

# Check swap
swapon --show

# Reduce PM2 instances if needed
pm2 scale randevubu-api 1
```

---

## Performance Optimization for t3.micro

### 1. Enable Gzip Compression in Nginx
Already enabled in your app, but ensure Nginx also compresses:
```bash
sudo nano /etc/nginx/nginx.conf
```

Add in http block:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 2. Optimize Node.js Memory
In `ecosystem.config.js`:
```javascript
env_production: {
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-old-space-size=400'
}
```

### 3. Monitor and Adjust
```bash
# Watch resource usage
watch -n 1 'free -h && echo && ps aux --sort=-%mem | head -10'
```

---

## Security Best Practices

1. **Firewall**: Enable UFW
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

2. **Fail2Ban**: Prevent brute force
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

3. **Regular Updates**
```bash
sudo apt update && sudo apt upgrade -y
```

4. **SSH Key Only**: Disable password authentication
```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

---

## Cost Optimization

- t3.micro is free tier eligible (750 hours/month for first 12 months)
- Use Elastic IP (free when attached to running instance)
- Monitor CloudWatch for CPU credit balance
- Consider AWS RDS Free Tier for PostgreSQL if needed

---

## Support

For issues:
- Check logs: `pm2 logs`
- Check system: `htop`
- Review configuration files
- Consult application documentation in `/docs`

---

**Good luck with your deployment!**
