#!/bin/bash

# Vercel Deployment Script for 6FB Methodologies Workshop
# This script deploys the Next.js application to Vercel with proper environment configuration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_NAME="6fb-methodologies-workshop"
LOG_FILE="logs/vercel-deployment.log"

# Create logs directory
mkdir -p logs

# Function to log with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

echo -e "${BLUE}🚀 6FB Methodologies Workshop - Vercel Deployment${NC}"
echo "=================================================="
echo

# Check if Vercel CLI is installed
if ! command -v vercel >/dev/null 2>&1; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI installed${NC}"
else
    echo -e "${GREEN}✅ Vercel CLI found${NC}"
fi

# Check Vercel CLI version
VERCEL_VERSION=$(vercel --version)
echo "Vercel CLI Version: $VERCEL_VERSION"
log_message "INFO" "Vercel CLI version: $VERCEL_VERSION"

echo

# Function to setup production environment variables
setup_env_variables() {
    echo -e "${BLUE}🔧 Setting up Environment Variables${NC}"
    echo "------------------------------------"

    # Production environment variables (replace with actual values)
    echo "Setting up production environment variables..."

    # Stripe Configuration
    vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
    vercel env add STRIPE_SECRET_KEY production
    vercel env add STRIPE_WEBHOOK_SECRET production
    vercel env add STRIPE_WORKSHOP_GA_PRICE_ID production
    vercel env add STRIPE_WORKSHOP_VIP_PRICE_ID production

    # SendGrid Configuration
    vercel env add SENDGRID_API_KEY production
    vercel env add SENDGRID_FROM_EMAIL production
    vercel env add SENDGRID_TEMPLATE_WELCOME production
    vercel env add SENDGRID_TEMPLATE_CONFIRMATION production

    # Analytics Configuration
    vercel env add NEXT_PUBLIC_GA4_MEASUREMENT_ID production
    vercel env add GA4_API_SECRET production
    vercel env add NEXT_PUBLIC_FACEBOOK_PIXEL_ID production
    vercel env add FACEBOOK_ACCESS_TOKEN production
    vercel env add NEXT_PUBLIC_GTM_ID production
    vercel env add NEXT_PUBLIC_HOTJAR_ID production

    # Workshop Configuration
    vercel env add WORKSHOP_DATE_1 production
    vercel env add WORKSHOP_LOCATION production
    vercel env add WORKSHOP_TIMEZONE production

    # Security Configuration
    vercel env add JWT_SECRET production
    vercel env add ENCRYPTION_KEY production

    echo -e "${GREEN}✅ Environment variables configured${NC}"
    log_message "INFO" "Production environment variables configured"
}

# Function to validate build
validate_build() {
    echo -e "${BLUE}🔍 Validating Build${NC}"
    echo "-------------------"

    echo "Running TypeScript type check..."
    if npm run type-check; then
        echo -e "${GREEN}✅ TypeScript validation passed${NC}"
        log_message "INFO" "TypeScript validation passed"
    else
        echo -e "${RED}❌ TypeScript validation failed${NC}"
        log_message "ERROR" "TypeScript validation failed"
        exit 1
    fi

    echo "Running ESLint check..."
    if npm run lint; then
        echo -e "${GREEN}✅ ESLint validation passed${NC}"
        log_message "INFO" "ESLint validation passed"
    else
        echo -e "${RED}❌ ESLint validation failed${NC}"
        log_message "ERROR" "ESLint validation failed"
        exit 1
    fi

    echo "Testing build process..."
    if npm run build; then
        echo -e "${GREEN}✅ Build process successful${NC}"
        log_message "INFO" "Build process successful"
    else
        echo -e "${RED}❌ Build process failed${NC}"
        log_message "ERROR" "Build process failed"
        exit 1
    fi
}

# Function to deploy to preview
deploy_preview() {
    echo -e "${BLUE}🔄 Deploying Preview${NC}"
    echo "--------------------"

    echo "Deploying to preview environment..."
    PREVIEW_URL=$(vercel --yes 2>&1 | grep -o 'https://[^ ]*')

    if [ $? -eq 0 ] && [ -n "$PREVIEW_URL" ]; then
        echo -e "${GREEN}✅ Preview deployment successful${NC}"
        echo -e "${CYAN}Preview URL: $PREVIEW_URL${NC}"
        log_message "INFO" "Preview deployment successful: $PREVIEW_URL"

        # Test preview deployment
        echo "Testing preview deployment..."
        if curl -s -o /dev/null -w "%{http_code}" "$PREVIEW_URL" | grep -q "200"; then
            echo -e "${GREEN}✅ Preview site is responding${NC}"
            log_message "INFO" "Preview site health check passed"
        else
            echo -e "${YELLOW}⚠️ Preview site may not be fully ready${NC}"
            log_message "WARN" "Preview site health check failed"
        fi

        return 0
    else
        echo -e "${RED}❌ Preview deployment failed${NC}"
        log_message "ERROR" "Preview deployment failed"
        return 1
    fi
}

