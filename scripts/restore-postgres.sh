#!/bin/bash
# 6FB Methodologies Workshop - PostgreSQL Restore Script
# Restore database from backup with validation and safety checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-6fb_methodologies}"
PGUSER="${PGUSER:-postgres}"

# Logging
LOG_FILE="${BACKUP_DIR}/restore.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS] BACKUP_FILE

Restore PostgreSQL database from backup file.

OPTIONS:
    -f, --force         Force restore without confirmation
    -c, --create-db     Create database if it doesn't exist
    -v, --validate      Validate backup before restore
    -h, --help          Show this help message

BACKUP_FILE:
    Path to backup file (.sql or .sql.gz)
    Use 'latest' to restore from latest backup

Examples:
    $0 /backups/6fb_methodologies_20231215_143000.sql.gz
    $0 --force --create-db latest
    $0 -v /backups/6fb_methodologies_20231215_143000.sql.gz

EOF
    exit 1
}

# Parse command line arguments
FORCE=false
CREATE_DB=false
VALIDATE=false
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -c|--create-db)
            CREATE_DB=true
            shift
            ;;
        -v|--validate)
            VALIDATE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            error "Unknown option: $1"
            ;;
        *)
            if [[ -z "$BACKUP_FILE" ]]; then
                BACKUP_FILE="$1"
            else
                error "Multiple backup files specified"
            fi
            shift
            ;;
    esac
done

# Check if backup file is specified
if [[ -z "$BACKUP_FILE" ]]; then
    error "Backup file not specified. Use -h for help."
fi

# Handle 'latest' keyword
if [[ "$BACKUP_FILE" == "latest" ]]; then
    LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"
    if [[ -L "$LATEST_LINK" ]]; then
        BACKUP_FILE="$LATEST_LINK"
        log "Using latest backup: $(readlink "$LATEST_LINK")"
    else
        error "Latest backup symlink not found: $LATEST_LINK"
    fi
fi

