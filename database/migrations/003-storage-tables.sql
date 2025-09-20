-- ==============================================================
-- Storage System Tables - Audit Log and Cleanup Jobs
-- ==============================================================
-- This migration adds tables to support the file storage system
-- with audit logging and automated cleanup capabilities.
--
-- Tables created:
-- 1. storage_audit_log - Track all file operations
-- 2. storage_cleanup_jobs - Track automated cleanup operations
-- ==============================================================

-- ==============================================================
-- 1. STORAGE AUDIT LOG TABLE
-- ==============================================================

CREATE TABLE storage_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(20) NOT NULL CHECK (action IN ('upload', 'download', 'delete', 'access')),
    file_key VARCHAR(1000) NOT NULL,
    user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    file_size BIGINT,
    processing_time INTEGER, -- milliseconds
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_audit_file_key_not_empty CHECK (LENGTH(TRIM(file_key)) > 0),
    CONSTRAINT check_audit_file_size CHECK (file_size IS NULL OR file_size >= 0),
    CONSTRAINT check_audit_processing_time CHECK (processing_time IS NULL OR processing_time >= 0),
    CONSTRAINT check_audit_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes for storage_audit_log
CREATE INDEX idx_audit_action ON storage_audit_log(action);
CREATE INDEX idx_audit_user ON storage_audit_log(user_id);
CREATE INDEX idx_audit_file_key ON storage_audit_log(file_key);
CREATE INDEX idx_audit_created ON storage_audit_log(created_at DESC);
CREATE INDEX idx_audit_action_user ON storage_audit_log(action, user_id);
CREATE INDEX idx_audit_file_actions ON storage_audit_log(file_key, action, created_at DESC);
CREATE INDEX idx_audit_metadata ON storage_audit_log USING GIN(metadata);

-- ==============================================================
-- 2. STORAGE CLEANUP JOBS TABLE
-- ==============================================================

CREATE TABLE storage_cleanup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('orphaned_files', 'old_files', 'large_files', 'manual')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    parameters JSONB DEFAULT '{}',
    files_processed INTEGER DEFAULT 0,
    files_deleted INTEGER DEFAULT 0,
    bytes_saved BIGINT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_cleanup_files_processed CHECK (files_processed >= 0),
    CONSTRAINT check_cleanup_files_deleted CHECK (files_deleted >= 0 AND files_deleted <= files_processed),
    CONSTRAINT check_cleanup_bytes_saved CHECK (bytes_saved >= 0),
    CONSTRAINT check_cleanup_parameters_object CHECK (jsonb_typeof(parameters) = 'object'),
    CONSTRAINT check_cleanup_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND (completed_at IS NULL OR status = 'failed'))
    ),
    CONSTRAINT check_cleanup_start_complete CHECK (
        completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
    )
);

-- Indexes for storage_cleanup_jobs
CREATE INDEX idx_cleanup_status ON storage_cleanup_jobs(status);
CREATE INDEX idx_cleanup_type ON storage_cleanup_jobs(job_type);
CREATE INDEX idx_cleanup_created ON storage_cleanup_jobs(created_at DESC);
CREATE INDEX idx_cleanup_active ON storage_cleanup_jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_cleanup_parameters ON storage_cleanup_jobs USING GIN(parameters);

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_cleanup_jobs_updated_at
    BEFORE UPDATE ON storage_cleanup_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================
-- HELPFUL VIEWS AND FUNCTIONS
-- ==============================================================

-- View for storage usage summary
CREATE VIEW storage_usage_summary AS
SELECT
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(ar.id) as total_files,
    COALESCE(SUM(ar.file_size_bytes), 0) as total_bytes,
    pg_size_pretty(COALESCE(SUM(ar.file_size_bytes), 0)) as total_size_pretty,
    COUNT(CASE WHEN ar.mime_type LIKE 'audio/%' THEN 1 END) as audio_files,
    COALESCE(SUM(CASE WHEN ar.mime_type LIKE 'audio/%' THEN ar.file_size_bytes ELSE 0 END), 0) as audio_bytes,
    MAX(ar.created_at) as last_upload,
    COUNT(DISTINCT sal.id) FILTER (WHERE sal.action = 'download' AND sal.created_at > CURRENT_DATE - INTERVAL '30 days') as downloads_last_30_days
FROM workbook_users u
LEFT JOIN audio_recordings ar ON u.id = ar.user_id
LEFT JOIN storage_audit_log sal ON u.id = sal.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name;

