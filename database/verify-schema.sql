-- ==============================================================
-- 6FB Workbook Database Schema Verification
-- ==============================================================
-- This script verifies that the database schema has been
-- created correctly and all constraints are working.
--
-- Run this after executing the schema and seed files to
-- ensure everything is working properly.
-- ==============================================================

\echo '================================================='
\echo '6FB Workbook Database Schema Verification'
\echo '================================================='

-- ==============================================================
-- 1. VERIFY EXTENSIONS
-- ==============================================================

\echo ''
\echo '1. Checking PostgreSQL Extensions...'

SELECT
    extname as "Extension",
    extversion as "Version"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'unaccent')
ORDER BY extname;

-- ==============================================================
-- 2. VERIFY CUSTOM TYPES
-- ==============================================================

\echo ''
\echo '2. Checking Custom Types...'

SELECT
    typname as "Type Name",
    array_length(enum_range(NULL::subscription_tier), 1) as "Enum Count"
FROM pg_type
WHERE typname IN (
    'subscription_tier', 'progress_status', 'lesson_type',
    'transcription_status', 'session_status', 'participant_role'
)
ORDER BY typname;

-- ==============================================================
-- 3. VERIFY TABLES
-- ==============================================================

\echo ''
\echo '3. Checking Tables...'

SELECT
    schemaname as "Schema",
    tablename as "Table Name",
    tableowner as "Owner"
FROM pg_tables
WHERE tablename IN (
    'workbook_users', 'workshop_modules', 'user_progress',
    'audio_recordings', 'transcription_records', 'workbook_notes',
    'live_sessions', 'session_participants'
)
ORDER BY tablename;

-- ==============================================================
-- 4. VERIFY INDEXES
-- ==============================================================

\echo ''
\echo '4. Checking Indexes...'

SELECT
    schemaname as "Schema",
    tablename as "Table",
    indexname as "Index Name",
    indexdef as "Definition"
FROM pg_indexes
WHERE tablename IN (
    'workbook_users', 'workshop_modules', 'user_progress',
    'audio_recordings', 'transcription_records', 'workbook_notes',
    'live_sessions', 'session_participants'
)
ORDER BY tablename, indexname;

-- ==============================================================
-- 5. VERIFY CONSTRAINTS
-- ==============================================================

\echo ''
\echo '5. Checking Constraints...'

SELECT
    tc.table_name as "Table",
    tc.constraint_name as "Constraint",
    tc.constraint_type as "Type",
    cc.check_clause as "Check Definition"
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN (
    'workbook_users', 'workshop_modules', 'user_progress',
    'audio_recordings', 'transcription_records', 'workbook_notes',
    'live_sessions', 'session_participants'
)
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ==============================================================
-- 6. VERIFY FUNCTIONS
-- ==============================================================

\echo ''
\echo '6. Checking Functions...'

SELECT
    routine_name as "Function Name",
    routine_type as "Type",
    data_type as "Return Type"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_updated_at_column', 'is_valid_email',
    'is_valid_module_content', 'get_table_stats'
)
ORDER BY routine_name;

-- ==============================================================
-- 7. VERIFY VIEWS
-- ==============================================================

\echo ''
\echo '7. Checking Views...'

SELECT
    schemaname as "Schema",
    viewname as "View Name",
    viewowner as "Owner"
FROM pg_views
WHERE viewname IN ('user_dashboard_summary', 'module_progress_view')
ORDER BY viewname;

-- ==============================================================
-- 8. TEST DATA VERIFICATION
-- ==============================================================

\echo ''
\echo '8. Checking Seed Data...'

-- Count records in each table
SELECT 'workbook_users' as "Table", COUNT(*) as "Row Count" FROM workbook_users
UNION ALL
SELECT 'workshop_modules', COUNT(*) FROM workshop_modules
UNION ALL
SELECT 'user_progress', COUNT(*) FROM user_progress
UNION ALL
SELECT 'audio_recordings', COUNT(*) FROM audio_recordings
UNION ALL
SELECT 'transcription_records', COUNT(*) FROM transcription_records
UNION ALL
SELECT 'workbook_notes', COUNT(*) FROM workbook_notes
UNION ALL
SELECT 'live_sessions', COUNT(*) FROM live_sessions
UNION ALL
SELECT 'session_participants', COUNT(*) FROM session_participants
ORDER BY "Table";