# Resolve full path
if [[ ! "$BACKUP_FILE" =~ ^/ ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Verify backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Backup file not found: $BACKUP_FILE"
fi

log "Starting PostgreSQL restore for 6FB Methodologies"
log "Database: $PGDATABASE on $PGHOST:$PGPORT"
log "Backup file: $BACKUP_FILE"
log "File size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Validate backup file if requested
if [[ "$VALIDATE" == "true" ]]; then
    log "Validating backup file..."

    # Check if checksum file exists
    CHECKSUM_FILE="${BACKUP_FILE}.sha256"
    if [[ -f "$CHECKSUM_FILE" ]]; then
        log "Verifying backup checksum..."
        if sha256sum -c "$CHECKSUM_FILE" > /dev/null 2>&1; then
            log "Backup checksum verification successful"
        else
            error "Backup checksum verification failed"
        fi
    else
        log "WARNING: Checksum file not found, skipping verification"
    fi

    # Test if backup file can be read
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        if ! gunzip -t "$BACKUP_FILE" > /dev/null 2>&1; then
            error "Backup file is corrupted or not a valid gzip file"
        fi
        log "Backup file compression integrity verified"
    fi
fi

# Test database connection
log "Testing database connection..."
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -q; then
    error "Cannot connect to PostgreSQL server"
fi

# Check if database exists
DB_EXISTS=false
if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -lqt | cut -d \| -f 1 | grep -qw "$PGDATABASE"; then
    DB_EXISTS=true
    log "Database $PGDATABASE exists"
else
    log "Database $PGDATABASE does not exist"
fi

# Create database if requested and it doesn't exist
if [[ "$DB_EXISTS" == "false" ]]; then
    if [[ "$CREATE_DB" == "true" ]]; then
        log "Creating database $PGDATABASE..."
        if createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE"; then
            log "Database created successfully"
            DB_EXISTS=true
        else
            error "Failed to create database $PGDATABASE"
        fi
    else
        error "Database $PGDATABASE does not exist. Use --create-db to create it."
    fi
fi

# Safety check - confirm restore if not forced
if [[ "$FORCE" == "false" && "$DB_EXISTS" == "true" ]]; then
    # Count existing tables
    TABLE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

    if [[ "$TABLE_COUNT" -gt 0 ]]; then
        echo
        echo "WARNING: Database $PGDATABASE contains $TABLE_COUNT tables."
        echo "This restore operation will DROP and recreate all tables."
        echo "All existing data will be LOST."
        echo
        echo "Backup file: $BACKUP_FILE"
        echo "Database: $PGDATABASE on $PGHOST:$PGPORT"
        echo
        read -p "Are you sure you want to continue? [y/N]: " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
fi

# Create a backup of current database before restore (if it has data)
if [[ "$DB_EXISTS" == "true" ]]; then
    TABLE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

    if [[ "$TABLE_COUNT" -gt 0 ]]; then
        log "Creating safety backup of current database..."
        SAFETY_BACKUP="${BACKUP_DIR}/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

        if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists | gzip > "$SAFETY_BACKUP"; then
            log "Safety backup created: $SAFETY_BACKUP"
        else
            log "WARNING: Failed to create safety backup"
        fi
    fi
fi

# Perform the restore
log "Starting database restore..."

RESTORE_START_TIME=$(date +%s)

if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
    # Compressed backup
    log "Restoring from compressed backup..."
    if gunzip -c "$BACKUP_FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1; then
        RESTORE_SUCCESS=true
    else
        RESTORE_SUCCESS=false
    fi
else
    # Uncompressed backup
    log "Restoring from uncompressed backup..."
    if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"; then
        RESTORE_SUCCESS=true
    else
        RESTORE_SUCCESS=false
    fi
fi

RESTORE_END_TIME=$(date +%s)
RESTORE_DURATION=$((RESTORE_END_TIME - RESTORE_START_TIME))

if [[ "$RESTORE_SUCCESS" == "true" ]]; then
    log "Database restore completed successfully in ${RESTORE_DURATION} seconds"
else
    error "Database restore failed"
fi

# Verify restore
log "Verifying restored database..."

# Check if database is accessible
if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    error "Restored database is not accessible"
fi

# Count restored tables
RESTORED_TABLES=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
log "Restored $RESTORED_TABLES tables"

if [[ "$RESTORED_TABLES" -eq 0 ]]; then
    error "No tables found in restored database"
fi

# Verify key tables exist
EXPECTED_TABLES=("cities" "inventory" "customers" "payments" "tickets")
MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
    if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT to_regclass('public.$table');" 2>/dev/null | grep -q "$table"; then
        MISSING_TABLES+=("$table")
    fi
done

if [[ ${#MISSING_TABLES[@]} -gt 0 ]]; then
    log "WARNING: Missing expected tables: ${MISSING_TABLES[*]}"
else
    log "All expected tables found in restored database"
fi

# Update database statistics
log "Updating database statistics..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "ANALYZE;" > /dev/null 2>&1 || log "WARNING: Failed to update statistics"

# Create restore status file
RESTORE_STATUS_FILE="${BACKUP_DIR}/restore_status.json"
cat > "$RESTORE_STATUS_FILE" << EOF
{
  "status": "success",
  "restored_from": "$BACKUP_FILE",
  "restored_to": "$PGDATABASE",
  "restore_time": "$(date -Iseconds)",
  "restore_duration_seconds": $RESTORE_DURATION,
  "tables_restored": $RESTORED_TABLES,
  "missing_tables": [$(IFS=,; echo "${MISSING_TABLES[*]}" | sed 's/[^,]*/"&"/g')]
}
EOF

# Send notification if webhook URL is provided
if [[ -n "${RESTORE_WEBHOOK_URL:-}" ]]; then
    log "Sending restore notification..."
    curl -s -X POST "$RESTORE_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"status\": \"success\",
            \"database\": \"$PGDATABASE\",
            \"backup_file\": \"$BACKUP_FILE\",
            \"restore_duration\": $RESTORE_DURATION,
            \"tables_restored\": $RESTORED_TABLES
        }" > /dev/null || log "WARNING: Failed to send restore notification"
fi

log "PostgreSQL restore completed successfully"
log "Database: $PGDATABASE"
log "Tables restored: $RESTORED_TABLES"
log "Duration: ${RESTORE_DURATION} seconds"

exit 0