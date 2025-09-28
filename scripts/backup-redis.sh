#!/bin/bash

# Redis Backup Script for RandevuBu Production
# Performs automated Redis data backups with compression and S3 upload

set -e

# Configuration
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD="$REDIS_PASSWORD"
BACKUP_DIR="/var/backups/randevubu"
S3_BUCKET="${BACKUP_S3_BUCKET:-randevubu-production-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DIR=$(date +"%Y/%m/%d")

# Backup file names
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"
COMPRESSED_BACKUP="redis_backup_${TIMESTAMP}.rdb.gz"

echo "🔴 Starting Redis backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup on error
cleanup() {
    log "❌ Redis backup failed, cleaning up..."
    rm -f $BACKUP_DIR/$BACKUP_FILE
    rm -f $BACKUP_DIR/$COMPRESSED_BACKUP
    exit 1
}

# Set error trap
trap cleanup ERR

# Check if required tools are available
check_dependencies() {
    local missing_deps=()

    command -v redis-cli >/dev/null 2>&1 || missing_deps+=("redis-tools")
    command -v gzip >/dev/null 2>&1 || missing_deps+=("gzip")
    command -v aws >/dev/null 2>&1 || missing_deps+=("awscli")

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log "❌ Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Test Redis connection
test_redis_connection() {
    log "🔗 Testing Redis connection..."

    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping > /dev/null
    else
        redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null
    fi

    if [ $? -eq 0 ]; then
        log "✅ Redis connection successful"
    else
        log "❌ Redis connection failed"
        exit 1
    fi
}

# Get Redis info for backup metadata
get_redis_info() {
    log "📊 Gathering Redis information..."

    if [ -n "$REDIS_PASSWORD" ]; then
        REDIS_INFO=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info)
    else
        REDIS_INFO=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT info)
    fi

    REDIS_VERSION=$(echo "$REDIS_INFO" | grep "redis_version:" | cut -d: -f2 | tr -d '\r')
    USED_MEMORY=$(echo "$REDIS_INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
    KEY_COUNT=$(echo "$REDIS_INFO" | grep "^db0:" | cut -d: -f2 | cut -d, -f1 | grep -o 'keys=[0-9]*' | cut -d= -f2)

    log "📋 Redis Version: $REDIS_VERSION"
    log "💾 Used Memory: $USED_MEMORY"
    log "🔑 Total Keys: ${KEY_COUNT:-0}"
}

# Create Redis backup using BGSAVE
backup_redis() {
    log "💾 Creating Redis backup..."

    # Trigger background save
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD bgsave
    else
        redis-cli -h $REDIS_HOST -p $REDIS_PORT bgsave
    fi

    # Wait for background save to complete
    log "⏳ Waiting for background save to complete..."
    while true; do
        if [ -n "$REDIS_PASSWORD" ]; then
            SAVE_STATUS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD lastsave)
        else
            SAVE_STATUS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT lastsave)
        fi

        sleep 2

        if [ -n "$REDIS_PASSWORD" ]; then
            NEW_SAVE_STATUS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD lastsave)
        else
            NEW_SAVE_STATUS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT lastsave)
        fi

        if [ "$NEW_SAVE_STATUS" != "$SAVE_STATUS" ]; then
            break
        fi

        log "⏳ Still waiting for Redis BGSAVE..."
    done

    log "✅ Background save completed"

    # Copy the RDB file from Redis container
    docker cp randevubu-redis-prod:/data/dump.rdb $BACKUP_DIR/$BACKUP_FILE

    # Get backup file size
    BACKUP_SIZE=$(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)
    log "✅ Redis backup created: $BACKUP_FILE ($BACKUP_SIZE)"
}

# Compress backup
compress_backup() {
    log "🗜️  Compressing Redis backup..."

    gzip < $BACKUP_DIR/$BACKUP_FILE > $BACKUP_DIR/$COMPRESSED_BACKUP

    # Remove uncompressed backup
    rm -f $BACKUP_DIR/$BACKUP_FILE

    # Get compressed size
    COMPRESSED_SIZE=$(du -h $BACKUP_DIR/$COMPRESSED_BACKUP | cut -f1)
    log "✅ Backup compressed: $COMPRESSED_BACKUP ($COMPRESSED_SIZE)"
}

