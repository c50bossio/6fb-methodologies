#!/bin/bash

# 6FB Workbook System - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="6fb-workbook"
BACKUP_DIR="./backups"
LOG_FILE="./deploy-$(date +%Y%m%d-%H%M%S).log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi

    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
    fi

    # Check if required environment file exists
    if [[ ! -f .env.production ]]; then
        error "Production environment file (.env.production) not found"
    fi

    # Check if Node.js is installed (for build process)
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi

    # Check Node.js version (should be 18+)
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        error "Node.js version 18 or higher is required (current: $(node -v))"
    fi

    success "All prerequisites met"
}

# Load environment variables
load_environment() {
    log "Loading environment variables..."

    if [[ -f .env.production ]]; then
        export $(cat .env.production | xargs)
        success "Production environment loaded"
    else
        error "Production environment file not found"
    fi

    # Validate required environment variables
    required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "NEXT_PUBLIC_APP_URL"
        "OPENAI_API_KEY"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_S3_BUCKET"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done

    success "All required environment variables are set"
}

# Create backup
create_backup() {
    log "Creating backup..."

    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"

    # Database backup
    if [[ -n "$DATABASE_URL" ]]; then
        log "Backing up database..."
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_NAME-database.sql"
        success "Database backup created: $BACKUP_DIR/$BACKUP_NAME-database.sql"
    fi

    # Application backup (if running)
    if docker ps --format "table {{.Names}}" | grep -q "$PROJECT_NAME"; then
        log "Backing up application data..."
        docker exec "${PROJECT_NAME}_app_1" tar czf - /app/.next > "$BACKUP_DIR/$BACKUP_NAME-app.tar.gz"
        success "Application backup created: $BACKUP_DIR/$BACKUP_NAME-app.tar.gz"
    fi

    echo "$BACKUP_NAME" > "$BACKUP_DIR/latest-backup"
    success "Backup completed: $BACKUP_NAME"
}

# Build application
build_application() {
    log "Building application..."

    # Install dependencies
    log "Installing dependencies..."
    npm ci --only=production

    # Run tests
    log "Running tests..."
    npm run test:ci || {
        error "Tests failed. Deployment aborted."
    }

    # Type checking
    log "Running type checks..."
    npm run type-check || {
        error "Type checking failed. Deployment aborted."
    }

    # Linting
    log "Running linter..."
    npm run lint || {
        warning "Linting issues found, but continuing deployment"
    }

    # Build application
    log "Building Next.js application..."
    npm run build || {
        error "Build failed. Deployment aborted."
    }

    success "Application built successfully"
}

# Build Docker images
build_docker_images() {
    log "Building Docker images..."

    # Build main application image
    docker build -t "${PROJECT_NAME}:latest" -t "${PROJECT_NAME}:$(date +%Y%m%d-%H%M%S)" . || {
        error "Failed to build Docker image"
    }

    success "Docker images built successfully"
}

