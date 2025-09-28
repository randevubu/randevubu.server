#!/bin/bash

# Comprehensive Backup Orchestration Script for RandevuBu Production
# Coordinates database and Redis backups with monitoring and notifications

set -e

# Configuration
BACKUP_DIR="/var/backups/randevubu"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).log"
NOTIFICATION_URL="${BACKUP_NOTIFICATION_URL:-}"

# Create backup directory and log file
mkdir -p $BACKUP_DIR
touch $LOG_FILE

# Function to log messages to both console and file
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$message"
    echo "$message" >> $LOG_FILE
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    local details=$3

    if [ -n "$NOTIFICATION_URL" ]; then
        curl -X POST "$NOTIFICATION_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"backup_orchestration\",
                \"status\": \"$status\",
                \"message\": \"$message\",
                \"details\": \"$details\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"hostname\": \"$(hostname)\"
            }" || log "⚠️  Failed to send notification"
    fi
}

# Function to check system prerequisites
check_prerequisites() {
    log "🔧 Checking system prerequisites..."

    # Check if running in production environment
    if [ "$NODE_ENV" != "production" ]; then
        log "⚠️  Warning: Not running in production environment (NODE_ENV=$NODE_ENV)"
    fi

    # Check available disk space (require at least 5GB free)
    local available_space=$(df $BACKUP_DIR | tail -1 | awk '{print $4}')
    local required_space=5242880  # 5GB in KB

    if [ "$available_space" -lt "$required_space" ]; then
        log "❌ Insufficient disk space. Required: 5GB, Available: $(($available_space/1024/1024))GB"
        send_notification "error" "Backup failed: insufficient disk space" "Available: $(($available_space/1024/1024))GB"
        exit 1
    fi

    # Check if containers are running
    if ! docker ps | grep -q "randevubu-postgres-prod"; then
        log "❌ PostgreSQL container not running"
        send_notification "error" "Backup failed: PostgreSQL container not running" ""
        exit 1
    fi

    if ! docker ps | grep -q "randevubu-redis-prod"; then
        log "❌ Redis container not running"
        send_notification "error" "Backup failed: Redis container not running" ""
        exit 1
    fi

    # Check environment variables
    if [ -z "$POSTGRES_PASSWORD" ]; then
        log "❌ POSTGRES_PASSWORD environment variable not set"
        exit 1
    fi

    if [ -z "$BACKUP_S3_BUCKET" ]; then
        log "❌ BACKUP_S3_BUCKET environment variable not set"
        exit 1
    fi

    log "✅ Prerequisites check passed"
}

