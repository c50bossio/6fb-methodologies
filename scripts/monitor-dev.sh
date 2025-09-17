#!/bin/bash

# Development Environment Health Monitor
# Real-time monitoring of Next.js development server and system resources

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REFRESH_INTERVAL=5
MAX_MEMORY_THRESHOLD=2048
CPU_THRESHOLD=80
DISK_THRESHOLD=90
PORT=${NEXT_PORT:-3000}
LOG_FILE="logs/dev-monitor.log"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to log with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to get process info for Next.js
get_nextjs_process_info() {
    local pids=$(pgrep -f "next-dev\|next dev" || true)
    if [ -z "$pids" ]; then
        echo "❌ Next.js development server not running"
        return 1
    fi

    local total_memory=0
    local total_cpu=0
    local process_count=0

    for pid in $pids; do
        if ps -p "$pid" > /dev/null 2>&1; then
            local memory=$(ps -p "$pid" -o rss= | tr -d ' ')
            local cpu=$(ps -p "$pid" -o %cpu= | tr -d ' ')

            if [ -n "$memory" ] && [ -n "$cpu" ]; then
                total_memory=$((total_memory + memory / 1024))  # Convert to MB
                total_cpu=$(echo "$total_cpu + $cpu" | bc 2>/dev/null || echo "$total_cpu")
                process_count=$((process_count + 1))
            fi
        fi
    done

    echo "$total_memory $total_cpu $process_count"
}

# Function to check system resources
check_system_resources() {
    local resources=""

    # Memory check (macOS)
    if command -v vm_stat >/dev/null 2>&1; then
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.' || echo "0")
        local page_size=4096  # Default page size
        local free_memory_mb=$((free_pages * page_size / 1024 / 1024))

        local memory_pressure=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print $5}' | tr -d '%' || echo "50")

        resources="$resources MEMORY_FREE:${free_memory_mb}MB MEMORY_PRESSURE:${memory_pressure}%"
    fi

    # CPU usage
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | tr -d '%' || echo "0")
    resources="$resources CPU:${cpu_usage}%"

    # Disk usage
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | tr -d '%')
    resources="$resources DISK:${disk_usage}%"

    # Load average
    local load_avg=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | tr -d ',')
    resources="$resources LOAD:${load_avg}"

    echo "$resources"
}

# Function to check port status
check_port_status() {
    if lsof -i ":$PORT" >/dev/null 2>&1; then
        echo "✅ Port $PORT: ACTIVE"
        return 0
    else
        echo "❌ Port $PORT: NOT LISTENING"
        return 1
    fi
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url="http://localhost:$PORT"
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "timeout")

    if [ "$response_time" = "timeout" ]; then
        echo "❌ HTTP Test: TIMEOUT"
        return 1
    else
        local response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null | cut -d. -f1)
        if [ "$response_ms" -lt 1000 ]; then
            echo "✅ HTTP Test: ${response_ms}ms"
        elif [ "$response_ms" -lt 3000 ]; then
            echo "⚠️  HTTP Test: ${response_ms}ms (SLOW)"
        else
            echo "❌ HTTP Test: ${response_ms}ms (VERY SLOW)"
        fi
    fi
}

# Function to check for common issues
check_common_issues() {
    local issues=""

    # Check for build errors in .next
    if [ -f ".next/trace.json" ]; then
        local error_count=$(grep -c "error\|Error\|ERROR" .next/trace.json 2>/dev/null || echo "0")
        if [ "$error_count" -gt 0 ]; then
            issues="$issues BUILD_ERRORS:$error_count"
        fi
    fi

    # Check for TypeScript errors
    if [ -f "tsconfig.tsbuildinfo" ]; then
        local size=$(stat -f%z tsconfig.tsbuildinfo 2>/dev/null || echo "0")
        if [ "$size" -gt 1000000 ]; then  # 1MB
            issues="$issues LARGE_TSBUILDINFO:${size}bytes"
        fi
    fi

    # Check for zombie processes
    local zombie_count=$(ps aux | grep -c "[Zz]ombie\|<defunct>" || echo "0")
    if [ "$zombie_count" -gt 0 ]; then
        issues="$issues ZOMBIE_PROCESSES:$zombie_count"
    fi

    # Check node_modules size
    if [ -d "node_modules" ]; then
        local nm_size=$(du -sh node_modules 2>/dev/null | awk '{print $1}' || echo "unknown")
        issues="$issues NODE_MODULES:$nm_size"
    fi

    echo "$issues"
}

