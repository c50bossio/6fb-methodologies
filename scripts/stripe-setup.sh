#!/bin/bash

# Stripe CLI Setup Script for 6FB Methodologies Workshop
# This script helps set up Stripe CLI for development and production webhook testing

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
WEBHOOK_ENDPOINT="localhost:3000/api/webhooks/stripe"
LOG_FILE="logs/stripe-setup.log"

# Create logs directory
mkdir -p logs

# Function to log with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

echo -e "${BLUE}🔐 6FB Methodologies Workshop - Stripe CLI Setup${NC}"
echo "=================================================="
echo

# Check if Stripe CLI is installed
if ! command -v stripe >/dev/null 2>&1; then
    echo -e "${RED}❌ Stripe CLI not found${NC}"
    echo -e "${YELLOW}Installing Stripe CLI...${NC}"

    # Install on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew >/dev/null 2>&1; then
            echo "Installing via Homebrew..."
            brew install stripe/stripe-cli/stripe
        else
            echo -e "${RED}Homebrew not found. Please install manually from: https://stripe.com/docs/stripe-cli${NC}"
            exit 1
        fi
    # Install on Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Installing via package manager..."
        curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
        echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
        sudo apt update
        sudo apt install stripe
    else
        echo -e "${RED}Unsupported OS. Please install manually from: https://stripe.com/docs/stripe-cli${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Stripe CLI found${NC}"
fi

# Check Stripe CLI version
STRIPE_VERSION=$(stripe version)
echo "Stripe CLI Version: $STRIPE_VERSION"
log_message "INFO" "Stripe CLI version: $STRIPE_VERSION"

echo

# Function to setup development environment
setup_development() {
    echo -e "${BLUE}🔧 Setting up Development Environment${NC}"
    echo "---------------------------------------"

    # Login to Stripe
    echo -e "${YELLOW}Please login to your Stripe account...${NC}"
    stripe login

    # Test connection
    echo -n "Testing Stripe connection... "
    if stripe customers list --limit 1 >/dev/null 2>&1; then
        echo -e "${GREEN}CONNECTED${NC}"
        log_message "INFO" "Stripe CLI connected successfully"
    else
        echo -e "${RED}FAILED${NC}"
        log_message "ERROR" "Stripe CLI connection failed"
        exit 1
    fi

    echo
    echo -e "${CYAN}🪝 Webhook Configuration${NC}"
    echo "Configure webhooks for local development:"
    echo
    echo "1. Run this command in a separate terminal:"
    echo -e "${YELLOW}   stripe listen --forward-to $WEBHOOK_ENDPOINT${NC}"
    echo
    echo "2. Copy the webhook signing secret (whsec_xxx) and add to .env.local:"
    echo -e "${YELLOW}   STRIPE_WEBHOOK_SECRET=whsec_xxx${NC}"
    echo
    echo "3. Test webhook events:"
    echo -e "${YELLOW}   stripe trigger checkout.session.completed${NC}"
    echo -e "${YELLOW}   stripe trigger payment_intent.succeeded${NC}"
    echo

    # Create webhook forwarding script
    cat > scripts/stripe-listen.sh << 'EOF'
#!/bin/bash
echo "🪝 Starting Stripe webhook forwarding..."
echo "Forwarding webhooks to: localhost:3000/api/webhooks/stripe"
echo "Press Ctrl+C to stop"
echo
stripe listen --forward-to localhost:3000/api/webhooks/stripe
EOF

    chmod +x scripts/stripe-listen.sh
    echo -e "${GREEN}✅ Created webhook forwarding script: scripts/stripe-listen.sh${NC}"

    log_message "INFO" "Development environment setup completed"
}

# Function to setup production environment
setup_production() {
    echo -e "${BLUE}🚀 Setting up Production Environment${NC}"
    echo "---------------------------------------"

    echo "Production webhook configuration:"
    echo
    echo "1. Go to: https://dashboard.stripe.com/webhooks"
    echo "2. Click 'Add endpoint'"
    echo "3. Enter endpoint URL: https://6fbmethodologies.com/api/webhooks/stripe"
    echo "4. Select events to send:"
    echo "   • checkout.session.completed"
    echo "   • payment_intent.succeeded"
    echo "   • payment_intent.payment_failed"
    echo "   • invoice.payment_succeeded"
    echo "   • customer.subscription.created"
    echo "5. Copy the webhook signing secret and add to production environment"
    echo

    # Create production webhook verification script
    cat > scripts/verify-production-webhook.sh << 'EOF'
#!/bin/bash
echo "🔍 Testing production webhook endpoint..."

# Test webhook endpoint accessibility
WEBHOOK_URL="https://6fbmethodologies.com/api/webhooks/stripe"
echo "Testing endpoint: $WEBHOOK_URL"

if curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" | grep -q "405\|200"; then
    echo "✅ Webhook endpoint is accessible"
else
    echo "❌ Webhook endpoint is not accessible"
    exit 1
fi

echo "🎯 Send a test event from Stripe Dashboard to verify webhook processing"
EOF

    chmod +x scripts/verify-production-webhook.sh
    echo -e "${GREEN}✅ Created production verification script: scripts/verify-production-webhook.sh${NC}"

    log_message "INFO" "Production environment setup completed"
}

