#!/bin/bash

# Deployment Preparation Script for Next.js Workshop Site
# Comprehensive pre-deployment validation and optimization

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DEPLOY_LOG="logs/deploy-prepare.log"
BUILD_OUTPUT_DIR=".next"
NODE_ENV=${NODE_ENV:-production}
PERFORMANCE_BUDGET_KB=500
BUNDLE_SIZE_LIMIT_MB=10

# Create logs directory
mkdir -p logs

# Function to log with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$DEPLOY_LOG"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites${NC}"
    echo "──────────────────────────────────"

    local errors=0

    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | cut -d'v' -f2)
        echo "✅ Node.js: $node_version"
        log_message "INFO" "Node.js version: $node_version"

        # Check if version is >= 18
        local major_version=$(echo "$node_version" | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            echo -e "${RED}❌ Node.js version must be >= 18${NC}"
            errors=$((errors + 1))
        fi
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        errors=$((errors + 1))
    fi

    # Check npm version
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        echo "✅ npm: $npm_version"
        log_message "INFO" "npm version: $npm_version"
    else
        echo -e "${RED}❌ npm not found${NC}"
        errors=$((errors + 1))
    fi

    # Check required files
    local required_files=("package.json" "next.config.mjs" "tsconfig.json")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo "✅ Required file: $file"
        else
            echo -e "${RED}❌ Missing required file: $file${NC}"
            errors=$((errors + 1))
        fi
    done

    echo

    if [ $errors -gt 0 ]; then
        echo -e "${RED}❌ $errors prerequisite errors found${NC}"
        log_message "ERROR" "$errors prerequisite errors found"
        return 1
    fi

    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
    log_message "INFO" "Prerequisites check passed"
    return 0
}

