-- ==============================================================
-- 6FB Workbook System - Workshop Content Seed Data
-- ==============================================================
-- This file seeds the database with initial workshop modules,
-- test users, sample progress data, and comprehensive content
-- for demonstrating the full capability of the 6FB Workbook system.
--
-- Data included:
-- 1. Test users with different subscription tiers and progress
-- 2. 6 comprehensive workshop modules based on Six Figure Barber methodology
-- 3. Realistic lesson content with interactive elements
-- 4. Sample progress data with different completion states
-- 5. Audio recordings and transcription samples
-- 6. Live session examples with participants
-- 7. Rich notes with tags and full-text searchable content
-- ==============================================================

-- ==============================================================
-- 1. SEED TEST USERS WITH COMPREHENSIVE PROFILES
-- ==============================================================

INSERT INTO workbook_users (
    id,
    email,
    first_name,
    last_name,
    subscription_tier,
    workshop_access_granted,
    workshop_access_expires_at,
    daily_transcription_limit_minutes,
    daily_transcription_used_minutes,
    monthly_transcription_cost_cents,
    monthly_cost_limit_cents,
    last_reset_date,
    preferences,
    profile_image_url,
    bio,
    location,
    phone,
    timezone,
    language,
    notification_preferences,
    onboarding_completed,
    last_login_at,
    login_count,
    created_at,
    updated_at
) VALUES
    -- Basic tier user - New starter
    (
        '01234567-89ab-cdef-0123-456789abcdef',
        'john.barber@example.com',
        'John',
        'Thompson',
        'basic',
        true,
        '2025-12-31 23:59:59'::timestamp,
        60,
        45,
        2500,
        5000,
        '2024-09-01 00:00:00'::timestamp,
        '{"theme": "light", "notifications": true, "auto_save": true}',
        'https://api.dicebear.com/7.x/avatars/svg?seed=john',
        'Traditional barber transitioning to the 6FB methodology. Excited to scale my business!',
        'Chicago, IL',
        '+1-555-0101',
        'America/Chicago',
        'en',
        '{"email": true, "push": false, "sms": true}',
        true,
        '2024-09-19 08:30:00'::timestamp,
        47,
        '2024-08-15 10:00:00'::timestamp,
        '2024-09-19 08:30:00'::timestamp
    ),
    -- Premium tier user - Advanced learner
    (
        '11234567-89ab-cdef-0123-456789abcdef',
        'maria.stylish@example.com',
        'Maria',
        'Rodriguez',
        'premium',
        true,
        '2025-12-31 23:59:59'::timestamp,
        120,
        89,
        4200,
        10000,
        '2024-09-01 00:00:00'::timestamp,
        '{"theme": "dark", "notifications": true, "auto_save": true, "playback_speed": 1.25}',
        'https://api.dicebear.com/7.x/avatars/svg?seed=maria',
        'Salon owner implementing 6FB principles. Focused on revenue optimization and team development.',
        'Austin, TX',
        '+1-555-0202',
        'America/Chicago',
        'en',
        '{"email": true, "push": true, "sms": true}',
        true,
        '2024-09-19 14:22:00'::timestamp,
        134,
        '2024-07-10 14:00:00'::timestamp,
        '2024-09-19 14:22:00'::timestamp
    ),
    -- VIP tier user - High achiever
    (
        '21234567-89ab-cdef-0123-456789abcdef',
        'carlos.elite@example.com',
        'Carlos',
        'Johnson',
        'vip',
        true,
        '2025-12-31 23:59:59'::timestamp,
        300,
        156,
        8500,
        25000,
        '2024-09-01 00:00:00'::timestamp,
        '{"theme": "auto", "notifications": true, "auto_save": true, "playback_speed": 1.5, "quality": "high"}',
        'https://api.dicebear.com/7.x/avatars/svg?seed=carlos',
        'Multi-location barbershop owner and 6FB mentor. Passionate about scaling excellence.',
        'Miami, FL',
        '+1-555-0303',
        'America/New_York',
        'en',
        '{"email": true, "push": true, "sms": true}',
        true,
        '2024-09-19 16:45:00'::timestamp,
        289,
        '2024-06-01 09:00:00'::timestamp,
        '2024-09-19 16:45:00'::timestamp
    ),
    -- Basic tier user - Starting journey
    (
        '31234567-89ab-cdef-0123-456789abcdef',
        'sarah.newbie@example.com',
        'Sarah',
        'Wilson',
        'basic',
        false,
        NULL,
        30,
        12,
        800,
        3000,
        '2024-09-01 00:00:00'::timestamp,
        '{"theme": "light", "notifications": false, "auto_save": true}',
        'https://api.dicebear.com/7.x/avatars/svg?seed=sarah',
        'New to the barbering world. Learning the fundamentals of business growth.',
        'Denver, CO',
        '+1-555-0404',
        'America/Denver',
        'en',
        '{"email": true, "push": false, "sms": false}',
        false,
        '2024-09-18 19:20:00'::timestamp,
        8,
        '2024-09-10 16:30:00'::timestamp,
        '2024-09-18 19:20:00'::timestamp
    ),
    -- Enterprise tier user - Instructor/Mentor
    (
        '41234567-89ab-cdef-0123-456789abcdef',
        'david.mentor@example.com',
        'David',
        'Anderson',
        'enterprise',
        true,
        '2025-12-31 23:59:59'::timestamp,
        1000,
        425,
        15000,
        50000,
        '2024-09-01 00:00:00'::timestamp,
        '{"theme": "dark", "notifications": true, "auto_save": true, "instructor_mode": true}',
        'https://api.dicebear.com/7.x/avatars/svg?seed=david',
        'Certified 6FB instructor and business consultant. Helping barbers achieve financial freedom.',
        'Las Vegas, NV',
        '+1-555-0505',
        'America/Los_Angeles',
        'en',
        '{"email": true, "push": true, "sms": true}',
        true,
        '2024-09-19 11:15:00'::timestamp,
        512,
        '2024-05-15 10:00:00'::timestamp,
        '2024-09-19 11:15:00'::timestamp
    )
ON CONFLICT (email) DO NOTHING;

-- ==============================================================
-- 2. COMPREHENSIVE WORKSHOP MODULES BASED ON 6FB METHODOLOGY
-- ==============================================================

-- Module 1: Introduction to Six Figure Barber
INSERT INTO workshop_modules (
    id,
    title,
    description,
    module_order,
    duration_minutes,
    content,
    prerequisites,
    is_published,
    difficulty_level,
    tags,
    created_at,
    updated_at
) VALUES (
    '91234567-89ab-cdef-0123-456789abcdef',
    'Introduction to Six Figure Barber Methodology',
    'Master the foundational principles that separate six-figure barbers from the rest. Learn the mindset shifts, business fundamentals, and strategic thinking required to build a thriving barbershop business.',
    1,
    90,
    '{
        "overview": "This comprehensive module introduces you to the Six Figure Barber system, covering the mindset shifts and core principles needed to build a profitable barbershop business. You will learn how to think like a business owner, not just a barber.",
        "learningObjectives": [
            "Develop the Six Figure Barber entrepreneurial mindset",
            "Understand the key revenue drivers in barbershop businesses",
            "Learn the importance of systems and processes for scalability",
            "Set realistic yet ambitious business goals using the 6FB framework",
            "Identify your unique value proposition in the market"
        ],
        "keyTakeaways": [
            "Mindset is everything - think owner, not employee",
            "Systems create freedom and scalability",
            "Premium pricing requires premium service",
            "Location and presentation matter as much as skill"
        ],
        "practicalExercises": [
            "Current business assessment worksheet",
            "Revenue goal setting exercise",
            "Competitive analysis template",
            "Personal mission statement creation"
        ],
        "resources": [
            "6FB Business Assessment PDF",
            "Goal Setting Worksheet",
            "Competitive Analysis Template",
            "Recommended Reading List"
        ]
    }',
    NULL,
    true,
    'beginner',
    '["introduction", "mindset", "fundamentals", "business-basics"]',
    '2024-08-01 10:00:00'::timestamp,
    '2024-09-15 14:30:00'::timestamp
);

