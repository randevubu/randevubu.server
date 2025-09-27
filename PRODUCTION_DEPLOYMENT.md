# Production Deployment Guide

## 🚀 Quick Production Setup

### 1. Environment Configuration

```bash
# Copy production environment template
cp .env.production .env

# Update all CHANGE_ME values with secure credentials
nano .env
```

### 2. Generate Secure Keys

```bash
# Generate JWT secrets (run these commands and copy output to .env)
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)"
echo "COOKIE_SECRET=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -base64 32)"

# Generate strong database passwords
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
```

### 3. SSL Certificate Setup

```bash
# For production with domain
./scripts/setup-letsencrypt.sh yourdomain.com

# For development/testing
./scripts/generate-dev-certs.sh
```

### 4. Start Production Environment

```bash
# Build and start all services
make prod-up

# Check health status
curl https://yourdomain.com/health

# View logs
make prod-logs
```

## 🔒 Security Checklist

### Pre-Deployment
- [ ] All CHANGE_ME values updated in .env
- [ ] Strong passwords generated (minimum 32 characters)
- [ ] SSL certificates configured
- [ ] CORS origins updated to production domains
- [ ] Database SSL mode enabled
- [ ] Rate limiting configured appropriately

### Database Security
- [ ] Strong database password set
- [ ] Database user has minimal required permissions
- [ ] SSL/TLS enabled for database connections
- [ ] Database backups configured
- [ ] Connection pooling optimized

### Application Security
- [ ] JWT secrets are cryptographically secure
- [ ] Session security configured
- [ ] Helmet security headers enabled
- [ ] Rate limiting in place
- [ ] File upload limits set appropriately
- [ ] Input validation and sanitization verified

### Infrastructure Security
- [ ] Firewall rules configured (only necessary ports open)
- [ ] Container security scanning completed
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured

## 📊 Monitoring & Health Checks

### Health Endpoint
- **URL**: `https://yourdomain.com/health`
- **Purpose**: Comprehensive health check including database connectivity
- **Expected Response**: HTTP 200 with detailed status information

### Metrics Collection
- **Prometheus metrics**: Available at `:9090/metrics`
- **Key metrics**: Response times, error rates, memory usage, database connections

### Logging
- **Format**: Structured JSON logging
- **Location**: `/var/log/randevubu/app.log`
- **Log Levels**: error, warn, info (production uses 'warn' level)

## 🔄 Backup Strategy

### Database Backups
- **Schedule**: Daily at 2 AM UTC
- **Retention**: 30 days
- **Storage**: AWS S3 encrypted bucket
- **Restoration**: Automated scripts available

### Application Backups
- **Code**: Version controlled in Git
- **Uploads**: Stored in AWS S3 with versioning
- **Configuration**: Environment variables backed up securely

## 🚨 Incident Response

### Common Issues

#### Database Connection Failures
```bash
# Check database status
docker exec randevubu-postgres-prod pg_isready -U postgres

# Check logs
make prod-logs-all
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in nginx/ssl/cert.pem -noout -dates

# Renew certificates
./scripts/renew-ssl.sh
```

#### High Memory Usage
```bash
# Check memory usage
curl https://yourdomain.com/health

# Restart application if needed
docker restart randevubu-server-prod
```

### Emergency Contacts
- **DevOps Team**: [Insert contact information]
- **Database Admin**: [Insert contact information]
- **Security Team**: [Insert contact information]

## 📈 Scaling Considerations

### Horizontal Scaling
- Current setup supports 2 application replicas
- Load balanced through nginx
- Database connection pooling configured

### Vertical Scaling
- Monitor memory and CPU usage through health endpoint
- Adjust container resource limits in docker-compose.prod.yml
- Database can be scaled independently

### Performance Optimization
- Redis caching implemented
- Gzip compression enabled
- Static file serving optimized
- Database queries optimized with proper indexing

## 🔧 Maintenance

### Regular Tasks
- [ ] Monitor SSL certificate expiry (auto-renewal configured)
- [ ] Review and rotate secrets quarterly
- [ ] Update dependencies monthly
- [ ] Review and optimize database performance
- [ ] Check backup integrity monthly

### Security Updates
- [ ] Apply OS security patches
- [ ] Update Node.js runtime
- [ ] Update dependencies with security vulnerabilities
- [ ] Review access logs for suspicious activity

## 🆘 Troubleshooting

### Application Won't Start
1. Check environment variables are properly set
2. Verify database connectivity
3. Check SSL certificate validity
4. Review application logs

### Performance Issues
1. Check `/health` endpoint for system metrics
2. Monitor database connection pool
3. Review nginx access logs for traffic patterns
4. Check memory and CPU usage

### SSL Issues
1. Verify certificate files exist and are readable
2. Check certificate expiry dates
3. Validate certificate chain
4. Test SSL configuration

For additional support, check the logs and monitoring dashboards, or contact the development team.