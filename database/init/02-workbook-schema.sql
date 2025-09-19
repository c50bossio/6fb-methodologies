-- 6FB Workbook Extension Schema
-- Extends the existing 6FB Methodologies database with workbook functionality
-- for recording sessions, transcriptions, and notes

-- Create workbook-specific types
CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed', 'stopped');
CREATE TYPE transcription_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE note_type AS ENUM ('session-note', 'manual', 'transcription-highlight', 'action-item');
CREATE TYPE subscription_tier AS ENUM ('basic', 'premium', 'enterprise');

-- ==============================================
-- Table: workbook_users
-- Extended user profiles for workbook functionality
-- ==============================================
CREATE TABLE workbook_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    subscription_tier subscription_tier DEFAULT 'basic',
    workshop_access_granted BOOLEAN DEFAULT false,
    workshop_access_expires_at TIMESTAMP WITH TIME ZONE,
    daily_transcription_limit_minutes INTEGER DEFAULT 60, -- Basic tier: 60 minutes/day
    daily_transcription_used_minutes INTEGER DEFAULT 0,
    monthly_transcription_cost_cents INTEGER DEFAULT 0,
    monthly_cost_limit_cents INTEGER DEFAULT 5000, -- $50/month default
    last_reset_date DATE DEFAULT CURRENT_DATE,
    preferences JSONB DEFAULT '{}', -- Audio quality, auto-save, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT workbook_users_daily_limit_check CHECK (daily_transcription_limit_minutes >= 0),
    CONSTRAINT workbook_users_used_minutes_check CHECK (daily_transcription_used_minutes >= 0),
    CONSTRAINT workbook_users_cost_check CHECK (monthly_transcription_cost_cents >= 0)
);

-- ==============================================
-- Table: workbook_sessions
-- Recording sessions with metadata
-- ==============================================
CREATE TABLE workbook_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    status session_status DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- Device info, browser, location, etc.
    tags TEXT[],
    is_workshop_related BOOLEAN DEFAULT true,
    workshop_module VARCHAR(100), -- Which part of the workshop this relates to
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT workbook_sessions_duration_check CHECK (duration_seconds >= 0),
    CONSTRAINT workbook_sessions_chunks_check CHECK (total_chunks >= 0)
);

-- ==============================================
-- Table: audio_recordings
-- Individual audio recordings and chunks
-- ==============================================
CREATE TABLE audio_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    chunk_number INTEGER NOT NULL,
    file_path VARCHAR(500), -- Path to stored audio file
    file_size_bytes INTEGER,
    duration_seconds NUMERIC(10,2),
    format VARCHAR(20) DEFAULT 'webm', -- webm, mp3, wav, etc.
    sample_rate INTEGER DEFAULT 44100,
    channels INTEGER DEFAULT 1,
    quality VARCHAR(20) DEFAULT 'standard', -- standard, high, premium
    upload_status VARCHAR(20) DEFAULT 'pending', -- pending, uploaded, failed
    uploaded_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- Audio analysis data, noise levels, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audio_recordings_session_chunk_unique UNIQUE (session_id, chunk_number),
    CONSTRAINT audio_recordings_duration_check CHECK (duration_seconds >= 0),
    CONSTRAINT audio_recordings_size_check CHECK (file_size_bytes >= 0)
);

-- ==============================================
-- Table: transcriptions
-- Audio transcriptions with cost tracking
-- ==============================================
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    status transcription_status DEFAULT 'pending',
    provider VARCHAR(50) DEFAULT 'openai-whisper', -- openai-whisper, google, azure, etc.
    model VARCHAR(50) DEFAULT 'whisper-1',
    language VARCHAR(10) DEFAULT 'en',
    text TEXT,
    confidence_score NUMERIC(3,2), -- 0.00 to 1.00
    processing_duration_seconds INTEGER,
    cost_cents INTEGER, -- Cost in cents for this transcription
    cost_per_minute_cents INTEGER, -- Rate used for billing
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- Provider response, confidence per word, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transcriptions_confidence_check CHECK (confidence_score >= 0 AND confidence_score <= 1),
    CONSTRAINT transcriptions_cost_check CHECK (cost_cents >= 0),
    CONSTRAINT transcriptions_retry_check CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- ==============================================