-- Module 2: Revenue Optimization Strategies
INSERT INTO workshop_modules (
    id,
    title,
    description,
    module_order,
    duration_minutes,
    content,
    prerequisites,
    is_published,
    difficulty_level,
    tags,
    created_at,
    updated_at
) VALUES (
    '92234567-89ab-cdef-0123-456789abcdef',
    'Revenue Optimization & Pricing Strategies',
    'Transform your pricing structure and service offerings to maximize revenue per client. Learn advanced techniques for upselling, cross-selling, and creating premium service packages that clients gladly pay for.',
    2,
    120,
    '{
        "overview": "Master the art and science of revenue optimization. This module teaches you how to strategically price your services, create irresistible service packages, and implement systems that automatically increase your average transaction value.",
        "learningObjectives": [
            "Design premium service packages that justify higher prices",
            "Master the psychology of pricing and perceived value",
            "Implement effective upselling and cross-selling techniques",
            "Create recurring revenue streams through memberships",
            "Optimize your service menu for maximum profitability"
        ],
        "coreTopics": [
            "Value-based pricing vs. competition-based pricing",
            "The premium service experience blueprint",
            "Membership and subscription models for barbershops",
            "Retail product integration and markup strategies",
            "Seasonal pricing and promotional strategies"
        ],
        "practicalApplication": [
            "Service menu redesign workshop",
            "Pricing psychology exercises",
            "Upselling script development",
            "Membership model creation"
        ],
        "casestudies": [
            "From $30 to $80 cuts: A transformation story",
            "Building a $10K/month membership base",
            "Retail integration that doubled shop revenue"
        ]
    }',
    '["91234567-89ab-cdef-0123-456789abcdef"]',
    true,
    'intermediate',
    '["revenue", "pricing", "upselling", "packages", "optimization"]',
    '2024-08-01 10:00:00'::timestamp,
    '2024-09-15 14:30:00'::timestamp
);

-- Module 3: Client Acquisition & Marketing Systems
INSERT INTO workshop_modules (
    id,
    title,
    description,
    module_order,
    duration_minutes,
    content,
    prerequisites,
    is_published,
    difficulty_level,
    tags,
    created_at,
    updated_at
) VALUES (
    '93234567-89ab-cdef-0123-456789abcdef',
    'Client Acquisition & Marketing Mastery',
    'Build a consistent pipeline of high-value clients through proven marketing strategies. Learn to leverage social media, referral systems, and community engagement to grow your client base exponentially.',
    3,
    135,
    '{
        "overview": "Discover the marketing strategies that consistently bring premium clients to successful barbershops. This module covers both digital and traditional marketing approaches, with emphasis on sustainable, relationship-based growth.",
        "learningObjectives": [
            "Develop a comprehensive marketing strategy tailored to your market",
            "Master social media marketing for barbershops",
            "Build powerful referral systems that generate consistent new clients",
            "Create community partnerships that drive business growth",
            "Implement tracking systems to measure marketing ROI"
        ],
        "marketingChannels": [
            "Instagram and TikTok content strategy",
            "Google My Business optimization",
            "Referral reward programs",
            "Community event participation",
            "Partnership with local businesses"
        ],
        "contentCreation": [
            "Before/after transformation content",
            "Behind-the-scenes shop culture videos",
            "Educational hair care content",
            "Client testimonial systems"
        ],
        "systemsAndProcesses": [
            "Lead tracking and follow-up systems",
            "Appointment booking optimization",
            "New client onboarding process",
            "Client retention strategies"
        ]
    }',
    '["91234567-89ab-cdef-0123-456789abcdef"]',
    true,
    'intermediate',
    '["marketing", "client-acquisition", "social-media", "referrals", "growth"]',
    '2024-08-01 10:00:00'::timestamp,
    '2024-09-15 14:30:00'::timestamp
);

-- Module 4: Service Delivery Excellence
INSERT INTO workshop_modules (
    id,
    title,
    description,
    module_order,
    duration_minutes,
    content,
    prerequisites,
    is_published,
    difficulty_level,
    tags,
    created_at,
    updated_at
) VALUES (
    '94234567-89ab-cdef-0123-456789abcdef',
    'Service Delivery Excellence & Customer Experience',
    'Create an unforgettable customer experience that justifies premium pricing and generates powerful word-of-mouth marketing. Learn to design every touchpoint for maximum impact and client satisfaction.',
    4,
    105,
    '{
        "overview": "Excellence in service delivery is what separates premium barbershops from commodity businesses. This module teaches you how to create consistent, exceptional experiences that clients value and are willing to pay premium prices for.",
        "learningObjectives": [
            "Design a premium customer experience journey",
            "Standardize service delivery for consistency across all interactions",
            "Implement quality control systems that maintain high standards",
            "Train team members to deliver exceptional service",
            "Handle difficult situations while maintaining professionalism"
        ],
        "experienceDesign": [
            "First impression optimization (shop atmosphere, greeting)",
            "Consultation process that builds trust and value",
            "Service delivery that exceeds expectations",
            "Follow-up systems that ensure satisfaction"
        ],
        "qualityStandards": [
            "Technical skill development and maintenance",
            "Hygiene and safety protocols",
            "Time management and efficiency",
            "Attention to detail in finishing touches"
        ],
        "teamDevelopment": [
            "Hiring for attitude and cultural fit",
            "Training programs for consistent service delivery",
            "Performance management and feedback systems",
            "Creating a positive team culture"
        ]
    }',
    '["91234567-89ab-cdef-0123-456789abcdef", "92234567-89ab-cdef-0123-456789abcdef"]',
    true,
    'intermediate',
    '["service-excellence", "customer-experience", "quality", "team-training", "standards"]',
    '2024-08-01 10:00:00'::timestamp,
    '2024-09-15 14:30:00'::timestamp
);

-- Module 5: Business Scaling & Operations
INSERT INTO workshop_modules (
    id,
    title,
    description,
    module_order,
    duration_minutes,
    content,
    prerequisites,
    is_published,
    difficulty_level,
    tags,
    created_at,
    updated_at
) VALUES (
    '95234567-89ab-cdef-0123-456789abcdef',
    'Business Scaling & Operational Excellence',
    'Scale your barbershop business beyond your personal capacity. Learn to build systems, manage teams, and create multiple revenue streams that generate income whether you are working or not.',
    5,
    150,
    '{
        "overview": "Scaling is about creating systems and processes that allow your business to grow beyond your personal capacity. This advanced module covers everything from team management to operational efficiency to multi-location expansion.",
        "learningObjectives": [
            "Develop systems that allow the business to run without your constant presence",
            "Build and manage high-performing teams",
            "Create multiple revenue streams for business stability",
            "Plan and execute business expansion strategies",
            "Implement financial management systems for growth"
        ],
        "systemsDevelopment": [
            "Standard Operating Procedures (SOPs) for all business functions",
            "Staff scheduling and workload optimization",
            "Inventory management and supply chain efficiency",
            "Financial tracking and performance metrics"
        ],
        "teamManagement": [
            "Leadership development for barbershop owners",
            "Hiring and onboarding best practices",
            "Performance management and incentive systems",
            "Creating accountability without micromanagement"
        ],
        "revenueStreams": [
            "Product sales and retail integration",
            "Educational workshops and classes",
            "Mobile barbering services",
            "Equipment rental and space utilization"
        ],
        "expansionStrategies": [
            "Location selection and lease negotiation",
            "Franchising vs. company-owned expansion",
            "Capital raising and financing options",
            "Brand consistency across multiple locations"
        ]
    }',
    '["91234567-89ab-cdef-0123-456789abcdef", "92234567-89ab-cdef-0123-456789abcdef", "94234567-89ab-cdef-0123-456789abcdef"]',
    true,
    'advanced',
    '["scaling", "operations", "team-management", "expansion", "systems"]',
    '2024-08-01 10:00:00'::timestamp,
    '2024-09-15 14:30:00'::timestamp
);