-- ==============================================================
-- 9. TEST BASIC FUNCTIONALITY
-- ==============================================================

\echo ''
\echo '9. Testing Basic Functionality...'

-- Test email validation function
SELECT
    'john@example.com' as "Email",
    is_valid_email('john@example.com') as "Valid"
UNION ALL
SELECT
    'invalid-email',
    is_valid_email('invalid-email');

-- Test full-text search
SELECT
    'Search Test' as "Test",
    COUNT(*) as "Results"
FROM workbook_notes
WHERE search_vector @@ plainto_tsquery('customer');

-- Test module content validation
SELECT
    'Content Validation' as "Test",
    is_valid_module_content('{"overview": "test", "learningObjectives": [], "lessons": []}') as "Valid";

-- ==============================================================
-- 10. TEST DASHBOARD VIEWS
-- ==============================================================

\echo ''
\echo '10. Testing Dashboard Views...'

-- Test user dashboard summary
SELECT
    email,
    subscription_tier,
    overall_progress,
    modules_started,
    modules_completed,
    recordings_count,
    notes_count
FROM user_dashboard_summary
LIMIT 3;

-- Test module progress view
SELECT
    title,
    module_order,
    progress_status,
    is_accessible
FROM module_progress_view
WHERE user_id = (SELECT id FROM workbook_users LIMIT 1)
ORDER BY module_order
LIMIT 3;

-- ==============================================================
-- 11. PERFORMANCE CHECK
-- ==============================================================

\echo ''
\echo '11. Performance Statistics...'

-- Get table statistics
SELECT * FROM get_table_stats();

-- ==============================================================
-- 12. CONSTRAINT TESTING
-- ==============================================================

\echo ''
\echo '12. Testing Constraints...'

-- This should fail with constraint violation (commented out for safety)
-- INSERT INTO workbook_users (email, first_name, last_name)
-- VALUES ('invalid-email', 'Test', 'User');

\echo ''
\echo 'Testing constraint: Email validation...'
SELECT
    CASE
        WHEN is_valid_email('test@example.com') THEN 'PASS: Valid email accepted'
        ELSE 'FAIL: Valid email rejected'
    END as "Email Validation Test";

SELECT
    CASE
        WHEN NOT is_valid_email('invalid-email') THEN 'PASS: Invalid email rejected'
        ELSE 'FAIL: Invalid email accepted'
    END as "Email Validation Test";

-- ==============================================================
-- VERIFICATION SUMMARY
-- ==============================================================

\echo ''
\echo '================================================='
\echo 'Schema Verification Complete!'
\echo '================================================='

-- Final summary query
WITH verification_summary AS (
    SELECT
        'Extensions' as "Component",
        COUNT(*) as "Count"
    FROM pg_extension
    WHERE extname IN ('uuid-ossp', 'pg_trgm', 'unaccent')

    UNION ALL

    SELECT
        'Tables',
        COUNT(*)
    FROM pg_tables
    WHERE tablename IN (
        'workbook_users', 'workshop_modules', 'user_progress',
        'audio_recordings', 'transcription_records', 'workbook_notes',
        'live_sessions', 'session_participants'
    )

    UNION ALL

    SELECT
        'Views',
        COUNT(*)
    FROM pg_views
    WHERE viewname IN ('user_dashboard_summary', 'module_progress_view')

    UNION ALL

    SELECT
        'Functions',
        COUNT(*)
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'update_updated_at_column', 'is_valid_email',
        'is_valid_module_content', 'get_table_stats'
    )

    UNION ALL

    SELECT
        'Test Users',
        COUNT(*)
    FROM workbook_users

    UNION ALL

    SELECT
        'Workshop Modules',
        COUNT(*)
    FROM workshop_modules
)
SELECT * FROM verification_summary ORDER BY "Component";

\echo ''
\echo 'If all counts match expected values, the schema is working correctly!'
\echo 'Expected: Extensions=3, Tables=8, Views=2, Functions=4, Test Users=4, Workshop Modules=6'
\echo '================================================='