#!/bin/bash

# Environment Validation Script for Next.js Workshop Site
# Validates development environment setup and configuration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
VALIDATION_LOG="logs/environment-validation.log"
MIN_NODE_VERSION=18
MIN_NPM_VERSION=8
REQUIRED_DISK_SPACE_GB=5
MIN_MEMORY_GB=4

# Create logs directory
mkdir -p logs

# Function to log with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$VALIDATION_LOG"
}

# Function to check system requirements
check_system_requirements() {
    echo -e "${BLUE}🖥️  System Requirements Validation${NC}"
    echo "──────────────────────────────────"

    local errors=0
    local warnings=0

    # Operating System
    local os_name=$(uname -s)
    local os_version=$(uname -r)
    echo "🖥️  Operating System: $os_name $os_version"
    log_message "INFO" "OS: $os_name $os_version"

    # Architecture
    local arch=$(uname -m)
    echo "🏗️  Architecture: $arch"
    log_message "INFO" "Architecture: $arch"

    # Available Memory
    if command -v vm_stat >/dev/null 2>&1; then
        # macOS memory check
        local total_memory_mb=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024" | bc)
        local total_memory_gb=$(echo "scale=1; $total_memory_mb / 1024" | bc)

        echo "💾 Total Memory: ${total_memory_gb}GB"
        log_message "INFO" "Total memory: ${total_memory_gb}GB"

        if (( $(echo "$total_memory_gb < $MIN_MEMORY_GB" | bc -l) )); then
            echo -e "${YELLOW}⚠️  Warning: Memory (${total_memory_gb}GB) below recommended minimum (${MIN_MEMORY_GB}GB)${NC}"
            warnings=$((warnings + 1))
        fi
    elif [ -f "/proc/meminfo" ]; then
        # Linux memory check
        local total_memory_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local total_memory_gb=$(echo "scale=1; $total_memory_kb / 1024 / 1024" | bc)

        echo "💾 Total Memory: ${total_memory_gb}GB"
        log_message "INFO" "Total memory: ${total_memory_gb}GB"

        if (( $(echo "$total_memory_gb < $MIN_MEMORY_GB" | bc -l) )); then
            echo -e "${YELLOW}⚠️  Warning: Memory (${total_memory_gb}GB) below recommended minimum (${MIN_MEMORY_GB}GB)${NC}"
            warnings=$((warnings + 1))
        fi
    fi

    # Available Disk Space (handle macOS df command differences)
    local disk_space_gb
    if [[ "$os_name" == "Darwin" ]]; then
        # macOS version
        disk_space_gb=$(df -h . | tail -1 | awk '{print $4}' | sed 's/Gi//' | sed 's/G//' | cut -d'.' -f1)
    else
        # Linux version
        disk_space_gb=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
    fi

    echo "💿 Available Disk Space: ${disk_space_gb}GB"
    log_message "INFO" "Available disk space: ${disk_space_gb}GB"

    if [ -n "$disk_space_gb" ] && [ "$disk_space_gb" -lt "$REQUIRED_DISK_SPACE_GB" ]; then
        echo -e "${RED}❌ Error: Insufficient disk space (${disk_space_gb}GB < ${REQUIRED_DISK_SPACE_GB}GB required)${NC}"
        errors=$((errors + 1))
    fi

    # CPU Information
    if [ -f "/proc/cpuinfo" ]; then
        local cpu_count=$(grep -c ^processor /proc/cpuinfo)
        local cpu_model=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
        echo "🧮 CPU: $cpu_model ($cpu_count cores)"
    elif command -v sysctl >/dev/null 2>&1; then
        local cpu_count=$(sysctl -n hw.ncpu)
        local cpu_model=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Unknown")
        echo "🧮 CPU: $cpu_model ($cpu_count cores)"
    fi

    echo

    return $((errors + warnings))
}

