#!/bin/bash

# Automated Disk Space Cleanup Script
# Safely removes caches and temporary files to free up space

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Starting automatic disk cleanup...${NC}"
echo ""

# Track space before cleanup
BEFORE=$(df -h / | awk 'NR==2 {print $4}')
echo -e "Available space before cleanup: ${YELLOW}${BEFORE}${NC}"
echo ""

# 1. Clean npm cache
echo -e "${GREEN}1. Cleaning npm cache...${NC}"
npm cache clean --force 2>/dev/null
echo "✅ npm cache cleaned"

# 2. Clean yarn cache if exists
echo -e "${GREEN}2. Cleaning yarn cache...${NC}"
yarn cache clean --all 2>/dev/null && echo "✅ yarn cache cleaned" || echo "ℹ️  yarn not found or no cache"

# 3. Clean pnpm cache
echo -e "${GREEN}3. Cleaning pnpm cache...${NC}"
rm -rf ~/Library/Caches/pnpm/* 2>/dev/null
echo "✅ pnpm cache cleaned"

# 4. Clean pip cache
echo -e "${GREEN}4. Cleaning pip cache...${NC}"
rm -rf ~/Library/Caches/pip/* 2>/dev/null
echo "✅ pip cache cleaned"

# 5. Clean Next.js build folders
echo -e "${GREEN}5. Removing Next.js build caches...${NC}"
find /Users/bossio -name ".next" -type d -exec rm -rf {} + 2>/dev/null
echo "✅ .next folders removed"

# 6. Clean TypeScript caches
echo -e "${GREEN}6. Cleaning TypeScript caches...${NC}"
rm -rf ~/Library/Caches/typescript/* 2>/dev/null
echo "✅ TypeScript cache cleaned"

# 7. Clean Claude CLI cache
echo -e "${GREEN}7. Cleaning Claude CLI cache...${NC}"
rm -rf ~/Library/Caches/claude-cli-nodejs/* 2>/dev/null
echo "✅ Claude CLI cache cleaned"

# 8. Clean Playwright cache
echo -e "${GREEN}8. Cleaning Playwright cache...${NC}"
rm -rf ~/Library/Caches/ms-playwright/* 2>/dev/null
echo "✅ Playwright cache cleaned"

# 9. Clean Pieces OS cache
echo -e "${GREEN}9. Cleaning Pieces OS cache...${NC}"
rm -rf ~/Library/Caches/com.pieces.os/* 2>/dev/null
echo "✅ Pieces OS cache cleaned"

# 10. Clean system temp files
echo -e "${GREEN}10. Cleaning temporary files...${NC}"
sudo rm -rf /tmp/* 2>/dev/null
echo "✅ Temporary files cleaned"

# 11. Clean Homebrew cache
echo -e "${GREEN}11. Cleaning Homebrew cache...${NC}"
brew cleanup --prune=all 2>/dev/null && echo "✅ Homebrew cache cleaned" || echo "ℹ️  Homebrew cleanup completed"

# 12. Clean node-gyp cache
echo -e "${GREEN}12. Cleaning node-gyp cache...${NC}"
rm -rf ~/Library/Caches/node-gyp/* 2>/dev/null
echo "✅ node-gyp cache cleaned"

echo ""
echo -e "${BLUE}🎉 Cleanup completed!${NC}"

# Show space after cleanup
AFTER=$(df -h / | awk 'NR==2 {print $4}')
USAGE_AFTER=$(df -h / | awk 'NR==2 {print $5}')

echo ""
echo -e "Available space after cleanup: ${GREEN}${AFTER}${NC}"
echo -e "Current disk usage: ${GREEN}${USAGE_AFTER}${NC}"

# Log the cleanup
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/Users/bossio/6fb-methodologies/disk-monitor.log"
echo "[$TIMESTAMP] Automatic cleanup completed. Available: $AFTER, Usage: $USAGE_AFTER" >> "$LOG_FILE"

echo ""
echo -e "${YELLOW}💡 Pro tip:${NC} Run this script weekly or add it to a cron job:"
echo "   0 10 * * 0 /Users/bossio/6fb-methodologies/clean-disk-space.sh"
echo ""
echo -e "${YELLOW}🔍 To monitor disk space:${NC}"
echo "   /Users/bossio/6fb-methodologies/monitor-disk-space.sh"