-- View for file access analytics
CREATE VIEW file_access_analytics AS
SELECT
    ar.id as file_id,
    ar.file_name,
    ar.mime_type,
    ar.file_size_bytes,
    ar.user_id,
    ar.created_at as uploaded_at,
    COUNT(sal.id) FILTER (WHERE sal.action = 'download') as download_count,
    MAX(sal.created_at) FILTER (WHERE sal.action = 'download') as last_download,
    COUNT(sal.id) FILTER (WHERE sal.action = 'access') as access_count,
    MAX(sal.created_at) FILTER (WHERE sal.action = 'access') as last_access,
    CASE
        WHEN MAX(sal.created_at) FILTER (WHERE sal.action IN ('download', 'access')) > CURRENT_DATE - INTERVAL '7 days' THEN 'active'
        WHEN MAX(sal.created_at) FILTER (WHERE sal.action IN ('download', 'access')) > CURRENT_DATE - INTERVAL '30 days' THEN 'recent'
        WHEN MAX(sal.created_at) FILTER (WHERE sal.action IN ('download', 'access')) > CURRENT_DATE - INTERVAL '90 days' THEN 'stale'
        ELSE 'inactive'
    END as activity_status
FROM audio_recordings ar
LEFT JOIN storage_audit_log sal ON ar.file_name = sal.file_key
GROUP BY ar.id, ar.file_name, ar.mime_type, ar.file_size_bytes, ar.user_id, ar.created_at;

-- Function to get storage metrics for dashboard
CREATE OR REPLACE FUNCTION get_storage_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    total_files BIGINT,
    total_size_bytes BIGINT,
    total_size_pretty TEXT,
    files_this_period BIGINT,
    size_this_period BIGINT,
    downloads_this_period BIGINT,
    most_active_users JSONB,
    file_type_breakdown JSONB,
    daily_upload_stats JSONB
) AS $$
DECLARE
    start_date DATE := CURRENT_DATE - INTERVAL '1 day' * days_back;
BEGIN
    RETURN QUERY
    WITH storage_totals AS (
        SELECT
            COUNT(*) as total_files,
            COALESCE(SUM(file_size_bytes), 0) as total_size_bytes
        FROM audio_recordings
    ),
    period_stats AS (
        SELECT
            COUNT(*) as files_this_period,
            COALESCE(SUM(file_size_bytes), 0) as size_this_period
        FROM audio_recordings
        WHERE created_at >= start_date
    ),
    download_stats AS (
        SELECT COUNT(*) as downloads_this_period
        FROM storage_audit_log
        WHERE action = 'download' AND created_at >= start_date
    ),
    top_users AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'user_id', user_id,
                'email', email,
                'file_count', total_files,
                'total_bytes', total_bytes
            )
        ) as most_active_users
        FROM (
            SELECT u.id as user_id, u.email, COUNT(ar.id) as total_files, COALESCE(SUM(ar.file_size_bytes), 0) as total_bytes
            FROM workbook_users u
            JOIN audio_recordings ar ON u.id = ar.user_id
            WHERE ar.created_at >= start_date
            GROUP BY u.id, u.email
            ORDER BY total_bytes DESC
            LIMIT 5
        ) top_5
    ),
    file_types AS (
        SELECT jsonb_object_agg(mime_type, file_count) as file_type_breakdown
        FROM (
            SELECT mime_type, COUNT(*) as file_count
            FROM audio_recordings
            GROUP BY mime_type
            ORDER BY file_count DESC
        ) types
    ),
    daily_stats AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', upload_date,
                'files', file_count,
                'bytes', total_bytes
            ) ORDER BY upload_date DESC
        ) as daily_upload_stats
        FROM (
            SELECT
                DATE(created_at) as upload_date,
                COUNT(*) as file_count,
                COALESCE(SUM(file_size_bytes), 0) as total_bytes
            FROM audio_recordings
            WHERE created_at >= start_date
            GROUP BY DATE(created_at)
        ) daily
    )
    SELECT
        st.total_files,
        st.total_size_bytes,
        pg_size_pretty(st.total_size_bytes),
        ps.files_this_period,
        ps.size_this_period,
        ds.downloads_this_period,
        tu.most_active_users,
        ft.file_type_breakdown,
        dst.daily_upload_stats
    FROM storage_totals st
    CROSS JOIN period_stats ps
    CROSS JOIN download_stats ds
    CROSS JOIN top_users tu
    CROSS JOIN file_types ft
    CROSS JOIN daily_stats dst;
END;
$$ LANGUAGE plpgsql;

