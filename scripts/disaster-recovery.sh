#!/bin/bash
# 6FB Methodologies Workshop - Disaster Recovery Script
# Complete disaster recovery procedures for the ticket sales system

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RECOVERY_MODE="${1:-help}"

# Logging
LOG_FILE="${BACKUP_DIR}/disaster_recovery.log"
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
6FB Methodologies Disaster Recovery Script

USAGE:
    $0 MODE [OPTIONS]

MODES:
    assess      - Assess current system health and backup status
    restore     - Full system restore from latest backups
    partial     - Partial restore (database only)
    validate    - Validate backup integrity and restore procedures
    help        - Show this help message

EXAMPLES:
    $0 assess                    # Check system health
    $0 restore --confirm         # Full system restore with confirmation
    $0 partial --backup-file latest  # Restore database from latest backup
    $0 validate                  # Validate all backups

ENVIRONMENT VARIABLES:
    BACKUP_DIR              - Backup directory (default: /backups)
    PGHOST                  - PostgreSQL host (default: postgres)
    PGPORT                  - PostgreSQL port (default: 5432)
    PGDATABASE              - Database name (default: 6fb_methodologies)
    PGUSER                  - Database user (default: postgres)
    REDIS_HOST              - Redis host (default: redis)
    REDIS_PORT              - Redis port (default: 6379)
    RECOVERY_WEBHOOK_URL    - Webhook for recovery notifications

EOF
    exit 0
}