-- Table: session_notes
-- Notes linked to sessions and transcriptions
-- ==============================================
CREATE TABLE session_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE SET NULL,
    type note_type DEFAULT 'manual',
    title VARCHAR(255),
    content TEXT NOT NULL,
    rich_content JSONB, -- For rich text formatting, markdown, etc.
    timestamp_in_session INTEGER, -- Seconds into the session when note was taken
    highlighted_text TEXT, -- If note relates to specific transcribed text
    tags TEXT[],
    is_action_item BOOLEAN DEFAULT false,
    action_item_completed BOOLEAN DEFAULT false,
    action_item_due_date TIMESTAMP WITH TIME ZONE,
    parent_note_id UUID REFERENCES session_notes(id) ON DELETE CASCADE, -- For threaded notes
    importance INTEGER DEFAULT 1 CHECK (importance >= 1 AND importance <= 5), -- 1-5 scale
    is_private BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Table: user_progress
-- Track user progress through workshop materials
-- ==============================================
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id VARCHAR(100) NOT NULL, -- Workshop module identifier
    module_name VARCHAR(255),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    notes_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}', -- Detailed progress data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_progress_user_module_unique UNIQUE (user_id, module_id),
    CONSTRAINT user_progress_time_check CHECK (time_spent_seconds >= 0),
    CONSTRAINT user_progress_sessions_check CHECK (sessions_count >= 0)
);

-- ==============================================
-- Table: transcription_jobs
-- Background job queue for transcription processing
-- ==============================================
CREATE TABLE transcription_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest
    status VARCHAR(20) DEFAULT 'queued', -- queued, processing, completed, failed, cancelled
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    processor_id VARCHAR(100), -- ID of the worker that processed this job
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transcription_jobs_attempts_check CHECK (attempts >= 0 AND attempts <= max_attempts)
);

-- ==============================================
-- Table: cost_tracking
-- Detailed cost tracking for transcription services
-- ==============================================
CREATE TABLE cost_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE SET NULL,
    service_type VARCHAR(50) NOT NULL, -- 'transcription', 'storage', 'processing'
    provider VARCHAR(50) NOT NULL, -- 'openai', 'google', 'azure', etc.
    cost_cents INTEGER NOT NULL,
    quantity NUMERIC(10,4), -- Minutes, bytes, requests, etc.
    unit VARCHAR(20) NOT NULL, -- 'minutes', 'bytes', 'requests'
    rate_cents_per_unit NUMERIC(10,4), -- Rate used for calculation
    billing_date DATE DEFAULT CURRENT_DATE,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT cost_tracking_cost_check CHECK (cost_cents >= 0),
    CONSTRAINT cost_tracking_quantity_check CHECK (quantity >= 0)
);

-- ==============================================
-- Table: rate_limits
-- Track API usage and enforce rate limits
-- ==============================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    endpoint VARCHAR(100) NOT NULL, -- '/api/workbook/audio', etc.
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    window_duration_seconds INTEGER DEFAULT 3600, -- 1 hour default
    limit_per_window INTEGER DEFAULT 100,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT rate_limits_user_endpoint_window_unique UNIQUE (user_id, endpoint, window_start),
    CONSTRAINT rate_limits_requests_check CHECK (requests_count >= 0)
);

-- ==============================================
-- Indexes for Performance
-- ==============================================

-- Workbook Users
CREATE INDEX idx_workbook_users_customer ON workbook_users(customer_id);
CREATE INDEX idx_workbook_users_email ON workbook_users(email);
CREATE INDEX idx_workbook_users_subscription ON workbook_users(subscription_tier);
CREATE INDEX idx_workbook_users_access ON workbook_users(workshop_access_granted, workshop_access_expires_at);
CREATE INDEX idx_workbook_users_reset_date ON workbook_users(last_reset_date);

