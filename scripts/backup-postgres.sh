#!/bin/bash
# 6FB Methodologies Workshop - PostgreSQL Backup Script
# Automated database backup with retention, compression, and validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-6fb_methodologies}"
PGUSER="${PGUSER:-postgres}"

# Backup settings
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="6fb_methodologies_${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
CHECKSUM_FILE="${COMPRESSED_FILE}.sha256"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting PostgreSQL backup for 6FB Methodologies"
log "Database: $PGDATABASE on $PGHOST:$PGPORT"
log "Backup file: $COMPRESSED_FILE"

# Test database connection
log "Testing database connection..."
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q; then
    error "Cannot connect to PostgreSQL database"
fi

# Create database dump
log "Creating database dump..."
if ! pg_dump \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --no-owner \
    --no-privileges \
    --exclude-table-data=system_health \
    --exclude-table-data=sessions \
    > "$BACKUP_FILE"; then
    error "Failed to create database dump"
fi

# Verify backup file exists and has content
if [[ ! -s "$BACKUP_FILE" ]]; then
    error "Backup file is empty or does not exist"
fi

log "Database dump created successfully ($(du -h "$BACKUP_FILE" | cut -f1))"

# Compress backup
log "Compressing backup..."
if ! gzip "$BACKUP_FILE"; then
    error "Failed to compress backup file"
fi

log "Backup compressed successfully ($(du -h "$COMPRESSED_FILE" | cut -f1))"

# Create checksum
log "Creating checksum..."
if ! sha256sum "$COMPRESSED_FILE" > "$CHECKSUM_FILE"; then
    error "Failed to create checksum"
fi

# Verify backup integrity
log "Verifying backup integrity..."
if ! sha256sum -c "$CHECKSUM_FILE" > /dev/null 2>&1; then
    error "Backup integrity check failed"
fi

# Create metadata file
METADATA_FILE="${COMPRESSED_FILE}.meta"
cat > "$METADATA_FILE" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "database": "$PGDATABASE",
  "host": "$PGHOST",
  "port": "$PGPORT",
  "user": "$PGUSER",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "backup_file": "$COMPRESSED_FILE",
  "checksum_file": "$CHECKSUM_FILE",
  "size_bytes": $(stat -c%s "$COMPRESSED_FILE"),
  "size_human": "$(du -h "$COMPRESSED_FILE" | cut -f1)",
  "retention_days": $RETENTION_DAYS,
  "script_version": "1.0.0"
}
EOF

log "Backup metadata created: $METADATA_FILE"

# Test backup restoration (optional, but recommended)
if [[ "${BACKUP_VALIDATE:-true}" == "true" ]]; then
    log "Testing backup restoration (validation)..."

    # Create temporary database for testing
    TEST_DB="test_restore_$$"

    if createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$TEST_DB" 2>/dev/null; then
        log "Created test database: $TEST_DB"

        # Try to restore backup to test database
        if gunzip -c "$COMPRESSED_FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TEST_DB" -q > /dev/null 2>&1; then
            log "Backup validation successful"

            # Count tables to ensure structure was restored
            TABLE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
            log "Restored $TABLE_COUNT tables in test database"

            if [[ "$TABLE_COUNT" -lt 5 ]]; then
                log "WARNING: Fewer tables than expected in restored database"
            fi
        else
            log "WARNING: Backup validation failed - restore test unsuccessful"
        fi

        # Clean up test database
        dropdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$TEST_DB" 2>/dev/null || true
        log "Cleaned up test database"
    else
        log "WARNING: Could not create test database for validation"
    fi
fi

# Clean up old backups
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
CLEANUP_COUNT=0

if [[ -d "$BACKUP_DIR" ]]; then
    while IFS= read -r -d '' old_file; do
        if rm "$old_file"; then
            ((CLEANUP_COUNT++))
            log "Removed old backup: $(basename "$old_file")"
        fi
    done < <(find "$BACKUP_DIR" -name "6fb_methodologies_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0)

    # Also clean up associated files (checksums and metadata)
    find "$BACKUP_DIR" -name "6fb_methodologies_*.sha256" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "6fb_methodologies_*.meta" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
fi

log "Cleaned up $CLEANUP_COUNT old backup files"

# Create latest symlink
LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"
if [[ -L "$LATEST_LINK" ]] || [[ -f "$LATEST_LINK" ]]; then
    rm "$LATEST_LINK"
fi
ln -s "$(basename "$COMPRESSED_FILE")" "$LATEST_LINK"

# Create status file for monitoring
STATUS_FILE="${BACKUP_DIR}/backup_status.json"
cat > "$STATUS_FILE" << EOF
{
  "status": "success",
  "last_backup": "$TIMESTAMP",
  "last_backup_file": "$COMPRESSED_FILE",
  "last_backup_size": $(stat -c%s "$COMPRESSED_FILE"),
  "retention_days": $RETENTION_DAYS,
  "backups_cleaned": $CLEANUP_COUNT,
  "completed_at": "$(date -Iseconds)"
}
EOF

# Send notification if webhook URL is provided
if [[ -n "${BACKUP_WEBHOOK_URL:-}" ]]; then
    log "Sending backup notification..."
    curl -s -X POST "$BACKUP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"status\": \"success\",
            \"database\": \"$PGDATABASE\",
            \"backup_file\": \"$COMPRESSED_FILE\",
            \"backup_size\": \"$(du -h "$COMPRESSED_FILE" | cut -f1)\",
            \"timestamp\": \"$TIMESTAMP\"
        }" > /dev/null || log "WARNING: Failed to send backup notification"
fi

log "PostgreSQL backup completed successfully"
log "Backup file: $COMPRESSED_FILE"
log "Backup size: $(du -h "$COMPRESSED_FILE" | cut -f1)"
log "Checksum: $(cat "$CHECKSUM_FILE" | cut -d' ' -f1)"

# Exit with success
exit 0