-- Module 6: Advanced 6FB Implementation & Mastery
INSERT INTO workshop_modules (
    id,
    title,
    description,
    module_order,
    duration_minutes,
    content,
    prerequisites,
    is_published,
    difficulty_level,
    tags,
    created_at,
    updated_at
) VALUES (
    '96234567-89ab-cdef-0123-456789abcdef',
    'Advanced 6FB Implementation & Business Mastery',
    'Master advanced strategies for market domination, competitive advantage, and long-term wealth building. Learn to become a market leader and build a business that generates wealth for generations.',
    6,
    180,
    '{
        "overview": "This master-level module is for established barbershop owners ready to dominate their market and build generational wealth. Focus on advanced strategies, market leadership, and creating lasting competitive advantages.",
        "learningObjectives": [
            "Develop market domination strategies",
            "Create sustainable competitive advantages",
            "Build wealth beyond daily operations",
            "Establish thought leadership in your market",
            "Plan for long-term legacy and succession"
        ],
        "marketDomination": [
            "Competitive intelligence and market analysis",
            "Strategic positioning for market leadership",
            "Community influence and brand building",
            "Strategic partnerships and alliances"
        ],
        "wealthBuilding": [
            "Real estate investment strategies for barbers",
            "Creating passive income streams",
            "Investment and portfolio diversification",
            "Tax optimization strategies for business owners"
        ],
        "thoughtLeadership": [
            "Personal branding and authority building",
            "Speaking and teaching opportunities",
            "Content creation and media presence",
            "Industry involvement and influence"
        ],
        "legacyPlanning": [
            "Business valuation and exit strategies",
            "Succession planning and team development",
            "Creating systems that outlast the founder",
            "Generational wealth transfer strategies"
        ],
        "masteryElements": [
            "Continuous learning and adaptation",
            "Innovation in service delivery",
            "Technology integration for efficiency",
            "Sustainable business practices"
        ]
    }',
    '["91234567-89ab-cdef-0123-456789abcdef", "92234567-89ab-cdef-0123-456789abcdef", "93234567-89ab-cdef-0123-456789abcdef", "94234567-89ab-cdef-0123-456789abcdef", "95234567-89ab-cdef-0123-456789abcdef"]',
    true,
    'advanced',
    '["mastery", "wealth-building", "market-domination", "legacy", "advanced-strategies"]',
    '2024-08-01 10:00:00'::timestamp,
    '2024-09-15 14:30:00'::timestamp
);

-- ==============================================================
-- 3. SAMPLE LESSON CONTENT FOR EACH MODULE
-- ==============================================================

INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites,
    created_at,
    updated_at
) VALUES
    -- Module 1 Lessons
    (
        'lesson-intro-welcome',
        '91234567-89ab-cdef-0123-456789abcdef',
        'Welcome to the Six Figure Barber Journey',
        'video',
        '{
            "videoUrl": "https://example.com/videos/intro-welcome.mp4",
            "description": "An inspiring introduction to the Six Figure Barber methodology and what makes it different from traditional barbering approaches.",
            "transcript": "Welcome to the Six Figure Barber program! Today marks the beginning of your transformation from a barber to a business owner. In this program, we are not just going to teach you how to cut hair better – we are going to teach you how to think differently about your business, your clients, and your potential for financial success...",
            "keyPoints": [
                "The difference between a barber and a barbershop business owner",
                "Why mindset is the foundation of financial success",
                "Overview of the 6 modules and what to expect"
            ]
        }',
        12,
        1,
        true,
        NULL,
        '2024-08-01 10:00:00'::timestamp,
        '2024-09-15 14:30:00'::timestamp
    ),
    (
        'lesson-mindset-shift',
        '91234567-89ab-cdef-0123-456789abcdef',
        'The Entrepreneur Mindset Shift',
        'interactive',
        '{
            "description": "Interactive workshop on developing an entrepreneurial mindset versus an employee mindset.",
            "exercises": [
                {
                    "type": "self-assessment",
                    "title": "Current Mindset Assessment",
                    "questions": [
                        "Do you see yourself as a barber or a business owner?",
                        "How do you currently price your services?",
                        "What is your biggest business challenge right now?"
                    ]
                },
                {
                    "type": "goal-setting",
                    "title": "Vision Creation Exercise",
                    "description": "Define your ideal barbershop business 3 years from now"
                }
            ],
            "resources": [
                "Mindset Assessment PDF",
                "Goal Setting Worksheet"
            ]
        }',
        25,
        2,
        true,
        NULL,
        '2024-08-01 10:00:00'::timestamp,
        '2024-09-15 14:30:00'::timestamp
    ),
    (
        'lesson-business-fundamentals',
        '91234567-89ab-cdef-0123-456789abcdef',
        'Business Fundamentals for Barbers',
        'text',
        '{
            "content": "# Business Fundamentals Every Barber Must Know\n\n## Revenue Drivers\nUnderstanding what actually drives revenue in your barbershop is crucial for growth:\n\n### 1. Client Volume\n- Number of clients served per day/week/month\n- Appointment booking efficiency\n- Client retention rates\n\n### 2. Average Transaction Value\n- Service pricing strategy\n- Upselling and cross-selling\n- Add-on services and products\n\n### 3. Client Lifetime Value\n- How often clients return\n- Total spending over relationship\n- Referral generation\n\n## Key Performance Indicators (KPIs)\n- **Revenue per client visit**\n- **Client retention rate**\n- **Booking utilization rate**\n- **Product attachment rate**\n- **Referral rate**\n\n## Setting Up for Success\n1. **Track Everything**: What gets measured gets managed\n2. **Systems Over Hustle**: Build processes that scale\n3. **Quality Over Quantity**: Premium clients pay premium prices\n4. **Consistency is King**: Reliable service builds trust",
            "downloadableResources": [
                "KPI Tracking Template",
                "Business Fundamentals Checklist"
            ]
        }',
        20,
        3,
        true,
        NULL,
        '2024-08-01 10:00:00'::timestamp,
        '2024-09-15 14:30:00'::timestamp
    ),
    -- Module 2 Lessons
    (
        'lesson-pricing-psychology',
        '92234567-89ab-cdef-0123-456789abcdef',
        'The Psychology of Premium Pricing',
        'video',
        '{
            "videoUrl": "https://example.com/videos/pricing-psychology.mp4",
            "description": "Deep dive into how clients perceive value and how to position your services as premium offerings.",
            "transcript": "Premium pricing is not about charging more – it is about creating more value. When clients pay premium prices, they are not just paying for a haircut, they are paying for an experience, for expertise, for convenience, and for the confidence that comes with looking their best...",
            "keyTakeaways": [
                "Value perception is more important than actual cost",
                "Premium environments justify premium prices",
                "Confidence in pricing translates to client confidence"
            ]
        }',
        18,
        1,
        true,
        '["lesson-intro-welcome"]',
        '2024-08-01 10:00:00'::timestamp,
        '2024-09-15 14:30:00'::timestamp
    ),
    (
        'lesson-service-packages',
        '92234567-89ab-cdef-0123-456789abcdef',
        'Creating Irresistible Service Packages',
        'exercise',
        '{
            "description": "Hands-on workshop for designing service packages that increase average transaction value.",
            "steps": [
                {
                    "title": "Analyze Current Services",
                    "description": "List all services you currently offer and their individual prices",
                    "timeMinutes": 10
                },
                {
                    "title": "Group Complementary Services",
                    "description": "Identify services that naturally go together",
                    "timeMinutes": 15
                },
                {
                    "title": "Create Package Tiers",
                    "description": "Design Basic, Premium, and VIP packages",
                    "timeMinutes": 20
                },
                {
                    "title": "Price for Value",
                    "description": "Set package prices that provide value while increasing revenue",
                    "timeMinutes": 15
                }
            ],
            "templates": [
                "Service Package Worksheet",
                "Pricing Calculator Spreadsheet"
            ]
        }',
        35,
        2,
        true,
        '["lesson-pricing-psychology"]',
        '2024-08-01 10:00:00'::timestamp,
        '2024-09-15 14:30:00'::timestamp
    );