# Database migration
migrate_database() {
    log "Running database migrations..."

    # Check if database is accessible
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Check DATABASE_URL"
    fi

    # Run migrations
    log "Applying database migrations..."
    for migration in database/migrations/*.sql; do
        if [[ -f "$migration" ]]; then
            log "Applying migration: $(basename "$migration")"
            psql "$DATABASE_URL" -f "$migration" || {
                error "Migration failed: $migration"
            }
        fi
    done

    # Verify schema
    if [[ -f database/verify-schema.sql ]]; then
        log "Verifying database schema..."
        psql "$DATABASE_URL" -f database/verify-schema.sql || {
            error "Schema verification failed"
        }
    fi

    success "Database migrations completed"
}

# Deploy services
deploy_services() {
    log "Deploying services..."

    # Stop existing services
    if docker-compose ps | grep -q "Up"; then
        log "Stopping existing services..."
        docker-compose down || {
            warning "Failed to stop some services"
        }
    fi

    # Start services
    log "Starting services..."
    docker-compose up -d || {
        error "Failed to start services"
    }

    # Wait for services to be ready
    log "Waiting for services to be ready..."

    # Wait for app to respond
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            success "Application is responding"
            break
        fi
        if [[ $i -eq 30 ]]; then
            error "Application failed to start within 30 seconds"
        fi
        sleep 1
    done

    success "Services deployed successfully"
}

# Health checks
run_health_checks() {
    log "Running health checks..."

    # Application health check
    log "Checking application health..."
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        success "Application health check passed"
    else
        error "Application health check failed: $HEALTH_RESPONSE"
    fi

    # Database health check
    log "Checking database connectivity..."
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
    fi

    # Redis health check (if configured)
    if [[ -n "$REDIS_URL" ]]; then
        log "Checking Redis connectivity..."
        if redis-cli -u "$REDIS_URL" ping | grep -q "PONG"; then
            success "Redis connectivity check passed"
        else
            warning "Redis connectivity check failed"
        fi
    fi

    # S3 health check
    log "Checking S3 connectivity..."
    if aws s3 ls "s3://$AWS_S3_BUCKET" &> /dev/null; then
        success "S3 connectivity check passed"
    else
        warning "S3 connectivity check failed"
    fi

    success "Health checks completed"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."

    # Clear caches
    log "Clearing application caches..."
    curl -X POST http://localhost:3000/api/cache/clear &> /dev/null || {
        warning "Failed to clear application caches"
    }

    # Warm up application
    log "Warming up application..."
    curl -s http://localhost:3000/ &> /dev/null
    curl -s http://localhost:3000/workbook &> /dev/null
    curl -s http://localhost:3000/api/workbook/modules &> /dev/null

    # Send deployment notification (if configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        log "Sending deployment notification..."
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚀 6FB Workbook System deployed successfully to production"}' \
            "$SLACK_WEBHOOK_URL" &> /dev/null || {
            warning "Failed to send Slack notification"
        }
    fi

    success "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    log "Rolling back to previous version..."

    if [[ ! -f "$BACKUP_DIR/latest-backup" ]]; then
        error "No backup found for rollback"
    fi

    BACKUP_NAME=$(cat "$BACKUP_DIR/latest-backup")

    # Stop current services
    docker-compose down

    # Restore database
    if [[ -f "$BACKUP_DIR/$BACKUP_NAME-database.sql" ]]; then
        log "Restoring database..."
        psql "$DATABASE_URL" < "$BACKUP_DIR/$BACKUP_NAME-database.sql"
    fi

    # Restore application (if available)
    if [[ -f "$BACKUP_DIR/$BACKUP_NAME-app.tar.gz" ]]; then
        log "Restoring application..."
        # Restore logic would depend on your specific setup
    fi

    success "Rollback completed"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."

    # Remove old Docker images (keep last 3)
    docker images "${PROJECT_NAME}" --format "table {{.Tag}}" | grep -E '^[0-9]{8}-[0-9]{6}$' | sort -r | tail -n +4 | xargs -r docker rmi "${PROJECT_NAME}:"

    # Remove old backups (keep last 10)
    find "$BACKUP_DIR" -name "backup-*" -type f | sort -r | tail -n +11 | xargs -r rm

    # Clean up build artifacts
    rm -rf .next/cache
    npm prune --production

    success "Cleanup completed"
}

# Main deployment function
deploy() {
    log "Starting deployment of 6FB Workbook System..."

    check_prerequisites
    load_environment
    create_backup
    build_application
    build_docker_images
    migrate_database
    deploy_services
    run_health_checks
    post_deployment
    cleanup

    success "🎉 Deployment completed successfully!"
    log "Deployment log saved to: $LOG_FILE"
}

# Script entry point
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "health")
        run_health_checks
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|backup|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment process (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Run health checks only"
        echo "  backup   - Create backup only"
        echo "  cleanup  - Cleanup old resources"
        exit 1
        ;;
esac