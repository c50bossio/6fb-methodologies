#!/bin/bash

# Development Environment Cleanup Script
# Clears caches, temporary files, and resets development environment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKUP_DIR="backups/cleanup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="logs/cleanup.log"

# Create necessary directories
mkdir -p logs
mkdir -p backups

# Function to log with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to calculate directory size
get_dir_size() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sh "$dir" 2>/dev/null | awk '{print $1}' || echo "0B"
    else
        echo "0B"
    fi
}

# Function to safely remove directory with backup option
safe_remove() {
    local target="$1"
    local description="$2"
    local backup="$3"

    if [ ! -e "$target" ]; then
        echo "✅ $description: Already clean"
        return 0
    fi

    local size=$(get_dir_size "$target")
    echo -n "🗑️  $description ($size)... "

    # Create backup if requested
    if [ "$backup" = "true" ] && [ -d "$target" ]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$target" "$BACKUP_DIR/$(basename "$target")" 2>/dev/null || true
        echo -n "backed up, "
    fi

    # Remove the target
    rm -rf "$target" 2>/dev/null || {
        echo -e "${RED}FAILED${NC}"
        log_message "ERROR" "Failed to remove $target"
        return 1
    }

    echo -e "${GREEN}DONE${NC}"
    log_message "INFO" "Cleaned $description ($size)"
    return 0
}

# Function to clean Next.js specific files
clean_nextjs() {
    echo -e "${CYAN}🚀 Cleaning Next.js Files${NC}"
    echo "──────────────────────────────"

    # Next.js build directory
    safe_remove ".next" "Next.js build cache" false

    # Next.js trace files
    safe_remove ".next/trace.json" "Next.js trace file" false

    # Next.js standalone files
    safe_remove ".next/standalone" "Next.js standalone build" false

    # Next.js static files
    safe_remove ".next/static" "Next.js static files" false

    echo
}

# Function to clean TypeScript files
clean_typescript() {
    echo -e "${CYAN}📝 Cleaning TypeScript Files${NC}"
    echo "──────────────────────────────"

    # TypeScript build info
    safe_remove "tsconfig.tsbuildinfo" "TypeScript build info" true

    # TypeScript incremental info
    find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
    echo "✅ TypeScript incremental files: DONE"

    echo
}

# Function to clean node modules and package management
clean_node_modules() {
    echo -e "${CYAN}📦 Cleaning Node.js Dependencies${NC}"
    echo "──────────────────────────────"

    local node_modules_size=$(get_dir_size "node_modules")
    echo "Current node_modules size: $node_modules_size"

    read -p "Remove node_modules? This will require 'npm install' afterwards (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        safe_remove "node_modules" "Node.js dependencies" false

        # Clean package lock
        if [ -f "package-lock.json" ]; then
            echo -n "🔒 Removing package-lock.json... "
            rm -f "package-lock.json"
            echo -e "${GREEN}DONE${NC}"
        fi

        echo -e "${YELLOW}⚠️  Remember to run 'npm install' to restore dependencies${NC}"
    else
        echo "⏭️  Skipping node_modules cleanup"
    fi

    echo
}

# Function to clean npm and yarn caches
clean_package_caches() {
    echo -e "${CYAN}🗄️  Cleaning Package Manager Caches${NC}"
    echo "──────────────────────────────"

    # NPM cache
    if command -v npm >/dev/null 2>&1; then
        echo -n "📦 NPM cache... "
        npm cache clean --force >/dev/null 2>&1 && echo -e "${GREEN}DONE${NC}" || echo -e "${RED}FAILED${NC}"
    fi

    # Yarn cache
    if command -v yarn >/dev/null 2>&1; then
        echo -n "🧶 Yarn cache... "
        yarn cache clean >/dev/null 2>&1 && echo -e "${GREEN}DONE${NC}" || echo -e "${RED}FAILED${NC}"
    fi

    echo
}

# Function to clean system caches
clean_system_caches() {
    echo -e "${CYAN}💾 Cleaning System Caches${NC}"
    echo "──────────────────────────────"

    # Clear DNS cache (macOS)
    if command -v dscacheutil >/dev/null 2>&1; then
        echo -n "🌐 DNS cache... "
        sudo dscacheutil -flushcache >/dev/null 2>&1 && echo -e "${GREEN}DONE${NC}" || echo -e "${YELLOW}SKIPPED${NC}"
    fi

    # Clear font cache (macOS)
    if [ -d "~/Library/Caches/com.adobe.AdobeFontsCacheProcessor" ]; then
        safe_remove "~/Library/Caches/com.adobe.AdobeFontsCacheProcessor" "Font cache" false
    fi

    echo
}

# Function to clean development logs and temporary files
clean_dev_files() {
    echo -e "${CYAN}📄 Cleaning Development Files${NC}"
    echo "──────────────────────────────"

    # Log files (keep recent ones)
    if [ -d "logs" ]; then
        echo -n "📋 Old log files... "
        find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
        echo -e "${GREEN}DONE${NC}"
    fi

    # Temporary files
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name ".DS_Store" -type f -delete 2>/dev/null || true
    find . -name "Thumbs.db" -type f -delete 2>/dev/null || true
    echo "✅ Temporary files: DONE"

    # Editor swap files
    find . -name "*.swp" -o -name "*.swo" -o -name "*~" -type f -delete 2>/dev/null || true
    echo "✅ Editor swap files: DONE"

    echo
}