-- ==============================================================
-- 4. USER PROGRESS DATA WITH REALISTIC COMPLETION PATTERNS
-- ==============================================================

INSERT INTO user_progress (
    id,
    user_id,
    module_id,
    module_name,
    progress_percentage,
    completed,
    completed_at,
    time_spent_seconds,
    sessions_count,
    notes_count,
    last_accessed,
    metadata,
    created_at,
    updated_at
) VALUES
    -- John (Basic) - Just started, working through Module 1
    (
        'progress-john-mod1',
        '01234567-89ab-cdef-0123-456789abcdef',
        '91234567-89ab-cdef-0123-456789abcdef',
        'Introduction to Six Figure Barber Methodology',
        75,
        false,
        NULL,
        3240, -- 54 minutes
        8,
        12,
        '2024-09-19 08:15:00'::timestamp,
        '{"learning_style": "visual", "difficulty_areas": ["goal_setting"], "strengths": ["technical_skills"]}',
        '2024-08-20 14:30:00'::timestamp,
        '2024-09-19 08:15:00'::timestamp
    ),
    -- Maria (Premium) - Completed Modules 1-2, working on Module 3
    (
        'progress-maria-mod1',
        '11234567-89ab-cdef-0123-456789abcdef',
        '91234567-89ab-cdef-0123-456789abcdef',
        'Introduction to Six Figure Barber Methodology',
        100,
        true,
        '2024-08-05 16:22:00'::timestamp,
        4680, -- 78 minutes
        12,
        18,
        '2024-08-05 16:22:00'::timestamp,
        '{"completion_rating": 5, "favorite_lesson": "mindset_shift", "implementation_status": "active"}',
        '2024-07-15 09:00:00'::timestamp,
        '2024-08-05 16:22:00'::timestamp
    ),
    (
        'progress-maria-mod2',
        '11234567-89ab-cdef-0123-456789abcdef',
        '92234567-89ab-cdef-0123-456789abcdef',
        'Revenue Optimization & Pricing Strategies',
        100,
        true,
        '2024-08-25 11:45:00'::timestamp,
        5940, -- 99 minutes
        15,
        24,
        '2024-08-25 11:45:00'::timestamp,
        '{"completion_rating": 5, "revenue_increase": "40%", "implementation_status": "completed"}',
        '2024-08-06 10:00:00'::timestamp,
        '2024-08-25 11:45:00'::timestamp
    ),
    (
        'progress-maria-mod3',
        '11234567-89ab-cdef-0123-456789abcdef',
        '93234567-89ab-cdef-0123-456789abcdef',
        'Client Acquisition & Marketing Mastery',
        60,
        false,
        NULL,
        4320, -- 72 minutes
        9,
        15,
        '2024-09-18 19:30:00'::timestamp,
        '{"current_focus": "social_media_strategy", "challenges": ["content_creation"], "wins": ["referral_system"]}',
        '2024-08-26 12:00:00'::timestamp,
        '2024-09-18 19:30:00'::timestamp
    ),
    -- Carlos (VIP) - Advanced learner, completed Modules 1-4, working on Module 5
    (
        'progress-carlos-mod1',
        '21234567-89ab-cdef-0123-456789abcdef',
        '91234567-89ab-cdef-0123-456789abcdef',
        'Introduction to Six Figure Barber Methodology',
        100,
        true,
        '2024-06-20 14:30:00'::timestamp,
        3600, -- 60 minutes (efficient learner)
        6,
        8,
        '2024-06-20 14:30:00'::timestamp,
        '{"completion_rating": 4, "notes": "Good foundation, moved quickly through basics"}',
        '2024-06-15 10:00:00'::timestamp,
        '2024-06-20 14:30:00'::timestamp
    ),
    (
        'progress-carlos-mod2',
        '21234567-89ab-cdef-0123-456789abcdef',
        '92234567-89ab-cdef-0123-456789abcdef',
        'Revenue Optimization & Pricing Strategies',
        100,
        true,
        '2024-07-10 16:15:00'::timestamp,
        6480, -- 108 minutes
        10,
        22,
        '2024-07-10 16:15:00'::timestamp,
        '{"completion_rating": 5, "revenue_increase": "85%", "pricing_changes": "implemented_premium_packages"}',
        '2024-06-21 09:00:00'::timestamp,
        '2024-07-10 16:15:00'::timestamp
    ),
    (
        'progress-carlos-mod3',
        '21234567-89ab-cdef-0123-456789abcdef',
        '93234567-89ab-cdef-0123-456789abcdef',
        'Client Acquisition & Marketing Mastery',
        100,
        true,
        '2024-08-05 13:20:00'::timestamp,
        7200, -- 120 minutes
        12,
        28,
        '2024-08-05 13:20:00'::timestamp,
        '{"completion_rating": 5, "client_growth": "200%", "marketing_budget_roi": "450%"}',
        '2024-07-11 10:00:00'::timestamp,
        '2024-08-05 13:20:00'::timestamp
    ),
    (
        'progress-carlos-mod4',
        '21234567-89ab-cdef-0123-456789abcdef',
        '94234567-89ab-cdef-0123-456789abcdef',
        'Service Delivery Excellence & Customer Experience',
        100,
        true,
        '2024-08-28 17:45:00'::timestamp,
        5760, -- 96 minutes
        11,
        20,
        '2024-08-28 17:45:00'::timestamp,
        '{"completion_rating": 5, "customer_satisfaction": "98%", "team_performance": "excellent"}',
        '2024-08-06 09:00:00'::timestamp,
        '2024-08-28 17:45:00'::timestamp
    ),
    (
        'progress-carlos-mod5',
        '21234567-89ab-cdef-0123-456789abcdef',
        '95234567-89ab-cdef-0123-456789abcdef',
        'Business Scaling & Operational Excellence',
        40,
        false,
        NULL,
        3600, -- 60 minutes
        5,
        11,
        '2024-09-19 10:30:00'::timestamp,
        '{"current_focus": "team_management", "scaling_plan": "second_location", "timeline": "Q1_2025"}',
        '2024-08-29 11:00:00'::timestamp,
        '2024-09-19 10:30:00'::timestamp
    );

-- ==============================================================
-- 5. LESSON PROGRESS FOR DETAILED TRACKING
-- ==============================================================

