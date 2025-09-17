#!/bin/bash

# Disk Space Monitoring Script
# Prevents future disk space issues by monitoring and alerting

# Configuration
THRESHOLD=85  # Alert when disk usage exceeds this percentage
LOG_FILE="/Users/bossio/6fb-methodologies/disk-monitor.log"
CLEAN_SCRIPT="/Users/bossio/6fb-methodologies/clean-disk-space.sh"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get current disk usage percentage
USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log current status
echo "[$TIMESTAMP] Disk usage: ${USAGE}%, Available: ${AVAILABLE}" >> "$LOG_FILE"

# Check if usage exceeds threshold
if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo -e "${RED}⚠️  DISK SPACE WARNING${NC}"
    echo -e "Disk usage: ${RED}${USAGE}%${NC} (Threshold: ${THRESHOLD}%)"
    echo -e "Available space: ${YELLOW}${AVAILABLE}${NC}"
    echo -e "[$TIMESTAMP] WARNING: Disk usage ${USAGE}% exceeds threshold ${THRESHOLD}%" >> "$LOG_FILE"

    echo ""
    echo "🧹 Recommended actions:"
    echo "1. Run automatic cleanup: $CLEAN_SCRIPT"
    echo "2. Check Downloads folder for large files"
    echo "3. Clear browser caches"
    echo "4. Remove old Docker images/containers"

    # Offer to run cleanup automatically
    echo ""
    read -p "Run automatic cleanup now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "$CLEAN_SCRIPT" ]; then
            echo "Running cleanup script..."
            bash "$CLEAN_SCRIPT"
        else
            echo "Cleanup script not found. Running basic cleanup..."

            # Basic cleanup
            echo "Cleaning npm cache..."
            npm cache clean --force 2>/dev/null

            echo "Cleaning system caches..."
            rm -rf ~/Library/Caches/claude-cli-nodejs/* 2>/dev/null
            rm -rf ~/Library/Caches/pip/* 2>/dev/null
            rm -rf ~/Library/Caches/pnpm/* 2>/dev/null

            echo "Removing .next build folders..."
            find /Users/bossio -name ".next" -type d -exec rm -rf {} + 2>/dev/null

            echo "Basic cleanup completed!"
        fi
    fi

elif [ "$USAGE" -gt 70 ]; then
    echo -e "${YELLOW}⚠️  DISK SPACE CAUTION${NC}"
    echo -e "Disk usage: ${YELLOW}${USAGE}%${NC}"
    echo -e "Available space: ${GREEN}${AVAILABLE}${NC}"
    echo "Consider running cleanup soon to prevent issues."
else
    echo -e "${GREEN}✅ DISK SPACE OK${NC}"
    echo -e "Disk usage: ${GREEN}${USAGE}%${NC}"
    echo -e "Available space: ${GREEN}${AVAILABLE}${NC}"
fi

# Show largest directories if space is low
if [ "$USAGE" -gt 80 ]; then
    echo ""
    echo "🔍 Largest directories in home folder:"
    du -sh ~/Downloads ~/Library/Caches ~/.npm ~/.cache 2>/dev/null | sort -hr | head -5
fi

echo ""
echo "📊 Disk usage history (last 10 entries):"
tail -10 "$LOG_FILE" 2>/dev/null || echo "No history available"