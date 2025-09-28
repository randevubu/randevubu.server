#!/bin/bash

# Database Backup Script for RandevuBu Production
# Performs automated PostgreSQL database backups with encryption and S3 upload

set -e

# Configuration
DB_NAME="randevubu"
DB_USER="postgres"
DB_HOST="postgres"
DB_PORT="5432"
BACKUP_DIR="/var/backups/randevubu"
S3_BUCKET="${BACKUP_S3_BUCKET:-randevubu-production-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ENCRYPTION_KEY_FILE="/etc/backup/encryption.key"

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DIR=$(date +"%Y/%m/%d")

# Backup file names
BACKUP_FILE="randevubu_backup_${TIMESTAMP}.sql"
ENCRYPTED_BACKUP="randevubu_backup_${TIMESTAMP}.sql.enc"
COMPRESSED_BACKUP="randevubu_backup_${TIMESTAMP}.sql.gz.enc"

echo "🗄️  Starting database backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup on error
cleanup() {
    log "❌ Backup failed, cleaning up..."
    rm -f $BACKUP_DIR/$BACKUP_FILE
    rm -f $BACKUP_DIR/$ENCRYPTED_BACKUP
    rm -f $BACKUP_DIR/$COMPRESSED_BACKUP
    exit 1
}

# Set error trap
trap cleanup ERR