INSERT INTO lesson_progress (
    id,
    user_id,
    lesson_id,
    module_id,
    progress_percentage,
    completed,
    completed_at,
    time_spent_seconds,
    last_position,
    notes_count,
    quiz_score,
    attempts_count,
    created_at,
    updated_at
) VALUES
    -- John's lesson progress in Module 1
    (
        'lesson-progress-john-welcome',
        '01234567-89ab-cdef-0123-456789abcdef',
        'lesson-intro-welcome',
        '91234567-89ab-cdef-0123-456789abcdef',
        100,
        true,
        '2024-08-21 10:15:00'::timestamp,
        720, -- 12 minutes
        720,
        3,
        NULL,
        1,
        '2024-08-20 14:30:00'::timestamp,
        '2024-08-21 10:15:00'::timestamp
    ),
    (
        'lesson-progress-john-mindset',
        '01234567-89ab-cdef-0123-456789abcdef',
        'lesson-mindset-shift',
        '91234567-89ab-cdef-0123-456789abcdef',
        85,
        false,
        NULL,
        1350, -- 22.5 minutes
        1350,
        5,
        85,
        2,
        '2024-08-21 11:00:00'::timestamp,
        '2024-09-19 08:15:00'::timestamp
    ),
    -- Maria's completed lessons
    (
        'lesson-progress-maria-pricing',
        '11234567-89ab-cdef-0123-456789abcdef',
        'lesson-pricing-psychology',
        '92234567-89ab-cdef-0123-456789abcdef',
        100,
        true,
        '2024-08-10 14:30:00'::timestamp,
        1080, -- 18 minutes
        1080,
        6,
        NULL,
        1,
        '2024-08-08 09:00:00'::timestamp,
        '2024-08-10 14:30:00'::timestamp
    ),
    (
        'lesson-progress-maria-packages',
        '11234567-89ab-cdef-0123-456789abcdef',
        'lesson-service-packages',
        '92234567-89ab-cdef-0123-456789abcdef',
        100,
        true,
        '2024-08-15 16:45:00'::timestamp,
        2100, -- 35 minutes
        2100,
        8,
        95,
        1,
        '2024-08-12 10:30:00'::timestamp,
        '2024-08-15 16:45:00'::timestamp
    );

-- ==============================================================
-- 6. WORKBOOK SESSIONS WITH AUDIO RECORDINGS
-- ==============================================================

INSERT INTO workbook_sessions (
    id,
    user_id,
    title,
    description,
    status,
    started_at,
    ended_at,
    duration_seconds,
    total_chunks,
    metadata,
    tags,
    is_workshop_related,
    workshop_module,
    created_at,
    updated_at
) VALUES
    -- John's practice sessions
    (
        'session-john-goals',
        '01234567-89ab-cdef-0123-456789abcdef',
        'Setting My 6FB Goals',
        'Working through the goal-setting exercise from Module 1. Recording my thoughts on where I want my business to be in 3 years.',
        'completed',
        '2024-09-15 14:30:00'::timestamp,
        '2024-09-15 15:05:00'::timestamp,
        2100,
        3,
        '{"session_type": "goal_setting", "module_lesson": "mindset_shift", "mood": "motivated", "clarity_level": "high"}',
        '["goals", "vision", "business-planning", "mindset"]',
        true,
        '91234567-89ab-cdef-0123-456789abcdef',
        '2024-09-15 14:30:00'::timestamp,
        '2024-09-15 15:05:00'::timestamp
    ),
    -- Maria's strategy session
    (
        'session-maria-pricing',
        '11234567-89ab-cdef-0123-456789abcdef',
        'Implementing New Pricing Strategy',
        'Recording my thoughts as I implement the new pricing structure. Documenting client reactions and revenue changes.',
        'completed',
        '2024-08-20 09:00:00'::timestamp,
        '2024-08-20 09:45:00'::timestamp,
        2700,
        4,
        '{"session_type": "implementation", "revenue_change": "+40%", "client_feedback": "positive", "confidence_level": "high"}',
        '["pricing", "implementation", "revenue", "client-feedback"]',
        true,
        '92234567-89ab-cdef-0123-456789abcdef',
        '2024-08-20 09:00:00'::timestamp,
        '2024-08-20 09:45:00'::timestamp
    ),
    -- Carlos's scaling session
    (
        'session-carlos-team',
        '21234567-89ab-cdef-0123-456789abcdef',
        'Team Management Challenges',
        'Reflecting on current team dynamics and planning improvements based on Module 5 content.',
        'completed',
        '2024-09-10 16:00:00'::timestamp,
        '2024-09-10 16:55:00'::timestamp,
        3300,
        5,
        '{"session_type": "reflection", "team_size": 8, "challenges": ["communication", "accountability"], "solutions_planned": 3}',
        '["team-management", "scaling", "leadership", "challenges"]',
        true,
        '95234567-89ab-cdef-0123-456789abcdef',
        '2024-09-10 16:00:00'::timestamp,
        '2024-09-10 16:55:00'::timestamp
    );

-- ==============================================================
-- 7. AUDIO RECORDINGS WITH REALISTIC METADATA
-- ==============================================================

INSERT INTO audio_recordings (
    id,
    session_id,
    user_id,
    lesson_id,
    chunk_number,
    file_path,
    file_url,
    file_size_bytes,
    duration_seconds,
    format,
    sample_rate,
    channels,
    quality,
    upload_status,
    uploaded_at,
    processed_at,
    storage_provider,
    encryption_key_id,
    checksum,
    is_backup,
    metadata,
    created_at,
    updated_at
) VALUES
    -- John's goal setting session recordings
    (
        'audio-john-goals-1',
        'session-john-goals',
        '01234567-89ab-cdef-0123-456789abcdef',
        'lesson-mindset-shift',
        1,
        '/audio/john/session-goals/chunk-001.wav',
        'https://cdn.6fb.com/audio/john/session-goals/chunk-001.wav',
        1234567,
        720,
        'wav',
        44100,
        1,
        'high',
        'completed',
        '2024-09-15 14:38:00'::timestamp,
        '2024-09-15 14:42:00'::timestamp,
        'aws-s3',
        'enc-key-john-001',
        'sha256:abc123def456',
        false,
        '{"noise_level": "low", "speech_clarity": "good", "emotional_tone": "motivated"}',
        '2024-09-15 14:30:00'::timestamp,
        '2024-09-15 14:42:00'::timestamp
    ),
    (
        'audio-john-goals-2',
        'session-john-goals',
        '01234567-89ab-cdef-0123-456789abcdef',
        'lesson-mindset-shift',
        2,
        '/audio/john/session-goals/chunk-002.wav',
        'https://cdn.6fb.com/audio/john/session-goals/chunk-002.wav',
        1456789,
        840,
        'wav',
        44100,
        1,
        'high',
        'completed',
        '2024-09-15 14:52:00'::timestamp,
        '2024-09-15 14:56:00'::timestamp,
        'aws-s3',
        'enc-key-john-002',
        'sha256:def456ghi789',
        false,
        '{"noise_level": "low", "speech_clarity": "excellent", "emotional_tone": "confident"}',
        '2024-09-15 14:42:00'::timestamp,
        '2024-09-15 14:56:00'::timestamp
    ),
    -- Maria's pricing strategy recordings
    (
        'audio-maria-pricing-1',
        'session-maria-pricing',
        '11234567-89ab-cdef-0123-456789abcdef',
        'lesson-pricing-psychology',
        1,
        '/audio/maria/session-pricing/chunk-001.m4a',
        'https://cdn.6fb.com/audio/maria/session-pricing/chunk-001.m4a',
        987654,
        675,
        'm4a',
        44100,
        1,
        'high',
        'completed',
        '2024-08-20 09:08:00'::timestamp,
        '2024-08-20 09:12:00'::timestamp,
        'aws-s3',
        'enc-key-maria-001',
        'sha256:ghi789jkl012',
        false,
        '{"noise_level": "medium", "speech_clarity": "good", "emotional_tone": "analytical"}',
        '2024-08-20 09:00:00'::timestamp,
        '2024-08-20 09:12:00'::timestamp
    );

-- ==============================================================
-- 8. TRANSCRIPTIONS WITH AI-GENERATED INSIGHTS
-- ==============================================================