-- Workbook Sessions
CREATE INDEX idx_workbook_sessions_user ON workbook_sessions(user_id);
CREATE INDEX idx_workbook_sessions_status ON workbook_sessions(status);
CREATE INDEX idx_workbook_sessions_started ON workbook_sessions(started_at);
CREATE INDEX idx_workbook_sessions_workshop ON workbook_sessions(is_workshop_related, workshop_module);
CREATE INDEX idx_workbook_sessions_tags ON workbook_sessions USING GIN(tags);

-- Audio Recordings
CREATE INDEX idx_audio_recordings_session ON audio_recordings(session_id);
CREATE INDEX idx_audio_recordings_user ON audio_recordings(user_id);
CREATE INDEX idx_audio_recordings_chunk ON audio_recordings(session_id, chunk_number);
CREATE INDEX idx_audio_recordings_upload_status ON audio_recordings(upload_status);
CREATE INDEX idx_audio_recordings_created ON audio_recordings(created_at);

-- Transcriptions
CREATE INDEX idx_transcriptions_recording ON transcriptions(recording_id);
CREATE INDEX idx_transcriptions_session ON transcriptions(session_id);
CREATE INDEX idx_transcriptions_user ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
CREATE INDEX idx_transcriptions_provider ON transcriptions(provider);
CREATE INDEX idx_transcriptions_created ON transcriptions(created_at);
CREATE INDEX idx_transcriptions_cost ON transcriptions(cost_cents);

-- Session Notes
CREATE INDEX idx_session_notes_user ON session_notes(user_id);
CREATE INDEX idx_session_notes_session ON session_notes(session_id);
CREATE INDEX idx_session_notes_transcription ON session_notes(transcription_id);
CREATE INDEX idx_session_notes_type ON session_notes(type);
CREATE INDEX idx_session_notes_action_items ON session_notes(is_action_item, action_item_completed);
CREATE INDEX idx_session_notes_parent ON session_notes(parent_note_id);
CREATE INDEX idx_session_notes_tags ON session_notes USING GIN(tags);
CREATE INDEX idx_session_notes_created ON session_notes(created_at);

-- User Progress
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_module ON user_progress(module_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed, completed_at);
CREATE INDEX idx_user_progress_accessed ON user_progress(last_accessed);

-- Transcription Jobs
CREATE INDEX idx_transcription_jobs_transcription ON transcription_jobs(transcription_id);
CREATE INDEX idx_transcription_jobs_user ON transcription_jobs(user_id);
CREATE INDEX idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX idx_transcription_jobs_priority ON transcription_jobs(priority, scheduled_at);
CREATE INDEX idx_transcription_jobs_scheduled ON transcription_jobs(scheduled_at);

-- Cost Tracking
CREATE INDEX idx_cost_tracking_user ON cost_tracking(user_id);
CREATE INDEX idx_cost_tracking_transcription ON cost_tracking(transcription_id);
CREATE INDEX idx_cost_tracking_service ON cost_tracking(service_type, provider);
CREATE INDEX idx_cost_tracking_billing_date ON cost_tracking(billing_date);
CREATE INDEX idx_cost_tracking_usage_date ON cost_tracking(usage_date);

-- Rate Limits
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start, window_duration_seconds);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(blocked_until);

-- ==============================================
-- Functions and Triggers for Workbook
-- ==============================================

-- Function to reset daily usage
CREATE OR REPLACE FUNCTION reset_daily_transcription_usage()
RETURNS void AS $$
BEGIN
    UPDATE workbook_users
    SET daily_transcription_used_minutes = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Function to check transcription limits