# Function to generate alerts
check_alerts() {
    local nextjs_info=$(get_nextjs_process_info)
    local memory_mb=$(echo "$nextjs_info" | awk '{print $1}')
    local cpu_usage=$(echo "$nextjs_info" | awk '{print $2}')

    local alerts=""

    # Memory alert
    if [ -n "$memory_mb" ] && [ "$memory_mb" -gt "$MAX_MEMORY_THRESHOLD" ]; then
        alerts="$alerts HIGH_MEMORY:${memory_mb}MB"
        log_message "ALERT" "High memory usage: ${memory_mb}MB (threshold: ${MAX_MEMORY_THRESHOLD}MB)"
    fi

    # CPU alert
    if [ -n "$cpu_usage" ] && [ "$(echo "$cpu_usage > $CPU_THRESHOLD" | bc 2>/dev/null || echo 0)" = "1" ]; then
        alerts="$alerts HIGH_CPU:${cpu_usage}%"
        log_message "ALERT" "High CPU usage: ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
    fi

    if [ -n "$alerts" ]; then
        echo -e "${RED}🚨 ALERTS: $alerts${NC}"
    fi
}

# Function to display monitoring dashboard
display_dashboard() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  Development Health Monitor                  ║${NC}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} Project: 6FB Methodologies Workshop                       ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} Time: $(date '+%Y-%m-%d %H:%M:%S')                              ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo

    # Next.js Process Status
    echo -e "${CYAN}🚀 Next.js Development Server${NC}"
    echo "─────────────────────────────────"

    local nextjs_info=$(get_nextjs_process_info)
    if [ $? -eq 0 ]; then
        local memory_mb=$(echo "$nextjs_info" | awk '{print $1}')
        local cpu_usage=$(echo "$nextjs_info" | awk '{print $2}')
        local process_count=$(echo "$nextjs_info" | awk '{print $3}')

        echo -e "Status: ${GREEN}✅ RUNNING${NC}"
        echo "Memory Usage: ${memory_mb}MB"
        echo "CPU Usage: ${cpu_usage}%"
        echo "Process Count: $process_count"
    else
        echo -e "Status: ${RED}❌ NOT RUNNING${NC}"
    fi

    echo

    # Port Status
    echo -e "${CYAN}🌐 Network Status${NC}"
    echo "─────────────────────────────────"
    check_port_status
    test_http_endpoint
    echo

    # System Resources
    echo -e "${CYAN}📊 System Resources${NC}"
    echo "─────────────────────────────────"
    local resources=$(check_system_resources)
    echo "$resources" | tr ' ' '\n' | while read -r item; do
        if [ -n "$item" ]; then
            echo "$item" | sed 's/:/ = /'
        fi
    done
    echo

    # Common Issues
    echo -e "${CYAN}🔍 System Checks${NC}"
    echo "─────────────────────────────────"
    local issues=$(check_common_issues)
    if [ -n "$issues" ]; then
        echo "$issues" | tr ' ' '\n' | while read -r item; do
            if [ -n "$item" ]; then
                echo "$item" | sed 's/:/ = /'
            fi
        done
    else
        echo "✅ No issues detected"
    fi
    echo

    # Alerts
    check_alerts

    # Footer
    echo -e "${YELLOW}⚙️  Controls: Ctrl+C to exit | Refresh every ${REFRESH_INTERVAL}s${NC}"
    echo -e "${YELLOW}📝 Logs: $LOG_FILE${NC}"
    echo -e "${YELLOW}🧹 Cleanup: ./scripts/cleanup-dev.sh${NC}"
}

# Function to start monitoring
start_monitoring() {
    echo -e "${BLUE}🔍 Starting development environment monitoring...${NC}"
    log_message "INFO" "Monitoring started"

    # Trap Ctrl+C for clean exit
    trap 'echo -e "\n${YELLOW}🛑 Monitoring stopped${NC}"; log_message "INFO" "Monitoring stopped"; exit 0' INT TERM

    while true; do
        display_dashboard
        sleep "$REFRESH_INTERVAL"
    done
}

# Function to run single check
run_single_check() {
    echo -e "${BLUE}🔍 Running single health check...${NC}"
    display_dashboard
}

# Function to show help
show_help() {
    echo "Development Environment Monitor"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  monitor    Start continuous monitoring (default)"
    echo "  check      Run single health check"
    echo "  log        Show recent log entries"
    echo "  help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  REFRESH_INTERVAL   Monitoring refresh interval in seconds (default: 5)"
    echo "  NEXT_PORT         Next.js development port (default: 3000)"
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}📝 Recent log entries:${NC}"
        tail -n 20 "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠️  No log file found${NC}"
    fi
}

# Main execution
case "${1:-monitor}" in
    "monitor")
        start_monitoring
        ;;
    "check")
        run_single_check
        ;;
    "log")
        show_logs
        ;;
    "help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac