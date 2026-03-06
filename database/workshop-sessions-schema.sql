-- ==============================================================
-- Workshop Sessions Schema
-- ==============================================================
-- Replaces course-based modules/lessons with session-based workshop agenda
-- Supports live keynotes, note-taking, and AI audio transcription
-- ==============================================================

BEGIN;

-- ==============================================================
-- WORKSHOP SESSIONS TABLE
-- ==============================================================
-- Represents individual keynote sessions in the workshop agenda
CREATE TABLE IF NOT EXISTS workshop_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    presenter VARCHAR(255),
    session_order INTEGER NOT NULL,

    -- Timing
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,

    -- Content
    session_type VARCHAR(50) DEFAULT 'keynote', -- keynote, workshop, qa, break
    key_points JSONB DEFAULT '[]'::JSONB,
    objectives JSONB DEFAULT '[]'::JSONB,
    resources JSONB DEFAULT '[]'::JSONB,

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    is_live BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,

    -- Metadata
    tags TEXT[],
    cover_image_url TEXT,
    presentation_url TEXT,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- SESSION ATTENDANCE TABLE
-- ==============================================================
-- Tracks which users attended which sessions
CREATE TABLE IF NOT EXISTS session_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workshop_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,

    -- Attendance tracking
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0, -- 0-100 based on notes, recordings, etc.

    -- Completion status
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(session_id, user_id)
);

-- ==============================================================
-- SESSION NOTES TABLE
-- ==============================================================
-- User notes taken during specific sessions
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workshop_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,

    -- Note content
    title VARCHAR(255),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, action_item, question, insight

    -- Timing context
    session_timestamp INTEGER, -- Seconds into the session when note was taken
    audio_timestamp INTEGER, -- If linked to audio recording

    -- Organization
    tags TEXT[],
    is_private BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- SESSION AUDIO RECORDINGS TABLE
-- ==============================================================
-- Audio recordings specific to workshop sessions
CREATE TABLE IF NOT EXISTS session_audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workshop_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,

    -- File information
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER,
    mime_type VARCHAR(100),

    -- Storage
    file_path TEXT,
    s3_bucket VARCHAR(255),
    s3_key VARCHAR(500),

    -- Transcription
    transcription_id UUID REFERENCES transcription_records(id),
    transcription_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed

    -- Session context
    session_start_offset INTEGER DEFAULT 0, -- Seconds into session when recording started

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- SESSION INSIGHTS TABLE
-- ==============================================================
-- AI-generated insights and summaries from sessions
CREATE TABLE IF NOT EXISTS session_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workshop_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE, -- NULL for session-wide insights

    -- Insight content
    insight_type VARCHAR(50) NOT NULL, -- summary, action_items, key_quotes, questions
    title VARCHAR(255),
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- AI confidence 0.00-1.00

    -- Source data
    source_type VARCHAR(50), -- transcription, notes, combination
    source_ids UUID[],

    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================

-- Session queries
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_schedule ON workshop_sessions(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_status ON workshop_sessions(status, is_live);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_order ON workshop_sessions(session_order);

-- Attendance queries
CREATE INDEX IF NOT EXISTS idx_session_attendance_user ON session_attendance(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id, completed);

-- Notes queries
CREATE INDEX IF NOT EXISTS idx_session_notes_user_session ON session_notes(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_timestamp ON session_notes(session_id, session_timestamp);
CREATE INDEX IF NOT EXISTS idx_session_notes_type ON session_notes(note_type, is_pinned);

-- Audio recordings queries
CREATE INDEX IF NOT EXISTS idx_session_audio_user ON session_audio_recordings(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_session_audio_transcription ON session_audio_recordings(transcription_status);

-- Insights queries
CREATE INDEX IF NOT EXISTS idx_session_insights_session ON session_insights(session_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_session_insights_user ON session_insights(user_id, insight_type);

-- ==============================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all session tables
CREATE TRIGGER update_workshop_sessions_updated_at
    BEFORE UPDATE ON workshop_sessions
    FOR EACH ROW EXECUTE FUNCTION update_session_updated_at();

CREATE TRIGGER update_session_attendance_updated_at
    BEFORE UPDATE ON session_attendance
    FOR EACH ROW EXECUTE FUNCTION update_session_updated_at();

CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW EXECUTE FUNCTION update_session_updated_at();

CREATE TRIGGER update_session_audio_recordings_updated_at
    BEFORE UPDATE ON session_audio_recordings
    FOR EACH ROW EXECUTE FUNCTION update_session_updated_at();

COMMIT;