# Function to create sample products and prices
setup_stripe_products() {
    echo -e "${BLUE}📦 Setting up Stripe Products${NC}"
    echo "------------------------------"

    # Check if already logged in
    if ! stripe customers list --limit 1 >/dev/null 2>&1; then
        echo -e "${YELLOW}Please login to Stripe first${NC}"
        stripe login
    fi

    # Create GA Workshop Product
    echo "Creating GA Workshop product..."
    GA_PRODUCT=$(stripe products create \
        --name "6FB Methodologies Workshop - General Admission" \
        --description "Complete workshop access with all core content and materials" \
        --metadata[type]="workshop_ticket" \
        --metadata[tier]="GA" \
        --active \
        --output json)

    GA_PRODUCT_ID=$(echo "$GA_PRODUCT" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo "GA Product ID: $GA_PRODUCT_ID"

    # Create GA Price
    GA_PRICE=$(stripe prices create \
        --product "$GA_PRODUCT_ID" \
        --unit-amount 100000 \
        --currency usd \
        --nickname "GA Workshop Ticket" \
        --metadata[type]="workshop_ga" \
        --active \
        --output json)

    GA_PRICE_ID=$(echo "$GA_PRICE" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo "GA Price ID: $GA_PRICE_ID"

    # Create VIP Workshop Product
    echo "Creating VIP Workshop product..."
    VIP_PRODUCT=$(stripe products create \
        --name "6FB Methodologies Workshop - VIP Experience" \
        --description "Complete workshop access plus VIP dinner and exclusive perks" \
        --metadata[type]="workshop_ticket" \
        --metadata[tier]="VIP" \
        --active \
        --output json)

    VIP_PRODUCT_ID=$(echo "$VIP_PRODUCT" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo "VIP Product ID: $VIP_PRODUCT_ID"

    # Create VIP Price
    VIP_PRICE=$(stripe prices create \
        --product "$VIP_PRODUCT_ID" \
        --unit-amount 150000 \
        --currency usd \
        --nickname "VIP Workshop Ticket" \
        --metadata[type]="workshop_vip" \
        --active \
        --output json)

    VIP_PRICE_ID=$(echo "$VIP_PRICE" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo "VIP Price ID: $VIP_PRICE_ID"

    # Create promotion codes
    echo "Creating promotion codes..."

    # Early bird 25% off
    stripe promotion_codes create \
        --code "EARLY25" \
        --coupon $(stripe coupons create --percent-off 25 --duration once --name "Early Bird 25% Off" --output json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4) \
        --max-redemptions 100 \
        --active \
        --metadata[campaign]="early_bird"

    # General 15% off
    stripe promotion_codes create \
        --code "SAVE15" \
        --coupon $(stripe coupons create --percent-off 15 --duration once --name "Save 15%" --output json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4) \
        --max-redemptions 50 \
        --active \
        --metadata[campaign]="general_discount"

    echo
    echo -e "${GREEN}✅ Stripe products and prices created successfully${NC}"
    echo
    echo "Add these to your .env.production file:"
    echo "STRIPE_WORKSHOP_GA_PRICE_ID=$GA_PRICE_ID"
    echo "STRIPE_WORKSHOP_VIP_PRICE_ID=$VIP_PRICE_ID"

    log_message "INFO" "Stripe products and prices created"
    log_message "INFO" "GA Product: $GA_PRODUCT_ID, Price: $GA_PRICE_ID"
    log_message "INFO" "VIP Product: $VIP_PRODUCT_ID, Price: $VIP_PRICE_ID"
}

# Function to test webhook events
test_webhooks() {
    echo -e "${BLUE}🧪 Testing Webhook Events${NC}"
    echo "-------------------------"

    echo "Testing checkout session completed..."
    stripe trigger checkout.session.completed

    echo "Testing payment intent succeeded..."
    stripe trigger payment_intent.succeeded

    echo "Testing payment failed..."
    stripe trigger payment_intent.payment_failed

    echo
    echo -e "${GREEN}✅ Test events sent${NC}"
    echo "Check your application logs to verify webhook processing"

    log_message "INFO" "Webhook test events triggered"
}

# Function to show help
show_help() {
    echo "Stripe CLI Setup Script"
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  dev          Setup development environment"
    echo "  prod         Setup production environment"
    echo "  products     Create Stripe products and prices"
    echo "  test         Test webhook events"
    echo "  listen       Start webhook forwarding"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev       # Setup development with webhook forwarding"
    echo "  $0 products  # Create workshop products in Stripe"
    echo "  $0 test      # Send test webhook events"
}

# Main execution
case "${1:-dev}" in
    "dev")
        setup_development
        ;;
    "prod")
        setup_production
        ;;
    "products")
        setup_stripe_products
        ;;
    "test")
        test_webhooks
        ;;
    "listen")
        if [ -f "scripts/stripe-listen.sh" ]; then
            ./scripts/stripe-listen.sh
        else
            echo -e "${RED}Webhook forwarding script not found. Run '$0 dev' first.${NC}"
            exit 1
        fi
        ;;
    "help")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac

echo
echo -e "${GREEN}🎉 Stripe setup completed!${NC}"
echo "Check the log file for details: $LOG_FILE"
echo

log_message "INFO" "Stripe setup script completed"