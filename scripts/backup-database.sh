#!/bin/bash

#===============================================================================
# Database Backup Script for RandevuBu Server
# Based on industry best practices (Netflix, Airbnb, Stripe)
#===============================================================================

set -e  # Exit on error

# ============================================
# CONFIGURATION
# ============================================

# Backup directory
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"

# PostgreSQL connection details (from environment or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-randevubu}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Backup retention (days)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="randevubu_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# ============================================
# COLORS FOR OUTPUT
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# FUNCTIONS
# ============================================

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Perform database backup
perform_backup() {
    log_info "Starting database backup..."
    log_info "Database: $DB_NAME"
    log_info "Timestamp: $TIMESTAMP"

    # Export password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"

    # Perform backup with compression
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --verbose \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-acl \
        "$DB_NAME" | gzip > "$BACKUP_PATH"; then

        log_info "Backup completed successfully!"

        # Get backup file size
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log_info "Backup file: $BACKUP_FILE"
        log_info "Backup size: $BACKUP_SIZE"
        log_info "Backup location: $BACKUP_PATH"
    else
        log_error "Backup failed!"
        exit 1
    fi

    # Unset password
    unset PGPASSWORD
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    # Find and delete old backups
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "randevubu_backup_*.sql.gz" \
        -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

    if [ "$DELETED_COUNT" -gt 0 ]; then
        log_info "Deleted $DELETED_COUNT old backup(s)"
    else
        log_info "No old backups to clean up"
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."

    if gzip -t "$BACKUP_PATH" 2>/dev/null; then
        log_info "Backup integrity verified ✓"
    else
        log_error "Backup verification failed! File may be corrupted."
        exit 1
    fi
}

# Display backup summary
show_summary() {
    echo ""
    echo "=================================================="
    echo "          BACKUP SUMMARY"
    echo "=================================================="
    echo "Database: $DB_NAME"
    echo "Timestamp: $TIMESTAMP"
    echo "Backup File: $BACKUP_FILE"
    echo "Location: $BACKUP_PATH"
    echo "Retention: $RETENTION_DAYS days"
    echo "=================================================="
    echo ""

    # List recent backups
    log_info "Recent backups:"
    ls -lh "$BACKUP_DIR" | grep "randevubu_backup_" | tail -5
    echo ""
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    echo ""
    echo "=================================================="
    echo "  RandevuBu Database Backup"
    echo "  $(date)"
    echo "=================================================="
    echo ""

    # Check if PostgreSQL tools are installed
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Execute backup steps
    create_backup_dir
    perform_backup
    verify_backup
    cleanup_old_backups
    show_summary

    log_info "Backup process completed successfully!"
}

# Run main function
main

# ============================================
# USAGE EXAMPLES
# ============================================
#
# Basic usage:
#   ./backup-database.sh
#
# Custom configuration:
#   DB_HOST=prod-db.example.com \
#   DB_NAME=randevubu_prod \
#   DB_USER=admin \
#   DB_PASSWORD=secure_password \
#   RETENTION_DAYS=90 \
#   ./backup-database.sh
#
# Docker environment:
#   docker compose -f docker-compose.production.yml exec postgres \
#   bash /app/scripts/backup-database.sh
#
# Automated backups (crontab):
#   # Daily backup at 2 AM
#   0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1
#
#   # Weekly backup every Sunday at 3 AM with custom retention
#   0 3 * * 0 RETENTION_DAYS=180 /path/to/backup-database.sh
#