# Function to get system metrics before backup
get_system_metrics() {
    log "📊 Gathering system metrics..."

    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

    # Memory usage
    MEMORY_INFO=$(free -h | grep Mem)
    MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')

    # Disk usage
    DISK_INFO=$(df -h $BACKUP_DIR | tail -1)
    DISK_USED=$(echo $DISK_INFO | awk '{print $3}')
    DISK_AVAILABLE=$(echo $DISK_INFO | awk '{print $4}')

    # Database size
    DB_SIZE=$(docker exec randevubu-postgres-prod psql -U postgres -d randevubu -t -c "SELECT pg_size_pretty(pg_database_size('randevubu'));" | xargs)

    # Redis memory usage
    REDIS_MEMORY=$(docker exec randevubu-redis-prod redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')

    log "💻 System Metrics:"
    log "   CPU Usage: ${CPU_USAGE}%"
    log "   Memory: $MEMORY_USED / $MEMORY_TOTAL"
    log "   Disk: $DISK_USED used, $DISK_AVAILABLE available"
    log "   Database Size: $DB_SIZE"
    log "   Redis Memory: $REDIS_MEMORY"
}

# Function to perform database backup
backup_database() {
    log "🗄️  Starting database backup..."

    local start_time=$(date +%s)

    if [ -f "$SCRIPT_DIR/backup-database.sh" ]; then
        if bash "$SCRIPT_DIR/backup-database.sh" 2>&1 | tee -a $LOG_FILE; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            log "✅ Database backup completed in ${duration}s"
            echo "$duration" > $BACKUP_DIR/.db_backup_duration
            return 0
        else
            log "❌ Database backup failed"
            return 1
        fi
    else
        log "❌ Database backup script not found: $SCRIPT_DIR/backup-database.sh"
        return 1
    fi
}

# Function to perform Redis backup
backup_redis() {
    log "🔴 Starting Redis backup..."

    local start_time=$(date +%s)

    if [ -f "$SCRIPT_DIR/backup-redis.sh" ]; then
        if bash "$SCRIPT_DIR/backup-redis.sh" 2>&1 | tee -a $LOG_FILE; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            log "✅ Redis backup completed in ${duration}s"
            echo "$duration" > $BACKUP_DIR/.redis_backup_duration
            return 0
        else
            log "❌ Redis backup failed"
            return 1
        fi
    else
        log "❌ Redis backup script not found: $SCRIPT_DIR/backup-redis.sh"
        return 1
    fi
}

# Function to generate comprehensive backup report
generate_backup_report() {
    log "📋 Generating comprehensive backup report..."

    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - TOTAL_START_TIME))

    # Read individual backup durations
    local db_duration=$(cat $BACKUP_DIR/.db_backup_duration 2>/dev/null || echo "0")
    local redis_duration=$(cat $BACKUP_DIR/.redis_backup_duration 2>/dev/null || echo "0")

    # Get backup sizes from S3
    local today=$(date +%Y/%m/%d)
    local db_backup_size=$(aws s3 ls s3://$BACKUP_S3_BUCKET/database/$today/ --human-readable | tail -1 | awk '{print $3" "$4}' || echo "Unknown")
    local redis_backup_size=$(aws s3 ls s3://$BACKUP_S3_BUCKET/redis/$today/ --human-readable | tail -1 | awk '{print $3" "$4}' || echo "Unknown")

    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).json"

    cat > $report_file << EOF
{
    "backup_session": {
        "timestamp": "$(date -Iseconds)",
        "hostname": "$(hostname)",
        "environment": "$NODE_ENV",
        "total_duration_seconds": $total_duration,
        "status": "$OVERALL_STATUS"
    },
    "system_metrics": {
        "cpu_usage_percent": "$CPU_USAGE",
        "memory_used": "$MEMORY_USED",
        "memory_total": "$MEMORY_TOTAL",
        "disk_used": "$DISK_USED",
        "disk_available": "$DISK_AVAILABLE",
        "database_size": "$DB_SIZE",
        "redis_memory": "$REDIS_MEMORY"
    },
    "backup_results": {
        "database": {
            "status": "$DB_BACKUP_STATUS",
            "duration_seconds": $db_duration,
            "backup_size": "$db_backup_size",
            "s3_location": "s3://$BACKUP_S3_BUCKET/database/$today/"
        },
        "redis": {
            "status": "$REDIS_BACKUP_STATUS",
            "duration_seconds": $redis_duration,
            "backup_size": "$redis_backup_size",
            "s3_location": "s3://$BACKUP_S3_BUCKET/redis/$today/"
        }
    },
    "configuration": {
        "retention_days": "${BACKUP_RETENTION_DAYS:-30}",
        "s3_bucket": "$BACKUP_S3_BUCKET",
        "backup_directory": "$BACKUP_DIR"
    },
    "log_file": "$LOG_FILE"
}
EOF

    # Upload report to S3
    aws s3 cp $report_file s3://$BACKUP_S3_BUCKET/reports/orchestration/backup_report_$(date +%Y%m%d_%H%M%S).json

    log "📋 Backup report generated and uploaded"

    # Cleanup duration files
    rm -f $BACKUP_DIR/.db_backup_duration $BACKUP_DIR/.redis_backup_duration
}

