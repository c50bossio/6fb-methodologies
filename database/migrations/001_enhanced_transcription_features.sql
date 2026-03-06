-- ==============================================================
-- Enhanced Transcription Features Migration
-- ==============================================================
-- This migration adds enhanced features for transcription processing,
-- search indexing, and queue management to the existing workbook schema.
-- ==============================================================

BEGIN;

-- Add error_message column to transcriptions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transcriptions'
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE transcriptions ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Add formatted_text column for formatted transcriptions with timestamps
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transcriptions'
        AND column_name = 'formatted_text'
    ) THEN
        ALTER TABLE transcriptions ADD COLUMN formatted_text TEXT;
    END IF;
END $$;

-- Add sentiment_score column for AI sentiment analysis
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transcriptions'
        AND column_name = 'sentiment_score'
    ) THEN
        ALTER TABLE transcriptions ADD COLUMN sentiment_score DECIMAL(3,2);
    END IF;
END $$;

-- Add action_items column for extracted action items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transcriptions'
        AND column_name = 'action_items'
    ) THEN
        ALTER TABLE transcriptions ADD COLUMN action_items TEXT[];
    END IF;
END $$;

-- Add transcription_segments table for detailed segment data
CREATE TABLE IF NOT EXISTS transcription_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id VARCHAR(50) NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    text TEXT NOT NULL,
    confidence_score DECIMAL(5,3),
    speaker_id VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (transcription_id, segment_index)
);

-- Add transcription_words table for word-level timestamps
CREATE TABLE IF NOT EXISTS transcription_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id VARCHAR(50) NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES transcription_segments(id) ON DELETE CASCADE,
    word_index INTEGER NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    word TEXT NOT NULL,
    confidence_score DECIMAL(5,3),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (transcription_id, word_index)
);

-- Add transcription_queue table for job queue management
CREATE TABLE IF NOT EXISTS transcription_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id VARCHAR(50) NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    estimated_duration_seconds INTEGER,
    actual_duration_seconds INTEGER,
    queue_position INTEGER,
    assigned_worker VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_transcriptions_error_message ON transcriptions(error_message) WHERE error_message IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transcriptions_action_items ON transcriptions USING gin(action_items) WHERE action_items IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transcriptions_sentiment ON transcriptions(sentiment_score) WHERE sentiment_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transcriptions_word_count ON transcriptions(word_count);
CREATE INDEX IF NOT EXISTS idx_transcriptions_character_count ON transcriptions(character_count);

-- Segment indexes
CREATE INDEX IF NOT EXISTS idx_transcription_segments_transcription ON transcription_segments(transcription_id);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_time_range ON transcription_segments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_speaker ON transcription_segments(speaker_id);

