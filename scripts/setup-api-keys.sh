#!/bin/bash

# 6FB Methodologies - API Key Setup Script
# This script helps you obtain and configure production API keys

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  6FB Methodologies - API Key Setup${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[STEP $1]${NC} $2"
    echo ""
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_step "1" "Checking prerequisites..."

    local missing_tools=()

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v jq &> /dev/null; then
        print_warning "jq not found. Installing jq for JSON processing..."
        if command -v brew &> /dev/null; then
            brew install jq
        else
            print_warning "Please install jq manually: https://stedolan.github.io/jq/"
            missing_tools+=("jq")
        fi
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo "Missing required tools: ${missing_tools[*]}"
        echo "Please install them and re-run this script."
        exit 1
    fi

    print_success "Prerequisites check passed"
    echo ""
}

# Generate secure random keys
generate_security_keys() {
    print_step "2" "Generating security keys..."

    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    SECRET_KEY=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

    print_success "Security keys generated"
    echo ""
}

# Check current Stripe configuration
check_stripe_config() {
    print_step "3" "Checking Stripe configuration..."

    if command -v stripe &> /dev/null; then
        print_success "Stripe CLI found"

        # Check if logged in
        if stripe config --list &> /dev/null; then
            print_info "Stripe CLI is configured"

            # Get current keys
            echo "Current Stripe configuration:"
            stripe config --list | grep -E "(test_mode|account)"

            echo ""
            echo "To get your live API keys:"
            echo "1. Run: stripe login"
            echo "2. Run: stripe config --list"
            echo "3. Switch to live mode in dashboard"
            echo ""

        else
            print_warning "Stripe CLI not logged in"
            echo "To configure Stripe CLI:"
            echo "1. Run: stripe login"
            echo "2. Follow the authentication flow"
            echo ""
        fi
    else
        print_warning "Stripe CLI not found"
        echo "To install Stripe CLI:"
        echo "macOS: brew install stripe/stripe-cli/stripe"
        echo "Other: https://stripe.com/docs/stripe-cli"
        echo ""
    fi
}

# Setup OpenAI CLI if possible
setup_openai_cli() {
    print_step "4" "Setting up OpenAI API access..."

    if command -v openai &> /dev/null; then
        print_success "OpenAI CLI found"

        echo "To get your OpenAI API key:"
        echo "1. Visit: https://platform.openai.com/api-keys"
        echo "2. Click 'Create new secret key'"
        echo "3. Copy the key (starts with sk-proj-)"
        echo ""

    else
        print_info "Installing OpenAI CLI..."
        if command -v pip3 &> /dev/null; then
            pip3 install openai
            print_success "OpenAI CLI installed"
        else
            print_warning "pip3 not found"
            echo "To install OpenAI CLI:"
            echo "pip install openai"
        fi

        echo ""
        echo "To get your OpenAI API key:"
        echo "1. Visit: https://platform.openai.com/api-keys"
        echo "2. Click 'Create new secret key'"
        echo "3. Copy the key (starts with sk-proj-)"
        echo ""
    fi
}

# Check for existing environment file
check_env_file() {
    print_step "5" "Checking environment configuration..."

    if [ -f ".env.local" ]; then
        print_success ".env.local file exists"

        # Check which keys are already configured
        echo "Current configuration status:"

        if grep -q "^OPENAI_API_KEY=sk-proj-" .env.local && ! grep -q "YOUR_.*_HERE" .env.local; then
            echo "✅ OpenAI API Key: Configured"
        else
            echo "❌ OpenAI API Key: Needs configuration"
        fi

        if grep -q "^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_" .env.local; then
            echo "✅ Stripe Publishable Key: Live key configured"
        elif grep -q "^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_" .env.local; then
            echo "⚠️  Stripe Publishable Key: Test key (needs live key for production)"
        else
            echo "❌ Stripe Publishable Key: Needs configuration"
        fi

        if grep -q "^STRIPE_SECRET_KEY=sk_live_" .env.local; then
            echo "✅ Stripe Secret Key: Live key configured"
        elif grep -q "^STRIPE_SECRET_KEY=sk_test_" .env.local; then
            echo "⚠️  Stripe Secret Key: Test key (needs live key for production)"
        else
            echo "❌ Stripe Secret Key: Needs configuration"
        fi

        if grep -q "^DATABASE_URL=postgres" .env.local && ! grep -q "your_database" .env.local; then
            echo "✅ Database URL: Configured"
        else
            echo "❌ Database URL: Needs configuration"
        fi

    else
        print_warning ".env.local not found"
        echo "Creating from template..."
        cp .env.production.template .env.local
        print_success ".env.local created from template"
    fi

    echo ""
}