# Function to perform health check after backups
post_backup_health_check() {
    log "🏥 Performing post-backup health check..."

    # Check application health
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")

    if [ "$health_status" = "200" ]; then
        log "✅ Application health check passed"
    else
        log "⚠️  Application health check failed (HTTP $health_status)"
    fi

    # Check database connectivity
    if docker exec randevubu-postgres-prod pg_isready -U postgres; then
        log "✅ Database connectivity check passed"
    else
        log "⚠️  Database connectivity check failed"
    fi

    # Check Redis connectivity
    if docker exec randevubu-redis-prod redis-cli ping | grep -q PONG; then
        log "✅ Redis connectivity check passed"
    else
        log "⚠️  Redis connectivity check failed"
    fi
}

# Function to cleanup old logs
cleanup_old_logs() {
    log "🧹 Cleaning up old backup logs..."

    find $BACKUP_DIR -name "backup_*.log" -mtime +30 -delete

    log "✅ Old logs cleaned up"
}

# Main orchestration function
main() {
    TOTAL_START_TIME=$(date +%s)
    OVERALL_STATUS="success"
    DB_BACKUP_STATUS="pending"
    REDIS_BACKUP_STATUS="pending"

    log "🚀 Starting comprehensive backup orchestration"
    log "📅 Backup session started at $(date)"

    # Send start notification
    send_notification "info" "Backup orchestration started" "Starting database and Redis backups"

    # System checks
    check_prerequisites
    get_system_metrics

    # Perform backups
    if backup_database; then
        DB_BACKUP_STATUS="success"
        log "✅ Database backup successful"
    else
        DB_BACKUP_STATUS="failed"
        OVERALL_STATUS="partial_failure"
        log "❌ Database backup failed"
        send_notification "error" "Database backup failed" "Check logs for details"
    fi

    if backup_redis; then
        REDIS_BACKUP_STATUS="success"
        log "✅ Redis backup successful"
    else
        REDIS_BACKUP_STATUS="failed"
        OVERALL_STATUS="partial_failure"
        log "❌ Redis backup failed"
        send_notification "error" "Redis backup failed" "Check logs for details"
    fi

    # Update overall status
    if [ "$DB_BACKUP_STATUS" = "failed" ] && [ "$REDIS_BACKUP_STATUS" = "failed" ]; then
        OVERALL_STATUS="complete_failure"
    fi

    # Post-backup activities
    post_backup_health_check
    generate_backup_report
    cleanup_old_logs

    # Upload log file to S3
    aws s3 cp $LOG_FILE s3://$BACKUP_S3_BUCKET/logs/orchestration/backup_$(date +%Y%m%d_%H%M%S).log

    # Final status
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - TOTAL_START_TIME))

    log "🏁 Backup orchestration completed"
    log "📊 Final Status: $OVERALL_STATUS"
    log "🕐 Total Duration: ${total_duration}s"
    log "📁 Log uploaded to S3"

    # Send completion notification
    if [ "$OVERALL_STATUS" = "success" ]; then
        send_notification "success" "Backup orchestration completed successfully" "Database: $DB_BACKUP_STATUS, Redis: $REDIS_BACKUP_STATUS, Duration: ${total_duration}s"
    else
        send_notification "warning" "Backup orchestration completed with issues" "Database: $DB_BACKUP_STATUS, Redis: $REDIS_BACKUP_STATUS, Duration: ${total_duration}s"
    fi

    # Exit with appropriate code
    case $OVERALL_STATUS in
        "success")
            exit 0
            ;;
        "partial_failure")
            exit 1
            ;;
        "complete_failure")
            exit 2
            ;;
    esac
}

# Trap errors and send notification
trap 'send_notification "error" "Backup orchestration failed unexpectedly" "Check logs for details"; exit 3' ERR

# Execute main function
main "$@"