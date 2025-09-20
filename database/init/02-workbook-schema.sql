-- ==============================================================
-- 6FB Workbook System - Core Database Tables
-- ==============================================================
-- This file creates all core tables for the 6FB Workbook system
-- based on the data model specification.
--
-- Tables created (in dependency order):
-- 1. workbook_users
-- 2. workshop_modules
-- 3. user_progress
-- 4. audio_recordings
-- 5. transcription_records
-- 6. workbook_notes
-- 7. live_sessions
-- 8. session_participants
-- ==============================================================

-- ==============================================================
-- 1. WORKBOOK USERS TABLE
-- ==============================================================

CREATE TABLE workbook_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    subscription_tier subscription_tier DEFAULT 'basic',
    workshop_access_granted BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_users_email_format CHECK (is_valid_email(email)),
    CONSTRAINT check_users_name_length CHECK (
        LENGTH(TRIM(first_name)) >= 1 AND LENGTH(TRIM(first_name)) <= 50 AND
        LENGTH(TRIM(last_name)) >= 1 AND LENGTH(TRIM(last_name)) <= 50
    )
);

-- Indexes for workbook_users
CREATE INDEX idx_users_email ON workbook_users(email);
CREATE INDEX idx_users_subscription ON workbook_users(subscription_tier);
CREATE INDEX idx_users_access ON workbook_users(workshop_access_granted) WHERE workshop_access_granted = true;
CREATE INDEX idx_users_last_login ON workbook_users(last_login_at DESC);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON workbook_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 2. WORKSHOP MODULES TABLE
-- ==============================================================

CREATE TABLE workshop_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    module_order INTEGER UNIQUE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    content JSONB NOT NULL,
    prerequisites JSONB DEFAULT '[]',
    is_published BOOLEAN DEFAULT false,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_modules_title_length CHECK (LENGTH(TRIM(title)) >= 5 AND LENGTH(TRIM(title)) <= 100),
    CONSTRAINT check_modules_order_range CHECK (module_order >= 1 AND module_order <= 50),
    CONSTRAINT check_modules_duration CHECK (duration_minutes > 0),
    CONSTRAINT check_modules_content_structure CHECK (is_valid_module_content(content)),
    CONSTRAINT check_modules_prerequisites_array CHECK (jsonb_typeof(prerequisites) = 'array')
);

-- Indexes for workshop_modules
CREATE INDEX idx_modules_order ON workshop_modules(module_order);
CREATE INDEX idx_modules_published ON workshop_modules(is_published);
CREATE INDEX idx_modules_search ON workshop_modules USING GIN(search_vector);
CREATE INDEX idx_modules_duration ON workshop_modules(duration_minutes);
CREATE INDEX idx_modules_prerequisites ON workshop_modules USING GIN(prerequisites);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_modules_updated_at
    BEFORE UPDATE ON workshop_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 3. USER PROGRESS TABLE
-- ==============================================================

CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
    lesson_id VARCHAR(50), -- References lesson ID within module content
    progress_percent INTEGER DEFAULT 0,
    status progress_status DEFAULT 'not_started',
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_progress_percent CHECK (progress_percent >= 0 AND progress_percent <= 100),
    CONSTRAINT check_time_spent CHECK (time_spent_minutes >= 0),
    CONSTRAINT check_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL AND progress_percent = 100) OR
        (status != 'completed' AND (completed_at IS NULL OR progress_percent < 100))
    ),

    -- Unique constraint for user-module-lesson combination
    UNIQUE(user_id, module_id, lesson_id)
);