# Function to validate Node.js and npm
validate_nodejs_npm() {
    echo -e "${BLUE}📦 Node.js and npm Validation${NC}"
    echo "──────────────────────────────────"

    local errors=0

    # Node.js version check
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | cut -d'v' -f2)
        local node_major=$(echo "$node_version" | cut -d'.' -f1)

        echo "🟢 Node.js: v$node_version"
        log_message "INFO" "Node.js version: v$node_version"

        if [ "$node_major" -lt "$MIN_NODE_VERSION" ]; then
            echo -e "${RED}❌ Error: Node.js version too old (v${node_version} < v${MIN_NODE_VERSION} required)${NC}"
            errors=$((errors + 1))
        fi

        # Check Node.js installation location
        local node_path=$(which node)
        echo "📁 Node.js Location: $node_path"

        # Check if using nvm
        if [[ "$node_path" == *".nvm"* ]]; then
            echo "🔧 Node Version Manager: nvm detected"
            echo "💡 Current nvm version: $(nvm --version 2>/dev/null || echo 'N/A')"
        fi
    else
        echo -e "${RED}❌ Error: Node.js not found${NC}"
        errors=$((errors + 1))
    fi

    # npm version check
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        local npm_major=$(echo "$npm_version" | cut -d'.' -f1)

        echo "📦 npm: v$npm_version"
        log_message "INFO" "npm version: v$npm_version"

        if [ "$npm_major" -lt "$MIN_NPM_VERSION" ]; then
            echo -e "${YELLOW}⚠️  Warning: npm version is old (v${npm_version} < v${MIN_NPM_VERSION} recommended)${NC}"
        fi

        # Check npm configuration
        local npm_prefix=$(npm config get prefix)
        echo "📁 npm prefix: $npm_prefix"

        # Check for global npm packages that might cause issues
        local problematic_globals=("next" "react" "react-dom")
        for package in "${problematic_globals[@]}"; do
            if npm list -g "$package" >/dev/null 2>&1; then
                echo -e "${YELLOW}⚠️  Warning: Global $package package detected (may cause conflicts)${NC}"
            fi
        done
    else
        echo -e "${RED}❌ Error: npm not found${NC}"
        errors=$((errors + 1))
    fi

    # Check for yarn (optional)
    if command -v yarn >/dev/null 2>&1; then
        local yarn_version=$(yarn --version)
        echo "🧶 Yarn: v$yarn_version (optional)"
    fi

    echo

    return $errors
}

# Function to validate project structure
validate_project_structure() {
    echo -e "${BLUE}📁 Project Structure Validation${NC}"
    echo "──────────────────────────────────"

    local errors=0
    local warnings=0

    # Essential files
    local essential_files=(
        "package.json"
        "next.config.mjs"
        "tsconfig.json"
        "tailwind.config.js"
        "postcss.config.js"
    )

    echo "📋 Essential Files:"
    for file in "${essential_files[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✅ $file"
        else
            echo -e "  ${RED}❌ $file${NC}"
            errors=$((errors + 1))
        fi
    done

    # Important directories
    local important_dirs=(
        "src"
        "public"
        "node_modules"
    )

    echo
    echo "📂 Important Directories:"
    for dir in "${important_dirs[@]}"; do
        if [ -d "$dir" ]; then
            echo "  ✅ $dir/"
        else
            echo -e "  ${YELLOW}⚠️  $dir/${NC}"
            if [ "$dir" = "node_modules" ]; then
                echo "     💡 Run 'npm install' to create"
            fi
            warnings=$((warnings + 1))
        fi
    done

    # Check for common problematic files
    local problematic_files=(
        ".env"
        ".env.local"
        "yarn.lock"
    )

    echo
    echo "🔍 Potential Issues:"
    local issues_found=false
    for file in "${problematic_files[@]}"; do
        if [ -f "$file" ]; then
            case "$file" in
                ".env"|".env.local")
                    echo -e "  ${YELLOW}⚠️  $file found (ensure it's in .gitignore)${NC}"
                    issues_found=true
                    ;;
                "yarn.lock")
                    if [ -f "package-lock.json" ]; then
                        echo -e "  ${YELLOW}⚠️  Both yarn.lock and package-lock.json found${NC}"
                        echo "     💡 Choose one package manager consistently"
                        issues_found=true
                    fi
                    ;;
            esac
        fi
    done

    if [ "$issues_found" = false ]; then
        echo "  ✅ No common issues detected"
    fi

    echo

    return $((errors + warnings))
}

