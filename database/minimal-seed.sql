-- Minimal seeding script for 6FB workshop content
-- Just insert basic content without triggering search vector updates

BEGIN;

-- Temporarily disable triggers to avoid search_vector issues
SET session_replication_role = replica;

-- Insert one additional module
INSERT INTO workshop_modules (
    id, title, description, module_order, duration_minutes, content,
    prerequisites, is_published, difficulty_level, tags
) VALUES (
    '22345678-9abc-def0-1234-56789abcdef0',
    'Business Fundamentals & Strategy',
    'Learn the core business principles that drive six-figure barbershop success.',
    2, 180,
    '{"overview": {"objectives": ["Master business planning", "Learn financial management"], "outcomes": ["Create business plan", "Implement pricing strategies"]}}',
    ARRAY[]::UUID[], true, 'intermediate', ARRAY['business', 'strategy']
) ON CONFLICT (id) DO NOTHING;

-- Insert lessons for the existing foundation module
INSERT INTO workshop_lessons (
    id, module_id, title, type, content, estimated_minutes, sort_order, is_published, prerequisites
) VALUES
(
    'lesson-001-mindset-foundation',
    '91234567-89ab-cdef-0123-456789abcdef',
    'Six Figure Mindset Foundation',
    'video',
    '{"blocks": [{"id": "intro", "type": "video", "order": 1, "title": "Introduction"}]}',
    15, 1, true, ARRAY[]::VARCHAR[]
),
(
    'lesson-002-success-principles',
    '91234567-89ab-cdef-0123-456789abcdef',
    'Core Success Principles',
    'text',
    '{"blocks": [{"id": "principles", "type": "text", "order": 1, "title": "Principles"}]}',
    20, 2, true, ARRAY['lesson-001-mindset-foundation']
) ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Success message
\echo 'Basic workshop content seeded successfully!'