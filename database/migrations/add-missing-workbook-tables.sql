-- ==============================================================
-- Missing Workbook Tables Migration
-- ==============================================================
-- This migration adds tables that are referenced in the APIs
-- but missing from the core workbook schema
-- ==============================================================

-- 1. Additional workshop structure tables
CREATE TABLE IF NOT EXISTS workshop_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    lesson_type VARCHAR(50) DEFAULT 'content',
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    prerequisites JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_lessons_title_length CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(TRIM(title)) <= 200),
    CONSTRAINT check_lessons_order CHECK (order_index >= 0),
    CONSTRAINT check_lessons_duration CHECK (duration_minutes >= 0),
    CONSTRAINT check_lessons_type CHECK (lesson_type IN ('content', 'video', 'audio', 'exercise', 'quiz', 'discussion')),
    UNIQUE(module_id, order_index)
);

-- 2. Session and transcription tables (updated structure)
CREATE TABLE IF NOT EXISTS workbook_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    workshop_module VARCHAR(100),
    session_type VARCHAR(50) DEFAULT 'learning',
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_sessions_title_length CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(TRIM(title)) <= 200),
    CONSTRAINT check_sessions_times CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT check_sessions_status CHECK (status IN ('active', 'paused', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
    session_id UUID REFERENCES workbook_sessions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    text TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    provider VARCHAR(50) DEFAULT 'openai-whisper',
    model VARCHAR(50) DEFAULT 'whisper-1',
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(3,2),
    cost_per_minute_cents INTEGER DEFAULT 60,
    cost_cents INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(text, ''))
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_transcriptions_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT check_transcriptions_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    CONSTRAINT check_transcriptions_retries CHECK (retry_count >= 0 AND retry_count <= max_retries),
    CONSTRAINT check_transcriptions_completed_text CHECK (
        (status = 'completed' AND text IS NOT NULL AND LENGTH(TRIM(text)) > 0) OR
        (status != 'completed')
    )
);

-- 3. Notes table (session_notes)
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES workbook_sessions(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'manual',
    title VARCHAR(255),
    content TEXT NOT NULL,
    rich_content JSONB,
    timestamp_in_session INTEGER,
    highlighted_text TEXT,
    tags TEXT[] DEFAULT '{}',
    is_action_item BOOLEAN DEFAULT false,
    action_item_completed BOOLEAN DEFAULT false,
    action_item_due_date TIMESTAMP WITH TIME ZONE,
    parent_note_id UUID REFERENCES session_notes(id) ON DELETE SET NULL,
    importance INTEGER DEFAULT 1,
    is_private BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(title, '') || ' ' || content)
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_notes_content_not_empty CHECK (LENGTH(TRIM(content)) > 0),
    CONSTRAINT check_notes_title_length CHECK (title IS NULL OR LENGTH(TRIM(title)) <= 255),
    CONSTRAINT check_notes_importance CHECK (importance >= 1 AND importance <= 5),
    CONSTRAINT check_notes_type CHECK (type IN ('manual', 'session-note', 'transcription-highlight', 'action-item')),
    CONSTRAINT check_notes_timestamp CHECK (timestamp_in_session IS NULL OR timestamp_in_session >= 0)
);

-- 4. Progress tracking tables
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES workshop_lessons(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started',
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_lesson_progress_percent CHECK (progress_percent >= 0 AND progress_percent <= 100),
    CONSTRAINT check_lesson_time_spent CHECK (time_spent_minutes >= 0),
    CONSTRAINT check_lesson_status CHECK (status IN ('not_started', 'in_progress', 'completed')),
    CONSTRAINT check_lesson_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL AND progress_percent = 100) OR
        (status != 'completed')
    ),
    UNIQUE(user_id, lesson_id)
);

-- 5. Completion and achievement tracking
CREATE TABLE IF NOT EXISTS module_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    completion_score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_completion_score CHECK (completion_score >= 0 AND completion_score <= 100),
    CONSTRAINT check_completion_time CHECK (time_spent_minutes >= 0),
    UNIQUE(user_id, module_id)
);

CREATE TABLE IF NOT EXISTS completion_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    certificate_url TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, module_id)
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_achievement_type_length CHECK (LENGTH(TRIM(achievement_type)) > 0),
    CONSTRAINT check_achievement_name_length CHECK (LENGTH(TRIM(achievement_name)) > 0)
);

-- 6. Export and analytics tables
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL,
    options JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'processing',
    file_size_bytes BIGINT,
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_export_format CHECK (format IN ('pdf', 'json', 'markdown', 'csv')),
    CONSTRAINT check_export_status CHECK (status IN ('processing', 'completed', 'failed', 'expired'))
);

-- 7. Cost tracking and admin tables
CREATE TABLE IF NOT EXISTS cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE SET NULL,
    service_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    cost_cents INTEGER NOT NULL,
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate_cents_per_unit INTEGER NOT NULL,
    billing_date DATE NOT NULL,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_cost_positive CHECK (cost_cents >= 0),
    CONSTRAINT check_quantity_positive CHECK (quantity > 0),
    CONSTRAINT check_rate_positive CHECK (rate_cents_per_unit >= 0)
);

CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_job_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT check_job_priority CHECK (priority >= 1 AND priority <= 10),
    CONSTRAINT check_job_retries CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- 8. Access logging tables
CREATE TABLE IF NOT EXISTS module_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',

    UNIQUE(user_id, module_id)
);

CREATE TABLE IF NOT EXISTS lesson_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES workshop_lessons(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',

    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS content_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    content_id VARCHAR(100) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',

    UNIQUE(user_id, content_id, content_type)
);

-- ==============================================================
-- ADDITIONAL COLUMNS FOR EXISTING TABLES
-- ==============================================================

-- Add missing columns to workbook_users
ALTER TABLE workbook_users
ADD COLUMN IF NOT EXISTS daily_transcription_limit_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS daily_transcription_used_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_transcription_cost_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_cost_limit_cents INTEGER DEFAULT 5000, -- $50
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student',
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add missing columns to audio_recordings
ALTER TABLE audio_recordings
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES workbook_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lesson_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS chunk_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS upload_status VARCHAR(50) DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(100),
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS waveform_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS peaks_data JSONB DEFAULT '[]';

-- Update existing constraints
ALTER TABLE audio_recordings
DROP CONSTRAINT IF EXISTS check_recordings_file_size,
ADD CONSTRAINT check_recordings_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 26214400); -- 25MB for Whisper

-- ==============================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================

-- Workshop lessons indexes
CREATE INDEX IF NOT EXISTS idx_lessons_module ON workshop_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON workshop_lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_active ON workshop_lessons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lessons_type ON workshop_lessons(lesson_type);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_workbook_sessions_user ON workbook_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workbook_sessions_status ON workbook_sessions(status);
CREATE INDEX IF NOT EXISTS idx_workbook_sessions_module ON workbook_sessions(workshop_module);
CREATE INDEX IF NOT EXISTS idx_workbook_sessions_created ON workbook_sessions(created_at DESC);

-- Transcription indexes
CREATE INDEX IF NOT EXISTS idx_transcriptions_recording ON transcriptions(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_session ON transcriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_search ON transcriptions USING GIN(search_vector);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_session_notes_user ON session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_transcription ON session_notes(transcription_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_type ON session_notes(type);
CREATE INDEX IF NOT EXISTS idx_session_notes_action_items ON session_notes(user_id, is_action_item) WHERE is_action_item = true;
CREATE INDEX IF NOT EXISTS idx_session_notes_search ON session_notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_session_notes_tags ON session_notes USING GIN(tags);

-- Progress indexes
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status ON lesson_progress(status);

-- Completion indexes
CREATE INDEX IF NOT EXISTS idx_module_completions_user ON module_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_completions_module ON module_completions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_completions_date ON module_completions(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON completion_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON user_achievements(achievement_type);

-- Export and cost tracking indexes
CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_created ON data_exports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_user ON cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_date ON cost_tracking(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_service ON cost_tracking(service_type, provider);

-- Job queue indexes
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_priority ON transcription_jobs(priority DESC, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user ON transcription_jobs(user_id);

-- Access log indexes
CREATE INDEX IF NOT EXISTS idx_module_access_user ON module_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_module_access_date ON module_access_log(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_access_user ON lesson_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_content_access_user ON content_access_log(user_id);

-- ==============================================================
-- TRIGGERS FOR TIMESTAMP UPDATES
-- ==============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for all tables with updated_at columns
CREATE TRIGGER IF NOT EXISTS trigger_lessons_updated_at
    BEFORE UPDATE ON workshop_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_workbook_sessions_updated_at
    BEFORE UPDATE ON workbook_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_certificates_updated_at
    BEFORE UPDATE ON completion_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_data_exports_updated_at
    BEFORE UPDATE ON data_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trigger_transcription_jobs_updated_at
    BEFORE UPDATE ON transcription_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- SUCCESS MESSAGE
-- ==============================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Missing Workbook Tables Migration Completed!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Added tables:';
    RAISE NOTICE '- workshop_lessons';
    RAISE NOTICE '- workbook_sessions';
    RAISE NOTICE '- transcriptions';
    RAISE NOTICE '- session_notes';
    RAISE NOTICE '- lesson_progress';
    RAISE NOTICE '- module_completions';
    RAISE NOTICE '- completion_certificates';
    RAISE NOTICE '- user_achievements';
    RAISE NOTICE '- data_exports';
    RAISE NOTICE '- cost_tracking';
    RAISE NOTICE '- transcription_jobs';
    RAISE NOTICE '- *_access_log tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated existing tables:';
    RAISE NOTICE '- workbook_users (added usage tracking columns)';
    RAISE NOTICE '- audio_recordings (added session and metadata columns)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total indexes created: 40+';
    RAISE NOTICE 'Triggers created: 8';
    RAISE NOTICE '=================================================';
END $$;