-- Word indexes
CREATE INDEX IF NOT EXISTS idx_transcription_words_transcription ON transcription_words(transcription_id);
CREATE INDEX IF NOT EXISTS idx_transcription_words_segment ON transcription_words(segment_id);
CREATE INDEX IF NOT EXISTS idx_transcription_words_time_range ON transcription_words(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_transcription_words_word ON transcription_words(word);

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_transcription_queue_status ON transcription_queue(status);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_priority ON transcription_queue(priority);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_created ON transcription_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_worker ON transcription_queue(assigned_worker);

-- Add enhanced search indexes
CREATE INDEX IF NOT EXISTS idx_transcriptions_gin_text ON transcriptions USING gin(to_tsvector('english', COALESCE(text, '')));
CREATE INDEX IF NOT EXISTS idx_transcriptions_gin_summary ON transcriptions USING gin(to_tsvector('english', COALESCE(summary, '')));
CREATE INDEX IF NOT EXISTS idx_transcriptions_gin_combined ON transcriptions USING gin(
    to_tsvector('english',
        COALESCE(text, '') || ' ' ||
        COALESCE(summary, '') || ' ' ||
        COALESCE(array_to_string(key_topics, ' '), '')
    )
);

-- Enhanced search function for transcriptions
CREATE OR REPLACE FUNCTION search_transcriptions_enhanced(
    search_query TEXT,
    user_id_filter UUID DEFAULT NULL,
    language_filter VARCHAR(10) DEFAULT NULL,
    min_confidence DECIMAL(3,2) DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    result_limit INTEGER DEFAULT 20,
    result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id VARCHAR(50),
    text TEXT,
    summary TEXT,
    language VARCHAR(10),
    confidence_score DECIMAL(3,2),
    word_count INTEGER,
    key_topics TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    relevance_score REAL,
    highlight TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.text,
        t.summary,
        t.language,
        t.confidence_score,
        t.word_count,
        t.key_topics,
        t.created_at,
        ts_rank(t.search_vector, plainto_tsquery('english', search_query)) as relevance_score,
        ts_headline('english', t.text, plainto_tsquery('english', search_query),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as highlight
    FROM transcriptions t
    WHERE
        (user_id_filter IS NULL OR t.user_id = user_id_filter) AND
        (language_filter IS NULL OR t.language = language_filter) AND
        (min_confidence IS NULL OR t.confidence_score >= min_confidence) AND
        (date_from IS NULL OR t.created_at >= date_from) AND
        (date_to IS NULL OR t.created_at <= date_to) AND
        (search_query IS NULL OR t.search_vector @@ plainto_tsquery('english', search_query)) AND
        t.status = 'completed'
    ORDER BY
        CASE
            WHEN search_query IS NOT NULL THEN ts_rank(t.search_vector, plainto_tsquery('english', search_query))
            ELSE 0
        END DESC,
        t.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to update transcription search vector including segments
CREATE OR REPLACE FUNCTION update_transcription_search_vector_enhanced()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the main transcription search vector
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.text, '') || ' ' ||
        COALESCE(NEW.summary, '') || ' ' ||
        COALESCE(array_to_string(NEW.key_topics, ' '), '') || ' ' ||
        COALESCE(array_to_string(NEW.action_items, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the existing trigger to use enhanced function
DROP TRIGGER IF EXISTS update_transcriptions_search ON transcriptions;
CREATE TRIGGER update_transcriptions_search
    BEFORE INSERT OR UPDATE ON transcriptions
    FOR EACH ROW EXECUTE PROCEDURE update_transcription_search_vector_enhanced();

-- Function to manage transcription queue priorities
CREATE OR REPLACE FUNCTION update_queue_priorities()
RETURNS TRIGGER AS $$
BEGIN
    -- Update queue positions based on priority and creation time
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.priority != NEW.priority) THEN
        UPDATE transcription_queue
        SET queue_position = ranked.new_position
        FROM (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    ORDER BY
                        CASE priority
                            WHEN 'high' THEN 1
                            WHEN 'normal' THEN 2
                            WHEN 'low' THEN 3
                        END,
                        created_at ASC
                ) as new_position
            FROM transcription_queue
            WHERE status = 'queued'
        ) ranked
        WHERE transcription_queue.id = ranked.id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for queue priority management
CREATE TRIGGER update_queue_priorities_trigger
    AFTER INSERT OR UPDATE ON transcription_queue
    FOR EACH ROW EXECUTE PROCEDURE update_queue_priorities();

-- Function to clean up old failed transcriptions
CREATE OR REPLACE FUNCTION cleanup_old_transcriptions(
    days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM transcriptions
    WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '1 day' * days_old;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup
    INSERT INTO system_metrics (metric_type, metric_name, value, unit, tags, recorded_at)
    VALUES ('cleanup', 'transcriptions_deleted', deleted_count, 'count',
            jsonb_build_object('days_old', days_old), NOW());

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_transcription_segments_updated_at
    BEFORE UPDATE ON transcription_segments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transcription_words_updated_at
    BEFORE UPDATE ON transcription_words
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transcription_queue_updated_at
    BEFORE UPDATE ON transcription_queue
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Update existing transcriptions to populate search vectors
UPDATE transcriptions
SET search_vector = to_tsvector('english',
    COALESCE(text, '') || ' ' ||
    COALESCE(summary, '') || ' ' ||
    COALESCE(array_to_string(key_topics, ' '), '') || ' ' ||
    COALESCE(array_to_string(action_items, ' '), '')
)
WHERE search_vector IS NULL;

-- Grant permissions to workbook_app_user for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON transcription_segments TO workbook_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON transcription_words TO workbook_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON transcription_queue TO workbook_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO workbook_app_user;
GRANT EXECUTE ON FUNCTION search_transcriptions_enhanced TO workbook_app_user;
GRANT EXECUTE ON FUNCTION cleanup_old_transcriptions TO workbook_app_user;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Enhanced Transcription Features Migration Complete!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Successfully added:';
    RAISE NOTICE '- Enhanced transcription schema with segments and words';
    RAISE NOTICE '- Queue management system for transcription jobs';
    RAISE NOTICE '- Advanced search indexing and functions';
    RAISE NOTICE '- Automated cleanup and maintenance functions';
    RAISE NOTICE '- Performance indexes for large-scale operations';
    RAISE NOTICE '=================================================================';
END $$;