# Upload to S3
upload_to_s3() {
    log "☁️  Uploading Redis backup to S3..."

    # S3 path with date hierarchy
    S3_PATH="s3://$S3_BUCKET/redis/$DATE_DIR/$COMPRESSED_BACKUP"

    # Upload with server-side encryption
    aws s3 cp $BACKUP_DIR/$COMPRESSED_BACKUP $S3_PATH \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$TIMESTAMP,redis-version=$REDIS_VERSION,used-memory=$USED_MEMORY,key-count=$KEY_COUNT"

    log "✅ Backup uploaded to: $S3_PATH"

    # Create latest symlink
    LATEST_PATH="s3://$S3_BUCKET/redis/latest/$COMPRESSED_BACKUP"
    aws s3 cp $S3_PATH $LATEST_PATH

    log "🔗 Latest backup link updated"
}

# Verify backup integrity
verify_backup() {
    log "🔍 Verifying Redis backup integrity..."

    # Test gzip integrity
    gzip -t $BACKUP_DIR/$COMPRESSED_BACKUP

    if [ $? -eq 0 ]; then
        log "✅ Backup integrity verified"
    else
        log "❌ Backup integrity check failed"
        exit 1
    fi
}

# Clean old local backups
cleanup_old_backups() {
    log "🧹 Cleaning up old local Redis backups..."

    find $BACKUP_DIR -name "redis_backup_*.rdb.gz" -mtime +$RETENTION_DAYS -delete

    log "✅ Old local backups cleaned up"
}

# Clean old S3 backups
cleanup_old_s3_backups() {
    log "🗑️  Cleaning up old S3 Redis backups..."

    # Calculate cutoff date
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')

    # List and delete old backups
    aws s3 ls s3://$S3_BUCKET/redis/ --recursive | \
    while read -r date time size filepath; do
        file_date=$(echo $filepath | grep -oE '[0-9]{8}' | head -1)
        formatted_date=$(echo $file_date | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3/')

        if [[ "$formatted_date" < "$CUTOFF_DATE" ]]; then
            aws s3 rm "s3://$S3_BUCKET/$filepath"
            log "🗑️  Deleted old Redis backup: $filepath"
        fi
    done

    log "✅ Old S3 Redis backups cleaned up"
}

# Generate backup report
generate_report() {
    log "📋 Generating Redis backup report..."

    REPORT_FILE="$BACKUP_DIR/redis_backup_report_$TIMESTAMP.json"

    cat > $REPORT_FILE << EOF
{
    "backup_timestamp": "$TIMESTAMP",
    "backup_date": "$(date -Iseconds)",
    "redis_version": "$REDIS_VERSION",
    "used_memory": "$USED_MEMORY",
    "key_count": "${KEY_COUNT:-0}",
    "backup_file": "$COMPRESSED_BACKUP",
    "backup_size": "$COMPRESSED_SIZE",
    "s3_location": "s3://$S3_BUCKET/redis/$DATE_DIR/$COMPRESSED_BACKUP",
    "compression": "gzip",
    "retention_days": $RETENTION_DAYS,
    "backup_type": "full",
    "status": "success"
}
EOF

    # Upload report to S3
    aws s3 cp $REPORT_FILE s3://$S3_BUCKET/reports/redis/redis_backup_report_$TIMESTAMP.json

    log "📋 Redis backup report generated and uploaded"
}

# Send notification (if configured)
send_notification() {
    if [ -n "$BACKUP_NOTIFICATION_URL" ]; then
        log "📧 Sending Redis backup notification..."

        curl -X POST "$BACKUP_NOTIFICATION_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"redis_backup_success\",
                \"redis_version\": \"$REDIS_VERSION\",
                \"used_memory\": \"$USED_MEMORY\",
                \"key_count\": \"${KEY_COUNT:-0}\",
                \"timestamp\": \"$TIMESTAMP\",
                \"size\": \"$COMPRESSED_SIZE\",
                \"location\": \"s3://$S3_BUCKET/redis/$DATE_DIR/$COMPRESSED_BACKUP\"
            }" || log "⚠️  Failed to send notification"
    fi
}

# Main execution
main() {
    log "🚀 Starting RandevuBu Redis backup"

    check_dependencies
    test_redis_connection
    get_redis_info
    backup_redis
    compress_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups
    cleanup_old_s3_backups
    generate_report
    send_notification

    # Clean up local backup file
    rm -f $BACKUP_DIR/$COMPRESSED_BACKUP

    log "✅ Redis backup completed successfully!"
    log "📍 Backup location: s3://$S3_BUCKET/redis/$DATE_DIR/$COMPRESSED_BACKUP"
    log "💾 Backup size: $COMPRESSED_SIZE"
    log "🔑 Keys backed up: ${KEY_COUNT:-0}"
    log "🕐 Duration: $(($(date +%s) - $(date -d "$TIMESTAMP" +%s 2>/dev/null || echo 0))) seconds"
}

# Execute main function
main "$@"