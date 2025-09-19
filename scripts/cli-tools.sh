#!/bin/bash

# CLI Tools Installation and Setup for 6FB Methodologies

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Install Stripe CLI
install_stripe_cli() {
    print_info "Installing Stripe CLI..."

    if command -v stripe &> /dev/null; then
        print_success "Stripe CLI already installed"
        stripe --version
    else
        if command -v brew &> /dev/null; then
            brew install stripe/stripe-cli/stripe
            print_success "Stripe CLI installed via Homebrew"
        else
            print_warning "Homebrew not found. Please install manually:"
            echo "Visit: https://stripe.com/docs/stripe-cli"
        fi
    fi
}

# Setup Stripe CLI
setup_stripe_cli() {
    print_info "Setting up Stripe CLI..."

    if command -v stripe &> /dev/null; then
        echo "Run these commands to set up Stripe:"
        echo ""
        echo "1. Login to Stripe:"
        echo "   stripe login"
        echo ""
        echo "2. List your API keys:"
        echo "   stripe config --list"
        echo ""
        echo "3. Test webhook forwarding:"
        echo "   stripe listen --forward-to localhost:3000/api/webhooks/stripe"
        echo ""
        echo "4. Get your webhook signing secret:"
        echo "   stripe listen --print-secret"
        echo ""
    fi
}

# Install OpenAI CLI
install_openai_cli() {
    print_info "Installing OpenAI CLI..."

    if python3 -c "import openai" &> /dev/null; then
        print_success "OpenAI package already installed"
    else
        if command -v pip3 &> /dev/null; then
            pip3 install openai
            print_success "OpenAI package installed"
        else
            print_warning "pip3 not found. Install Python first."
        fi
    fi
}

# Test OpenAI API key
test_openai_key() {
    print_info "Testing OpenAI API key..."

    if [ -f ".env.local" ]; then
        source .env.local
        if [ -n "$OPENAI_API_KEY" ]; then
            python3 << EOF
import openai
import os

try:
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    models = client.models.list()
    print("✅ OpenAI API key is valid")
    print(f"Available models: {len(models.data)} found")
except Exception as e:
    print(f"❌ OpenAI API key test failed: {e}")
EOF
        else
            print_warning "OPENAI_API_KEY not found in .env.local"
        fi
    else
        print_warning ".env.local file not found"
    fi
}

# Install Vercel CLI
install_vercel_cli() {
    print_info "Installing Vercel CLI..."

    if command -v vercel &> /dev/null; then
        print_success "Vercel CLI already installed"
        vercel --version
    else
        if command -v npm &> /dev/null; then
            npm install -g vercel
            print_success "Vercel CLI installed"
        else
            print_warning "npm not found. Install Node.js first."
        fi
    fi
}

# Setup database CLI tools
setup_database_tools() {
    print_info "Setting up database tools..."

    # PostgreSQL
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL client (psql) already installed"
    else
        if command -v brew &> /dev/null; then
            echo "To install PostgreSQL:"
            echo "   brew install postgresql"
        else
            echo "To install PostgreSQL:"
            echo "   Visit: https://www.postgresql.org/download/"
        fi
    fi

    # Supabase CLI
    if command -v supabase &> /dev/null; then
        print_success "Supabase CLI already installed"
    else
        echo "To install Supabase CLI:"
        echo "   npm install -g supabase"
    fi
}

# Quick API key retrieval functions
get_stripe_keys() {
    print_info "Getting Stripe API keys..."

    if command -v stripe &> /dev/null; then
        echo "Your Stripe configuration:"
        stripe config --list

        echo ""
        echo "To get live keys:"
        echo "1. Go to https://dashboard.stripe.com/apikeys"
        echo "2. Switch to 'Live' mode (toggle in top-left)"
        echo "3. Copy 'Publishable key' (pk_live_...)"
        echo "4. Reveal and copy 'Secret key' (sk_live_...)"
        echo ""
    else
        echo "Install Stripe CLI first: ./scripts/cli-tools.sh install_stripe"
    fi
}