INSERT INTO transcriptions (
    id,
    recording_id,
    session_id,
    user_id,
    status,
    provider,
    model,
    language,
    text,
    formatted_text,
    confidence_score,
    processing_duration_seconds,
    cost_cents,
    cost_per_minute_cents,
    retry_count,
    max_retries,
    started_at,
    completed_at,
    word_count,
    character_count,
    summary,
    key_topics,
    action_items,
    sentiment_score,
    metadata,
    created_at,
    updated_at
) VALUES
    -- John's goal setting transcription
    (
        'trans-john-goals-1',
        'audio-john-goals-1',
        'session-john-goals',
        '01234567-89ab-cdef-0123-456789abcdef',
        'completed',
        'openai',
        'whisper-1',
        'en',
        'Alright, so I''m working through this goal-setting exercise from the Six Figure Barber program. Right now my shop brings in about thirty-five hundred a month, which honestly isn''t enough. I''ve been cutting hair for eight years, and I''m good at what I do, but I''ve never really thought about the business side seriously. The module talks about thinking like an owner instead of just a barber, and that really hit me. Where do I want to be in three years? I want to be bringing in at least ten thousand a month consistently. I want to have a premium shop where people are excited to come, not just another barbershop. I want to charge what I''m actually worth.',
        '**Goal Setting Session - Part 1**\n\nAlright, so I''m working through this goal-setting exercise from the Six Figure Barber program. \n\nRight now my shop brings in about $3,500 a month, which honestly isn''t enough. I''ve been cutting hair for eight years, and I''m good at what I do, but I''ve never really thought about the business side seriously. \n\nThe module talks about thinking like an owner instead of just a barber, and that really hit me. \n\n**Where do I want to be in three years?**\n- I want to be bringing in at least $10,000 a month consistently\n- I want to have a premium shop where people are excited to come, not just another barbershop\n- I want to charge what I''m actually worth',
        0.94,
        45,
        120,
        10,
        0,
        3,
        '2024-09-15 14:42:00'::timestamp,
        '2024-09-15 14:42:45'::timestamp,
        128,
        656,
        'John reflects on his current business situation and sets ambitious goals for growth. He acknowledges the need to shift from barber mindset to business owner mindset and wants to triple his monthly revenue within three years.',
        '["goal_setting", "revenue_growth", "mindset_shift", "premium_positioning", "business_owner_mentality"]',
        '["Develop plan to reach $10k monthly revenue", "Research premium shop positioning strategies", "Implement business owner mindset practices"]',
        0.72,
        '{"speech_pace": "moderate", "hesitation_markers": 3, "confidence_indicators": 5, "goal_clarity": "high"}',
        '2024-09-15 14:42:00'::timestamp,
        '2024-09-15 14:42:45'::timestamp
    ),
    -- Maria's pricing implementation transcription
    (
        'trans-maria-pricing-1',
        'audio-maria-pricing-1',
        'session-maria-pricing',
        '11234567-89ab-cdef-0123-456789abcdef',
        'completed',
        'openai',
        'whisper-1',
        'en',
        'It''s been two weeks since I implemented the new pricing structure from Module Two, and I have to say the results are better than I expected. I was nervous about raising my standard cut from forty-five to sixty-five dollars, but the psychology of pricing lesson really helped me understand that it''s about perceived value, not just the cost. I created three packages like they suggested - the Essential Cut at sixty-five, the Premium Experience at eighty-five with a hot towel and beard trim, and the VIP Treatment at one-twenty with everything plus a scalp massage. Most clients are choosing the Premium Experience. My average transaction went from forty-five dollars to seventy-eight dollars. That''s a forty percent increase. The crazy part is clients seem happier because they feel like they''re getting more value.',
        '**Pricing Implementation Results - Week 2**\n\nIt''s been two weeks since I implemented the new pricing structure from Module 2, and I have to say **the results are better than I expected**.\n\nI was nervous about raising my standard cut from $45 to $65, but the psychology of pricing lesson really helped me understand that it''s about **perceived value, not just the cost**.\n\n**New Package Structure:**\n- Essential Cut: $65\n- Premium Experience: $85 (with hot towel and beard trim)\n- VIP Treatment: $120 (everything plus scalp massage)\n\n**Results:**\n- Most clients are choosing the Premium Experience\n- Average transaction: $45 → $78 (40% increase)\n- **Client satisfaction is actually higher** because they feel like they''re getting more value',
        0.97,
        52,
        135,
        12,
        0,
        3,
        '2024-08-20 09:12:00'::timestamp,
        '2024-08-20 09:12:52'::timestamp,
        156,
        798,
        'Maria reports successful implementation of new pricing strategy with 40% revenue increase. Client satisfaction improved due to better value perception through service packages.',
        '["pricing_strategy", "revenue_optimization", "service_packages", "value_perception", "client_satisfaction"]',
        '["Continue monitoring client feedback", "Analyze package popularity trends", "Consider expanding VIP services"]',
        0.85,
        '{"confidence_level": "high", "excitement_indicators": 4, "analytical_tone": true, "implementation_success": "confirmed"}',
        '2024-08-20 09:12:00'::timestamp,
        '2024-08-20 09:12:52'::timestamp
    );

-- ==============================================================
-- 9. RICH NOTES WITH TAGS AND SEARCHABLE CONTENT
-- ==============================================================