# Function to validate package.json and dependencies
validate_dependencies() {
    echo -e "${BLUE}📦 Dependencies Validation${NC}"
    echo "──────────────────────────────────"

    local errors=0
    local warnings=0

    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        return 1
    fi

    # Parse package.json
    local project_name=$(grep '"name"' package.json | cut -d'"' -f4 || echo "unknown")
    local project_version=$(grep '"version"' package.json | cut -d'"' -f4 || echo "unknown")

    echo "📄 Project: $project_name v$project_version"
    log_message "INFO" "Project: $project_name v$project_version"

    # Check required dependencies
    local required_deps=("next" "react" "react-dom" "typescript")

    echo
    echo "🔍 Required Dependencies:"
    for dep in "${required_deps[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            local version=$(grep "\"$dep\"" package.json | cut -d'"' -f4)
            echo "  ✅ $dep: $version"
        else
            echo -e "  ${RED}❌ $dep: Missing${NC}"
            errors=$((errors + 1))
        fi
    done

    # Check for conflicting versions
    echo
    echo "🔄 Version Compatibility:"

    # React version compatibility
    local react_version=$(grep '"react"' package.json | cut -d'"' -f4 | sed 's/[^0-9.]//g' || echo "0")
    local react_dom_version=$(grep '"react-dom"' package.json | cut -d'"' -f4 | sed 's/[^0-9.]//g' || echo "0")

    if [ "$react_version" != "$react_dom_version" ]; then
        echo -e "  ${YELLOW}⚠️  React version mismatch: react@$react_version vs react-dom@$react_dom_version${NC}"
        warnings=$((warnings + 1))
    else
        echo "  ✅ React versions aligned: $react_version"
    fi

    # Next.js version check
    local next_version=$(grep '"next"' package.json | cut -d'"' -f4 | sed 's/[^0-9.]//g' || echo "0")
    local next_major=$(echo "$next_version" | cut -d'.' -f1)

    if [ "$next_major" -ge 14 ]; then
        echo "  ✅ Next.js version: $next_version (modern)"
    elif [ "$next_major" -ge 12 ]; then
        echo -e "  ${YELLOW}⚠️  Next.js version: $next_version (consider upgrading)${NC}"
        warnings=$((warnings + 1))
    else
        echo -e "  ${RED}❌ Next.js version: $next_version (too old)${NC}"
        errors=$((errors + 1))
    fi

    # Check for security vulnerabilities
    echo
    echo "🛡️  Security Check:"
    if command -v npm >/dev/null 2>&1; then
        if npm audit --audit-level=high >/dev/null 2>&1; then
            echo "  ✅ No high-severity vulnerabilities"
        else
            echo -e "  ${YELLOW}⚠️  Security vulnerabilities detected${NC}"
            echo "     💡 Run 'npm audit fix' to resolve"
            warnings=$((warnings + 1))
        fi
    fi

    echo

    return $((errors + warnings))
}

