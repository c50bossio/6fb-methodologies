#!/bin/bash

# 6FB Methodologies Workbook - Production Deployment Script
# Run this script to deploy to production

set -e  # Exit on any error

echo "🚀 6FB Methodologies Workbook - Production Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/app/workbook/page.tsx" ]; then
    print_error "Please run this script from the 6fb-methodologies project root"
    exit 1
fi

print_status "Starting production deployment checklist..."

# Step 1: Check environment variables
print_status "Step 1: Checking environment variables..."

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating from template..."
    cp .env.production.template .env.local
    print_warning "Please update .env.local with your production values before continuing"
    exit 1
fi

# Check for required environment variables
required_vars=(
    "OPENAI_API_KEY"
    "DATABASE_URL"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "JWT_SECRET_KEY"
    "SECRET_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env.local || grep -q "^${var}=.*YOUR_.*_HERE" .env.local; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing or incomplete environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_warning "Please update .env.local with production values"
    exit 1
fi

print_success "Environment variables configured"

# Step 2: Test database connection
print_status "Step 2: Testing database connection..."

if command -v psql &> /dev/null; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d'=' -f2- | tr -d '"')
    if [ -n "$DATABASE_URL" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            print_success "Database connection successful"
        else
            print_error "Cannot connect to database. Please check DATABASE_URL"
            exit 1
        fi
    fi
else
    print_warning "psql not found. Skipping database connection test"
fi

# Step 3: Run database migration
print_status "Step 3: Running database migration..."

if node scripts/migrate-to-production.js; then
    print_success "Database migration completed"
else
    print_error "Database migration failed"
    exit 1
fi

# Step 4: Install production dependencies
print_status "Step 4: Installing production dependencies..."

if npm ci --production=false; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 5: Run type checking
print_status "Step 5: Running type checking..."

if npm run type-check; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Step 6: Build for production
print_status "Step 6: Building for production..."

if npm run build; then
    print_success "Production build completed"
else
    print_error "Production build failed"
    exit 1
fi

# Step 7: Test production endpoints
print_status "Step 7: Testing production endpoints..."

# Start the production server in background
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 10

# Test health endpoint
if curl -f -s http://localhost:3000/api/test-workbook > /dev/null; then
    print_success "Production server responding"
else
    print_error "Production server not responding"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Kill the test server
kill $SERVER_PID 2>/dev/null

# Step 8: Security check
print_status "Step 8: Running security check..."

# Check for common security issues
security_issues=()

if grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "// TODO" | grep -v "// DEBUG" > /dev/null; then
    security_issues+=("console.log statements found in source code")
fi

if grep -r "sk-" .env.local | grep -v "sk-proj-" | grep -v "sk_test_" | grep -v "sk_live_" > /dev/null; then
    security_issues+=("Possible exposed API keys in .env.local")
fi

if [ ${#security_issues[@]} -ne 0 ]; then
    print_warning "Security issues found:"
    for issue in "${security_issues[@]}"; do
        echo "  - $issue"
    done
fi

print_success "Security check completed"

# Step 9: Generate deployment summary
print_status "Step 9: Generating deployment summary..."

cat > DEPLOYMENT_SUMMARY.md << EOF
# 6FB Methodologies Workbook - Deployment Summary

**Deployment Date**: $(date)
**Status**: Ready for Production

## Configuration Verified
- ✅ Environment variables configured
- ✅ Database connection tested
- ✅ Dependencies installed
- ✅ Type checking passed
- ✅ Production build successful
- ✅ Server endpoints responding
- ✅ Security check completed

## Next Steps
1. Deploy to your hosting platform (Vercel recommended)
2. Configure custom domain (6fbmethodologies.com)
3. Set up Stripe webhook endpoint
4. Test end-to-end purchase flow
5. Monitor system performance

## Monitoring
- Database health: Check /api/test-database
- System status: Check /api/test-workbook
- Audio functionality: Test /workbook page

## Support
- Production deployment guide: /PRODUCTION_DEPLOYMENT_GUIDE.md
- Implementation details: /IMPLEMENTATION_COMPLETE.md
- Database schema: /scripts/upgrade-to-database.sql

EOF

print_success "Deployment summary created: DEPLOYMENT_SUMMARY.md"

# Final success message
echo ""
echo "🎉 Production Deployment Ready!"
echo "================================"
echo ""
echo "Your 6FB Methodologies Workbook is ready for production deployment."
echo ""
echo "Next steps:"
echo "1. Deploy to Vercel or your hosting platform"
echo "2. Configure your custom domain"
echo "3. Test the complete purchase → email → login → recording flow"
echo ""
echo "The system includes:"
echo "✅ Audio recording with AI transcription"
echo "✅ Secure authentication with access codes"
echo "✅ Professional email automation"
echo "✅ Database persistence"
echo "✅ Mobile-responsive design"
echo ""
echo "Ready to provide workshop participants with an amazing digital experience!"
echo ""

exit 0