INSERT INTO session_notes (
    id,
    user_id,
    session_id,
    transcription_id,
    lesson_id,
    module_id,
    type,
    title,
    content,
    rich_content,
    timestamp_in_session,
    highlighted_text,
    tags,
    is_action_item,
    action_item_completed,
    action_item_due_date,
    parent_note_id,
    importance,
    is_private,
    is_public,
    likes_count,
    metadata,
    created_at,
    updated_at
) VALUES
    -- John's goal setting notes
    (
        'note-john-revenue-goal',
        '01234567-89ab-cdef-0123-456789abcdef',
        'session-john-goals',
        'trans-john-goals-1',
        'lesson-mindset-shift',
        '91234567-89ab-cdef-0123-456789abcdef',
        'action-item',
        'Revenue Growth Plan',
        'Need to create a detailed plan to get from $3,500/month to $10,000/month. This means almost tripling my revenue. Key areas to focus on: premium pricing, better client experience, upselling services.',
        '{
            "actionItems": [
                "Research competitors pricing in my area",
                "Design premium service packages",
                "Improve shop atmosphere and branding",
                "Develop upselling scripts"
            ],
            "timeline": "6 months for initial implementation",
            "metrics": [
                "Monthly revenue tracking",
                "Average transaction value",
                "Client retention rate"
            ]
        }',
        480,
        'I want to be bringing in at least ten thousand a month consistently',
        '["revenue-growth", "goal-setting", "action-plan", "pricing", "upselling"]',
        true,
        false,
        '2024-10-15 00:00:00'::timestamp,
        NULL,
        5,
        false,
        false,
        0,
        '{"priority": "high", "category": "business_growth", "review_frequency": "weekly"}',
        '2024-09-15 14:38:00'::timestamp,
        '2024-09-15 14:38:00'::timestamp
    ),
    (
        'note-john-mindset',
        '01234567-89ab-cdef-0123-456789abcdef',
        'session-john-goals',
        'trans-john-goals-1',
        'lesson-mindset-shift',
        '91234567-89ab-cdef-0123-456789abcdef',
        'reflection',
        'Mindset Shift Realization',
        'The idea of thinking like a business owner instead of just a barber really resonated with me. I''ve been doing this for 8 years but never really focused on the business side. I''m technically skilled but business-wise I''ve been coasting.',
        '{
            "insights": [
                "Technical skill alone isn''t enough for financial success",
                "Business systems and processes are crucial",
                "Need to develop entrepreneurial thinking"
            ],
            "nextSteps": [
                "Study successful barbershop business models",
                "Start tracking key business metrics",
                "Invest time in business education"
            ]
        }',
        120,
        'thinking like an owner instead of just a barber',
        '["mindset", "business-owner", "reflection", "skills-development"]',
        false,
        false,
        NULL,
        NULL,
        4,
        false,
        true,
        2,
        '{"breakthrough_moment": true, "emotional_impact": "high"}',
        '2024-09-15 14:32:00'::timestamp,
        '2024-09-15 14:32:00'::timestamp
    ),
    -- Maria's pricing implementation notes
    (
        'note-maria-pricing-success',
        '11234567-89ab-cdef-0123-456789abcdef',
        'session-maria-pricing',
        'trans-maria-pricing-1',
        'lesson-pricing-psychology',
        '92234567-89ab-cdef-0123-456789abcdef',
        'lesson-note',
        'Pricing Psychology Works!',
        'The pricing psychology principles from the module are proving true. Clients aren''t just paying for the haircut - they''re paying for the experience, expertise, and confidence. When I frame it as value rather than cost, they''re much more receptive.',
        '{
            "validatedConcepts": [
                "Value perception trumps actual cost",
                "Premium environment justifies premium prices",
                "Confidence in pricing creates client confidence"
            ],
            "evidence": [
                "40% revenue increase with minimal client loss",
                "Higher client satisfaction scores",
                "More referrals from premium package clients"
            ],
            "lessons": [
                "Packaging services increases perceived value",
                "Most clients prefer mid-tier options",
                "Premium positioning attracts better clients"
            ]
        }',
        340,
        'it''s about perceived value, not just the cost',
        '["pricing-psychology", "value-perception", "success-story", "client-behavior"]',
        false,
        false,
        NULL,
        NULL,
        5,
        false,
        true,
        8,
        '{"implementation_success": true, "module_validation": "pricing_psychology"}',
        '2024-08-20 09:15:00'::timestamp,
        '2024-08-20 09:15:00'::timestamp
    ),
    (
        'note-maria-package-analysis',
        '11234567-89ab-cdef-0123-456789abcdef',
        'session-maria-pricing',
        'trans-maria-pricing-1',
        'lesson-service-packages',
        '92234567-89ab-cdef-0123-456789abcdef',
        'manual',
        'Package Performance Analysis',
        'Tracking which packages clients are choosing and why. Premium Experience ($85) is the clear winner - about 60% of clients choose this. Essential Cut (25%) and VIP Treatment (15%). This confirms the psychological pricing principle about middle options.',
        '{
            "packageBreakdown": {
                "essential": {"price": 65, "percentage": 25, "notes": "Price-conscious clients"},
                "premium": {"price": 85, "percentage": 60, "notes": "Sweet spot - best value perception"},
                "vip": {"price": 120, "percentage": 15, "notes": "Special occasions, high-value clients"}
            },
            "insights": [
                "Middle option bias is real",
                "Value-add services increase satisfaction",
                "Premium clients refer more premium clients"
            ],
            "optimizations": [
                "Consider expanding premium options",
                "Test seasonal VIP upgrades",
                "Track client lifetime value by package"
            ]
        }',
        NULL,
        NULL,
        '["package-analysis", "client-behavior", "pricing-optimization", "data-driven"]',
        false,
        false,
        NULL,
        'note-maria-pricing-success',
        4,
        false,
        false,
        0,
        '{"analysis_type": "performance_metrics", "data_period": "2_weeks"}',
        '2024-08-20 09:25:00'::timestamp,
        '2024-08-20 09:25:00'::timestamp
    );

-- ==============================================================
-- 10. LIVE SESSION EXAMPLES WITH PARTICIPANTS
-- ==============================================================

INSERT INTO live_sessions (
    id,
    title,
    description,
    scheduled_at,
    duration_minutes,
    max_participants,
    status,
    meeting_url,
    recording_url,
    instructor_id,
    module_id,
    metadata,
    created_at,
    updated_at
) VALUES
    -- Monthly Q&A with David (instructor)
    (
        'live-qa-september-2024',
        'Monthly 6FB Q&A - Scaling Your Business',
        'Interactive Q&A session focusing on common challenges in scaling barbershop businesses. Open discussion about team management, multi-location expansion, and operational efficiency.',
        '2024-09-25 19:00:00'::timestamp,
        90,
        50,
        'scheduled',
        'https://zoom.us/j/123456789',
        NULL,
        '41234567-89ab-cdef-0123-456789abcdef',
        '95234567-89ab-cdef-0123-456789abcdef',
        '{
            "topics": [
                "Team hiring and training best practices",
                "Managing multiple locations effectively",
                "Creating systems that scale",
                "Financial planning for expansion"
            ],
            "format": "Q&A with breakout sessions",
            "recording_available": true,
            "materials": ["Scaling Checklist PDF", "Team Management Templates"]
        }',
        '2024-09-01 10:00:00'::timestamp,
        '2024-09-15 14:30:00'::timestamp
    ),
    -- Completed pricing workshop
    (
        'live-pricing-workshop-aug',
        'Pricing Psychology Workshop',
        'Deep dive into the psychology of premium pricing. Interactive workshop where participants redesign their service menus and pricing structures in real-time.',
        '2024-08-15 18:00:00'::timestamp,
        120,
        30,
        'completed',
        'https://zoom.us/j/987654321',
        'https://recordings.6fb.com/pricing-workshop-aug-2024.mp4',
        '41234567-89ab-cdef-0123-456789abcdef',
        '92234567-89ab-cdef-0123-456789abcdef',
        '{
            "attendees": 28,
            "completion_rate": 89,
            "satisfaction_rating": 4.8,
            "key_outcomes": [
                "Average price increase of 35% among participants",
                "87% implemented package pricing within 2 weeks",
                "Significant improvement in value positioning confidence"
            ],
            "workshop_materials": [
                "Pricing Psychology Presentation",
                "Service Menu Template",
                "Package Design Worksheet",
                "Client Communication Scripts"
            ]
        }',
        '2024-07-15 10:00:00'::timestamp,
        '2024-08-16 10:30:00'::timestamp
    );

-- Live session participants
INSERT INTO live_session_participants (
    id,
    session_id,
    user_id,
    joined_at,
    left_at,
    attendance_status,
    feedback_rating,
    feedback_text,
    created_at
) VALUES
    -- Pricing workshop participants
    (
        'participant-maria-pricing',
        'live-pricing-workshop-aug',
        '11234567-89ab-cdef-0123-456789abcdef',
        '2024-08-15 18:02:00'::timestamp,
        '2024-08-15 20:05:00'::timestamp,
        'attended',
        5,
        'Incredible workshop! The package pricing strategy I learned here directly led to my 40% revenue increase. David''s examples were so practical and immediately actionable.',
        '2024-08-10 14:00:00'::timestamp
    ),
    (
        'participant-carlos-pricing',
        'live-pricing-workshop-aug',
        '21234567-89ab-cdef-0123-456789abcdef',
        '2024-08-15 17:58:00'::timestamp,
        '2024-08-15 20:08:00'::timestamp,
        'attended',
        5,
        'As someone already doing well, I wasn''t sure this would help, but I learned several new techniques for premium positioning. The psychology insights were eye-opening.',
        '2024-08-10 12:30:00'::timestamp
    ),
    (
        'participant-john-pricing',
        'live-pricing-workshop-aug',
        '01234567-89ab-cdef-0123-456789abcdef',
        '2024-08-15 18:05:00'::timestamp,
        '2024-08-15 19:30:00'::timestamp,
        'attended',
        4,
        'Great content, but I need to work through Module 1 more before implementing these advanced strategies. Definitely planning to attend future sessions.',
        '2024-08-12 16:00:00'::timestamp
    ),
    -- September Q&A registrations
    (
        'participant-maria-qa-sept',
        'live-qa-september-2024',
        '11234567-89ab-cdef-0123-456789abcdef',
        NULL,
        NULL,
        'registered',
        NULL,
        NULL,
        '2024-09-10 11:30:00'::timestamp
    ),
    (
        'participant-carlos-qa-sept',
        'live-qa-september-2024',
        '21234567-89ab-cdef-0123-456789abcdef',
        NULL,
        NULL,
        'registered',
        NULL,
        NULL,
        '2024-09-08 09:15:00'::timestamp
    );