-- Function to find files that should be cleaned up
CREATE OR REPLACE FUNCTION find_cleanup_candidates(
    older_than_days INTEGER DEFAULT 90,
    min_size_mb INTEGER DEFAULT 0,
    unused_only BOOLEAN DEFAULT true
)
RETURNS TABLE(
    file_id UUID,
    file_name VARCHAR,
    file_size_bytes BIGINT,
    last_access TIMESTAMP WITH TIME ZONE,
    days_since_access INTEGER,
    user_email VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ar.id,
        ar.file_name,
        ar.file_size_bytes,
        COALESCE(MAX(sal.created_at), ar.created_at) as last_access,
        EXTRACT(DAYS FROM CURRENT_TIMESTAMP - COALESCE(MAX(sal.created_at), ar.created_at))::INTEGER as days_since_access,
        u.email
    FROM audio_recordings ar
    JOIN workbook_users u ON ar.user_id = u.id
    LEFT JOIN storage_audit_log sal ON ar.file_name = sal.file_key
        AND sal.action IN ('download', 'access')
    WHERE ar.file_size_bytes >= (min_size_mb * 1024 * 1024)
    GROUP BY ar.id, ar.file_name, ar.file_size_bytes, ar.created_at, u.email
    HAVING (
        (unused_only = false) OR
        (unused_only = true AND COALESCE(MAX(sal.created_at), ar.created_at) < CURRENT_TIMESTAMP - INTERVAL '1 day' * older_than_days)
    )
    ORDER BY days_since_access DESC, ar.file_size_bytes DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- STORAGE POLICIES AND TRIGGERS
-- ==============================================================

-- Trigger to automatically log file operations
CREATE OR REPLACE FUNCTION log_audio_recording_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- File uploaded
        INSERT INTO storage_audit_log (action, file_key, user_id, metadata)
        VALUES ('upload', NEW.file_name, NEW.user_id, jsonb_build_object(
            'file_size', NEW.file_size_bytes,
            'mime_type', NEW.mime_type,
            'module_id', NEW.module_id,
            'lesson_id', NEW.lesson_id
        ));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- File deleted
        INSERT INTO storage_audit_log (action, file_key, user_id, metadata)
        VALUES ('delete', OLD.file_name, OLD.user_id, jsonb_build_object(
            'file_size', OLD.file_size_bytes,
            'deleted_at', CURRENT_TIMESTAMP
        ));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to audio_recordings table
CREATE TRIGGER trigger_log_audio_recording_changes
    AFTER INSERT OR DELETE ON audio_recordings
    FOR EACH ROW
    EXECUTE FUNCTION log_audio_recording_changes();

-- ==============================================================
-- DATA RETENTION POLICIES
-- ==============================================================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM storage_audit_log
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up completed cleanup jobs
CREATE OR REPLACE FUNCTION cleanup_old_cleanup_jobs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM storage_cleanup_jobs
    WHERE status IN ('completed', 'failed')
      AND created_at < CURRENT_DATE - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- COMMENTS AND DOCUMENTATION
-- ==============================================================

COMMENT ON TABLE storage_audit_log IS 'Audit trail for all file storage operations';
COMMENT ON TABLE storage_cleanup_jobs IS 'Tracking for automated storage cleanup operations';

COMMENT ON VIEW storage_usage_summary IS 'Per-user storage usage statistics and activity';
COMMENT ON VIEW file_access_analytics IS 'File access patterns and activity classification';

COMMENT ON FUNCTION get_storage_metrics IS 'Comprehensive storage metrics for dashboards and monitoring';
COMMENT ON FUNCTION find_cleanup_candidates IS 'Identify files that are candidates for cleanup based on age and usage';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove old audit log entries to manage database size';
COMMENT ON FUNCTION cleanup_old_cleanup_jobs IS 'Remove old cleanup job records to manage database size';

-- ==============================================================
-- SUCCESS MESSAGE
-- ==============================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Storage System Tables Created Successfully!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables added: 2';
    RAISE NOTICE '- storage_audit_log (file operation tracking)';
    RAISE NOTICE '- storage_cleanup_jobs (automated cleanup tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Views added: 2';
    RAISE NOTICE '- storage_usage_summary (user storage statistics)';
    RAISE NOTICE '- file_access_analytics (file activity patterns)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions added: 4';
    RAISE NOTICE '- get_storage_metrics() (dashboard metrics)';
    RAISE NOTICE '- find_cleanup_candidates() (cleanup identification)';
    RAISE NOTICE '- cleanup_old_audit_logs() (maintenance)';
    RAISE NOTICE '- cleanup_old_cleanup_jobs() (maintenance)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '- Automatic audit logging for file operations';
    RAISE NOTICE '- Storage usage tracking and analytics';
    RAISE NOTICE '- Automated cleanup job management';
    RAISE NOTICE '- Data retention policies';
    RAISE NOTICE '=================================================';
END $$;