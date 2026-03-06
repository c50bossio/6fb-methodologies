-- ==============================================================
-- 6FB Workbook System - Database Schema
-- ==============================================================
-- This script creates the complete database schema for the 6FB
-- Workbook learning management system, including all tables,
-- indexes, functions, and initial data required for the
-- educational content platform.
-- ==============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types for workbook system
CREATE TYPE subscription_tier AS ENUM ('basic', 'premium', 'vip', 'enterprise');
CREATE TYPE lesson_type AS ENUM ('video', 'text', 'interactive', 'exercise', 'quiz');
CREATE TYPE session_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE transcription_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE note_type AS ENUM ('lesson-note', 'reflection', 'action-item', 'manual');
CREATE TYPE live_session_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE attendance_status AS ENUM ('registered', 'attended', 'no-show', 'cancelled');

-- ==============================================================
-- Table: workbook_users
-- User accounts for the workbook system
-- ==============================================================
CREATE TABLE workbook_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255),
    subscription_tier subscription_tier DEFAULT 'basic',
    workshop_access_granted BOOLEAN DEFAULT false,
    workshop_access_expires_at TIMESTAMP WITH TIME ZONE,
    daily_transcription_limit_minutes INTEGER DEFAULT 30,
    daily_transcription_used_minutes INTEGER DEFAULT 0,
    monthly_transcription_cost_cents INTEGER DEFAULT 0,
    monthly_cost_limit_cents INTEGER DEFAULT 5000,
    last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    profile_image_url TEXT,
    bio TEXT,
    location VARCHAR(200),
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "push": false, "sms": false}',
    onboarding_completed BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: workshop_modules
-- Main learning modules/courses
-- ==============================================================
CREATE TABLE workshop_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_order INTEGER NOT NULL,
    duration_minutes INTEGER,
    content JSONB NOT NULL DEFAULT '{}',
    prerequisites UUID[],
    is_published BOOLEAN DEFAULT false,
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    tags TEXT[],
    cover_image_url TEXT,
    video_intro_url TEXT,
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: workshop_lessons
-- Individual lessons within modules
-- ==============================================================
CREATE TABLE workshop_lessons (
    id VARCHAR(50) PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type lesson_type NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    estimated_minutes INTEGER,
    sort_order INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT false,
    prerequisites VARCHAR(50)[],
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: user_progress
-- Track user progress through modules
-- ==============================================================
CREATE TABLE user_progress (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    module_name VARCHAR(255),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    notes_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id, module_id)
);

-- ==============================================================
-- Table: lesson_progress
-- Detailed progress tracking for individual lessons
-- ==============================================================
CREATE TABLE lesson_progress (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(50) NOT NULL REFERENCES workshop_lessons(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,
    last_position INTEGER DEFAULT 0,
    notes_count INTEGER DEFAULT 0,
    quiz_score INTEGER,
    attempts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id, lesson_id)
);

-- ==============================================================
-- Table: workbook_sessions
-- Audio recording sessions
-- ==============================================================
CREATE TABLE workbook_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status session_status DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    total_chunks INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    is_workshop_related BOOLEAN DEFAULT false,
    workshop_module UUID REFERENCES workshop_modules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: audio_recordings
