-- 6FB Methodologies Workbook Database Schema
-- Production database setup for workbook user authentication

-- Create database (run this first if needed)
-- CREATE DATABASE 6fb_methodologies;

-- Use the database
-- \c 6fb_methodologies;

-- Create workbook_users table for authentication
CREATE TABLE IF NOT EXISTS workbook_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(50) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    ticket_type VARCHAR(20) DEFAULT 'GA',
    stripe_session_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    business_type VARCHAR(100),
    years_experience VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workbook_users_email ON workbook_users(email);
CREATE INDEX IF NOT EXISTS idx_workbook_users_stripe_session ON workbook_users(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_workbook_users_created_at ON workbook_users(created_at);

-- Create audio_sessions table for tracking recordings
CREATE TABLE IF NOT EXISTS audio_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES workbook_users(id) ON DELETE CASCADE,
    session_name VARCHAR(255),
    audio_file_path VARCHAR(500),
    audio_duration DECIMAL(10,2), -- in seconds
    file_size BIGINT, -- in bytes
    audio_format VARCHAR(20),
    quality VARCHAR(20),
    transcription_status VARCHAR(50) DEFAULT 'pending',
    transcription_text TEXT,
    transcription_cost DECIMAL(10,4), -- cost in USD
    ai_summary TEXT,
    session_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audio sessions
CREATE INDEX IF NOT EXISTS idx_audio_sessions_user_id ON audio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_status ON audio_sessions(transcription_status);
CREATE INDEX IF NOT EXISTS idx_audio_sessions_created ON audio_sessions(created_at);

-- Create notes table for session notes
CREATE TABLE IF NOT EXISTS session_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES workbook_users(id) ON DELETE CASCADE,
    audio_session_id INTEGER REFERENCES audio_sessions(id) ON DELETE SET NULL,
    title VARCHAR(255),
    content TEXT,
    note_type VARCHAR(50) DEFAULT 'general', -- general, reflection, action_item, etc.
    tags JSONB,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notes
CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_audio_session ON session_notes(audio_session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_type ON session_notes(note_type);

-- Create user_progress table for tracking workbook completion
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES workbook_users(id) ON DELETE CASCADE,
    module_id VARCHAR(100),
    exercise_id VARCHAR(100),
    completion_status VARCHAR(50) DEFAULT 'started', -- started, in_progress, completed
    progress_data JSONB, -- flexible storage for progress data
    time_spent INTEGER DEFAULT 0, -- in seconds
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_id, exercise_id)
);

-- Create indexes for progress tracking
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(completion_status);

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES workbook_users(id) ON DELETE CASCADE,
    api_type VARCHAR(50), -- openai_transcription, openai_chat, etc.
    usage_count INTEGER DEFAULT 1,
    cost_usd DECIMAL(10,4),
    usage_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for API usage
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_type ON api_usage(api_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(usage_date);

-- Create audit log table for security tracking
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES workbook_users(id) ON DELETE SET NULL,
    action VARCHAR(100), -- login, logout, audio_upload, transcription_request, etc.
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_success ON audit_log(success);

-- Create triggers for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_workbook_users_updated_at BEFORE UPDATE ON workbook_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_sessions_updated_at BEFORE UPDATE ON audio_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_notes_updated_at BEFORE UPDATE ON session_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO workbook_users (email, password, first_name, last_name, ticket_type, stripe_session_id)
-- VALUES ('test@6fbmethodologies.com', '6FB-TEST-1234', 'Test', 'User', 'VIP', 'test_session_123')
-- ON CONFLICT (email) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.ticket_type,
    u.created_at,
    u.last_login,
    u.login_count,
    COUNT(DISTINCT a.id) as total_audio_sessions,
    COUNT(DISTINCT n.id) as total_notes,
    COUNT(DISTINCT p.id) as total_progress_items,
    SUM(a.audio_duration) as total_audio_duration,
    SUM(api.cost_usd) as total_api_cost
FROM workbook_users u
LEFT JOIN audio_sessions a ON u.id = a.user_id
LEFT JOIN session_notes n ON u.id = n.user_id
LEFT JOIN user_progress p ON u.id = p.user_id
LEFT JOIN api_usage api ON u.id = api.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.first_name, u.last_name, u.ticket_type, u.created_at, u.last_login, u.login_count;

-- Create view for daily usage stats
CREATE OR REPLACE VIEW daily_usage_stats AS
SELECT
    DATE(created_at) as usage_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE action = 'login') as login_count,
    COUNT(*) FILTER (WHERE action = 'audio_upload') as audio_uploads,
    COUNT(*) FILTER (WHERE action = 'transcription_request') as transcription_requests
FROM audit_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY usage_date DESC;

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO 6fb_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO 6fb_app_user;

-- Display table information
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('workbook_users', 'audio_sessions', 'session_notes', 'user_progress', 'api_usage', 'audit_log')
ORDER BY table_name, ordinal_position;

-- Success message
SELECT 'Database schema created successfully! Ready for 6FB Methodologies Workbook production deployment.' as status;