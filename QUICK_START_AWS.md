# Quick Start - AWS EC2 Deployment

Fast deployment guide for AWS t3.micro instance.

## Prerequisites

- AWS account with EC2 t3.micro instance launched (Ubuntu 22.04)
- Domain name (optional but recommended)
- Git repository access
- SSH key (.pem file) downloaded

## One-Command Deployment

Once connected to your EC2 instance, run:

```bash
# Download and run deployment script
curl -o deploy.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/deploy-to-ec2.sh
chmod +x deploy.sh
./deploy.sh
```

Or manually clone and run:

```bash
git clone YOUR_REPOSITORY_URL randevubu-server
cd randevubu-server
chmod +x scripts/deploy-to-ec2.sh
./scripts/deploy-to-ec2.sh
```

The script will:
- Install all dependencies (Node.js, PostgreSQL, Redis, Nginx, PM2)
- Setup database and Redis
- Clone and build your application
- Configure environment variables
- Start the application with PM2
- Setup swap space and firewall

## Manual Quick Setup

### 1. Connect to EC2
```bash
ssh -i your-key.pem ubuntu@YOUR_IP
```

### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install other services
sudo apt install -y postgresql postgresql-contrib redis-server nginx
sudo npm install -g pm2
```

### 3. Clone and Setup App
```bash
cd ~
git clone YOUR_REPO_URL randevubu-server
cd randevubu-server
npm install --production
npm run build
```

### 4. Configure Database
```bash
sudo -u postgres psql
```

In PostgreSQL:
```sql
CREATE USER randevubu_user WITH PASSWORD 'your_password';
CREATE DATABASE randevubu OWNER randevubu_user;
GRANT ALL PRIVILEGES ON DATABASE randevubu TO randevubu_user;
\c randevubu
GRANT ALL ON SCHEMA public TO randevubu_user;
\q
```

### 5. Create .env File
```bash
cp .env.example .env
nano .env
```

Update these critical values:
```bash
DATABASE_URL="postgresql://randevubu_user:your_password@localhost:5432/randevubu?schema=public"
JWT_ACCESS_SECRET="your-strong-secret"
JWT_REFRESH_SECRET="your-strong-refresh-secret"
NODE_ENV="production"
```

### 6. Run Migrations and Start
```bash
npx prisma migrate deploy
npx prisma generate
npm run db:seed-rbac
npm run db:seed-subscription-plans

# Create PM2 config (see docs/AWS_T3_MICRO_DEPLOYMENT.md)
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 7. Setup Nginx (Optional but recommended)
```bash
sudo nano /etc/nginx/sites-available/randevubu
# Add configuration from docs/AWS_T3_MICRO_DEPLOYMENT.md

sudo ln -s /etc/nginx/sites-available/randevubu /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Setup SSL (if you have a domain)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Common Commands

### Application Management
```bash
pm2 status                  # Check status
pm2 logs randevubu-api      # View logs
pm2 restart randevubu-api   # Restart app
pm2 monit                   # Monitor resources
```

### Update Application
```bash
cd ~/randevubu-server
git pull origin main
npm install --production
npm run build
npx prisma migrate deploy
pm2 restart randevubu-api
```

### Check Services
```bash
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
pm2 status
```

### View Logs
```bash
pm2 logs randevubu-api                      # App logs
sudo tail -f /var/log/nginx/error.log       # Nginx errors
sudo journalctl -u postgresql -n 50         # PostgreSQL logs
```

### Monitor Resources
```bash
htop              # Real-time system monitor
free -h           # Memory usage
df -h             # Disk usage
pm2 monit         # PM2 process monitor
```

## Troubleshooting

### App won't start
```bash
pm2 logs randevubu-api
# Check for errors in environment variables or database connection
```

### Database connection failed
```bash
# Test connection
psql -U randevubu_user -d randevubu -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Out of memory
```bash
# Check memory
free -h

# Check if swap is enabled
swapon --show

# Create swap if missing
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Nginx errors
```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Reload nginx
sudo systemctl reload nginx
```

## Security Checklist

- [ ] SSH key-only authentication enabled
- [ ] Firewall (UFW) configured and enabled
- [ ] Strong passwords for database and Redis
- [ ] SSL/HTTPS configured
- [ ] Regular system updates scheduled
- [ ] Fail2Ban installed (optional)
- [ ] Security groups properly configured in AWS

## Important URLs

After deployment:
- **API**: https://yourdomain.com or http://YOUR_IP:3000
- **API Docs**: https://yourdomain.com/api-docs
- **Health Check**: https://yourdomain.com/health

## AWS Security Group Ports

Make sure these ports are open in your EC2 Security Group:
- **22** - SSH (your IP only)
- **80** - HTTP (0.0.0.0/0)
- **443** - HTTPS (0.0.0.0/0)

## Cost Optimization

- t3.micro is **FREE TIER** eligible (750 hours/month for 12 months)
- Elastic IP is **FREE** when attached to a running instance
- Stop the instance when not in use to save CPU credits
- Monitor CloudWatch for usage

## Next Steps

1. Point your domain DNS to your EC2 Elastic IP
2. Setup SSL with Let's Encrypt
3. Configure email/SMS providers
4. Add AWS S3 credentials for file uploads
5. Setup monitoring and alerts
6. Configure backup automation

## Support

For detailed documentation, see:
- **Full Deployment Guide**: `docs/AWS_T3_MICRO_DEPLOYMENT.md`
- **Application Docs**: `docs/` directory
- **Makefile Commands**: Run `make help`

## Quick Reference

| Task | Command |
|------|---------|
| View app logs | `pm2 logs randevubu-api` |
| Restart app | `pm2 restart randevubu-api` |
| Update app | `cd ~/randevubu-server && git pull && npm run build && pm2 restart randevubu-api` |
| Database backup | `pg_dump -U randevubu_user randevubu > backup.sql` |
| Check memory | `free -h` |
| Monitor system | `htop` |
| View nginx logs | `sudo tail -f /var/log/nginx/error.log` |
| Reload nginx | `sudo systemctl reload nginx` |

---

**Happy deploying!**
