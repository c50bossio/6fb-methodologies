-- 6FB Methodologies Workshop Database Schema
-- PostgreSQL initialization script for ticket sales and inventory management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE ticket_tier AS ENUM ('ga', 'vip');
CREATE TYPE transaction_operation AS ENUM ('decrement', 'expand', 'reset');
CREATE TYPE sms_status AS ENUM ('pending', 'sent', 'failed', 'retry');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'canceled', 'refunded');

-- ==============================================
-- Table: cities
-- Workshop cities and their details
-- ==============================================
CREATE TABLE cities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    workshop_date DATE NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    venue_name VARCHAR(200),
    venue_address TEXT,
    venue_capacity_ga INTEGER DEFAULT 35,
    venue_capacity_vip INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    early_bird_end_date DATE,
    registration_open_date DATE DEFAULT CURRENT_DATE,
    registration_close_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Table: inventory
-- Real-time ticket inventory tracking
-- ==============================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id VARCHAR(50) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    tier ticket_tier NOT NULL,
    public_limit INTEGER NOT NULL,
    actual_limit INTEGER NOT NULL,
    sold INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0, -- For pending payments
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1, -- For optimistic locking

    CONSTRAINT inventory_city_tier_unique UNIQUE (city_id, tier),
    CONSTRAINT inventory_limits_check CHECK (actual_limit >= public_limit),
    CONSTRAINT inventory_sold_check CHECK (sold >= 0),
    CONSTRAINT inventory_reserved_check CHECK (reserved >= 0),
    CONSTRAINT inventory_capacity_check CHECK (sold + reserved <= actual_limit)
);

-- ==============================================
-- Table: inventory_transactions
-- Audit trail for all inventory changes
-- ==============================================
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id VARCHAR(50) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    tier ticket_tier NOT NULL,
    quantity INTEGER NOT NULL,
    operation transaction_operation NOT NULL,
    previous_sold INTEGER,
    new_sold INTEGER,
    previous_limit INTEGER,
    new_limit INTEGER,
    payment_intent_id VARCHAR(100),
    session_id VARCHAR(100),
    admin_user_id VARCHAR(100),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT inventory_transactions_quantity_check CHECK (quantity != 0)
);

-- ==============================================
-- Table: inventory_expansions
-- Track inventory expansions for high-demand cities
-- ==============================================
CREATE TABLE inventory_expansions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id VARCHAR(50) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    tier ticket_tier NOT NULL,
    additional_spots INTEGER NOT NULL,
    reason TEXT NOT NULL,
    authorized_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT inventory_expansions_spots_check CHECK (additional_spots > 0)
);

-- ==============================================
-- Table: customers
-- Customer information and 6FB membership status
-- ==============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    stripe_customer_id VARCHAR(100) UNIQUE,
    is_sixfb_member BOOLEAN DEFAULT false,
    membership_verified_at TIMESTAMP WITH TIME ZONE,
    membership_verification_method VARCHAR(50), -- 'manual', 'email_domain', 'api'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Table: payments
-- Payment processing and Stripe integration
-- ==============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(100) UNIQUE,
    stripe_session_id VARCHAR(100) UNIQUE,
    amount_cents INTEGER NOT NULL,
    original_amount_cents INTEGER,
    discount_amount_cents INTEGER DEFAULT 0,
    discount_reason TEXT,
    currency VARCHAR(3) DEFAULT 'usd',
    status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50), -- 'card', 'bank_account', etc.
    failure_reason TEXT,
    metadata JSONB,
    stripe_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payments_amount_check CHECK (amount_cents > 0),
    CONSTRAINT payments_original_amount_check CHECK (original_amount_cents >= amount_cents)
);

-- ==============================================
-- Table: tickets
-- Individual ticket records
-- ==============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    city_id VARCHAR(50) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    tier ticket_tier NOT NULL,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    attendee_first_name VARCHAR(100),
    attendee_last_name VARCHAR(100),
    attendee_email VARCHAR(255),
    check_in_at TIMESTAMP WITH TIME ZONE,
    is_refunded BOOLEAN DEFAULT false,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Table: sms_notifications
-- SMS notification delivery tracking
-- ==============================================
CREATE TABLE sms_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL, -- 'ticket_sale', 'system_alert', 'test'
    recipient_phone VARCHAR(20) NOT NULL,
    message_body TEXT NOT NULL,
    status sms_status DEFAULT 'pending',
    twilio_message_id VARCHAR(100),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Table: sessions
-- User session management
-- ==============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Table: system_health
-- System health and monitoring metrics
-- ==============================================
CREATE TABLE system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT system_health_timestamp_name_unique UNIQUE (timestamp, metric_name)
);

-- ==============================================
-- Indexes for Performance
-- ==============================================

-- Cities
CREATE INDEX idx_cities_active_date ON cities(is_active, workshop_date);
CREATE INDEX idx_cities_registration_dates ON cities(registration_open_date, registration_close_date);

-- Inventory
CREATE INDEX idx_inventory_city_tier ON inventory(city_id, tier);
CREATE INDEX idx_inventory_last_updated ON inventory(last_updated);

-- Inventory Transactions
CREATE INDEX idx_inventory_transactions_city_tier ON inventory_transactions(city_id, tier);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_session ON inventory_transactions(session_id);
CREATE INDEX idx_inventory_transactions_payment ON inventory_transactions(payment_intent_id);

