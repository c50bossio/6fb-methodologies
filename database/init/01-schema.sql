-- ==============================================================
-- 6FB Workbook System - Database Schema Setup
-- ==============================================================
-- This file sets up the basic database configuration and extensions
-- for the 6FB Workbook PostgreSQL database.
--
-- Features:
-- - UUID generation support
-- - Full-text search with tsvector
-- - JSONB for flexible content storage
-- - Performance optimizations
-- ==============================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create schema for workbook system (optional - using public by default)
-- CREATE SCHEMA IF NOT EXISTS workbook;
-- SET search_path = workbook, public;

-- ==============================================================
-- CUSTOM TYPES AND ENUMS
-- ==============================================================

-- Subscription tier enumeration
CREATE TYPE subscription_tier AS ENUM (
    'basic',
    'premium',
    'vip'
);

-- Progress status enumeration
CREATE TYPE progress_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'locked'
);

-- Lesson type enumeration
CREATE TYPE lesson_type AS ENUM (
    'video',
    'text',
    'interactive',
    'exercise',
    'discussion'
);

-- Transcription status enumeration
CREATE TYPE transcription_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

-- Session status enumeration
CREATE TYPE session_status AS ENUM (
    'scheduled',
    'starting',
    'active',
    'paused',
    'ended',
    'cancelled'
);

-- Participant role enumeration
CREATE TYPE participant_role AS ENUM (
    'instructor',
    'assistant',
    'participant',
    'observer'
);

-- Permission enumeration for session participants
CREATE TYPE session_permission AS ENUM (
    'can_speak',
    'can_share_screen',
    'can_use_whiteboard',
    'can_create_polls',
    'can_moderate'
);

-- ==============================================================
-- UTILITY FUNCTIONS
-- ==============================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate JSON structure for module content
CREATE OR REPLACE FUNCTION is_valid_module_content(content JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if required fields exist
    RETURN (
        content ? 'overview' AND
        content ? 'learningObjectives' AND
        content ? 'lessons' AND
        jsonb_typeof(content->'learningObjectives') = 'array' AND
        jsonb_typeof(content->'lessons') = 'array'
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- HELPER VIEWS (to be created after tables)
-- ==============================================================

-- Note: Views will be created in 02-workbook-schema.sql after tables are defined

COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching for fast text search';
COMMENT ON EXTENSION "unaccent" IS 'Text search dictionary for removing accents';

COMMENT ON TYPE subscription_tier IS 'User subscription levels for access control';
COMMENT ON TYPE progress_status IS 'User progress states through learning content';
COMMENT ON TYPE lesson_type IS 'Different types of lesson content delivery';
COMMENT ON TYPE transcription_status IS 'Audio transcription processing states';
COMMENT ON TYPE session_status IS 'Live session lifecycle states';
COMMENT ON TYPE participant_role IS 'User roles within live sessions';
COMMENT ON TYPE session_permission IS 'Granular permissions for session participants';

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update timestamps';
COMMENT ON FUNCTION is_valid_email(TEXT) IS 'Email format validation function';
COMMENT ON FUNCTION is_valid_module_content(JSONB) IS 'Module content structure validation';