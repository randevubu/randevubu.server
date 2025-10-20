#!/bin/bash

#===============================================================================
# Setup Automated Database Backups (Cron Job)
# This script configures automated daily backups for production
#===============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "=================================================="
echo "  Automated Backup Setup for RandevuBu"
echo "=================================================="
echo ""

# Get the absolute path to the backup script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"

if [ ! -f "$BACKUP_SCRIPT" ]; then
    log_error "Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

echo "Backup script location: $BACKUP_SCRIPT"
echo ""

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"
log_info "Made backup script executable"

# Check if cron is installed
if ! command -v crontab &> /dev/null; then
    log_error "crontab not found. Please install cron."
    exit 1
fi

# Backup schedule options
echo "Select backup schedule:"
echo "  1. Daily at 2:00 AM (recommended)"
echo "  2. Daily at 3:00 AM"
echo "  3. Twice daily (2:00 AM and 2:00 PM)"
echo "  4. Weekly (Sunday at 3:00 AM)"
echo "  5. Custom schedule"
echo ""
read -p "Your choice (1-5): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="Daily at 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 2,14 * * *"
        DESCRIPTION="Twice daily at 2:00 AM and 2:00 PM"
        ;;
    4)
        CRON_SCHEDULE="0 3 * * 0"
        DESCRIPTION="Weekly on Sunday at 3:00 AM"
        ;;
    5)
        echo ""
        echo "Enter cron schedule (e.g., '0 2 * * *' for daily at 2 AM):"
        read -p "Cron schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom: $CRON_SCHEDULE"
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

# Log file location
LOG_DIR="/var/log/randevubu"
LOG_FILE="$LOG_DIR/db-backup.log"

# Create log directory
if [ ! -d "$LOG_DIR" ]; then
    sudo mkdir -p "$LOG_DIR"
    sudo chown $USER:$USER "$LOG_DIR"
    log_info "Created log directory: $LOG_DIR"
fi

# Cron job entry
CRON_ENTRY="$CRON_SCHEDULE $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

echo ""
echo "=================================================="
echo "Cron job to be added:"
echo "  Schedule: $DESCRIPTION"
echo "  Command: $BACKUP_SCRIPT"
echo "  Log file: $LOG_FILE"
echo "=================================================="
echo ""

read -p "Add this cron job? (yes/NO): " confirmation

if [ "$confirmation" != "yes" ]; then
    log_warn "Setup cancelled"
    exit 0
fi

# Add cron job
(crontab -l 2>/dev/null || true; echo "# RandevuBu Database Backup - $DESCRIPTION"; echo "$CRON_ENTRY") | crontab -

log_info "Cron job added successfully!"

echo ""
echo "=================================================="
echo "          SETUP COMPLETE"
echo "=================================================="
echo "Backup schedule: $DESCRIPTION"
echo "Backup script: $BACKUP_SCRIPT"
echo "Log file: $LOG_FILE"
echo "=================================================="
echo ""

log_info "View current cron jobs:"
echo "  crontab -l"
echo ""

log_info "View backup logs:"
echo "  tail -f $LOG_FILE"
echo ""

log_info "Test backup manually:"
echo "  $BACKUP_SCRIPT"
echo ""

log_info "Remove cron job:"
echo "  crontab -e  (then delete the RandevuBu backup line)"
echo ""