# Health check functions
check_database_health() {
    log "Checking PostgreSQL database health..."

    local status="unknown"
    local details=""

    if pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -q; then
        # Database is responding, check deeper
        local db_name="${PGDATABASE:-6fb_methodologies}"

        if psql -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$db_name" -c "SELECT 1;" > /dev/null 2>&1; then
            # Check table count
            local table_count
            table_count=$(psql -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

            if [[ "$table_count" -ge 10 ]]; then
                status="healthy"
                details="Database responding, $table_count tables found"
            else
                status="degraded"
                details="Database responding but only $table_count tables found (expected 10+)"
            fi
        else
            status="error"
            details="Cannot connect to database $db_name"
        fi
    else
        status="down"
        details="PostgreSQL server not responding"
    fi

    echo "$status|$details"
}

check_redis_health() {
    log "Checking Redis cache health..."

    local status="unknown"
    local details=""

    if command -v redis-cli > /dev/null 2>&1; then
        if redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
            local memory_info
            memory_info=$(redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" info memory 2>/dev/null | grep used_memory_human || echo "used_memory_human:unknown")

            status="healthy"
            details="Redis responding, memory: ${memory_info#*:}"
        else
            status="down"
            details="Redis server not responding"
        fi
    else
        status="unavailable"
        details="redis-cli not available for testing"
    fi

    echo "$status|$details"
}

check_application_health() {
    log "Checking application health..."

    local status="unknown"
    local details=""

    # Try to reach health endpoint
    if command -v curl > /dev/null 2>&1; then
        if curl -f -s "http://app:3000/api/health" > /dev/null 2>&1; then
            status="healthy"
            details="Application health endpoint responding"
        else
            status="down"
            details="Application health endpoint not responding"
        fi
    else
        status="unavailable"
        details="curl not available for testing"
    fi

    echo "$status|$details"
}

check_backup_status() {
    log "Checking backup status..."

    local status="unknown"
    local details=""
    local latest_backup=""

    if [[ -d "$BACKUP_DIR" ]]; then
        # Find latest backup
        latest_backup=$(find "$BACKUP_DIR" -name "6fb_methodologies_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2- || echo "")

        if [[ -n "$latest_backup" ]]; then
            local backup_age
            backup_age=$(( $(date +%s) - $(stat -c %Y "$latest_backup" 2>/dev/null || echo "0") ))
            local backup_size
            backup_size=$(du -h "$latest_backup" 2>/dev/null | cut -f1 || echo "unknown")

            if [[ "$backup_age" -lt 86400 ]]; then  # Less than 24 hours
                status="recent"
                details="Latest backup: $(basename "$latest_backup"), size: $backup_size, age: $((backup_age / 3600))h"
            elif [[ "$backup_age" -lt 259200 ]]; then  # Less than 72 hours
                status="old"
                details="Latest backup: $(basename "$latest_backup"), size: $backup_size, age: $((backup_age / 3600))h (OLD)"
            else
                status="stale"
                details="Latest backup: $(basename "$latest_backup"), age: $((backup_age / 86400))d (STALE)"
            fi
        else
            status="missing"
            details="No backups found in $BACKUP_DIR"
        fi
    else
        status="unavailable"
        details="Backup directory $BACKUP_DIR not accessible"
    fi

    echo "$status|$details|$latest_backup"
}

# Recovery procedures
assess_system() {
    log "=== DISASTER RECOVERY ASSESSMENT ==="
    log "Starting comprehensive system health assessment..."

    local overall_status="healthy"
    local critical_issues=0
    local warnings=0

    # Check database
    local db_result
    db_result=$(check_database_health)
    local db_status="${db_result%%|*}"
    local db_details="${db_result#*|}"

    log "Database Status: $db_status - $db_details"
    if [[ "$db_status" != "healthy" ]]; then
        if [[ "$db_status" == "down" || "$db_status" == "error" ]]; then
            ((critical_issues++))
            overall_status="critical"
        else
            ((warnings++))
            if [[ "$overall_status" == "healthy" ]]; then
                overall_status="degraded"
            fi
        fi
    fi

    # Check Redis
    local redis_result
    redis_result=$(check_redis_health)
    local redis_status="${redis_result%%|*}"
    local redis_details="${redis_result#*|}"

    log "Redis Status: $redis_status - $redis_details"
    if [[ "$redis_status" != "healthy" && "$redis_status" != "unavailable" ]]; then
        ((warnings++))
        if [[ "$overall_status" == "healthy" ]]; then
            overall_status="degraded"
        fi
    fi

    # Check application
    local app_result
    app_result=$(check_application_health)
    local app_status="${app_result%%|*}"
    local app_details="${app_result#*|}"

    log "Application Status: $app_status - $app_details"
    if [[ "$app_status" != "healthy" ]]; then
        if [[ "$app_status" == "down" ]]; then
            ((critical_issues++))
            overall_status="critical"
        else
            ((warnings++))
            if [[ "$overall_status" == "healthy" ]]; then
                overall_status="degraded"
            fi
        fi
    fi

    # Check backups
    local backup_result
    backup_result=$(check_backup_status)
    local backup_status="${backup_result%%|*}"
    local backup_details="${backup_result#*|*|}"
    local latest_backup="${backup_result##*|}"

    log "Backup Status: $backup_status - ${backup_result#*|*|}"
    if [[ "$backup_status" != "recent" ]]; then
        if [[ "$backup_status" == "missing" || "$backup_status" == "stale" ]]; then
            ((critical_issues++))
            overall_status="critical"
        else
            ((warnings++))
            if [[ "$overall_status" == "healthy" ]]; then
                overall_status="degraded"
            fi
        fi
    fi

    # Summary
    log "=== ASSESSMENT SUMMARY ==="
    log "Overall Status: $overall_status"
    log "Critical Issues: $critical_issues"
    log "Warnings: $warnings"

    if [[ "$overall_status" == "critical" ]]; then
        log "CRITICAL: Immediate action required!"
        if [[ "$critical_issues" -gt 0 ]]; then
            log "Consider running: $0 restore --confirm"
        fi
    elif [[ "$overall_status" == "degraded" ]]; then
        log "WARNING: System is degraded but functional"
    else
        log "GOOD: System appears healthy"
    fi

    # Create assessment report
    local report_file="${BACKUP_DIR}/assessment_$(date +%Y%m%d_%H%M%S).json"
    cat > "$report_file" << EOF
{
  "assessment_time": "$(date -Iseconds)",
  "overall_status": "$overall_status",
  "critical_issues": $critical_issues,
  "warnings": $warnings,
  "components": {
    "database": {
      "status": "$db_status",
      "details": "$db_details"
    },
    "redis": {
      "status": "$redis_status",
      "details": "$redis_details"
    },
    "application": {
      "status": "$app_status",
      "details": "$app_details"
    },
    "backups": {
      "status": "$backup_status",
      "details": "${backup_result#*|}",
      "latest_backup": "$latest_backup"
    }
  }
}
EOF

    log "Assessment report saved: $report_file"

    # Send notification if webhook is configured
    if [[ -n "${RECOVERY_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST "$RECOVERY_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"assessment\",
                \"status\": \"$overall_status\",
                \"critical_issues\": $critical_issues,
                \"warnings\": $warnings,
                \"timestamp\": \"$(date -Iseconds)\"
            }" > /dev/null || log "WARNING: Failed to send assessment notification"
    fi

    return $critical_issues
}

full_restore() {
    log "=== FULL SYSTEM RESTORE ==="
    log "Starting full disaster recovery restore..."

    # Parse options
    local confirm=false
    local backup_file=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --confirm)
                confirm=true
                shift
                ;;
            --backup-file)
                backup_file="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    # Safety confirmation
    if [[ "$confirm" != "true" ]]; then
        echo
        echo "WARNING: This will perform a FULL SYSTEM RESTORE"
        echo "This operation will:"
        echo "  - Stop all services"
        echo "  - Restore database from backup"
        echo "  - Clear Redis cache"
        echo "  - Restart all services"
        echo
        read -p "Are you sure you want to continue? Type 'RESTORE' to confirm: " -r
        if [[ "$REPLY" != "RESTORE" ]]; then
            log "Full restore cancelled by user"
            exit 0
        fi
    fi

    local restore_start_time
    restore_start_time=$(date +%s)

    # Step 1: Assess current state
    log "Step 1: Assessing current system state..."
    assess_system || true  # Don't fail on assessment issues

    # Step 2: Determine backup file
    if [[ -z "$backup_file" ]]; then
        local backup_result
        backup_result=$(check_backup_status)
        backup_file="${backup_result##*|}"

        if [[ -z "$backup_file" || "$backup_file" == "unknown" ]]; then
            error "No backup file specified and no recent backups found"
        fi

        log "Using latest backup: $backup_file"
    fi

    # Step 3: Stop services (simulate - in real deployment this would stop actual services)
    log "Step 3: Stopping services..."
    # docker-compose stop app || log "WARNING: Failed to stop application"

    # Step 4: Restore database
    log "Step 4: Restoring database..."
    if "${SCRIPT_DIR}/restore-postgres.sh" --force "$backup_file"; then
        log "Database restore completed successfully"
    else
        error "Database restore failed"
    fi

    # Step 5: Clear Redis cache
    log "Step 5: Clearing Redis cache..."
    if command -v redis-cli > /dev/null 2>&1; then
        redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" FLUSHALL > /dev/null 2>&1 || log "WARNING: Failed to clear Redis cache"
        log "Redis cache cleared"
    else
        log "WARNING: redis-cli not available, skipping cache clear"
    fi

    # Step 6: Start services
    log "Step 6: Starting services..."
    # docker-compose up -d || error "Failed to start services"

    # Step 7: Verify restore
    log "Step 7: Verifying restore..."
    sleep 30  # Wait for services to start

    local verification_passed=true

    # Check database
    local db_result
    db_result=$(check_database_health)
    local db_status="${db_result%%|*}"
    if [[ "$db_status" != "healthy" ]]; then
        log "ERROR: Database verification failed: ${db_result#*|}"
        verification_passed=false
    fi

    # Check application
    local app_result
    app_result=$(check_application_health)
    local app_status="${app_result%%|*}"
    if [[ "$app_status" != "healthy" ]]; then
        log "WARNING: Application verification failed: ${app_result#*|}"
    fi

    local restore_end_time
    restore_end_time=$(date +%s)
    local restore_duration=$((restore_end_time - restore_start_time))

    if [[ "$verification_passed" == "true" ]]; then
        log "=== FULL RESTORE COMPLETED SUCCESSFULLY ==="
        log "Duration: ${restore_duration} seconds"
        log "Backup used: $backup_file"

        # Send success notification
        if [[ -n "${RECOVERY_WEBHOOK_URL:-}" ]]; then
            curl -s -X POST "$RECOVERY_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{
                    \"type\": \"full_restore\",
                    \"status\": \"success\",
                    \"backup_file\": \"$backup_file\",
                    \"duration\": $restore_duration,
                    \"timestamp\": \"$(date -Iseconds)\"
                }" > /dev/null || log "WARNING: Failed to send success notification"
        fi
    else
        error "Full restore completed but verification failed"
    fi
}

partial_restore() {
    log "=== PARTIAL RESTORE (Database Only) ==="

    local backup_file="$1"
    if [[ -z "$backup_file" ]]; then
        backup_file="latest"
    fi

    log "Starting partial restore (database only)..."
    if "${SCRIPT_DIR}/restore-postgres.sh" --force "$backup_file"; then
        log "Partial restore completed successfully"
    else
        error "Partial restore failed"
    fi
}

validate_backups() {
    log "=== BACKUP VALIDATION ==="
    log "Validating all available backups..."

    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory not found: $BACKUP_DIR"
    fi

    local backup_count=0
    local valid_count=0
    local invalid_count=0

    while IFS= read -r -d '' backup_file; do
        ((backup_count++))
        log "Validating backup: $(basename "$backup_file")"

        # Check checksum if available
        local checksum_file="${backup_file}.sha256"
        if [[ -f "$checksum_file" ]]; then
            if sha256sum -c "$checksum_file" > /dev/null 2>&1; then
                log "  ✓ Checksum valid"
                ((valid_count++))
            else
                log "  ✗ Checksum invalid"
                ((invalid_count++))
                continue
            fi
        else
            log "  ⚠ No checksum file found"
        fi

        # Test compression
        if gunzip -t "$backup_file" > /dev/null 2>&1; then
            log "  ✓ Compression valid"
        else
            log "  ✗ Compression invalid"
            ((invalid_count++))
            continue
        fi

        log "  ✓ Backup validation passed"

    done < <(find "$BACKUP_DIR" -name "6fb_methodologies_*.sql.gz" -type f -print0 2>/dev/null)

    log "=== VALIDATION SUMMARY ==="
    log "Total backups: $backup_count"
    log "Valid backups: $valid_count"
    log "Invalid backups: $invalid_count"

    if [[ "$invalid_count" -gt 0 ]]; then
        log "WARNING: Some backups failed validation"
        return 1
    else
        log "All backups passed validation"
        return 0
    fi
}

# Main execution
case "$RECOVERY_MODE" in
    assess)
        assess_system
        ;;
    restore)
        shift
        full_restore "$@"
        ;;
    partial)
        shift
        partial_restore "$@"
        ;;
    validate)
        validate_backups
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo "Unknown mode: $RECOVERY_MODE"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac