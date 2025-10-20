#!/bin/bash

#===============================================================================
# Database Restore Script for RandevuBu Server
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

# Backup file to restore (passed as argument or latest)
BACKUP_FILE="${1:-}"

# ============================================
# COLORS FOR OUTPUT
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}➡️  $1${NC}"
}

# List available backups
list_backups() {
    echo ""
    echo "=================================================="
    echo "Available Backups:"
    echo "=================================================="

    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
        ls -lht "$BACKUP_DIR"/*.sql.gz | nl -w2 -s'. '
    else
        log_error "No backups found in $BACKUP_DIR"
        exit 1
    fi

    echo "=================================================="
    echo ""
}

# Select backup file
select_backup() {
    if [ -z "$BACKUP_FILE" ]; then
        list_backups

        echo "Options:"
        echo "  1. Enter backup number from the list above"
        echo "  2. Enter full path to backup file"
        echo "  3. Press Enter to use the latest backup"
        echo ""
        read -p "Your choice: " choice

        if [ -z "$choice" ]; then
            # Use latest backup
            BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)
            log_info "Using latest backup: $(basename "$BACKUP_FILE")"
        elif [ "$choice" -eq "$choice" ] 2>/dev/null; then
            # User entered a number
            BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz | sed -n "${choice}p")
        else
            # User entered a path
            BACKUP_FILE="$choice"
        fi
    fi

    # Verify backup file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    log_info "Selected backup: $(basename "$BACKUP_FILE")"
}

# Verify backup integrity
verify_backup() {
    log_step "Verifying backup integrity..."

    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_info "Backup integrity verified ✓"
    else
        log_error "Backup verification failed! File may be corrupted."
        exit 1
    fi
}

# Confirm restore operation
confirm_restore() {
    echo ""
    echo "=================================================="
    echo "  ⚠️  WARNING: DATABASE RESTORE"
    echo "=================================================="
    echo "This will REPLACE all data in the database:"
    echo "  Database: $DB_NAME"
    echo "  Host: $DB_HOST"
    echo "  Backup: $(basename "$BACKUP_FILE")"
    echo ""
    echo "All existing data will be LOST!"
    echo "=================================================="
    echo ""

    read -p "Are you sure you want to continue? (yes/NO): " confirmation

    if [ "$confirmation" != "yes" ]; then
        log_warn "Restore cancelled by user"
        exit 0
    fi

    log_warn "Proceeding with restore in 5 seconds... (Ctrl+C to cancel)"
    sleep 5
}

# Create pre-restore backup
create_pre_restore_backup() {
    log_step "Creating pre-restore backup as safety measure..."

    PRE_RESTORE_BACKUP="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

    export PGPASSWORD="$DB_PASSWORD"

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --format=custom \
        --compress=9 \
        "$DB_NAME" | gzip > "$PRE_RESTORE_BACKUP"; then

        log_info "Pre-restore backup created: $(basename "$PRE_RESTORE_BACKUP")"
    else
        log_warn "Failed to create pre-restore backup (continuing anyway)"
    fi

    unset PGPASSWORD
}

# Perform database restore
perform_restore() {
    log_step "Starting database restore..."

    export PGPASSWORD="$DB_PASSWORD"

    # Decompress and restore
    if gunzip -c "$BACKUP_FILE" | pg_restore -h "$DB_HOST" -p "$DB_PORT" \
        -U "$DB_USER" \
        --dbname="$DB_NAME" \
        --clean \
        --if-exists \
        --verbose \
        --no-owner \
        --no-acl; then

        log_info "Database restore completed successfully!"
    else
        log_error "Database restore failed!"
        log_warn "You can recover using the pre-restore backup if one was created"
        exit 1
    fi

    unset PGPASSWORD
}

# Run post-restore checks
post_restore_checks() {
    log_step "Running post-restore checks..."

    export PGPASSWORD="$DB_PASSWORD"

    # Check database connection
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "SELECT 1" > /dev/null 2>&1; then
        log_info "Database connection: OK ✓"
    else
        log_error "Database connection failed"
        exit 1
    fi

    # Count tables
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables \
        WHERE table_schema = 'public'")

    log_info "Tables restored: $TABLE_COUNT"

    unset PGPASSWORD
}

# Display restore summary
show_summary() {
    echo ""
    echo "=================================================="
    echo "          RESTORE SUMMARY"
    echo "=================================================="
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST"
    echo "Backup File: $(basename "$BACKUP_FILE")"
    echo "Status: SUCCESS ✓"
    echo "=================================================="
    echo ""

    log_info "Next steps:"
    echo "  1. Run migrations if needed: npx prisma migrate deploy"
    echo "  2. Restart your application"
    echo "  3. Verify application functionality"
    echo ""
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    echo ""
    echo "=================================================="
    echo "  RandevuBu Database Restore"
    echo "  $(date)"
    echo "=================================================="
    echo ""

    # Check if PostgreSQL tools are installed
    if ! command -v pg_restore &> /dev/null; then
        log_error "pg_restore not found. Please install PostgreSQL client tools."
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Execute restore steps
    select_backup
    verify_backup
    confirm_restore
    create_pre_restore_backup
    perform_restore
    post_restore_checks
    show_summary

    log_info "Database restore completed successfully!"
}

# Run main function
main

# ============================================
# USAGE EXAMPLES
# ============================================
#
# Interactive mode (select from list):
#   ./restore-database.sh
#
# Restore specific backup:
#   ./restore-database.sh backups/database/randevubu_backup_20240101_120000.sql.gz
#
# Custom configuration:
#   DB_HOST=prod-db.example.com \
#   DB_NAME=randevubu_prod \
#   DB_USER=admin \
#   DB_PASSWORD=secure_password \
#   ./restore-database.sh backup_file.sql.gz
#
# Docker environment:
#   docker compose -f docker-compose.production.yml exec postgres \
#   bash /app/scripts/restore-database.sh
#