-- Indexes for user_progress
CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_progress_module ON user_progress(module_id);
CREATE INDEX idx_progress_status ON user_progress(status);
CREATE INDEX idx_progress_completion ON user_progress(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_progress_recent ON user_progress(last_accessed_at DESC);
CREATE INDEX idx_progress_user_status ON user_progress(user_id, status);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 4. AUDIO RECORDINGS TABLE
-- ==============================================================

CREATE TABLE audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES workshop_modules(id),
    lesson_id VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}',
    transcription_id UUID, -- Forward reference to transcription_records
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_recordings_duration CHECK (duration_seconds > 0),
    CONSTRAINT check_recordings_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 104857600), -- 100MB max
    CONSTRAINT check_recordings_mime_type CHECK (
        mime_type IN ('audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/m4a', 'audio/ogg')
    ),
    CONSTRAINT check_recordings_url_format CHECK (file_url ~* '^https?://.*')
);

-- Indexes for audio_recordings
CREATE INDEX idx_recordings_user ON audio_recordings(user_id);
CREATE INDEX idx_recordings_module ON audio_recordings(module_id);
CREATE INDEX idx_recordings_processed ON audio_recordings(is_processed);
CREATE INDEX idx_recordings_created ON audio_recordings(created_at DESC);
CREATE INDEX idx_recordings_duration ON audio_recordings(duration_seconds);
CREATE INDEX idx_recordings_metadata ON audio_recordings USING GIN(metadata);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_recordings_updated_at
    BEFORE UPDATE ON audio_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 5. TRANSCRIPTION RECORDS TABLE
-- ==============================================================

CREATE TABLE transcription_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_recording_id UUID NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    text TEXT,
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    language VARCHAR(10),
    word_count INTEGER,
    processing_time INTEGER, -- Seconds to process
    metadata JSONB DEFAULT '{}',
    status transcription_status DEFAULT 'pending',
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(text, ''))
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_transcriptions_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT check_transcriptions_word_count CHECK (word_count IS NULL OR word_count >= 0),
    CONSTRAINT check_transcriptions_processing_time CHECK (processing_time IS NULL OR processing_time >= 0),
    CONSTRAINT check_transcriptions_completed_text CHECK (
        (status = 'completed' AND text IS NOT NULL AND LENGTH(TRIM(text)) > 0) OR
        (status != 'completed')
    ),
    CONSTRAINT check_transcriptions_language CHECK (language IS NULL OR LENGTH(language) BETWEEN 2 AND 10)
);

-- Indexes for transcription_records
CREATE INDEX idx_transcriptions_recording ON transcription_records(audio_recording_id);
CREATE INDEX idx_transcriptions_user ON transcription_records(user_id);
CREATE INDEX idx_transcriptions_status ON transcription_records(status);
CREATE INDEX idx_transcriptions_search ON transcription_records USING GIN(search_vector);
CREATE INDEX idx_transcriptions_confidence ON transcription_records(confidence DESC) WHERE confidence IS NOT NULL;
CREATE INDEX idx_transcriptions_language ON transcription_records(language);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_transcriptions_updated_at
    BEFORE UPDATE ON transcription_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 6. WORKBOOK NOTES TABLE
-- ==============================================================

CREATE TABLE workbook_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    module_id UUID REFERENCES workshop_modules(id),
    lesson_id VARCHAR(50),
    audio_recording_id UUID REFERENCES audio_recordings(id),
    timestamp INTEGER, -- Timestamp in audio/video (seconds)
    tags JSONB DEFAULT '[]',
    is_private BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_notes_title_length CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(TRIM(title)) <= 200),
    CONSTRAINT check_notes_content_not_empty CHECK (LENGTH(TRIM(content)) > 0),
    CONSTRAINT check_notes_timestamp CHECK (timestamp IS NULL OR timestamp >= 0),
    CONSTRAINT check_notes_tags_array CHECK (jsonb_typeof(tags) = 'array'),
    CONSTRAINT check_notes_timestamp_with_audio CHECK (
        (timestamp IS NOT NULL AND audio_recording_id IS NOT NULL) OR
        (timestamp IS NULL)
    )
);