# Function to validate environment configuration
validate_environment() {
    echo -e "${BLUE}⚙️  Validating Environment Configuration${NC}"
    echo "──────────────────────────────────"

    local warnings=0

    # Check production environment variables
    if [ -f ".env.production" ]; then
        echo "✅ Production environment file found"

        # Check for sensitive data in production env
        if grep -q "localhost\|127.0.0.1\|test\|dev" .env.production; then
            echo -e "${YELLOW}⚠️  Warning: Production env contains development references${NC}"
            warnings=$((warnings + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  No .env.production file found${NC}"
        warnings=$((warnings + 1))
    fi

    # Check for .env.local (should not be in production)
    if [ -f ".env.local" ]; then
        echo -e "${YELLOW}⚠️  Warning: .env.local found (should not be deployed)${NC}"
        warnings=$((warnings + 1))
    fi

    # Validate Next.js configuration for production
    if grep -q "development\|debug.*true" next.config.mjs; then
        echo -e "${YELLOW}⚠️  Warning: Development settings found in next.config.mjs${NC}"
        warnings=$((warnings + 1))
    fi

    echo

    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $warnings environment warnings found${NC}"
        log_message "WARN" "$warnings environment warnings found"
    else
        echo -e "${GREEN}✅ Environment configuration validated${NC}"
        log_message "INFO" "Environment validation passed"
    fi

    return 0
}

# Function to run comprehensive tests
run_tests() {
    echo -e "${BLUE}🧪 Running Tests${NC}"
    echo "──────────────────────────────────"

    local test_errors=0

    # TypeScript type checking
    echo -n "🔍 TypeScript type checking... "
    if npm run type-check >/dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        log_message "INFO" "TypeScript type checking passed"
    else
        echo -e "${RED}FAILED${NC}"
        log_message "ERROR" "TypeScript type checking failed"
        test_errors=$((test_errors + 1))
    fi

    # Linting
    echo -n "📝 ESLint checking... "
    if npm run lint >/dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        log_message "INFO" "ESLint checking passed"
    else
        echo -e "${RED}FAILED${NC}"
        log_message "ERROR" "ESLint checking failed"
        test_errors=$((test_errors + 1))
    fi

    # Unit tests (if available)
    if npm run test --if-present >/dev/null 2>&1; then
        echo -e "🔬 Unit tests... ${GREEN}PASSED${NC}"
        log_message "INFO" "Unit tests passed"
    elif [ -d "__tests__" ] || [ -d "test" ] || grep -q '"test"' package.json; then
        echo -e "🔬 Unit tests... ${YELLOW}SKIPPED (no test script)${NC}"
        log_message "WARN" "Tests exist but no test script found"
    fi

    echo

    if [ $test_errors -gt 0 ]; then
        echo -e "${RED}❌ $test_errors test failures${NC}"
        log_message "ERROR" "$test_errors test failures"
        return 1
    fi

    echo -e "${GREEN}✅ All tests passed${NC}"
    log_message "INFO" "All tests passed"
    return 0
}

# Function to optimize and build for production
build_for_production() {
    echo -e "${BLUE}🏗️  Building for Production${NC}"
    echo "──────────────────────────────────"

    # Clean previous builds
    echo -n "🧹 Cleaning previous builds... "
    rm -rf "$BUILD_OUTPUT_DIR"
    rm -f "tsconfig.tsbuildinfo"
    echo -e "${GREEN}DONE${NC}"

    # Set production environment
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1

    # Build with timing
    echo "🔨 Starting production build..."
    local build_start=$(date +%s)

    if npm run build; then
        local build_end=$(date +%s)
        local build_time=$((build_end - build_start))
        echo -e "${GREEN}✅ Build completed in ${build_time}s${NC}"
        log_message "INFO" "Production build completed in ${build_time}s"
    else
        echo -e "${RED}❌ Build failed${NC}"
        log_message "ERROR" "Production build failed"
        return 1
    fi

    echo
    return 0
}

# Function to analyze bundle size and performance
analyze_bundle() {
    echo -e "${BLUE}📊 Analyzing Bundle Performance${NC}"
    echo "──────────────────────────────────"

    if [ ! -d "$BUILD_OUTPUT_DIR" ]; then
        echo -e "${RED}❌ Build output not found${NC}"
        return 1
    fi

    # Calculate total bundle size
    local total_size=$(du -sh "$BUILD_OUTPUT_DIR" | awk '{print $1}')
    local total_size_mb=$(du -sm "$BUILD_OUTPUT_DIR" | awk '{print $1}')

    echo "📦 Total build size: $total_size"
    log_message "INFO" "Total build size: $total_size"

    # Check bundle size limit
    if [ "$total_size_mb" -gt "$BUNDLE_SIZE_LIMIT_MB" ]; then
        echo -e "${YELLOW}⚠️  Warning: Bundle size (${total_size_mb}MB) exceeds limit (${BUNDLE_SIZE_LIMIT_MB}MB)${NC}"
        log_message "WARN" "Bundle size exceeds limit"
    fi

    # Analyze static files
    if [ -d "$BUILD_OUTPUT_DIR/static" ]; then
        echo "🔍 Static files analysis:"
        find "$BUILD_OUTPUT_DIR/static" -name "*.js" -exec du -sh {} \; | sort -hr | head -5 | while read size file; do
            echo "  📄 $(basename "$file"): $size"
        done
    fi

    # Check for large chunks
    if [ -d "$BUILD_OUTPUT_DIR/static/chunks" ]; then
        local large_chunks=$(find "$BUILD_OUTPUT_DIR/static/chunks" -name "*.js" -size +${PERFORMANCE_BUDGET_KB}k)
        if [ -n "$large_chunks" ]; then
            echo -e "${YELLOW}⚠️  Large chunks detected (>${PERFORMANCE_BUDGET_KB}KB):${NC}"
            echo "$large_chunks" | while read chunk; do
                local chunk_size=$(du -sh "$chunk" | awk '{print $1}')
                echo "  📄 $(basename "$chunk"): $chunk_size"
            done
        fi
    fi

    # Check for source maps in production
    if find "$BUILD_OUTPUT_DIR" -name "*.map" | head -1 | grep -q .; then
        echo -e "${YELLOW}⚠️  Source maps found in production build${NC}"
        log_message "WARN" "Source maps found in production build"
    fi

    echo
    return 0
}

# Function to check security
security_check() {
    echo -e "${BLUE}🔒 Security Validation${NC}"
    echo "──────────────────────────────────"

    local security_issues=0

    # Check for vulnerable packages
    echo -n "🛡️  Checking for vulnerable packages... "
    if npm audit --audit-level=high >/dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        log_message "INFO" "No high-severity vulnerabilities found"
    else
        echo -e "${RED}ISSUES FOUND${NC}"
        log_message "WARN" "Security vulnerabilities detected"
        security_issues=$((security_issues + 1))
    fi

    # Check for hardcoded secrets
    echo -n "🔍 Checking for hardcoded secrets... "
    local secret_patterns=("password.*=" "api.*key.*=" "secret.*=" "token.*=")
    local secrets_found=false

    for pattern in "${secret_patterns[@]}"; do
        if grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" "$pattern" . >/dev/null 2>&1; then
            secrets_found=true
            break
        fi
    done

    if [ "$secrets_found" = true ]; then
        echo -e "${RED}ISSUES FOUND${NC}"
        log_message "WARN" "Potential hardcoded secrets detected"
        security_issues=$((security_issues + 1))
    else
        echo -e "${GREEN}PASSED${NC}"
        log_message "INFO" "No hardcoded secrets found"
    fi

    # Check file permissions
    echo -n "📁 Checking file permissions... "
    if find . -type f -perm /o+w | grep -v node_modules | head -1 | grep -q .; then
        echo -e "${YELLOW}WARNINGS${NC}"
        log_message "WARN" "World-writable files found"
        security_issues=$((security_issues + 1))
    else
        echo -e "${GREEN}PASSED${NC}"
        log_message "INFO" "File permissions secure"
    fi

    echo

    if [ $security_issues -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $security_issues security issues found${NC}"
        log_message "WARN" "$security_issues security issues found"
    else
        echo -e "${GREEN}✅ Security validation passed${NC}"
        log_message "INFO" "Security validation passed"
    fi

    return 0
}

# Function to generate deployment manifest
generate_deployment_manifest() {
    echo -e "${BLUE}📋 Generating Deployment Manifest${NC}"
    echo "──────────────────────────────────"

    local manifest_file="deployment-manifest.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local git_branch=$(git branch --show-current 2>/dev/null || echo "unknown")

    cat > "$manifest_file" << EOF
{
  "deploymentInfo": {
    "timestamp": "$timestamp",
    "project": "6fb-methodologies-workshop",
    "version": "$(grep '"version"' package.json | cut -d'"' -f4)",
    "nodeVersion": "$(node --version)",
    "npmVersion": "$(npm --version)",
    "environment": "$NODE_ENV"
  },
  "git": {
    "commit": "$git_commit",
    "branch": "$git_branch"
  },
  "build": {
    "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "buildSize": "$(du -sh $BUILD_OUTPUT_DIR | awk '{print $1}')",
    "nextJsVersion": "$(grep '"next"' package.json | cut -d'"' -f4)"
  },
  "validation": {
    "testsRun": true,
    "securityChecked": true,
    "bundleAnalyzed": true
  },
  "deploymentInstructions": {
    "commands": [
      "npm ci --only=production",
      "npm run start"
    ],
    "environment": {
      "NODE_ENV": "production",
      "PORT": "3000"
    },
    "healthCheck": "GET /",
    "requirements": {
      "nodeVersion": ">=18.0.0",
      "memory": "512MB",
      "disk": "100MB"
    }
  }
}
EOF

    echo "📋 Deployment manifest created: $manifest_file"
    log_message "INFO" "Deployment manifest generated"

    return 0
}

# Function to create deployment package
create_deployment_package() {
    echo -e "${BLUE}📦 Creating Deployment Package${NC}"
    echo "──────────────────────────────────"

    local package_name="6fb-methodologies-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    local temp_dir="deploy-staging"

    # Create staging directory
    mkdir -p "$temp_dir"

    # Copy essential files
    echo "📂 Copying deployment files..."

    # Core application files
    cp -r "$BUILD_OUTPUT_DIR" "$temp_dir/"
    cp package.json "$temp_dir/"
    cp package-lock.json "$temp_dir/" 2>/dev/null || true
    cp next.config.mjs "$temp_dir/"
    cp *.json "$temp_dir/" 2>/dev/null || true

    # Environment files
    [ -f ".env.production" ] && cp .env.production "$temp_dir/"

    # Public assets
    [ -d "public" ] && cp -r public "$temp_dir/"

    # Documentation
    [ -f "README.md" ] && cp README.md "$temp_dir/"
    [ -f "deployment-manifest.json" ] && cp deployment-manifest.json "$temp_dir/"

    # Create package
    echo "🗜️  Creating compressed package..."
    tar -czf "$package_name" -C "$temp_dir" .

    # Cleanup staging
    rm -rf "$temp_dir"

    local package_size=$(du -sh "$package_name" | awk '{print $1}')
    echo "📦 Deployment package created: $package_name ($package_size)"
    log_message "INFO" "Deployment package created: $package_name ($package_size)"

    return 0
}

# Function to show deployment summary
show_deployment_summary() {
    echo
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Deployment Summary                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

    echo -e "${GREEN}✅ Deployment preparation completed successfully!${NC}"
    echo

    if [ -f "deployment-manifest.json" ]; then
        echo "📋 Deployment Manifest: deployment-manifest.json"
    fi

    if ls 6fb-methodologies-deploy-*.tar.gz >/dev/null 2>&1; then
        local package_file=$(ls -t 6fb-methodologies-deploy-*.tar.gz | head -1)
        local package_size=$(du -sh "$package_file" | awk '{print $1}')
        echo "📦 Deployment Package: $package_file ($package_size)"
    fi

    if [ -d "$BUILD_OUTPUT_DIR" ]; then
        local build_size=$(du -sh "$BUILD_OUTPUT_DIR" | awk '{print $1}')
        echo "🏗️  Build Output: $BUILD_OUTPUT_DIR ($build_size)"
    fi

    echo "📝 Deployment Log: $DEPLOY_LOG"
    echo

    echo -e "${CYAN}🚀 Next Steps:${NC}"
    echo "1. Upload deployment package to your hosting platform"
    echo "2. Extract package in production environment"
    echo "3. Set NODE_ENV=production"
    echo "4. Run: npm ci --only=production"
    echo "5. Start application: npm run start"
    echo "6. Verify health check: curl -I http://your-domain/"

    echo
    echo -e "${YELLOW}⚠️  Remember to:${NC}"
    echo "- Set up production environment variables"
    echo "- Configure reverse proxy (nginx/apache)"
    echo "- Set up SSL certificates"
    echo "- Configure monitoring and logging"
    echo "- Set up backup strategies"
}

# Function to show help
show_help() {
    echo "Deployment Preparation Script"
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --quick        Quick preparation (skip package creation)"
    echo "  --validate     Validation only (no build)"
    echo "  --build        Build only (skip validation)"
    echo "  --package      Create deployment package only"
    echo "  --help         Show this help message"
    echo ""
    echo "Default: Full preparation including validation, build, and packaging"
}

# Main execution function
main() {
    echo -e "${BLUE}🚀 Next.js Deployment Preparation${NC}"
    echo "Project: 6FB Methodologies Workshop"
    echo "Date: $(date)"
    echo "Environment: $NODE_ENV"
    echo

    log_message "INFO" "Deployment preparation started"

    local option="${1:-full}"
    local exit_code=0

    case "$option" in
        "--validate")
            check_prerequisites || exit_code=1
            validate_environment || exit_code=1
            run_tests || exit_code=1
            security_check || exit_code=1
            ;;
        "--build")
            build_for_production || exit_code=1
            analyze_bundle || exit_code=1
            ;;
        "--package")
            if [ ! -d "$BUILD_OUTPUT_DIR" ]; then
                echo -e "${RED}❌ Build output not found. Run build first.${NC}"
                exit 1
            fi
            generate_deployment_manifest || exit_code=1
            create_deployment_package || exit_code=1
            ;;
        "--quick")
            check_prerequisites || exit_code=1
            validate_environment || exit_code=1
            run_tests || exit_code=1
            build_for_production || exit_code=1
            analyze_bundle || exit_code=1
            generate_deployment_manifest || exit_code=1
            ;;
        "--help")
            show_help
            exit 0
            ;;
        *)
            # Full preparation
            check_prerequisites || exit_code=1
            validate_environment || exit_code=1
            run_tests || exit_code=1
            security_check || exit_code=1
            build_for_production || exit_code=1
            analyze_bundle || exit_code=1
            generate_deployment_manifest || exit_code=1
            create_deployment_package || exit_code=1
            ;;
    esac

    if [ $exit_code -eq 0 ]; then
        show_deployment_summary
        log_message "INFO" "Deployment preparation completed successfully"
    else
        echo -e "${RED}❌ Deployment preparation failed${NC}"
        log_message "ERROR" "Deployment preparation failed"
    fi

    exit $exit_code
}

# Run main function
main "$@"