CREATE OR REPLACE FUNCTION validate_transcription_limits(
    p_user_id UUID,
    p_duration_minutes NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    user_record workbook_users%ROWTYPE;
    available_minutes INTEGER;
    projected_cost_cents INTEGER;
BEGIN
    SELECT * INTO user_record FROM workbook_users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check daily limit
    available_minutes := user_record.daily_transcription_limit_minutes - user_record.daily_transcription_used_minutes;
    IF available_minutes < p_duration_minutes THEN
        RETURN false;
    END IF;

    -- Check monthly cost limit (assuming $0.006 per minute)
    projected_cost_cents := ROUND(p_duration_minutes * 0.6); -- $0.006 * 100 cents
    IF (user_record.monthly_transcription_cost_cents + projected_cost_cents) > user_record.monthly_cost_limit_cents THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ language 'plpgsql';

-- Function to update session duration
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update user progress
CREATE OR REPLACE FUNCTION update_user_progress_stats()
RETURNS TRIGGER AS $$
DECLARE
    session_count INTEGER;
    note_count INTEGER;
    total_time INTEGER;
BEGIN
    -- Count sessions for this module
    SELECT COUNT(*), COALESCE(SUM(duration_seconds), 0)
    INTO session_count, total_time
    FROM workbook_sessions
    WHERE user_id = NEW.user_id
    AND workshop_module = NEW.module_id;

    -- Count notes for this module
    SELECT COUNT(*)
    INTO note_count
    FROM session_notes sn
    JOIN workbook_sessions ws ON sn.session_id = ws.id
    WHERE sn.user_id = NEW.user_id
    AND ws.workshop_module = NEW.module_id;

    -- Update progress record
    UPDATE user_progress SET
        sessions_count = session_count,
        notes_count = note_count,
        time_spent_seconds = total_time,
        last_accessed = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id AND module_id = NEW.module_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_workbook_users_updated_at BEFORE UPDATE ON workbook_users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workbook_sessions_updated_at BEFORE UPDATE ON workbook_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at BEFORE UPDATE ON session_notes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transcription_jobs_updated_at BEFORE UPDATE ON transcription_jobs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Session duration trigger
CREATE TRIGGER update_session_duration_trigger BEFORE UPDATE ON workbook_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_session_duration();

-- Progress tracking trigger
CREATE TRIGGER update_progress_on_session_change AFTER INSERT OR UPDATE ON workbook_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_user_progress_stats();

-- ==============================================
-- Security and Permissions
-- ==============================================

-- Grant permissions to app_user for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON workbook_users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON workbook_sessions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON audio_recordings TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON transcriptions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_notes TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_progress TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON transcription_jobs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON cost_tracking TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO app_user;

-- Grant readonly access for monitoring
GRANT SELECT ON workbook_users TO readonly_user;
GRANT SELECT ON workbook_sessions TO readonly_user;
GRANT SELECT ON audio_recordings TO readonly_user;
GRANT SELECT ON transcriptions TO readonly_user;
GRANT SELECT ON session_notes TO readonly_user;
GRANT SELECT ON user_progress TO readonly_user;
GRANT SELECT ON transcription_jobs TO readonly_user;
GRANT SELECT ON cost_tracking TO readonly_user;
GRANT SELECT ON rate_limits TO readonly_user;

-- ==============================================
-- Initial Data and Configuration
-- ==============================================

-- Create a scheduled job to reset daily usage (would need pg_cron extension)
-- SELECT cron.schedule('reset-daily-usage', '0 0 * * *', 'SELECT reset_daily_transcription_usage();');

-- Insert default workshop modules for progress tracking
INSERT INTO user_progress (user_id, module_id, module_name)
SELECT
    wu.id,
    module.id,
    module.name
FROM workbook_users wu
CROSS JOIN (VALUES
    ('intro', 'Introduction to 6FB Methodologies'),
    ('foundations', 'Business Foundations'),
    ('marketing', 'Marketing Strategies'),
    ('operations', 'Operations Excellence'),
    ('growth', 'Growth and Scaling'),
    ('conclusion', 'Implementation and Next Steps')
) AS module(id, name)
ON CONFLICT (user_id, module_id) DO NOTHING;

COMMIT;