get_openai_key() {
    print_info "Getting OpenAI API key..."

    echo "To get your OpenAI API key:"
    echo "1. Visit: https://platform.openai.com/api-keys"
    echo "2. Click 'Create new secret key'"
    echo "3. Name it '6FB-Methodologies-Production'"
    echo "4. Copy the key (starts with sk-proj-)"
    echo "5. Set usage limits (recommended: $50/month)"
    echo ""

    if command -v open &> /dev/null; then
        echo "Opening OpenAI dashboard..."
        open "https://platform.openai.com/api-keys"
    fi
}

setup_vercel_database() {
    print_info "Setting up Vercel Postgres database..."

    if command -v vercel &> /dev/null; then
        echo "Steps to create Vercel Postgres database:"
        echo ""
        echo "1. Login to Vercel:"
        echo "   vercel login"
        echo ""
        echo "2. Link your project:"
        echo "   vercel link"
        echo ""
        echo "3. Create database via dashboard:"
        echo "   - Go to vercel.com/dashboard"
        echo "   - Navigate to your project"
        echo "   - Go to Storage tab"
        echo "   - Click 'Create Database'"
        echo "   - Choose 'Postgres'"
        echo "   - Copy connection string"
        echo ""
        echo "4. Add to environment:"
        echo "   vercel env add DATABASE_URL"
        echo ""

        if command -v open &> /dev/null; then
            echo "Opening Vercel dashboard..."
            open "https://vercel.com/dashboard"
        fi
    else
        echo "Install Vercel CLI first: ./scripts/cli-tools.sh install_vercel"
    fi
}

# Test all API connections
test_all_apis() {
    print_info "Testing all API connections..."

    echo "🧪 Running comprehensive API tests..."
    echo ""

    # Test OpenAI
    test_openai_key

    # Test Stripe (if configured)
    if command -v stripe &> /dev/null && stripe config --list &> /dev/null; then
        echo "✅ Stripe CLI is configured"
    else
        echo "❌ Stripe CLI needs setup"
    fi

    # Test database connection
    if [ -f ".env.local" ]; then
        source .env.local
        if [ -n "$DATABASE_URL" ]; then
            if command -v psql &> /dev/null; then
                if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
                    echo "✅ Database connection successful"
                else
                    echo "❌ Database connection failed"
                fi
            else
                echo "⚠️  psql not available to test database"
            fi
        else
            echo "❌ DATABASE_URL not configured"
        fi
    fi

    echo ""
    echo "Run './scripts/cli-tools.sh help' for available commands"
}

# Help function
show_help() {
    echo "6FB Methodologies CLI Tools"
    echo "=========================="
    echo ""
    echo "Installation:"
    echo "  install_stripe     Install Stripe CLI"
    echo "  install_openai     Install OpenAI CLI tools"
    echo "  install_vercel     Install Vercel CLI"
    echo "  install_database   Install database tools"
    echo "  install_all        Install all tools"
    echo ""
    echo "Setup:"
    echo "  setup_stripe       Configure Stripe CLI"
    echo "  get_stripe_keys    Get Stripe API keys"
    echo "  get_openai_key     Get OpenAI API key"
    echo "  setup_vercel_db    Set up Vercel database"
    echo ""
    echo "Testing:"
    echo "  test_openai        Test OpenAI API key"
    echo "  test_all           Test all API connections"
    echo ""
    echo "Examples:"
    echo "  ./scripts/cli-tools.sh install_all"
    echo "  ./scripts/cli-tools.sh get_openai_key"
    echo "  ./scripts/cli-tools.sh test_all"
}

# Main command dispatcher
case "$1" in
    install_stripe)
        install_stripe_cli
        ;;
    install_openai)
        install_openai_cli
        ;;
    install_vercel)
        install_vercel_cli
        ;;
    install_database)
        setup_database_tools
        ;;
    install_all)
        install_stripe_cli
        install_openai_cli
        install_vercel_cli
        setup_database_tools
        ;;
    setup_stripe)
        setup_stripe_cli
        ;;
    get_stripe_keys)
        get_stripe_keys
        ;;
    get_openai_key)
        get_openai_key
        ;;
    setup_vercel_db)
        setup_vercel_database
        ;;
    test_openai)
        test_openai_key
        ;;
    test_all)
        test_all_apis
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Usage: $0 [command]"
        echo "Run '$0 help' for available commands"
        exit 1
        ;;
esac