-- Audio file storage and metadata
-- ==============================================================
CREATE TABLE audio_recordings (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(50) REFERENCES workshop_lessons(id),
    chunk_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    format VARCHAR(10),
    sample_rate INTEGER,
    channels INTEGER DEFAULT 1,
    quality VARCHAR(20) DEFAULT 'standard',
    upload_status VARCHAR(20) DEFAULT 'pending',
    uploaded_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    storage_provider VARCHAR(50) DEFAULT 'aws-s3',
    encryption_key_id VARCHAR(100),
    checksum VARCHAR(100),
    is_backup BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: transcriptions
-- AI transcription results and analysis
-- ==============================================================
CREATE TABLE transcriptions (
    id VARCHAR(50) PRIMARY KEY,
    recording_id VARCHAR(50) NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    status transcription_status DEFAULT 'pending',
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',
    text TEXT,
    formatted_text TEXT,
    confidence_score DECIMAL(3,2),
    processing_duration_seconds INTEGER,
    cost_cents INTEGER,
    cost_per_minute_cents INTEGER,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    word_count INTEGER,
    character_count INTEGER,
    summary TEXT,
    key_topics TEXT[],
    action_items TEXT[],
    sentiment_score DECIMAL(3,2),
    search_vector tsvector,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: session_notes
-- User notes with rich content and search
-- ==============================================================
CREATE TABLE session_notes (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    transcription_id VARCHAR(50) REFERENCES transcriptions(id) ON DELETE CASCADE,
    lesson_id VARCHAR(50) REFERENCES workshop_lessons(id),
    module_id UUID REFERENCES workshop_modules(id),
    type note_type NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    rich_content JSONB,
    timestamp_in_session INTEGER,
    highlighted_text TEXT,
    tags TEXT[],
    is_action_item BOOLEAN DEFAULT false,
    action_item_completed BOOLEAN DEFAULT false,
    action_item_due_date TIMESTAMP WITH TIME ZONE,
    parent_note_id VARCHAR(50) REFERENCES session_notes(id),
    importance INTEGER DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
    is_private BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    search_vector tsvector,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: live_sessions
-- Live workshop sessions and webinars
-- ==============================================================
CREATE TABLE live_sessions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 50,
    status live_session_status DEFAULT 'scheduled',
    meeting_url TEXT,
    recording_url TEXT,
    instructor_id UUID REFERENCES workbook_users(id),
    module_id UUID REFERENCES workshop_modules(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: live_session_participants
-- Track participation in live sessions
-- ==============================================================
CREATE TABLE live_session_participants (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    attendance_status attendance_status DEFAULT 'registered',
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (session_id, user_id)
);

-- ==============================================================
-- Table: user_achievements
-- Track user achievements and milestones
-- ==============================================================
CREATE TABLE user_achievements (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: cost_tracking
-- Track usage costs and billing
-- ==============================================================
CREATE TABLE cost_tracking (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES workbook_sessions(id),
    transcription_id VARCHAR(50) REFERENCES transcriptions(id),
    recording_id VARCHAR(50) REFERENCES audio_recordings(id),
    service_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    cost_cents INTEGER NOT NULL,
    quantity DECIMAL(10,3),
    unit VARCHAR(20),
    rate_cents_per_unit INTEGER,
    billing_date DATE,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tier_discount_applied BOOLEAN DEFAULT false,
    discount_percentage INTEGER,
    invoice_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- Table: system_metrics
-- System performance and usage metrics
-- ==============================================================
CREATE TABLE system_metrics (
    id VARCHAR(50) PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    aggregation_period VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================

-- Workbook Users
CREATE INDEX idx_workbook_users_email ON workbook_users(email);
CREATE INDEX idx_workbook_users_subscription ON workbook_users(subscription_tier);
CREATE INDEX idx_workbook_users_active ON workbook_users(is_active);
CREATE INDEX idx_workbook_users_last_login ON workbook_users(last_login_at);

-- Workshop Modules
CREATE INDEX idx_workshop_modules_published ON workshop_modules(is_published);
CREATE INDEX idx_workshop_modules_order ON workshop_modules(module_order);
CREATE INDEX idx_workshop_modules_difficulty ON workshop_modules(difficulty_level);
CREATE INDEX idx_workshop_modules_search ON workshop_modules USING gin(search_vector);
CREATE INDEX idx_workshop_modules_tags ON workshop_modules USING gin(tags);

-- Workshop Lessons
CREATE INDEX idx_workshop_lessons_module ON workshop_lessons(module_id);
CREATE INDEX idx_workshop_lessons_type ON workshop_lessons(type);
CREATE INDEX idx_workshop_lessons_published ON workshop_lessons(is_published);
CREATE INDEX idx_workshop_lessons_order ON workshop_lessons(sort_order);
CREATE INDEX idx_workshop_lessons_search ON workshop_lessons USING gin(search_vector);

-- User Progress
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_module ON user_progress(module_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);
CREATE INDEX idx_user_progress_last_accessed ON user_progress(last_accessed);

-- Lesson Progress
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_module ON lesson_progress(module_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(completed);

-- Workbook Sessions
CREATE INDEX idx_workbook_sessions_user ON workbook_sessions(user_id);
CREATE INDEX idx_workbook_sessions_status ON workbook_sessions(status);
CREATE INDEX idx_workbook_sessions_workshop ON workbook_sessions(is_workshop_related);
CREATE INDEX idx_workbook_sessions_module ON workbook_sessions(workshop_module);
CREATE INDEX idx_workbook_sessions_created ON workbook_sessions(created_at);
CREATE INDEX idx_workbook_sessions_tags ON workbook_sessions USING gin(tags);

-- Audio Recordings
CREATE INDEX idx_audio_recordings_session ON audio_recordings(session_id);
CREATE INDEX idx_audio_recordings_user ON audio_recordings(user_id);
CREATE INDEX idx_audio_recordings_lesson ON audio_recordings(lesson_id);
CREATE INDEX idx_audio_recordings_status ON audio_recordings(upload_status);
CREATE INDEX idx_audio_recordings_created ON audio_recordings(created_at);

-- Transcriptions
CREATE INDEX idx_transcriptions_recording ON transcriptions(recording_id);
CREATE INDEX idx_transcriptions_session ON transcriptions(session_id);
CREATE INDEX idx_transcriptions_user ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
CREATE INDEX idx_transcriptions_provider ON transcriptions(provider);
CREATE INDEX idx_transcriptions_search ON transcriptions USING gin(search_vector);
CREATE INDEX idx_transcriptions_topics ON transcriptions USING gin(key_topics);

-- Session Notes
CREATE INDEX idx_session_notes_user ON session_notes(user_id);
CREATE INDEX idx_session_notes_session ON session_notes(session_id);
CREATE INDEX idx_session_notes_lesson ON session_notes(lesson_id);
CREATE INDEX idx_session_notes_module ON session_notes(module_id);
CREATE INDEX idx_session_notes_type ON session_notes(type);
CREATE INDEX idx_session_notes_action_items ON session_notes(is_action_item);
CREATE INDEX idx_session_notes_public ON session_notes(is_public);
CREATE INDEX idx_session_notes_search ON session_notes USING gin(search_vector);
CREATE INDEX idx_session_notes_tags ON session_notes USING gin(tags);

-- Live Sessions
CREATE INDEX idx_live_sessions_scheduled ON live_sessions(scheduled_at);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_sessions_instructor ON live_sessions(instructor_id);
CREATE INDEX idx_live_sessions_module ON live_sessions(module_id);

-- Live Session Participants
CREATE INDEX idx_live_session_participants_session ON live_session_participants(session_id);
CREATE INDEX idx_live_session_participants_user ON live_session_participants(user_id);
CREATE INDEX idx_live_session_participants_status ON live_session_participants(attendance_status);

-- User Achievements
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX idx_user_achievements_earned ON user_achievements(earned_at);

-- Cost Tracking
CREATE INDEX idx_cost_tracking_user ON cost_tracking(user_id);
CREATE INDEX idx_cost_tracking_service ON cost_tracking(service_type);
CREATE INDEX idx_cost_tracking_provider ON cost_tracking(provider);
CREATE INDEX idx_cost_tracking_billing ON cost_tracking(billing_date);
CREATE INDEX idx_cost_tracking_usage ON cost_tracking(usage_date);

-- System Metrics
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_recorded ON system_metrics(recorded_at);

-- ==============================================================
-- FUNCTIONS AND TRIGGERS
-- ==============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_workbook_users_updated_at
    BEFORE UPDATE ON workbook_users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workshop_modules_updated_at
    BEFORE UPDATE ON workshop_modules
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workshop_lessons_updated_at
    BEFORE UPDATE ON workshop_lessons
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workbook_sessions_updated_at
    BEFORE UPDATE ON workbook_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_audio_recordings_updated_at
    BEFORE UPDATE ON audio_recordings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_live_sessions_updated_at
    BEFORE UPDATE ON live_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'workshop_modules' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' ||
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(array_to_string(NEW.tags, ' '), '')
        );
    ELSIF TG_TABLE_NAME = 'workshop_lessons' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' ||
            COALESCE(NEW.content::text, '')
        );
    ELSIF TG_TABLE_NAME = 'transcriptions' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.text, '') || ' ' ||
            COALESCE(NEW.summary, '') || ' ' ||
            COALESCE(array_to_string(NEW.key_topics, ' '), '')
        );
    ELSIF TG_TABLE_NAME = 'session_notes' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' ||
            COALESCE(NEW.content, '') || ' ' ||
            COALESCE(array_to_string(NEW.tags, ' '), '')
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Search vector triggers
CREATE TRIGGER update_workshop_modules_search
    BEFORE INSERT OR UPDATE ON workshop_modules
    FOR EACH ROW EXECUTE PROCEDURE update_search_vector();

CREATE TRIGGER update_workshop_lessons_search
    BEFORE INSERT OR UPDATE ON workshop_lessons
    FOR EACH ROW EXECUTE PROCEDURE update_search_vector();

CREATE TRIGGER update_transcriptions_search
    BEFORE INSERT OR UPDATE ON transcriptions
    FOR EACH ROW EXECUTE PROCEDURE update_search_vector();

CREATE TRIGGER update_session_notes_search
    BEFORE INSERT OR UPDATE ON session_notes
    FOR EACH ROW EXECUTE PROCEDURE update_search_vector();

-- Function to reset daily transcription usage
CREATE OR REPLACE FUNCTION reset_daily_transcription_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_reset_date::date < CURRENT_DATE THEN
        NEW.daily_transcription_used_minutes = 0;
        NEW.last_reset_date = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER reset_transcription_usage
    BEFORE UPDATE ON workbook_users
    FOR EACH ROW EXECUTE PROCEDURE reset_daily_transcription_usage();

-- ==============================================================
-- SECURITY SETUP
-- ==============================================================

-- Create workbook application user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'workbook_app_user') THEN
        CREATE USER workbook_app_user WITH PASSWORD 'workbook_app_secure_password_change_in_production';
    END IF;
END
$$;

-- Grant necessary permissions to workbook_app_user
GRANT CONNECT ON DATABASE postgres TO workbook_app_user;
GRANT USAGE ON SCHEMA public TO workbook_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO workbook_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO workbook_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO workbook_app_user;

-- Grant permissions on new tables created after this script
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO workbook_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO workbook_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO workbook_app_user;

-- ==============================================================
-- INITIAL TEST USER
-- ==============================================================

-- Insert a test user for development/testing
INSERT INTO workbook_users (
    id,
    email,
    first_name,
    last_name,
    password_hash,
    subscription_tier,
    workshop_access_granted,
    workshop_access_expires_at,
    daily_transcription_limit_minutes,
    onboarding_completed,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@6fbmethodologies.com',
    'Test',
    'User',
    '$2b$10$dummy.hash.for.testing.purposes.only.change.in.production',
    'premium',
    true,
    '2025-12-31 23:59:59'::timestamp,
    120,
    true,
    true
) ON CONFLICT (email) DO NOTHING;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '6FB Workbook Database Schema Creation Complete!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Successfully created:';
    RAISE NOTICE '- All workbook system tables with proper relationships';
    RAISE NOTICE '- Performance indexes for efficient querying';
    RAISE NOTICE '- Full-text search capabilities with tsvectors';
    RAISE NOTICE '- Automated triggers for timestamps and search vectors';
    RAISE NOTICE '- Security setup with workbook_app_user permissions';
    RAISE NOTICE '- Test user: test@6fbmethodologies.com';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Run the workshop content seeding script to populate';
    RAISE NOTICE 'the database with sample modules, lessons, and user data.';
    RAISE NOTICE '=================================================================';
END $$;