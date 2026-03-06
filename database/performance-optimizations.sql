-- ==============================================================
-- 6FB Workbook System - Performance Optimizations
-- ==============================================================
-- Additional indexes and optimizations for performance
-- Run this after workbook-schema.sql for enhanced performance
-- ==============================================================

-- Additional Performance Indexes
-- ==============================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_user_accessed
ON user_progress(user_id, last_accessed DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_module_completed
ON user_progress(module_id, completed, progress_percentage);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workshop_modules_published_order
ON workshop_modules(is_published, module_order) WHERE is_published = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcriptions_user_status
ON transcriptions(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_notes_user_module
ON session_notes(user_id, module_id, created_at DESC);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workbook_users_active_login
ON workbook_users(last_login_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workbook_sessions_active
ON workbook_sessions(user_id, status, created_at DESC) WHERE status != 'cancelled';

-- JSONB indexes for metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workshop_modules_content_gin
ON workshop_modules USING gin(content);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_metadata_gin
ON user_progress USING gin(metadata);

-- ==============================================================
-- Materialized Views for Analytics
-- ==============================================================

-- User progress summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_progress_summary AS
SELECT
    u.id as user_id,
    u.email,
    u.subscription_tier,
    COUNT(up.id) as modules_started,
    COUNT(CASE WHEN up.completed = true THEN 1 END) as modules_completed,
    COALESCE(AVG(up.progress_percentage), 0) as average_progress,
    COALESCE(SUM(up.time_spent_seconds), 0) as total_time_spent_seconds,
    MAX(up.last_accessed) as last_activity_at,
    u.created_at as user_created_at,
    NOW() as last_updated
FROM workbook_users u
LEFT JOIN user_progress up ON u.id = up.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.subscription_tier, u.created_at;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_progress_summary_user_id
ON user_progress_summary(user_id);

-- Module engagement summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS module_engagement_summary AS
SELECT
    wm.id as module_id,
    wm.title,
    wm.module_order,
    wm.difficulty_level,
    COUNT(up.id) as total_enrollments,
    COUNT(CASE WHEN up.completed = true THEN 1 END) as total_completions,
    COALESCE(AVG(up.progress_percentage), 0) as average_progress,
    COALESCE(AVG(up.time_spent_seconds), 0) as average_time_spent_seconds,
    COALESCE(
        ROUND(
            COUNT(CASE WHEN up.completed = true THEN 1 END)::numeric /
            NULLIF(COUNT(up.id), 0) * 100, 2
        ), 0
    ) as completion_rate,
    NOW() as last_updated
FROM workshop_modules wm
LEFT JOIN user_progress up ON wm.id = up.module_id
WHERE wm.is_published = true
GROUP BY wm.id, wm.title, wm.module_order, wm.difficulty_level;

-- Create unique index on module engagement view
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_engagement_summary_module_id
ON module_engagement_summary(module_id);

-- ==============================================================
-- Refresh Functions for Materialized Views
-- ==============================================================

-- Function to refresh user progress summary
CREATE OR REPLACE FUNCTION refresh_user_progress_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_progress_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh module engagement summary
CREATE OR REPLACE FUNCTION refresh_module_engagement_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY module_engagement_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS void AS $$
BEGIN
    PERFORM refresh_user_progress_summary();
    PERFORM refresh_module_engagement_summary();
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Database Performance Functions
-- ==============================================================

-- Function to get user progress with modules in a single query
CREATE OR REPLACE FUNCTION get_user_modules_with_progress(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_published_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
    module_id UUID,
    module_title VARCHAR(255),
    module_description TEXT,
    module_order INTEGER,
    duration_minutes INTEGER,
    difficulty_level VARCHAR(20),
    tags TEXT[],
    is_published BOOLEAN,
    prerequisites UUID[],
    progress_id VARCHAR(50),
    progress_percentage INTEGER,
    completed BOOLEAN,
    time_spent_seconds INTEGER,
    last_accessed TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wm.id,
        wm.title,
        wm.description,
        wm.module_order,
        wm.duration_minutes,
        wm.difficulty_level,
        wm.tags,
        wm.is_published,
        wm.prerequisites,
        up.id as progress_id,
        up.progress_percentage,
        up.completed,
        up.time_spent_seconds,
        up.last_accessed,
        up.completed_at
    FROM workshop_modules wm
    LEFT JOIN user_progress up ON wm.id = up.module_id AND up.user_id = p_user_id
    WHERE (p_published_only = false OR wm.is_published = true)
    ORDER BY wm.module_order ASC, wm.created_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get user analytics in a single query
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS TABLE (
    modules_started INTEGER,
    modules_completed INTEGER,
    average_progress NUMERIC,
    total_time_spent_minutes INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    preferred_study_hours INTEGER[],
    completion_rate_by_difficulty JSONB
) AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Get basic progress stats
    SELECT
        COUNT(up.id)::INTEGER,
        COUNT(CASE WHEN up.completed = true THEN 1 END)::INTEGER,
        COALESCE(AVG(up.progress_percentage), 0)::NUMERIC,
        COALESCE(ROUND(SUM(up.time_spent_seconds) / 60.0), 0)::INTEGER,
        MAX(up.last_accessed)
    INTO
        result_record
    FROM user_progress up
    WHERE up.user_id = p_user_id;

    -- Calculate streaks and study patterns (simplified for performance)
    -- In a real implementation, you'd want more sophisticated streak calculation

    RETURN QUERY
    SELECT
        result_record.count,
        result_record.count_1,
        result_record.avg,
        result_record.round,
        0, -- current_streak (placeholder)
        0, -- longest_streak (placeholder)
        result_record.max,
        ARRAY[]::INTEGER[], -- preferred_study_hours (placeholder)
        '{}'::JSONB; -- completion_rate_by_difficulty (placeholder)
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Cache Management Functions
-- ==============================================================

-- Function to get cache key for user modules
CREATE OR REPLACE FUNCTION get_user_modules_cache_key(
    p_user_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 50
)
RETURNS TEXT AS $$
BEGIN
    RETURN format('user_modules:%s:page_%s:limit_%s', p_user_id, p_page, p_limit);
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate user cache
CREATE OR REPLACE FUNCTION invalidate_user_cache(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- This would integrate with Redis to invalidate cache keys
    -- For now, it's a placeholder for the application layer
    RAISE NOTICE 'Cache invalidation needed for user: %', p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Performance Monitoring
-- ==============================================================

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
    p_query_type VARCHAR(50),
    p_execution_time_ms INTEGER,
    p_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO system_metrics (
        metric_type,
        metric_name,
        value,
        unit,
        tags,
        recorded_at
    ) VALUES (
        'performance',
        'slow_query',
        p_execution_time_ms,
        'milliseconds',
        jsonb_build_object(
            'query_type', p_query_type,
            'user_id', p_user_id,
            'metadata', p_metadata
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Automated Maintenance
-- ==============================================================

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE workbook_users;
    ANALYZE workshop_modules;
    ANALYZE user_progress;
    ANALYZE transcriptions;
    ANALYZE session_notes;
    ANALYZE audio_recordings;

    -- Log the statistics update
    INSERT INTO system_metrics (
        metric_type,
        metric_name,
        value,
        unit,
        recorded_at
    ) VALUES (
        'maintenance',
        'statistics_updated',
        1,
        'count',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Database Health Checks
-- ==============================================================

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    value NUMERIC,
    threshold NUMERIC,
    message TEXT
) AS $$
BEGIN
    -- Check connection count
    RETURN QUERY
    SELECT
        'active_connections'::TEXT,
        CASE WHEN count(*) < 80 THEN 'healthy' ELSE 'warning' END::TEXT,
        count(*)::NUMERIC,
        80::NUMERIC,
        format('Active connections: %s', count(*))::TEXT
    FROM pg_stat_activity
    WHERE state = 'active';

    -- Check cache hit ratio
    RETURN QUERY
    SELECT
        'cache_hit_ratio'::TEXT,
        CASE WHEN ratio > 0.95 THEN 'healthy' ELSE 'warning' END::TEXT,
        ratio::NUMERIC,
        0.95::NUMERIC,
        format('Cache hit ratio: %s%%', round(ratio * 100, 2))::TEXT
    FROM (
        SELECT
            sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as ratio
        FROM pg_statio_user_tables
    ) t;

    -- Check table sizes
    RETURN QUERY
    SELECT
        'largest_table'::TEXT,
        CASE WHEN size_mb < 1000 THEN 'healthy' ELSE 'info' END::TEXT,
        size_mb::NUMERIC,
        1000::NUMERIC,
        format('Largest table: %s (%s MB)', table_name, size_mb)::TEXT
    FROM (
        SELECT
            schemaname||'.'||tablename as table_name,
            round(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 1
    ) t;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- Success Message
-- ==============================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '6FB Workbook Performance Optimizations Applied Successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Applied optimizations:';
    RAISE NOTICE '- Additional composite indexes for common query patterns';
    RAISE NOTICE '- Materialized views for analytics with refresh functions';
    RAISE NOTICE '- Performance-optimized database functions';
    RAISE NOTICE '- Cache management and invalidation functions';
    RAISE NOTICE '- Database health monitoring functions';
    RAISE NOTICE '- Automated maintenance procedures';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up Redis caching layer in application';
    RAISE NOTICE '2. Implement API route optimizations';
    RAISE NOTICE '3. Schedule materialized view refreshes';
    RAISE NOTICE '4. Set up performance monitoring dashboard';
    RAISE NOTICE '=================================================================';
END $$;