# Function to deploy to production
deploy_production() {
    echo -e "${BLUE}🚀 Deploying to Production${NC}"
    echo "----------------------------"

    echo "Deploying to production environment..."
    PRODUCTION_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*')

    if [ $? -eq 0 ] && [ -n "$PRODUCTION_URL" ]; then
        echo -e "${GREEN}✅ Production deployment successful${NC}"
        echo -e "${CYAN}Production URL: $PRODUCTION_URL${NC}"
        log_message "INFO" "Production deployment successful: $PRODUCTION_URL"

        # Test production deployment
        echo "Testing production deployment..."
        sleep 10 # Give time for deployment to propagate

        if curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" | grep -q "200"; then
            echo -e "${GREEN}✅ Production site is live and responding${NC}"
            log_message "INFO" "Production site health check passed"
        else
            echo -e "${YELLOW}⚠️ Production site may not be fully ready${NC}"
            log_message "WARN" "Production site health check failed"
        fi

        return 0
    else
        echo -e "${RED}❌ Production deployment failed${NC}"
        log_message "ERROR" "Production deployment failed"
        return 1
    fi
}

# Function to setup custom domain
setup_domain() {
    echo -e "${BLUE}🌐 Setting up Custom Domain${NC}"
    echo "----------------------------"

    local domain="6fbmethodologies.com"

    echo "Adding custom domain: $domain"
    if vercel domains add "$domain" --yes; then
        echo -e "${GREEN}✅ Custom domain added${NC}"
        log_message "INFO" "Custom domain added: $domain"

        # Add domain to project
        echo "Linking domain to project..."
        if vercel alias set "$PRODUCTION_URL" "$domain"; then
            echo -e "${GREEN}✅ Domain linked to production${NC}"
            echo -e "${CYAN}Your workshop is now live at: https://$domain${NC}"
            log_message "INFO" "Domain linked successfully"
        else
            echo -e "${YELLOW}⚠️ Domain linking may require manual configuration${NC}"
            log_message "WARN" "Domain linking failed - manual configuration required"
        fi
    else
        echo -e "${YELLOW}⚠️ Custom domain setup may require manual configuration${NC}"
        log_message "WARN" "Custom domain setup requires manual configuration"
    fi
}

# Function to configure webhooks
configure_webhooks() {
    echo -e "${BLUE}🪝 Configuring Webhooks${NC}"
    echo "-------------------------"

    echo "Webhook endpoints that need configuration:"
    echo "• Stripe Webhook: https://6fbmethodologies.com/api/webhooks/stripe"
    echo "• SendGrid Event Webhook: https://6fbmethodologies.com/api/webhooks/sendgrid"

    echo
    echo "Manual webhook configuration required:"
    echo "1. Stripe Dashboard → Webhooks → Add endpoint"
    echo "   - URL: https://6fbmethodologies.com/api/webhooks/stripe"
    echo "   - Events: checkout.session.completed, payment_intent.succeeded"

    echo "2. SendGrid Dashboard → Mail Settings → Event Webhook"
    echo "   - URL: https://6fbmethodologies.com/api/webhooks/sendgrid"
    echo "   - Events: delivered, opened, clicked, bounced"

    log_message "INFO" "Webhook configuration instructions provided"
}

# Function to show deployment summary
show_summary() {
    echo
    echo -e "${GREEN}🎉 Deployment Summary${NC}"
    echo "====================="
    echo
    echo -e "${CYAN}Production URL: ${PRODUCTION_URL:-'Pending'}${NC}"
    echo -e "${CYAN}Custom Domain: https://6fbmethodologies.com${NC}"
    echo
    echo "✅ Features Deployed:"
    echo "  • Complete workshop registration system"
    echo "  • Stripe payment processing"
    echo "  • SendGrid email automation"
    echo "  • Google Analytics & Facebook Pixel tracking"
    echo "  • Mobile-responsive design"
    echo "  • Security headers and CSP"
    echo
    echo "📋 Next Steps:"
    echo "  1. Configure webhook endpoints in Stripe and SendGrid"
    echo "  2. Add actual API keys to Vercel environment variables"
    echo "  3. Test payment flows end-to-end"
    echo "  4. Monitor analytics and email delivery"
    echo
    echo "📊 Monitoring:"
    echo "  • Vercel Analytics: https://vercel.com/analytics"
    echo "  • Google Analytics: https://analytics.google.com"
    echo "  • SendGrid Dashboard: https://app.sendgrid.com"
    echo
    echo -e "${GREEN}🚀 Your 6FB Methodologies Workshop is now LIVE!${NC}"
}

# Main execution
case "${1:-deploy}" in
    "env")
        setup_env_variables
        ;;
    "validate")
        validate_build
        ;;
    "preview")
        validate_build
        deploy_preview
        ;;
    "production"|"prod")
        validate_build
        deploy_production
        configure_webhooks
        show_summary
        ;;
    "domain")
        setup_domain
        ;;
    "deploy")
        echo "Choose deployment type:"
        echo "1. Preview deployment (for testing)"
        echo "2. Production deployment (live site)"
        echo -n "Enter choice [1-2]: "
        read choice

        case $choice in
            1)
                validate_build
                deploy_preview
                ;;
            2)
                validate_build
                deploy_production
                setup_domain
                configure_webhooks
                show_summary
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                exit 1
                ;;
        esac
        ;;
    "help")
        echo "Vercel Deployment Script Usage:"
        echo "  $0 env        Setup environment variables"
        echo "  $0 validate   Validate build without deploying"
        echo "  $0 preview    Deploy to preview environment"
        echo "  $0 prod       Deploy to production"
        echo "  $0 domain     Setup custom domain"
        echo "  $0 deploy     Interactive deployment"
        echo "  $0 help       Show this help"
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

log_message "INFO" "Deployment script completed successfully"
echo
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo "Check the log file for details: $LOG_FILE"