-- Indexes for workbook_notes
CREATE INDEX idx_notes_user ON workbook_notes(user_id);
CREATE INDEX idx_notes_module ON workbook_notes(module_id);
CREATE INDEX idx_notes_tags ON workbook_notes USING GIN(tags);
CREATE INDEX idx_notes_search ON workbook_notes USING GIN(search_vector);
CREATE INDEX idx_notes_pinned ON workbook_notes(user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_private ON workbook_notes(user_id, is_private);
CREATE INDEX idx_notes_created ON workbook_notes(created_at DESC);
CREATE INDEX idx_notes_updated ON workbook_notes(updated_at DESC);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_notes_updated_at
    BEFORE UPDATE ON workbook_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 7. LIVE SESSIONS TABLE
-- ==============================================================

CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES workbook_users(id),
    module_id UUID REFERENCES workshop_modules(id),
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER DEFAULT 50,
    status session_status DEFAULT 'scheduled',
    features JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_sessions_title_length CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(TRIM(title)) <= 200),
    CONSTRAINT check_sessions_times CHECK (scheduled_end > scheduled_start),
    CONSTRAINT check_sessions_actual_times CHECK (
        actual_end IS NULL OR actual_start IS NULL OR actual_end >= actual_start
    ),
    CONSTRAINT check_sessions_max_participants CHECK (max_participants > 0 AND max_participants <= 1000),
    CONSTRAINT check_sessions_features_array CHECK (jsonb_typeof(features) = 'array'),
    CONSTRAINT check_sessions_status_logic CHECK (
        (status IN ('scheduled', 'cancelled') AND actual_start IS NULL) OR
        (status NOT IN ('scheduled', 'cancelled'))
    )
);

-- Indexes for live_sessions
CREATE INDEX idx_sessions_instructor ON live_sessions(instructor_id);
CREATE INDEX idx_sessions_status ON live_sessions(status);
CREATE INDEX idx_sessions_schedule ON live_sessions(scheduled_start, scheduled_end);
CREATE INDEX idx_sessions_module ON live_sessions(module_id);
CREATE INDEX idx_sessions_upcoming ON live_sessions(scheduled_start) WHERE status = 'scheduled' AND scheduled_start > CURRENT_TIMESTAMP;
CREATE INDEX idx_sessions_active ON live_sessions(status) WHERE status IN ('starting', 'active', 'paused');

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON live_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- 8. SESSION PARTICIPANTS TABLE
-- ==============================================================

CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    role participant_role DEFAULT 'participant',
    permissions JSONB DEFAULT '["can_speak"]',
    participation_score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_participants_session_times CHECK (
        left_at IS NULL OR left_at >= joined_at
    ),
    CONSTRAINT check_participants_score CHECK (participation_score >= 0 AND participation_score <= 1000),
    CONSTRAINT check_participants_permissions_array CHECK (jsonb_typeof(permissions) = 'array'),

    -- Unique constraint for user-session combination
    UNIQUE(session_id, user_id)
);

-- Indexes for session_participants
CREATE INDEX idx_participants_session ON session_participants(session_id);
CREATE INDEX idx_participants_user ON session_participants(user_id);
CREATE INDEX idx_participants_role ON session_participants(role);
CREATE INDEX idx_participants_active ON session_participants(session_id, left_at) WHERE left_at IS NULL;
CREATE INDEX idx_participants_score ON session_participants(participation_score DESC);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_participants_updated_at
    BEFORE UPDATE ON session_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- ADD FOREIGN KEY FOR TRANSCRIPTION REFERENCE
-- ==============================================================

-- Now we can add the foreign key constraint for transcription_id in audio_recordings
ALTER TABLE audio_recordings
ADD CONSTRAINT fk_recordings_transcription
FOREIGN KEY (transcription_id) REFERENCES transcription_records(id);

-- ==============================================================
-- HELPFUL VIEWS
-- ==============================================================