# Function to validate environment files
validate_environment_files() {
    echo -e "${BLUE}⚙️  Environment Configuration${NC}"
    echo "──────────────────────────────────"

    local warnings=0

    # Check for environment files
    local env_files=(".env" ".env.local" ".env.development" ".env.production" ".env.example")

    echo "📄 Environment Files:"
    for file in "${env_files[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✅ $file"

            # Check for common issues in env files
            case "$file" in
                ".env"|".env.local")
                    # Check if it's in .gitignore
                    if [ -f ".gitignore" ] && ! grep -q "^$file$" .gitignore; then
                        echo -e "    ${YELLOW}⚠️  $file should be in .gitignore${NC}"
                        warnings=$((warnings + 1))
                    fi

                    # Check for placeholder values
                    if grep -q "your-api-key\|placeholder\|example\|xxx" "$file"; then
                        echo -e "    ${YELLOW}⚠️  $file contains placeholder values${NC}"
                        warnings=$((warnings + 1))
                    fi
                    ;;
            esac
        else
            case "$file" in
                ".env.example")
                    echo -e "  ${YELLOW}⚠️  $file (recommended for documentation)${NC}"
                    ;;
                *)
                    echo "  ⏭️  $file (optional)"
                    ;;
            esac
        fi
    done

    # Validate .gitignore
    echo
    echo "🚫 .gitignore Validation:"
    if [ -f ".gitignore" ]; then
        local gitignore_items=(
            "node_modules"
            ".next"
            ".env.local"
            "*.log"
            ".DS_Store"
        )

        local missing_items=()
        for item in "${gitignore_items[@]}"; do
            if grep -q "^$item$\|^$item/\|$item" .gitignore; then
                echo "  ✅ $item"
            else
                echo -e "  ${YELLOW}⚠️  $item (missing)${NC}"
                missing_items+=("$item")
                warnings=$((warnings + 1))
            fi
        done

        if [ ${#missing_items[@]} -gt 0 ]; then
            echo
            echo -e "${YELLOW}💡 Consider adding to .gitignore:${NC}"
            for item in "${missing_items[@]}"; do
                echo "   $item"
            done
        fi
    else
        echo -e "  ${RED}❌ .gitignore not found${NC}"
        warnings=$((warnings + 1))
    fi

    echo

    return $warnings
}

# Function to validate development tools
validate_dev_tools() {
    echo -e "${BLUE}🛠️  Development Tools${NC}"
    echo "──────────────────────────────────"

    local warnings=0

    # Git
    if command -v git >/dev/null 2>&1; then
        local git_version=$(git --version | cut -d' ' -f3)
        echo "🔧 Git: v$git_version"

        # Check if we're in a git repository
        if git rev-parse --git-dir >/dev/null 2>&1; then
            echo "  ✅ Git repository initialized"

            # Check for uncommitted changes
            if ! git diff-index --quiet HEAD -- 2>/dev/null; then
                echo -e "  ${YELLOW}⚠️  Uncommitted changes detected${NC}"
                warnings=$((warnings + 1))
            fi
        else
            echo -e "  ${YELLOW}⚠️  Not a git repository${NC}"
            warnings=$((warnings + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Git not found${NC}"
        warnings=$((warnings + 1))
    fi

    # Code editor detection
    local editors=("code" "vim" "nvim" "nano" "emacs")
    local found_editor=false

    echo
    echo "📝 Available Editors:"
    for editor in "${editors[@]}"; do
        if command -v "$editor" >/dev/null 2>&1; then
            local version=""
            case "$editor" in
                "code")
                    version=" ($(code --version | head -1))"
                    ;;
            esac
            echo "  ✅ $editor$version"
            found_editor=true
        fi
    done

    if [ "$found_editor" = false ]; then
        echo -e "  ${YELLOW}⚠️  No common editors found${NC}"
        warnings=$((warnings + 1))
    fi

    # Browser detection (for development)
    echo
    echo "🌐 Available Browsers:"
    local browsers=("google-chrome" "chrome" "firefox" "safari")
    local found_browser=false

    for browser in "${browsers[@]}"; do
        if command -v "$browser" >/dev/null 2>&1; then
            echo "  ✅ $browser"
            found_browser=true
        fi
    done

    if [ "$found_browser" = false ]; then
        echo -e "  ${YELLOW}⚠️  No common browsers found${NC}"
        warnings=$((warnings + 1))
    fi

    echo

    return $warnings
}

# Function to perform network connectivity checks
validate_network() {
    echo -e "${BLUE}🌐 Network Connectivity${NC}"
    echo "──────────────────────────────────"

    local errors=0

    # Essential registries and CDNs
    local endpoints=(
        "registry.npmjs.org:npm registry"
        "github.com:GitHub"
        "fonts.googleapis.com:Google Fonts"
        "cdnjs.cloudflare.com:Cloudflare CDN"
    )

    echo "🔗 Testing Connectivity:"
    for endpoint in "${endpoints[@]}"; do
        local url=$(echo "$endpoint" | cut -d':' -f1)
        local name=$(echo "$endpoint" | cut -d':' -f2)

        if curl -Is "https://$url" --connect-timeout 10 >/dev/null 2>&1; then
            echo "  ✅ $name ($url)"
        else
            echo -e "  ${RED}❌ $name ($url)${NC}"
            errors=$((errors + 1))
        fi
    done

    # DNS resolution
    echo
    echo "🔍 DNS Resolution:"
    if nslookup google.com >/dev/null 2>&1; then
        echo "  ✅ DNS resolution working"
    else
        echo -e "  ${RED}❌ DNS resolution failed${NC}"
        errors=$((errors + 1))
    fi

    echo

    return $errors
}

# Function to generate validation report
generate_validation_report() {
    local total_errors="$1"
    local total_warnings="$2"

    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                     Validation Report                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

    if [ "$total_errors" -eq 0 ] && [ "$total_warnings" -eq 0 ]; then
        echo -e "${GREEN}🎉 Perfect! Environment is fully validated${NC}"
        log_message "INFO" "Environment validation passed with no issues"
    elif [ "$total_errors" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Environment validated with $total_warnings warning(s)${NC}"
        log_message "WARN" "Environment validation passed with $total_warnings warnings"
    else
        echo -e "${RED}❌ Environment validation failed with $total_errors error(s) and $total_warnings warning(s)${NC}"
        log_message "ERROR" "Environment validation failed with $total_errors errors and $total_warnings warnings"
    fi

    echo
    echo "📊 Summary:"
    echo "   Errors: $total_errors"
    echo "   Warnings: $total_warnings"
    echo "   Log: $VALIDATION_LOG"

    if [ "$total_errors" -gt 0 ]; then
        echo
        echo -e "${RED}🔧 Required Actions:${NC}"
        echo "   1. Fix all errors listed above"
        echo "   2. Re-run validation script"
        echo "   3. Proceed with development"
    elif [ "$total_warnings" -gt 0 ]; then
        echo
        echo -e "${YELLOW}💡 Recommended Actions:${NC}"
        echo "   1. Address warnings when possible"
        echo "   2. Development can proceed"
    else
        echo
        echo -e "${GREEN}🚀 Ready for Development!${NC}"
        echo "   ✅ All systems validated"
        echo "   ✅ Run: npm run dev or ./scripts/dev-optimized.sh"
    fi

    echo
    echo -e "${CYAN}📚 Next Steps:${NC}"
    echo "   • Development: ./scripts/dev-optimized.sh"
    echo "   • Monitoring: ./scripts/monitor-dev.sh"
    echo "   • Cleanup: ./scripts/cleanup-dev.sh"
    echo "   • Performance: ./scripts/performance-monitor.js"
}

# Function to show help
show_help() {
    echo "Environment Validation Script"
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --quick        Quick validation (skip network tests)"
    echo "  --system       System requirements only"
    echo "  --project      Project structure only"
    echo "  --deps         Dependencies only"
    echo "  --network      Network connectivity only"
    echo "  --help         Show this help message"
    echo ""
    echo "Default: Complete validation of all components"
}

# Main execution function
main() {
    echo -e "${MAGENTA}🔍 Environment Validation for Next.js Workshop${NC}"
    echo "Project: 6FB Methodologies Workshop"
    echo "Date: $(date)"
    echo

    log_message "INFO" "Environment validation started"

    local total_errors=0
    local total_warnings=0
    local option="${1:-full}"

    case "$option" in
        "--system")
            check_system_requirements
            total_errors=$((total_errors + $?))
            validate_nodejs_npm
            total_errors=$((total_errors + $?))
            ;;
        "--project")
            validate_project_structure
            total_warnings=$((total_warnings + $?))
            validate_environment_files
            total_warnings=$((total_warnings + $?))
            ;;
        "--deps")
            validate_dependencies
            total_warnings=$((total_warnings + $?))
            ;;
        "--network")
            validate_network
            total_errors=$((total_errors + $?))
            ;;
        "--quick")
            check_system_requirements
            total_errors=$((total_errors + $?))
            validate_nodejs_npm
            total_errors=$((total_errors + $?))
            validate_project_structure
            total_warnings=$((total_warnings + $?))
            validate_dependencies
            total_warnings=$((total_warnings + $?))
            validate_environment_files
            total_warnings=$((total_warnings + $?))
            ;;
        "--help")
            show_help
            exit 0
            ;;
        *)
            # Full validation
            check_system_requirements
            local sys_result=$?
            total_errors=$((total_errors + sys_result / 2))
            total_warnings=$((total_warnings + sys_result % 2))

            validate_nodejs_npm
            total_errors=$((total_errors + $?))

            validate_project_structure
            local proj_result=$?
            total_errors=$((total_errors + proj_result / 2))
            total_warnings=$((total_warnings + proj_result % 2))

            validate_dependencies
            local deps_result=$?
            total_errors=$((total_errors + deps_result / 2))
            total_warnings=$((total_warnings + deps_result % 2))

            validate_environment_files
            total_warnings=$((total_warnings + $?))

            validate_dev_tools
            total_warnings=$((total_warnings + $?))

            validate_network
            total_errors=$((total_errors + $?))
            ;;
    esac

    generate_validation_report "$total_errors" "$total_warnings"

    log_message "INFO" "Environment validation completed"

    # Exit with appropriate code
    if [ "$total_errors" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"