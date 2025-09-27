#!/bin/bash

# Database Restoration Script for RandevuBu Production
# Restores PostgreSQL database from encrypted backups stored in S3

set -e

# Configuration
DB_NAME="randevubu"
DB_USER="postgres"
DB_HOST="postgres"
DB_PORT="5432"
BACKUP_DIR="/var/backups/randevubu"
S3_BUCKET="${BACKUP_S3_BUCKET:-randevubu-production-backups}"
ENCRYPTION_KEY_FILE="/etc/backup/encryption.key"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Restore RandevuBu database from backup"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE         Restore from specific backup file"
    echo "  -d, --date YYYY-MM-DD   Restore from specific date (latest backup of that day)"
    echo "  -l, --latest            Restore from latest backup (default)"
    echo "  -s, --list              List available backups"
    echo "  --dry-run               Show what would be done without executing"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --latest                                   # Restore latest backup"
    echo "  $0 --date 2024-01-15                        # Restore latest backup from Jan 15, 2024"
    echo "  $0 --file randevubu_backup_20240115_143022.sql.gz.enc  # Restore specific file"
    echo "  $0 --list                                    # List available backups"
}

# Function to list available backups
list_backups() {
    log "📋 Available database backups:"
    echo ""

    aws s3 ls s3://$S3_BUCKET/database/ --recursive --human-readable | \
    grep "\.sql\.gz\.enc$" | \
    sort -r | \
    head -20 | \
    while read -r date time size filepath; do
        backup_file=$(basename "$filepath")
        backup_date=$(echo $backup_file | grep -oE '[0-9]{8}_[0-9]{6}')
        formatted_date=$(echo $backup_date | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')

        echo "📁 $backup_file"
        echo "   Date: $formatted_date"
        echo "   Size: $size"
        echo "   Location: s3://$S3_BUCKET/$filepath"
        echo ""
    done
}

# Function to find backup by date
find_backup_by_date() {
    local target_date=$1
    local formatted_date=$(echo $target_date | sed 's/-//g')

    log "🔍 Looking for backups from $target_date..."

    local backup_file=$(aws s3 ls s3://$S3_BUCKET/database/ --recursive | \
        grep "randevubu_backup_${formatted_date}" | \
        sort -r | \
        head -1 | \
        awk '{print $4}')

    if [ -n "$backup_file" ]; then
        echo "$backup_file"
    else
        log "❌ No backup found for date: $target_date"
        exit 1
    fi
}

# Function to find latest backup
find_latest_backup() {
    log "🔍 Finding latest backup..."

    local backup_file=$(aws s3 ls s3://$S3_BUCKET/database/latest/ | \
        grep "\.sql\.gz\.enc$" | \
        sort -r | \
        head -1 | \
        awk '{print $4}')

    if [ -n "$backup_file" ]; then
        echo "database/latest/$backup_file"
    else
        log "❌ No latest backup found"
        exit 1
    fi
}

# Function to download backup from S3
download_backup() {
    local s3_path=$1
    local local_file=$2

    log "⬇️  Downloading backup from S3..."
    log "📍 Source: s3://$S3_BUCKET/$s3_path"
    log "📁 Local: $local_file"

    aws s3 cp "s3://$S3_BUCKET/$s3_path" "$local_file"

    if [ $? -eq 0 ]; then
        log "✅ Backup downloaded successfully"
    else
        log "❌ Failed to download backup"
        exit 1
    fi
}

# Function to decrypt and decompress backup
decrypt_backup() {
    local encrypted_file=$1
    local output_file=$2

    log "🔓 Decrypting and decompressing backup..."

    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        log "❌ Encryption key file not found: $ENCRYPTION_KEY_FILE"
        exit 1
    fi

    # Decrypt and decompress
    openssl enc -d -aes-256-cbc -pbkdf2 \
        -pass file:$ENCRYPTION_KEY_FILE \
        -in "$encrypted_file" | \
    gzip -d > "$output_file"

    if [ $? -eq 0 ]; then
        log "✅ Backup decrypted and decompressed"
    else
        log "❌ Failed to decrypt backup"
        exit 1
    fi
}

# Function to validate SQL file
validate_sql() {
    local sql_file=$1

    log "🔍 Validating SQL file..."

    # Check if file is valid SQL
    if grep -q "PostgreSQL database dump" "$sql_file"; then
        log "✅ SQL file validation passed"
    else
        log "❌ SQL file validation failed"
        exit 1
    fi
}

# Function to create database backup before restoration
create_pre_restore_backup() {
    log "🛡️  Creating pre-restoration backup..."

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="pre_restore_backup_$timestamp.sql"

    export PGPASSWORD="$POSTGRES_PASSWORD"

    pg_dump \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=$DB_NAME \
        --clean \
        --create \
        --if-exists \
        --no-password \
        --format=plain \
        --file="$BACKUP_DIR/$backup_file"

    # Compress the pre-restore backup
    gzip "$BACKUP_DIR/$backup_file"

    log "✅ Pre-restoration backup created: ${backup_file}.gz"
}

# Function to restore database
restore_database() {
    local sql_file=$1

    log "🔄 Starting database restoration..."

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Stop application to prevent conflicts
    log "⏹️  Stopping application..."
    docker stop randevubu-server-prod || true

    # Restore database
    psql \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=postgres \
        --file="$sql_file"

    if [ $? -eq 0 ]; then
        log "✅ Database restoration completed"
    else
        log "❌ Database restoration failed"
        exit 1
    fi

    # Start application
    log "▶️  Starting application..."
    docker start randevubu-server-prod
}

# Function to verify restoration
verify_restoration() {
    log "🔍 Verifying database restoration..."

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Test database connection
    psql \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=$DB_NAME \
        --command="SELECT version();" > /dev/null

    if [ $? -eq 0 ]; then
        log "✅ Database connection verified"
    else
        log "❌ Database connection failed"
        exit 1
    fi

    # Check table count
    local table_count=$(psql \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=$DB_NAME \
        --tuples-only \
        --command="SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")

    log "📊 Tables restored: $table_count"

    # Test application health
    log "🏥 Testing application health..."
    sleep 10  # Wait for app to start

    local health_check=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")

    if [ "$health_check" = "200" ]; then
        log "✅ Application health check passed"
    else
        log "⚠️  Application health check failed (HTTP $health_check)"
    fi
}

# Function to cleanup temporary files
cleanup() {
    log "🧹 Cleaning up temporary files..."
    rm -f $BACKUP_DIR/restore_*.sql
    rm -f $BACKUP_DIR/restore_*.sql.gz.enc
}

# Main restoration function
main() {
    local restore_mode="latest"
    local backup_file=""
    local target_date=""
    local dry_run=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                backup_file="$2"
                restore_mode="file"
                shift 2
                ;;
            -d|--date)
                target_date="$2"
                restore_mode="date"
                shift 2
                ;;
            -l|--latest)
                restore_mode="latest"
                shift
                ;;
            -s|--list)
                list_backups
                exit 0
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log "❌ Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    log "🚀 Starting database restoration"

    # Create backup directory
    mkdir -p $BACKUP_DIR

    # Determine backup to restore
    local s3_backup_path
    case $restore_mode in
        "file")
            s3_backup_path="database/$(find_backup_by_file $backup_file)"
            ;;
        "date")
            s3_backup_path=$(find_backup_by_date $target_date)
            ;;
        "latest")
            s3_backup_path=$(find_latest_backup)
            ;;
    esac

    local local_backup_file="$BACKUP_DIR/restore_$(basename $s3_backup_path)"
    local decrypted_file="$BACKUP_DIR/restore_$(date +%Y%m%d_%H%M%S).sql"

    log "📋 Restoration plan:"
    log "   Source: s3://$S3_BUCKET/$s3_backup_path"
    log "   Local file: $local_backup_file"
    log "   Decrypted file: $decrypted_file"

    if [ "$dry_run" = true ]; then
        log "🧪 Dry run mode - no actual restoration will be performed"
        exit 0
    fi

    # Confirm restoration
    echo ""
    read -p "⚠️  This will replace the current database. Continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "❌ Restoration cancelled"
        exit 1
    fi

    # Perform restoration
    create_pre_restore_backup
    download_backup "$s3_backup_path" "$local_backup_file"
    decrypt_backup "$local_backup_file" "$decrypted_file"
    validate_sql "$decrypted_file"
    restore_database "$decrypted_file"
    verify_restoration
    cleanup

    log "✅ Database restoration completed successfully!"
    log "📊 Restored from: s3://$S3_BUCKET/$s3_backup_path"
}

# Set error trap
trap cleanup ERR

# Execute main function
main "$@"