-- ==============================================================
-- 11. USER ACHIEVEMENTS AND MILESTONES
-- ==============================================================

INSERT INTO user_achievements (
    id,
    user_id,
    achievement_type,
    achievement_id,
    title,
    description,
    earned_at,
    metadata,
    created_at
) VALUES
    -- Maria's achievements
    (
        'achievement-maria-first-module',
        '11234567-89ab-cdef-0123-456789abcdef',
        'module_completed',
        'module-1-completion',
        'Foundation Builder',
        'Completed the Introduction to Six Figure Barber Methodology module',
        '2024-08-05 16:22:00'::timestamp,
        '{"completion_time": "78_minutes", "rating": 5, "notes_created": 18}',
        '2024-08-05 16:22:00'::timestamp
    ),
    (
        'achievement-maria-revenue-boost',
        '11234567-89ab-cdef-0123-456789abcdef',
        'milestone',
        'revenue-increase-25plus',
        'Revenue Rockstar',
        'Achieved 25%+ revenue increase through 6FB implementation',
        '2024-08-25 11:45:00'::timestamp,
        '{"revenue_increase": "40%", "timeframe": "2_weeks", "module_applied": "pricing_optimization"}',
        '2024-08-25 11:45:00'::timestamp
    ),
    -- Carlos's achievements
    (
        'achievement-carlos-speed-learner',
        '21234567-89ab-cdef-0123-456789abcdef',
        'milestone',
        'fast-completion',
        'Speed Learner',
        'Completed first module in under 60 minutes while maintaining high comprehension',
        '2024-06-20 14:30:00'::timestamp,
        '{"completion_time": "60_minutes", "efficiency_score": 95, "notes_quality": "high"}',
        '2024-06-20 14:30:00'::timestamp
    ),
    (
        'achievement-carlos-multiple-modules',
        '21234567-89ab-cdef-0123-456789abcdef',
        'milestone',
        'multi-module-master',
        'Multi-Module Master',
        'Successfully completed 4 modules with consistently high performance',
        '2024-08-28 17:45:00'::timestamp,
        '{"modules_completed": 4, "average_rating": 5, "implementation_success": "excellent"}',
        '2024-08-28 17:45:00'::timestamp
    ),
    -- John's first achievement
    (
        'achievement-john-goal-setter',
        '01234567-89ab-cdef-0123-456789abcdef',
        'milestone',
        'first-goal-setting',
        'Vision Creator',
        'Completed first comprehensive goal-setting exercise',
        '2024-09-15 15:05:00'::timestamp,
        '{"session_duration": "35_minutes", "goals_clarity": "high", "action_items": 4}',
        '2024-09-15 15:05:00'::timestamp
    );

-- ==============================================================
-- 12. COST TRACKING AND USAGE METRICS
-- ==============================================================

INSERT INTO cost_tracking (
    id,
    user_id,
    session_id,
    transcription_id,
    recording_id,
    service_type,
    provider,
    cost_cents,
    quantity,
    unit,
    rate_cents_per_unit,
    billing_date,
    usage_date,
    tier_discount_applied,
    discount_percentage,
    invoice_id,
    metadata,
    created_at
) VALUES
    -- Transcription costs for various users
    (
        'cost-john-transcription-1',
        '01234567-89ab-cdef-0123-456789abcdef',
        'session-john-goals',
        'trans-john-goals-1',
        'audio-john-goals-1',
        'transcription',
        'openai',
        120,
        12,
        'minutes',
        10,
        '2024-09-30 00:00:00'::timestamp,
        '2024-09-15 14:42:00'::timestamp,
        false,
        NULL,
        'inv-2024-09-001',
        '{"model": "whisper-1", "quality": "high", "processing_time": "45_seconds"}',
        '2024-09-15 14:42:45'::timestamp
    ),
    (
        'cost-maria-transcription-1',
        '11234567-89ab-cdef-0123-456789abcdef',
        'session-maria-pricing',
        'trans-maria-pricing-1',
        'audio-maria-pricing-1',
        'transcription',
        'openai',
        135,
        11.3,
        'minutes',
        12,
        '2024-09-30 00:00:00'::timestamp,
        '2024-08-20 09:12:00'::timestamp,
        true,
        10,
        'inv-2024-08-015',
        '{"model": "whisper-1", "quality": "high", "premium_tier_discount": true}',
        '2024-08-20 09:12:52'::timestamp
    ),
    -- Storage costs
    (
        'cost-storage-monthly',
        '11234567-89ab-cdef-0123-456789abcdef',
        NULL,
        NULL,
        NULL,
        'storage',
        'aws-s3',
        89,
        2.3,
        'gb',
        39,
        '2024-09-30 00:00:00'::timestamp,
        '2024-09-01 00:00:00'::timestamp,
        true,
        15,
        'inv-2024-09-storage',
        '{"storage_type": "encrypted", "backup_included": true, "premium_tier_discount": true}',
        '2024-09-01 00:00:00'::timestamp
    );

-- ==============================================================
-- 13. SYSTEM METRICS FOR MONITORING
-- ==============================================================

INSERT INTO system_metrics (
    id,
    metric_type,
    metric_name,
    value,
    unit,
    tags,
    recorded_at,
    aggregation_period,
    created_at
) VALUES
    -- Query performance metrics
    (
        'metric-query-perf-daily',
        'query_performance',
        'average_query_duration',
        125.5,
        'milliseconds',
        '{"database": "primary", "period": "daily", "queries_measured": 1450}',
        '2024-09-19 23:59:59'::timestamp,
        'daily',
        '2024-09-19 23:59:59'::timestamp
    ),
    -- User activity metrics
    (
        'metric-user-activity-daily',
        'user_activity',
        'active_users',
        3,
        'count',
        '{"period": "daily", "includes_guest": false}',
        '2024-09-19 23:59:59'::timestamp,
        'daily',
        '2024-09-19 23:59:59'::timestamp
    ),
    (
        'metric-transcription-usage',
        'cost_tracking',
        'transcription_minutes_used',
        67.3,
        'minutes',
        '{"provider": "openai", "model": "whisper-1", "period": "daily"}',
        '2024-09-19 23:59:59'::timestamp,
        'daily',
        '2024-09-19 23:59:59'::timestamp
    ),
    -- Error rate tracking
    (
        'metric-error-rate-daily',
        'error_rate',
        'api_error_percentage',
        0.8,
        'percentage',
        '{"service": "transcription", "period": "daily", "total_requests": 125}',
        '2024-09-19 23:59:59'::timestamp,
        'daily',
        '2024-09-19 23:59:59'::timestamp
    );

-- ==============================================================
-- COMPLETION MESSAGE
-- ==============================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '6FB Workbook Workshop Content Seeding Complete!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Successfully seeded:';
    RAISE NOTICE '- 5 test users with different subscription tiers and progress levels';
    RAISE NOTICE '- 6 comprehensive workshop modules based on Six Figure Barber methodology';
    RAISE NOTICE '- Multiple lessons with video, interactive, and text content';
    RAISE NOTICE '- Realistic user progress data across different completion stages';
    RAISE NOTICE '- Sample workbook sessions with audio recordings';
    RAISE NOTICE '- AI-generated transcriptions with insights and action items';
    RAISE NOTICE '- Rich, searchable notes with tags and metadata';
    RAISE NOTICE '- Live session examples with participant data';
    RAISE NOTICE '- User achievements and milestone tracking';
    RAISE NOTICE '- Cost tracking and usage metrics';
    RAISE NOTICE '- System performance monitoring data';
    RAISE NOTICE '';
    RAISE NOTICE 'The database now contains comprehensive sample data that demonstrates';
    RAISE NOTICE 'the full capability of the 6FB Workbook system, from basic user';
    RAISE NOTICE 'onboarding through advanced business mastery content.';
    RAISE NOTICE '=================================================================';
END $$;