-- View for user dashboard summary
CREATE VIEW user_dashboard_summary AS
SELECT
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.subscription_tier,
    u.last_login_at,
    COALESCE(AVG(p.progress_percent), 0) as overall_progress,
    COUNT(DISTINCT p.module_id) as modules_started,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.module_id END) as modules_completed,
    COUNT(DISTINCT ar.id) as recordings_count,
    COUNT(DISTINCT n.id) as notes_count,
    MAX(p.last_accessed_at) as last_activity_at
FROM workbook_users u
LEFT JOIN user_progress p ON u.id = p.user_id
LEFT JOIN audio_recordings ar ON u.id = ar.user_id
LEFT JOIN workbook_notes n ON u.id = n.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.subscription_tier, u.last_login_at;

-- View for module progress with prerequisites
CREATE VIEW module_progress_view AS
SELECT
    m.id as module_id,
    m.title,
    m.description,
    m.module_order,
    m.duration_minutes,
    m.is_published,
    p.user_id,
    COALESCE(p.progress_percent, 0) as progress_percent,
    COALESCE(p.status, 'not_started') as progress_status,
    p.last_accessed_at,
    p.completed_at,
    CASE
        WHEN COALESCE(jsonb_array_length(m.prerequisites), 0) = 0 THEN true
        ELSE NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(m.prerequisites) AS prereq
            WHERE NOT EXISTS (
                SELECT 1 FROM user_progress p2
                WHERE p2.user_id = p.user_id
                AND p2.module_id = prereq::uuid
                AND p2.status = 'completed'
            )
        )
    END as is_accessible
FROM workshop_modules m
LEFT JOIN user_progress p ON m.id = p.module_id;

-- ==============================================================
-- DATABASE COMMENTS
-- ==============================================================

COMMENT ON TABLE workbook_users IS 'Core user accounts with subscription and access control';
COMMENT ON TABLE workshop_modules IS 'Workshop content modules with JSONB lesson structures';
COMMENT ON TABLE user_progress IS 'User progress tracking through modules and lessons';
COMMENT ON TABLE audio_recordings IS 'User-generated audio content with metadata';
COMMENT ON TABLE transcription_records IS 'AI-generated transcriptions with search capabilities';
COMMENT ON TABLE workbook_notes IS 'User notes with rich text and linking capabilities';
COMMENT ON TABLE live_sessions IS 'Live workshop sessions with real-time features';
COMMENT ON TABLE session_participants IS 'Participant tracking for live sessions';

COMMENT ON VIEW user_dashboard_summary IS 'Aggregated user progress and activity summary';
COMMENT ON VIEW module_progress_view IS 'Module progress with prerequisite checking logic';

-- ==============================================================
-- PERFORMANCE MONITORING
-- ==============================================================

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    size_pretty TEXT,
    index_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        t.n_tup_ins - t.n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size_pretty,
        COUNT(i.indexname) as index_count
    FROM pg_stat_user_tables t
    JOIN pg_class c ON c.relname = t.relname
    LEFT JOIN pg_indexes i ON i.tablename = t.relname
    WHERE t.schemaname = 'public'
    AND t.relname IN (
        'workbook_users', 'workshop_modules', 'user_progress',
        'audio_recordings', 'transcription_records', 'workbook_notes',
        'live_sessions', 'session_participants'
    )
    GROUP BY t.table_name, t.n_tup_ins, t.n_tup_del, c.oid
    ORDER BY row_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_table_stats() IS 'Monitor table sizes and performance metrics';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE '6FB Workbook Database Schema Created Successfully!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables created: 8';
    RAISE NOTICE 'Views created: 2';
    RAISE NOTICE 'Indexes created: 50+';
    RAISE NOTICE 'Custom types: 7';
    RAISE NOTICE 'Utility functions: 4';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run workshop-content.sql to seed initial data';
    RAISE NOTICE '2. Create application user accounts';
    RAISE NOTICE '3. Set up connection pooling';
    RAISE NOTICE '4. Configure backup strategy';
    RAISE NOTICE '=================================================';
END $$;