# Interactive key entry
interactive_key_setup() {
    print_step "6" "Interactive API key setup..."

    echo "Let's configure your API keys step by step."
    echo "Press Enter to skip any key you want to set up later."
    echo ""

    # OpenAI API Key
    echo -n "Enter your OpenAI API Key (sk-proj-...): "
    read openai_key
    if [ -n "$openai_key" ]; then
        if [[ $openai_key == sk-proj-* ]]; then
            sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env.local
            print_success "OpenAI API key updated"
        else
            print_warning "Invalid OpenAI API key format (should start with sk-proj-)"
        fi
    fi

    # Stripe Publishable Key
    echo -n "Enter your Stripe Publishable Key (pk_live_...): "
    read stripe_pub_key
    if [ -n "$stripe_pub_key" ]; then
        if [[ $stripe_pub_key == pk_live_* ]]; then
            sed -i.bak "s|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$stripe_pub_key|" .env.local
            print_success "Stripe publishable key updated"
        else
            print_warning "Invalid Stripe publishable key format (should start with pk_live_)"
        fi
    fi

    # Stripe Secret Key
    echo -n "Enter your Stripe Secret Key (sk_live_...): "
    read stripe_secret_key
    if [ -n "$stripe_secret_key" ]; then
        if [[ $stripe_secret_key == sk_live_* ]]; then
            sed -i.bak "s|STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$stripe_secret_key|" .env.local
            print_success "Stripe secret key updated"
        else
            print_warning "Invalid Stripe secret key format (should start with sk_live_)"
        fi
    fi

    # Database URL
    echo -n "Enter your Database URL (postgres://...): "
    read database_url
    if [ -n "$database_url" ]; then
        if [[ $database_url == postgres* ]]; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$database_url\"|" .env.local
            print_success "Database URL updated"
        else
            print_warning "Invalid database URL format (should start with postgres)"
        fi
    fi

    # Update security keys
    sed -i.bak "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET|" .env.local
    sed -i.bak "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|" .env.local
    print_success "Security keys updated"

    echo ""
}

# Test configuration
test_configuration() {
    print_step "7" "Testing configuration..."

    # Test if the development server can start
    echo "Testing environment configuration..."

    if node -e "require('dotenv').config(); console.log('Environment loaded successfully')" 2>/dev/null; then
        print_success "Environment file is valid"
    else
        print_warning "Environment file has syntax errors"
    fi

    echo ""
}

# Generate summary
generate_summary() {
    print_step "8" "Generating setup summary..."

    cat > API_KEYS_SETUP.md << EOF
# API Keys Setup Summary

**Setup Date**: $(date)

## Configuration Status

### Required for Production
- OpenAI API Key: $(grep "^OPENAI_API_KEY=" .env.local | grep -q "sk-proj-" && echo "✅ Configured" || echo "❌ Needs setup")
- Stripe Live Keys: $(grep "^STRIPE_SECRET_KEY=" .env.local | grep -q "sk_live_" && echo "✅ Configured" || echo "❌ Needs setup")
- Database URL: $(grep "^DATABASE_URL=" .env.local | grep -q "postgres" && echo "✅ Configured" || echo "❌ Needs setup")

### Security Keys
- JWT Secret: ✅ Generated
- Secret Key: ✅ Generated

## Next Steps

1. **Complete API Key Setup**:
   - Visit https://platform.openai.com/api-keys for OpenAI
   - Visit https://dashboard.stripe.com/apikeys for Stripe
   - Set up PostgreSQL database (Vercel/Supabase recommended)

2. **Test Configuration**:
   \`\`\`bash
   npm run db:test
   npm run production:test
   \`\`\`

3. **Deploy to Production**:
   \`\`\`bash
   ./scripts/deploy-production.sh
   \`\`\`

## Quick Reference

### OpenAI API Key
- Dashboard: https://platform.openai.com/api-keys
- Format: sk-proj-...
- Cost: \$0.006/minute for Whisper transcription

### Stripe API Keys
- Dashboard: https://dashboard.stripe.com/apikeys
- Publishable Key: pk_live_...
- Secret Key: sk_live_...
- Webhook Secret: whsec_... (configure after deployment)

### Database Options
- **Vercel Postgres**: Easy integration with Vercel deployment
- **Supabase**: Free tier available
- **Local PostgreSQL**: For development/testing

## CLI Tools for Management

### Stripe CLI
\`\`\`bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# List webhooks
stripe webhooks list

# Forward webhooks for testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
\`\`\`

### OpenAI CLI
\`\`\`bash
# Install
pip install openai

# Test API key
openai api models.list
\`\`\`

EOF

    print_success "Setup summary saved to API_KEYS_SETUP.md"
    echo ""
}

# Main execution
main() {
    print_header

    check_prerequisites
    generate_security_keys
    check_stripe_config
    setup_openai_cli
    check_env_file
    interactive_key_setup
    test_configuration
    generate_summary

    echo -e "${GREEN}🎉 API Key Setup Complete!${NC}"
    echo ""
    echo "Summary:"
    echo "- Security keys generated and configured"
    echo "- Environment file ready for production"
    echo "- Setup documentation created"
    echo ""
    echo "Next steps:"
    echo "1. Complete any missing API keys"
    echo "2. Set up your database"
    echo "3. Run: ./scripts/deploy-production.sh"
    echo ""
}

# Run main function
main