-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_stripe_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_sixfb_member ON customers(is_sixfb_member);

-- Payments
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_stripe_session ON payments(stripe_session_id);
CREATE INDEX idx_payments_stripe_payment ON payments(stripe_payment_intent_id);

-- Tickets
CREATE INDEX idx_tickets_payment ON tickets(payment_id);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_city_tier ON tickets(city_id, tier);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_attendee_email ON tickets(attendee_email);

-- SMS Notifications
CREATE INDEX idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX idx_sms_notifications_created_at ON sms_notifications(created_at);
CREATE INDEX idx_sms_notifications_payment ON sms_notifications(payment_id);
CREATE INDEX idx_sms_notifications_retry ON sms_notifications(retry_count, status);

-- Sessions
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_customer ON sessions(customer_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- System Health
CREATE INDEX idx_system_health_timestamp ON system_health(timestamp);
CREATE INDEX idx_system_health_metric ON system_health(metric_name);

-- ==============================================
-- Functions and Triggers
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sms_notifications_updated_at BEFORE UPDATE ON sms_notifications
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update inventory last_updated
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_timestamp BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE PROCEDURE update_inventory_timestamp();

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number(city_id VARCHAR, tier ticket_tier)
RETURNS VARCHAR AS $$
DECLARE
    city_code VARCHAR(3);
    tier_code VARCHAR(1);
    sequence_num INTEGER;
    ticket_num VARCHAR(20);
BEGIN
    -- Get city code (first 3 characters, uppercase)
    city_code := UPPER(SUBSTRING(city_id FROM 1 FOR 3));

    -- Get tier code
    tier_code := CASE tier WHEN 'ga' THEN 'G' WHEN 'vip' THEN 'V' END;

    -- Get next sequence number for this city/tier combination
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM tickets
    WHERE tickets.city_id = generate_ticket_number.city_id
    AND tickets.tier = generate_ticket_number.tier;

    -- Format: CITG001, CITV001, etc.
    ticket_num := city_code || tier_code || LPAD(sequence_num::TEXT, 3, '0');

    RETURN ticket_num;
END;
$$ language 'plpgsql';

-- Function to validate inventory before purchase
CREATE OR REPLACE FUNCTION validate_inventory_availability(
    p_city_id VARCHAR,
    p_tier ticket_tier,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    available_tickets INTEGER;
BEGIN
    SELECT (actual_limit - sold - reserved) INTO available_tickets
    FROM inventory
    WHERE city_id = p_city_id AND tier = p_tier;

    RETURN available_tickets >= p_quantity;
END;
$$ language 'plpgsql';

-- ==============================================
-- Initial Data
-- ==============================================

-- Insert default cities
INSERT INTO cities (id, name, state, workshop_date, timezone, venue_capacity_ga, venue_capacity_vip) VALUES
('dallas-jan-2026', 'Dallas', 'TX', '2026-01-15', 'America/Chicago', 35, 15),
('atlanta-feb-2026', 'Atlanta', 'GA', '2026-02-15', 'America/New_York', 35, 15),
('la-mar-2026', 'Los Angeles', 'CA', '2026-03-15', 'America/Los_Angeles', 35, 15),
('sf-apr-2026', 'San Francisco', 'CA', '2026-04-15', 'America/Los_Angeles', 35, 15),
('chicago-may-2026', 'Chicago', 'IL', '2026-05-15', 'America/Chicago', 35, 15),
('nyc-jun-2026', 'New York City', 'NY', '2026-06-15', 'America/New_York', 35, 15);

-- Initialize inventory for all cities
INSERT INTO inventory (city_id, tier, public_limit, actual_limit, sold, reserved)
SELECT
    c.id,
    t.tier,
    CASE WHEN t.tier = 'ga' THEN c.venue_capacity_ga ELSE c.venue_capacity_vip END,
    CASE WHEN t.tier = 'ga' THEN c.venue_capacity_ga ELSE c.venue_capacity_vip END,
    0,
    0
FROM cities c
CROSS JOIN (VALUES ('ga'::ticket_tier), ('vip'::ticket_tier)) AS t(tier);

-- ==============================================
-- Security and Permissions
-- ==============================================

-- Create application user (for the Next.js app)
CREATE USER app_user WITH PASSWORD 'secure_app_password_change_in_production';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- Create read-only user (for monitoring/reporting)
CREATE USER readonly_user WITH PASSWORD 'readonly_password_change_in_production';
GRANT CONNECT ON DATABASE postgres TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Enable row level security (for future multi-tenancy if needed)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- Performance and Maintenance
-- ==============================================

-- Enable auto-vacuum and stats collection
ALTER TABLE inventory SET (
    autovacuum_enabled = true,
    autovacuum_analyze_scale_factor = 0.1,
    autovacuum_vacuum_scale_factor = 0.1
);

ALTER TABLE payments SET (
    autovacuum_enabled = true,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_scale_factor = 0.05
);

-- Create partitioning for large tables (future enhancement)
-- This can be uncommented when the system scales
/*
-- Partition system_health by month
CREATE TABLE system_health_template (LIKE system_health INCLUDING ALL);
-- Add monthly partitions as needed
*/

COMMIT;