# Function to clean environment-specific files
clean_env_files() {
    echo -e "${CYAN}⚙️  Cleaning Environment Files${NC}"
    echo "──────────────────────────────"

    # Remove development-only environment files
    safe_remove ".env.local.tmp" "Temporary environment file" false
    safe_remove ".env.development.local" "Development environment file" true

    # Clean environment artifacts
    if [ -f ".env.backup" ]; then
        echo "⚠️  Found .env.backup file"
        read -p "Remove .env.backup? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            safe_remove ".env.backup" "Environment backup" false
        fi
    fi

    echo
}

# Function to optimize git repository
clean_git() {
    echo -e "${CYAN}🗂️  Git Repository Optimization${NC}"
    echo "──────────────────────────────"

    if [ -d ".git" ]; then
        echo -n "🔄 Git garbage collection... "
        git gc --prune=now >/dev/null 2>&1 && echo -e "${GREEN}DONE${NC}" || echo -e "${YELLOW}SKIPPED${NC}"

        echo -n "🗑️  Git reflog cleanup... "
        git reflog expire --expire=now --all >/dev/null 2>&1 && echo -e "${GREEN}DONE${NC}" || echo -e "${YELLOW}SKIPPED${NC}"

        # Show repository size after cleanup
        local repo_size=$(du -sh .git 2>/dev/null | awk '{print $1}' || echo "unknown")
        echo "📊 Repository size: $repo_size"
    else
        echo "⏭️  Not a git repository"
    fi

    echo
}

# Function to show cleanup summary
show_summary() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                       Cleanup Summary                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

    # Calculate space freed
    local log_lines=$(tail -n 50 "$LOG_FILE" | grep "Cleaned" | wc -l || echo "0")
    echo "📊 Items cleaned: $log_lines"

    # Show backup location if created
    if [ -d "$BACKUP_DIR" ]; then
        local backup_size=$(get_dir_size "$BACKUP_DIR")
        echo "💾 Backups created: $BACKUP_DIR ($backup_size)"
    fi

    # Show log file location
    echo "📝 Cleanup log: $LOG_FILE"

    echo
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Run 'npm install' if node_modules was removed"
    echo "2. Start development server with 'npm run dev' or './scripts/dev-optimized.sh'"
    echo "3. Monitor with './scripts/monitor-dev.sh'"
}

# Function to show help
show_help() {
    echo "Development Environment Cleanup Script"
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --full         Full cleanup including node_modules"
    echo "  --quick        Quick cleanup (caches and build files only)"
    echo "  --nextjs       Clean only Next.js specific files"
    echo "  --typescript   Clean only TypeScript files"
    echo "  --help         Show this help message"
    echo ""
    echo "Interactive mode (default): Prompts for each cleanup category"
}

# Function for quick cleanup
quick_cleanup() {
    echo -e "${BLUE}⚡ Quick Cleanup Mode${NC}"
    echo "══════════════════════════════════════"

    clean_nextjs
    clean_typescript
    clean_package_caches
    clean_dev_files

    show_summary
}

# Function for full cleanup
full_cleanup() {
    echo -e "${BLUE}🧹 Full Cleanup Mode${NC}"
    echo "══════════════════════════════════════"

    clean_nextjs
    clean_typescript
    clean_dev_files
    clean_env_files
    clean_package_caches
    clean_system_caches
    clean_git

    # Always prompt for node_modules in full mode
    clean_node_modules

    show_summary
}

# Function for interactive cleanup
interactive_cleanup() {
    echo -e "${BLUE}🎯 Interactive Cleanup Mode${NC}"
    echo "══════════════════════════════════════"
    echo "Select cleanup categories:"
    echo

    # Get user preferences
    echo -n "Clean Next.js files? (Y/n): "; read -r nextjs_clean
    echo -n "Clean TypeScript files? (Y/n): "; read -r ts_clean
    echo -n "Clean development files? (Y/n): "; read -r dev_clean
    echo -n "Clean package caches? (Y/n): "; read -r cache_clean
    echo -n "Clean node_modules? (y/N): "; read -r modules_clean
    echo -n "Git optimization? (y/N): "; read -r git_clean

    echo
    echo -e "${YELLOW}🔄 Starting cleanup...${NC}"

    # Execute based on user choices
    [[ ! $nextjs_clean =~ ^[Nn]$ ]] && clean_nextjs
    [[ ! $ts_clean =~ ^[Nn]$ ]] && clean_typescript
    [[ ! $dev_clean =~ ^[Nn]$ ]] && clean_dev_files
    [[ ! $cache_clean =~ ^[Nn]$ ]] && clean_package_caches
    [[ $modules_clean =~ ^[Yy]$ ]] && clean_node_modules
    [[ $git_clean =~ ^[Yy]$ ]] && clean_git

    show_summary
}

# Main execution
main() {
    echo -e "${BLUE}🧹 Development Environment Cleanup${NC}"
    echo "Project: 6FB Methodologies Workshop"
    echo "Date: $(date)"
    echo

    log_message "INFO" "Cleanup started with option: ${1:-interactive}"

    case "${1:-interactive}" in
        "--quick")
            quick_cleanup
            ;;
        "--full")
            full_cleanup
            ;;
        "--nextjs")
            clean_nextjs
            show_summary
            ;;
        "--typescript")
            clean_typescript
            show_summary
            ;;
        "--help")
            show_help
            ;;
        *)
            interactive_cleanup
            ;;
    esac

    log_message "INFO" "Cleanup completed"
}

# Run main function
main "$@"