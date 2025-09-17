#!/bin/bash

# Optimized Development Script for Next.js Workshop Site
# Prevents React hydration errors and manages system resources

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_MEMORY_MB=2048
MIN_FREE_MEMORY_MB=1024
NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY_MB} --optimize-for-size"
NEXT_PORT=${NEXT_PORT:-3000}

echo -e "${BLUE}🚀 Starting Optimized Development Environment${NC}"
echo "======================================================="

# Function to check system resources
check_system_resources() {
    echo -e "${YELLOW}📊 Checking system resources...${NC}"

    # Check available memory (macOS)
    if command -v vm_stat >/dev/null 2>&1; then
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
        local page_size=$(vm_stat | grep "page size" | awk '{print $8}')
        local free_memory_mb=$((free_pages * page_size / 1024 / 1024))

        echo "💾 Available memory: ${free_memory_mb}MB"

        if [ "$free_memory_mb" -lt "$MIN_FREE_MEMORY_MB" ]; then
            echo -e "${RED}⚠️  Warning: Low memory (${free_memory_mb}MB < ${MIN_FREE_MEMORY_MB}MB)${NC}"
            echo "Consider closing other applications or running cleanup script"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    # Check disk space
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | tr -d '%')
    echo "💿 Disk usage: ${disk_usage}%"

    if [ "$disk_usage" -gt 90 ]; then
        echo -e "${RED}⚠️  Warning: High disk usage (${disk_usage}%)${NC}"
        echo "Consider running cleanup script"
    fi

    # Check for port conflicts
    if lsof -i ":${NEXT_PORT}" >/dev/null 2>&1; then
        echo -e "${RED}⚠️  Port ${NEXT_PORT} is already in use${NC}"
        local pid=$(lsof -t -i ":${NEXT_PORT}")
        echo "Process using port: $(ps -p $pid -o comm=)"
        read -p "Kill process and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 "$pid" || true
            sleep 2
        else
            exit 1
        fi
    fi
}

# Function to optimize environment
optimize_environment() {
    echo -e "${YELLOW}⚙️  Optimizing environment...${NC}"

    # Set Node.js memory limits
    export NODE_OPTIONS="$NODE_OPTIONS"

    # Optimize Next.js for development
    export NEXT_TELEMETRY_DISABLED=1
    export NODE_ENV=development

    # Disable unnecessary features for development
    export NEXT_DISABLE_SWC_WASM=false
    export NEXT_EXPERIMENTAL_CPU_PROFILE=false

    # Memory optimizations
    export UV_THREADPOOL_SIZE=4
    export NODE_MAX_OLD_SPACE_SIZE=$MAX_MEMORY_MB

    echo "✅ Environment optimized"
    echo "   - Memory limit: ${MAX_MEMORY_MB}MB"
    echo "   - Node options: $NODE_OPTIONS"
    echo "   - Port: $NEXT_PORT"
}

# Function to cleanup before start
cleanup_before_start() {
    echo -e "${YELLOW}🧹 Pre-start cleanup...${NC}"

    # Clear Next.js cache
    if [ -d ".next" ]; then
        echo "Clearing .next cache..."
        rm -rf .next
    fi

    # Clear TypeScript build info
    if [ -f "tsconfig.tsbuildinfo" ]; then
        echo "Clearing TypeScript build info..."
        rm -f tsconfig.tsbuildinfo
    fi

    # Clear any existing lock files
    if [ -f ".next/trace.json" ]; then
        rm -f .next/trace.json
    fi

    echo "✅ Cleanup completed"
}

# Function to validate project setup
validate_project() {
    echo -e "${YELLOW}🔍 Validating project setup...${NC}"

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        exit 1
    fi

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
    fi

    # Check for required files
    local required_files=("next.config.mjs" "tsconfig.json" "tailwind.config.js")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Required file missing: $file${NC}"
            exit 1
        fi
    done

    # Type check
    echo "🔍 Running TypeScript check..."
    if ! npm run type-check; then
        echo -e "${RED}❌ TypeScript errors found${NC}"
        read -p "Continue with errors? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    echo "✅ Project validation passed"
}

# Function to start development server with monitoring
start_dev_server() {
    echo -e "${GREEN}🎯 Starting development server...${NC}"
    echo "======================================================="
    echo "🌐 Server will be available at: http://localhost:${NEXT_PORT}"
    echo "🔧 Memory limit: ${MAX_MEMORY_MB}MB"
    echo "📊 Monitor resources: scripts/monitor-dev.sh"
    echo "🧹 Cleanup caches: scripts/cleanup-dev.sh"
    echo "======================================================="

    # Create a trap to cleanup on exit
    trap 'echo -e "\n${YELLOW}🛑 Shutting down development server...${NC}"; cleanup_on_exit' INT TERM

    # Start the development server
    npm run dev -- --port "$NEXT_PORT"
}

# Function to cleanup on exit
cleanup_on_exit() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"

    # Kill any remaining processes
    pkill -f "next-dev" || true

    # Optional: Clear development artifacts
    if [ -f ".next/trace.json" ]; then
        rm -f .next/trace.json
    fi

    echo -e "${GREEN}✅ Cleanup completed${NC}"
    exit 0
}

# Main execution
main() {
    echo -e "${BLUE}Development Environment Optimizer${NC}"
    echo "Project: 6FB Methodologies Workshop"
    echo "Date: $(date)"
    echo ""

    check_system_resources
    optimize_environment
    cleanup_before_start
    validate_project
    start_dev_server
}

# Run main function
main "$@"