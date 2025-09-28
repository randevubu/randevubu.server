# Backup & Recovery Guide

## 🗄️ Backup Strategy Overview

RandevuBu implements a comprehensive backup strategy covering:
- **Database**: Encrypted PostgreSQL backups with compression
- **Redis**: Snapshot-based backups with compression
- **Logs**: Structured logging with retention policies
- **Configurations**: Environment and deployment configurations

## 📋 Backup Schedule

### Production Schedule
```bash
# Daily comprehensive backup at 2 AM UTC
0 2 * * * cd /app && bash scripts/backup-all.sh

# Weekly security scan (Sundays at 3 AM)
0 3 * * 0 cd /app && bash scripts/security-scan.sh
```

### Backup Types
- **Full Backup**: Complete database dump + Redis snapshot (Daily)
- **Incremental**: Transaction logs (Continuous via WAL)
- **Security Scan**: Container and dependency vulnerabilities (Weekly)

## 🚀 Quick Start

### Setup Backup System
```bash
# 1. Set environment variables
export BACKUP_S3_BUCKET="randevubu-production-backups"
export BACKUP_RETENTION_DAYS="30"
export POSTGRES_PASSWORD="your-secure-password"
export REDIS_PASSWORD="your-secure-password"

# 2. Install cron jobs
crontab backup/backup-schedule.cron

# 3. Test backup system
./scripts/backup-all.sh
```

### Manual Backup
```bash
# Backup everything
./scripts/backup-all.sh

# Backup database only
./scripts/backup-database.sh

# Backup Redis only
./scripts/backup-redis.sh
```

## 🔄 Restoration Procedures

### Database Restoration

#### List Available Backups
```bash
./scripts/restore-database.sh --list
```

#### Restore Latest Backup
```bash
./scripts/restore-database.sh --latest
```

#### Restore Specific Date
```bash
./scripts/restore-database.sh --date 2024-01-15
```

#### Restore Specific File
```bash
./scripts/restore-database.sh --file randevubu_backup_20240115_143022.sql.gz.enc
```

### Redis Restoration
```bash
# Download backup from S3
aws s3 cp s3://randevubu-production-backups/redis/latest/redis_backup_YYYYMMDD_HHMMSS.rdb.gz ./

# Decompress
gunzip redis_backup_YYYYMMDD_HHMMSS.rdb.gz

# Stop Redis
docker stop randevubu-redis-prod

# Replace dump file
docker cp redis_backup_YYYYMMDD_HHMMSS.rdb randevubu-redis-prod:/data/dump.rdb

# Start Redis
docker start randevubu-redis-prod
```

## 🔐 Security Features

### Encryption
- **Database**: AES-256-CBC encryption with PBKDF2
- **S3**: Server-side encryption (AES256)
- **Keys**: Separate encryption key file with restricted permissions

### Access Control
- **IAM**: Minimal S3 permissions (put/get specific bucket)
- **Container**: Non-root user execution
- **Network**: Internal-only backup network access

### Compliance
- **Data Protection**: GDPR-compliant data handling
- **Retention**: Configurable retention policies
- **Audit**: Comprehensive backup logging

## 📊 Monitoring & Alerting

### Backup Status Monitoring
```bash
# Check latest backup status
aws s3 ls s3://randevubu-production-backups/reports/orchestration/ --recursive | tail -5

# View backup logs
aws s3 cp s3://randevubu-production-backups/logs/orchestration/backup_YYYYMMDD_HHMMSS.log -
```

### Automated Notifications
- **Success**: Daily backup completion
- **Failure**: Immediate failure alerts
- **Warning**: Partial backup failures

### Health Checks
- **Backup Integrity**: Automatic verification
- **Storage Space**: Disk usage monitoring
- **Service Health**: Post-backup health checks

## 🛠️ Troubleshooting

### Common Issues

#### Backup Fails with Permission Error
```bash
# Check S3 permissions
aws s3 ls s3://randevubu-production-backups/

# Verify environment variables
echo $BACKUP_S3_BUCKET
echo $POSTGRES_PASSWORD
```

#### Restoration Fails
```bash
# Check encryption key
ls -la /etc/backup/encryption.key

# Verify backup integrity
./scripts/restore-database.sh --dry-run --file backup_file.sql.gz.enc
```

#### Large Backup Files
```bash
# Check disk space
df -h /var/backups/randevubu

# Clean old backups
find /var/backups/randevubu -name "*.gz.enc" -mtime +7 -delete
```

### Error Codes
- **Exit 0**: Success
- **Exit 1**: Partial failure (one component failed)
- **Exit 2**: Complete failure (all components failed)
- **Exit 3**: Unexpected error (system issue)

## 📈 Performance Optimization

### Backup Performance
- **Compression**: Reduces backup size by ~80%
- **Parallel**: Database and Redis backups can run concurrently
- **Incremental**: Use WAL archiving for frequent incremental backups

### Storage Optimization
- **S3 Intelligent Tiering**: Automatic cost optimization
- **Lifecycle Policies**: Automated deletion of old backups
- **Compression**: Gzip compression before upload

## 🔧 Configuration

### Environment Variables
```bash
# Required
BACKUP_S3_BUCKET="your-backup-bucket"
POSTGRES_PASSWORD="your-db-password"

# Optional
BACKUP_RETENTION_DAYS="30"         # Default: 30 days
BACKUP_NOTIFICATION_URL="webhook"   # Monitoring webhook
REDIS_PASSWORD="your-redis-password"
```

### File Locations
- **Scripts**: `./scripts/backup-*.sh`
- **Logs**: `/var/log/randevubu/`
- **Backups**: `/var/backups/randevubu/`
- **Keys**: `/etc/backup/encryption.key`

## 📋 Maintenance Tasks

### Weekly Tasks
- Review backup success/failure logs
- Check S3 storage usage and costs
- Verify backup integrity with test restoration

### Monthly Tasks
- Update backup retention policies
- Review and rotate encryption keys
- Performance optimization review

### Quarterly Tasks
- Disaster recovery testing
- Security audit of backup procedures
- Update backup scripts and dependencies

## 🆘 Emergency Procedures

### Complete Database Loss
1. Stop application containers
2. Provision new database container
3. Restore from latest backup
4. Verify data integrity
5. Restart application
6. Monitor for issues

### Backup System Failure
1. Check system resources (disk, network)
2. Verify AWS credentials and permissions
3. Test individual backup components
4. Review error logs
5. Execute manual backup if needed

### Contact Information
- **DevOps Team**: devops@randevubu.com
- **Database Admin**: dba@randevubu.com
- **Security Team**: security@randevubu.com
- **Emergency**: emergency@randevubu.com

## 📚 Additional Resources

- [AWS S3 Backup Best Practices](https://docs.aws.amazon.com/s3/)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [Redis Persistence](https://redis.io/docs/management/persistence/)
- [Docker Backup Strategies](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)