# Check if required tools are available
check_dependencies() {
    local missing_deps=()

    command -v pg_dump >/dev/null 2>&1 || missing_deps+=("postgresql-client")
    command -v gzip >/dev/null 2>&1 || missing_deps+=("gzip")
    command -v openssl >/dev/null 2>&1 || missing_deps+=("openssl")
    command -v aws >/dev/null 2>&1 || missing_deps+=("awscli")

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log "❌ Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Generate encryption key if it doesn't exist
setup_encryption() {
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        log "🔐 Generating encryption key..."
        mkdir -p "$(dirname $ENCRYPTION_KEY_FILE)"
        openssl rand -base64 32 > $ENCRYPTION_KEY_FILE
        chmod 600 $ENCRYPTION_KEY_FILE
        log "✅ Encryption key generated"
    fi
}

# Perform database backup
backup_database() {
    log "📊 Creating database backup..."

    # Set password from environment variable
    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Create full database backup
    pg_dump \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=$DB_NAME \
        --clean \
        --create \
        --if-exists \
        --verbose \
        --no-password \
        --format=plain \
        --file=$BACKUP_DIR/$BACKUP_FILE

    log "✅ Database backup created: $BACKUP_FILE"

    # Get backup file size
    BACKUP_SIZE=$(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)
    log "📁 Backup size: $BACKUP_SIZE"
}

# Compress and encrypt backup
encrypt_backup() {
    log "🔐 Compressing and encrypting backup..."

    # Compress then encrypt
    gzip < $BACKUP_DIR/$BACKUP_FILE | \
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -pass file:$ENCRYPTION_KEY_FILE \
        -out $BACKUP_DIR/$COMPRESSED_BACKUP

    # Remove unencrypted backup
    rm -f $BACKUP_DIR/$BACKUP_FILE

    # Get compressed size
    COMPRESSED_SIZE=$(du -h $BACKUP_DIR/$COMPRESSED_BACKUP | cut -f1)
    log "✅ Backup compressed and encrypted: $COMPRESSED_BACKUP ($COMPRESSED_SIZE)"
}

# Upload to S3
upload_to_s3() {
    log "☁️  Uploading backup to S3..."

    # S3 path with date hierarchy
    S3_PATH="s3://$S3_BUCKET/database/$DATE_DIR/$COMPRESSED_BACKUP"

    # Upload with server-side encryption
    aws s3 cp $BACKUP_DIR/$COMPRESSED_BACKUP $S3_PATH \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$TIMESTAMP,database=$DB_NAME,size=$COMPRESSED_SIZE"

    log "✅ Backup uploaded to: $S3_PATH"

    # Create latest symlink
    LATEST_PATH="s3://$S3_BUCKET/database/latest/$COMPRESSED_BACKUP"
    aws s3 cp $S3_PATH $LATEST_PATH

    log "🔗 Latest backup link updated"
}

# Verify backup integrity
verify_backup() {
    log "🔍 Verifying backup integrity..."

    # Test decryption
    openssl enc -d -aes-256-cbc -pbkdf2 \
        -pass file:$ENCRYPTION_KEY_FILE \
        -in $BACKUP_DIR/$COMPRESSED_BACKUP | \
    gzip -t

    if [ $? -eq 0 ]; then
        log "✅ Backup integrity verified"
    else
        log "❌ Backup integrity check failed"
        exit 1
    fi
}

# Clean old local backups
cleanup_old_backups() {
    log "🧹 Cleaning up old local backups..."

    find $BACKUP_DIR -name "randevubu_backup_*.sql.gz.enc" -mtime +$RETENTION_DAYS -delete

    log "✅ Old local backups cleaned up"
}

# Clean old S3 backups
cleanup_old_s3_backups() {
    log "🗑️  Cleaning up old S3 backups..."

    # Calculate cutoff date
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')

    # List and delete old backups
    aws s3 ls s3://$S3_BUCKET/database/ --recursive | \
    while read -r date time size filepath; do
        file_date=$(echo $filepath | grep -oE '[0-9]{8}' | head -1)
        formatted_date=$(echo $file_date | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3/')

        if [[ "$formatted_date" < "$CUTOFF_DATE" ]]; then
            aws s3 rm "s3://$S3_BUCKET/$filepath"
            log "🗑️  Deleted old backup: $filepath"
        fi
    done

    log "✅ Old S3 backups cleaned up"
}

# Generate backup report
generate_report() {
    log "📋 Generating backup report..."

    REPORT_FILE="$BACKUP_DIR/backup_report_$TIMESTAMP.json"

    cat > $REPORT_FILE << EOF
{
    "backup_timestamp": "$TIMESTAMP",
    "backup_date": "$(date -Iseconds)",
    "database_name": "$DB_NAME",
    "backup_file": "$COMPRESSED_BACKUP",
    "backup_size": "$COMPRESSED_SIZE",
    "s3_location": "s3://$S3_BUCKET/database/$DATE_DIR/$COMPRESSED_BACKUP",
    "encryption": "AES-256-CBC",
    "compression": "gzip",
    "retention_days": $RETENTION_DAYS,
    "backup_type": "full",
    "status": "success"
}
EOF

    # Upload report to S3
    aws s3 cp $REPORT_FILE s3://$S3_BUCKET/reports/database/backup_report_$TIMESTAMP.json

    log "📋 Backup report generated and uploaded"
}

# Send notification (if configured)
send_notification() {
    if [ -n "$BACKUP_NOTIFICATION_URL" ]; then
        log "📧 Sending backup notification..."

        curl -X POST "$BACKUP_NOTIFICATION_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"backup_success\",
                \"database\": \"$DB_NAME\",
                \"timestamp\": \"$TIMESTAMP\",
                \"size\": \"$COMPRESSED_SIZE\",
                \"location\": \"s3://$S3_BUCKET/database/$DATE_DIR/$COMPRESSED_BACKUP\"
            }" || log "⚠️  Failed to send notification"
    fi
}

# Main execution
main() {
    log "🚀 Starting RandevuBu database backup"

    check_dependencies
    setup_encryption
    backup_database
    encrypt_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups
    cleanup_old_s3_backups
    generate_report
    send_notification

    # Clean up local backup file
    rm -f $BACKUP_DIR/$COMPRESSED_BACKUP

    log "✅ Database backup completed successfully!"
    log "📍 Backup location: s3://$S3_BUCKET/database/$DATE_DIR/$COMPRESSED_BACKUP"
    log "💾 Backup size: $COMPRESSED_SIZE"
    log "🕐 Duration: $(($(date +%s) - $(date -d "$TIMESTAMP" +%s 2>/dev/null || echo 0))) seconds"
}

# Execute main function
main "$@"