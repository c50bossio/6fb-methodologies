-- ==============================================================
-- 6FB Workshop Content Seeding Script
-- ==============================================================
-- This script populates the workshop_modules and workshop_lessons
-- tables with complete Six Figure Barber methodology content.
--
-- Run this after creating the database schema to load all
-- workshop content with proper relationships and search vectors.
-- ==============================================================

BEGIN;

-- ==============================================================
-- SAFETY: Clear existing test data
-- ==============================================================
DO $$
BEGIN
    RAISE NOTICE 'Clearing existing workshop content...';

    -- Clear in dependency order
    DELETE FROM lesson_progress;
    DELETE FROM user_progress;
    DELETE FROM session_notes WHERE lesson_id IS NOT NULL OR module_id IS NOT NULL;
    DELETE FROM audio_recordings WHERE lesson_id IS NOT NULL;
    DELETE FROM workshop_lessons;
    DELETE FROM workshop_modules;

    RAISE NOTICE 'Existing content cleared successfully.';
END $$;

-- ==============================================================
-- MODULE 1: Foundation & Mindset
-- ==============================================================
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
    cover_image_url,
    video_intro_url
) VALUES (
    'mod-001-foundation-mindset',
    'Foundation & Mindset',
    'Establish the foundational mindset and principles for building a six-figure barbering business',
    1,
    120,
    '{
        "overview": {
            "objectives": [
                "Understand the Six Figure Barber methodology and framework",
                "Develop the proper mindset for business success",
                "Set clear, actionable goals for your barbering career",
                "Identify and overcome limiting beliefs",
                "Create a personal mission statement and vision"
            ],
            "outcomes": [
                "Clear understanding of what it takes to build a six-figure barbering business",
                "A personal action plan with specific, measurable goals",
                "Confidence and clarity about your barbering career path",
                "Tools to maintain motivation and overcome challenges"
            ],
            "keyTakeaways": [
                "Success in barbering requires more than just cutting skills",
                "Your mindset directly impacts your business results",
                "Goal setting is the foundation of business growth",
                "Consistency and persistence are key to reaching six figures"
            ]
        },
        "resources": [
            {
                "title": "Six Figure Barber Worksheet",
                "url": "/downloads/6fb-worksheet.pdf",
                "type": "template",
                "description": "Complete worksheet for tracking your progress"
            },
            {
                "title": "Business Structure Guide",
                "url": "/downloads/business-structure-guide.pdf",
                "type": "document",
                "description": "Detailed guide to choosing your business structure"
            }
        ],
        "assessment": {
            "type": "quiz",
            "passingScore": 80,
            "questions": [
                {
                    "question": "What is the primary difference between six-figure barbers and average barbers?",
                    "options": ["Better cutting skills", "More expensive tools", "Business mindset and systems", "Lucky breaks"],
                    "correct": 2
                },
                {
                    "question": "What weekly client volume at $50 average would generate $100,000 annually?",
                    "options": ["30 clients", "35 clients", "40 clients", "45 clients"],
                    "correct": 2
                }
            ]
        }
    }',
    '{}',
    true,
    'beginner',
    '{"foundation", "mindset", "business-basics", "goal-setting"}',
    '/images/modules/foundation-mindset.jpg',
    '/videos/modules/foundation-intro.mp4'
);

-- Module 1 Lessons
INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites
) VALUES
(
    'les-001-01-intro-6fb',
    'mod-001-foundation-mindset',
    'Introduction to the Six Figure Barber System',
    'video',
    '{
        "description": "Overview of the complete methodology and what sets six-figure barbers apart",
        "blocks": [
            {
                "id": "block-001-intro",
                "type": "video",
                "order": 1,
                "title": "Welcome to the Six Figure Barber Program",
                "estimatedMinutes": 15,
                "content": {
                    "videoUrl": "/videos/lessons/6fb-intro.mp4",
                    "duration": 900,
                    "chapters": [
                        {"title": "Program Overview", "startTime": 0},
                        {"title": "The 6FB Methodology", "startTime": 300},
                        {"title": "Success Stories", "startTime": 600},
                        {"title": "Your Journey Ahead", "startTime": 750}
                    ]
                }
            },
            {
                "id": "block-001-callout",
                "type": "callout",
                "order": 2,
                "content": {
                    "text": "The average barber makes $35,000 per year. Six-figure barbers make $100,000+. The difference isn''t just skill - it''s methodology.",
                    "style": "info",
                    "icon": "trophy",
                    "dismissible": false
                }
            },
            {
                "id": "block-001-quiz",
                "type": "quiz",
                "order": 4,
                "title": "Knowledge Check: Program Overview",
                "estimatedMinutes": 5,
                "content": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": "What are the four core pillars of the Six Figure Barber framework?",
                            "type": "multiple-choice",
                            "options": [
                                "Cutting, Styling, Marketing, Money",
                                "Mindset, Business Systems, Marketing, Growth",
                                "Tools, Techniques, Clients, Revenue",
                                "Location, Equipment, Staff, Promotion"
                            ],
                            "correctAnswer": "Mindset, Business Systems, Marketing, Growth",
                            "explanation": "The four pillars work together to create a complete business system.",
                            "points": 10
                        }
                    ],
                    "passingScore": 70,
                    "allowRetries": true,
                    "showResults": true
                }
            }
        ],
        "completionCriteria": {
            "type": "quiz",
            "threshold": 70
        }
    }',
    25,
    1,
    true,
    '{}'
),
(
    'les-001-02-success-mindset',
    'mod-001-foundation-mindset',
    'Developing a Success Mindset',
    'interactive',
    '{
        "description": "Transform your thinking patterns to align with six-figure success",
        "blocks": [
            {
                "id": "block-002-intro",
                "type": "text",
                "order": 1,
                "title": "The Power of Mindset",
                "content": {
                    "text": "Your mindset is the foundation of everything you achieve. The difference between a $35K barber and a $100K+ barber often starts in their thinking.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-002-interactive",
                "type": "interactive",
                "order": 2,
                "title": "Mindset Assessment & Goal Setting",
                "estimatedMinutes": 20,
                "content": {
                    "component": "GoalSettingWorksheet",
                    "props": {
                        "title": "Six Figure Barber Goals",
                        "categories": ["Income Goals", "Business Development", "Skill Enhancement", "Personal Growth"],
                        "timeframes": ["90 days", "6 months", "1 year", "3 years"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    30,
    2,
    true,
    '{}'
),
(
    'les-001-03-business-fundamentals',
    'mod-001-foundation-mindset',
    'Business Fundamentals for Barbers',
    'text',
    '{
        "description": "Essential business concepts every six-figure barber must understand",
        "blocks": [
            {
                "id": "block-003-fundamentals",
                "type": "text",
                "order": 1,
                "title": "Business Basics Every Barber Needs",
                "content": {
                    "text": "# Business Fundamentals for Barbers\\n\\n## Revenue vs Profit\\n- **Revenue**: Total money coming in\\n- **Profit**: Money left after expenses\\n- **Goal**: Maximize profit, not just revenue\\n\\n## The Six Figure Formula\\n```\\n40 clients/week × $50 average × 50 weeks = $100,000\\n```",
                    "format": "markdown"
                }
            },
            {
                "id": "block-003-calculator",
                "type": "interactive",
                "order": 2,
                "title": "Revenue Calculator",
                "estimatedMinutes": 15,
                "content": {
                    "component": "RevenuePricingCalculator",
                    "props": {
                        "title": "Calculate Your Six Figure Path",
                        "defaultValues": {
                            "weeklyClients": 30,
                            "averagePrice": 35,
                            "workingWeeks": 50
                        }
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 80
        }
    }',
    35,
    3,
    true,
    '{}'
),
(
    'les-001-04-action-planning',
    'mod-001-foundation-mindset',
    'Creating Your Action Plan',
    'exercise',
    '{
        "description": "Develop a concrete 90-day action plan to start your six-figure journey",
        "blocks": [
            {
                "id": "block-004-planning",
                "type": "text",
                "order": 1,
                "title": "The Power of Action Planning",
                "content": {
                    "text": "# Creating Your Six Figure Action Plan\\n\\nA goal without a plan is just a wish. Let''s turn your six-figure goal into a concrete action plan.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-004-exercise",
                "type": "exercise",
                "order": 2,
                "title": "Your 90-Day Action Plan",
                "estimatedMinutes": 25,
                "content": {
                    "instructions": "Create a detailed 90-day action plan with specific, measurable goals and weekly milestones.",
                    "timeLimit": 25,
                    "submissionType": "text",
                    "submissionRequired": true
                }
            }
        ],
        "completionCriteria": {
            "type": "exercise",
            "threshold": 100
        }
    }',
    30,
    4,
    true,
    '{}'
);

-- ==============================================================
-- MODULE 2: Business Systems & Operations
-- ==============================================================
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
    cover_image_url
) VALUES (
    'mod-002-business-systems',
    'Business Systems & Operations',
    'Build efficient systems that enable consistent growth and higher profitability',
    2,
    150,
    '{
        "overview": {
            "objectives": [
                "Design efficient booking and scheduling systems",
                "Create standard operating procedures for consistency",
                "Implement inventory management and cost controls",
                "Develop client management and retention systems",
                "Build financial tracking and reporting systems"
            ],
            "outcomes": [
                "Streamlined operations that save 10+ hours per week",
                "Improved client experience and satisfaction",
                "Better financial visibility and control",
                "Scalable systems ready for growth"
            ],
            "keyTakeaways": [
                "Systems create freedom and consistency",
                "Good systems improve both efficiency and quality",
                "Investment in systems pays dividends long-term"
            ]
        },
        "resources": [
            {
                "title": "Scheduling Software Comparison",
                "url": "/downloads/scheduling-comparison.pdf",
                "type": "document",
                "description": "Comparison of popular scheduling platforms"
            },
            {
                "title": "SOP Template Library",
                "url": "/downloads/sop-templates.zip",
                "type": "template",
                "description": "Standard operating procedure templates"
            }
        ]
    }',
    '{"mod-001-foundation-mindset"}',
    true,
    'intermediate',
    '{"systems", "operations", "efficiency", "automation"}',
    '/images/modules/business-systems.jpg'
);

-- Module 2 Lessons
INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites
) VALUES
(
    'les-002-01-scheduling-systems',
    'mod-002-business-systems',
    'Advanced Scheduling & Booking Systems',
    'video',
    '{
        "description": "Optimize your time and maximize revenue through strategic scheduling",
        "blocks": [
            {
                "id": "block-005-scheduling",
                "type": "video",
                "order": 1,
                "title": "Scheduling for Six Figures",
                "estimatedMinutes": 20,
                "content": {
                    "videoUrl": "/videos/lessons/advanced-scheduling.mp4",
                    "duration": 1200,
                    "chapters": [
                        {"title": "Time Block Strategy", "startTime": 0},
                        {"title": "Premium Time Slots", "startTime": 300},
                        {"title": "Booking Policies", "startTime": 600},
                        {"title": "No-Show Prevention", "startTime": 900}
                    ]
                }
            },
            {
                "id": "block-005-interactive",
                "type": "interactive",
                "order": 2,
                "title": "Service Package Designer",
                "estimatedMinutes": 20,
                "content": {
                    "component": "ServicePackageDesigner",
                    "props": {
                        "title": "Design Your Service Packages",
                        "serviceTypes": ["Basic Cut", "Premium Cut & Style", "Full Service Experience", "VIP Package"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    40,
    1,
    true,
    '{}'
),
(
    'les-002-02-client-management',
    'mod-002-business-systems',
    'Client Relationship Management',
    'interactive',
    '{
        "description": "Build systems to attract, retain, and maximize the value of your client relationships",
        "blocks": [
            {
                "id": "block-006-crm",
                "type": "text",
                "order": 1,
                "title": "The Power of Client Management",
                "content": {
                    "text": "# Client Relationship Management for Barbers\\n\\nYour clients are your most valuable asset. A systematic approach to managing client relationships can increase retention by 25% and referrals by 40%.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-006-assessment",
                "type": "interactive",
                "order": 2,
                "title": "Client Portfolio Analysis",
                "estimatedMinutes": 25,
                "content": {
                    "component": "BusinessAssessmentTemplate",
                    "props": {
                        "title": "Analyze Your Client Base",
                        "sections": ["Client Demographics", "Service Preferences", "Spending Patterns", "Retention Rates"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 90
        }
    }',
    35,
    2,
    true,
    '{}'
),
(
    'les-002-03-financial-systems',
    'mod-002-business-systems',
    'Financial Management & Tracking',
    'text',
    '{
        "description": "Implement robust financial systems for better business control and decision-making",
        "blocks": [
            {
                "id": "block-007-finance",
                "type": "text",
                "order": 1,
                "title": "Financial Control Systems",
                "content": {
                    "text": "# Financial Management for Six-Figure Success\\n\\n## Key Financial Metrics\\n1. **Revenue per Hour**: Total revenue / hours worked\\n2. **Client Lifetime Value**: Average spend × retention period\\n3. **Cost per Acquisition**: Marketing spend / new clients\\n4. **Profit Margin**: (Revenue - Expenses) / Revenue",
                    "format": "markdown"
                }
            },
            {
                "id": "block-007-quiz",
                "type": "quiz",
                "order": 2,
                "title": "Financial Systems Quiz",
                "estimatedMinutes": 10,
                "content": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": "What is the most important metric for measuring barbering business efficiency?",
                            "type": "multiple-choice",
                            "options": ["Total revenue", "Revenue per hour", "Number of clients", "Equipment costs"],
                            "correctAnswer": "Revenue per hour",
                            "explanation": "Revenue per hour shows how efficiently you convert time into income.",
                            "points": 10
                        }
                    ],
                    "passingScore": 80,
                    "allowRetries": true,
                    "showResults": true
                }
            }
        ],
        "completionCriteria": {
            "type": "quiz",
            "threshold": 80
        }
    }',
    30,
    3,
    true,
    '{}'
),
(
    'les-002-04-operational-excellence',
    'mod-002-business-systems',
    'Standard Operating Procedures',
    'exercise',
    '{
        "description": "Create standardized procedures for consistent, high-quality service delivery",
        "blocks": [
            {
                "id": "block-008-sops",
                "type": "text",
                "order": 1,
                "title": "Building Operational Excellence",
                "content": {
                    "text": "# Standard Operating Procedures (SOPs)\\n\\nSOPs ensure consistency, quality, and efficiency in every aspect of your business. They also make scaling much easier.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-008-exercise",
                "type": "exercise",
                "order": 2,
                "title": "Create Your SOPs",
                "estimatedMinutes": 30,
                "content": {
                    "instructions": "Document step-by-step procedures for your most important business processes: client consultation, service delivery, checkout process, and follow-up.",
                    "timeLimit": 30,
                    "submissionType": "text",
                    "submissionRequired": true
                }
            }
        ],
        "completionCriteria": {
            "type": "exercise",
            "threshold": 100
        }
    }',
    40,
    4,
    true,
    '{}'
);

-- ==============================================================
-- MODULE 3: Marketing & Client Acquisition
-- ==============================================================
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
    cover_image_url
) VALUES (
    'mod-003-marketing-acquisition',
    'Marketing & Client Acquisition',
    'Master the art and science of attracting high-value clients consistently',
    3,
    180,
    '{
        "overview": {
            "objectives": [
                "Develop a compelling brand identity and positioning",
                "Create effective marketing strategies for local markets",
                "Build a referral system that generates consistent new clients",
                "Leverage social media and digital marketing effectively",
                "Implement retention strategies to maximize client lifetime value"
            ],
            "outcomes": [
                "A clear brand identity that attracts ideal clients",
                "Marketing campaigns that generate qualified leads",
                "A referral system producing 3-5 new clients monthly",
                "Social media presence that builds trust and attracts bookings"
            ],
            "keyTakeaways": [
                "Marketing is about relationships, not just promotion",
                "Consistency beats perfection in marketing",
                "Word-of-mouth is still the most powerful marketing tool"
            ]
        },
        "resources": [
            {
                "title": "Brand Development Kit",
                "url": "/downloads/brand-kit.zip",
                "type": "template",
                "description": "Templates and guides for developing your brand"
            },
            {
                "title": "Social Media Content Calendar",
                "url": "/downloads/content-calendar.xlsx",
                "type": "template",
                "description": "90-day content planning template"
            }
        ]
    }',
    '{"mod-001-foundation-mindset", "mod-002-business-systems"}',
    true,
    'intermediate',
    '{"marketing", "branding", "client-acquisition", "social-media"}',
    '/images/modules/marketing-acquisition.jpg'
);

-- Module 3 Lessons
INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites
) VALUES
(
    'les-003-01-brand-development',
    'mod-003-marketing-acquisition',
    'Building Your Six Figure Brand',
    'interactive',
    '{
        "description": "Develop a compelling brand that attracts premium clients and commands higher prices",
        "blocks": [
            {
                "id": "block-009-brand",
                "type": "video",
                "order": 1,
                "title": "The Power of Personal Branding",
                "estimatedMinutes": 20,
                "content": {
                    "videoUrl": "/videos/lessons/brand-development.mp4",
                    "duration": 1200,
                    "chapters": [
                        {"title": "Brand vs Image", "startTime": 0},
                        {"title": "Positioning Strategy", "startTime": 400},
                        {"title": "Brand Consistency", "startTime": 800}
                    ]
                }
            },
            {
                "id": "block-009-workshop",
                "type": "interactive",
                "order": 2,
                "title": "Brand Identity Workshop",
                "estimatedMinutes": 25,
                "content": {
                    "component": "BusinessAssessmentTemplate",
                    "props": {
                        "title": "Define Your Brand Identity",
                        "sections": ["Target Client Profile", "Unique Value Proposition", "Brand Personality", "Visual Identity"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    45,
    1,
    true,
    '{}'
),
(
    'les-003-02-digital-marketing',
    'mod-003-marketing-acquisition',
    'Digital Marketing Mastery',
    'video',
    '{
        "description": "Leverage digital platforms to reach and convert your ideal clients",
        "blocks": [
            {
                "id": "block-010-digital",
                "type": "video",
                "order": 1,
                "title": "Digital Marketing Strategy",
                "estimatedMinutes": 25,
                "content": {
                    "videoUrl": "/videos/lessons/digital-marketing.mp4",
                    "duration": 1500,
                    "chapters": [
                        {"title": "Platform Selection", "startTime": 0},
                        {"title": "Content Strategy", "startTime": 500},
                        {"title": "Paid Advertising", "startTime": 1000}
                    ]
                }
            },
            {
                "id": "block-010-checklist",
                "type": "checklist",
                "order": 2,
                "title": "Digital Marketing Setup",
                "content": {
                    "items": [
                        {
                            "id": "google-business",
                            "text": "Optimize Google Business Profile",
                            "isRequired": true,
                            "helpText": "Essential for local search visibility"
                        },
                        {
                            "id": "instagram-business",
                            "text": "Set up Instagram Business account",
                            "isRequired": true,
                            "helpText": "Primary platform for barbering content"
                        },
                        {
                            "id": "facebook-page",
                            "text": "Create Facebook Business page",
                            "isRequired": false,
                            "helpText": "Good for local community engagement"
                        }
                    ],
                    "requireAll": false
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 75
        }
    }',
    40,
    2,
    true,
    '{}'
),
(
    'les-003-03-referral-systems',
    'mod-003-marketing-acquisition',
    'Building a Referral Engine',
    'text',
    '{
        "description": "Create systematic approaches to generate consistent referrals from satisfied clients",
        "blocks": [
            {
                "id": "block-011-referrals",
                "type": "text",
                "order": 1,
                "title": "The Referral System Framework",
                "content": {
                    "text": "# Building Your Referral Engine\\n\\n## The 3-Step Referral System\\n1. **Exceed Expectations**: Deliver exceptional service every time\\n2. **Ask at the Right Time**: When clients are most satisfied\\n3. **Reward and Recognize**: Thank referrers meaningfully\\n\\n## Referral Triggers\\n- Immediately after a great cut\\n- When clients compliment your work\\n- During checkout conversation\\n- Via follow-up messages",
                    "format": "markdown"
                }
            },
            {
                "id": "block-011-quiz",
                "type": "quiz",
                "order": 2,
                "title": "Referral Strategy Quiz",
                "estimatedMinutes": 8,
                "content": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": "When is the best time to ask for referrals?",
                            "type": "multiple-choice",
                            "options": ["During the haircut", "Right after finishing a great cut", "A week later via text", "Only when business is slow"],
                            "correctAnswer": "Right after finishing a great cut",
                            "explanation": "Clients are most satisfied and enthusiastic right after receiving great service.",
                            "points": 10
                        }
                    ],
                    "passingScore": 80,
                    "allowRetries": true,
                    "showResults": true
                }
            }
        ],
        "completionCriteria": {
            "type": "quiz",
            "threshold": 80
        }
    }',
    35,
    3,
    true,
    '{}'
),
(
    'les-003-04-client-retention',
    'mod-003-marketing-acquisition',
    'Maximizing Client Lifetime Value',
    'exercise',
    '{
        "description": "Implement strategies to keep clients coming back and spending more over time",
        "blocks": [
            {
                "id": "block-012-retention",
                "type": "text",
                "order": 1,
                "title": "Client Retention Strategies",
                "content": {
                    "text": "# Maximizing Client Lifetime Value\\n\\nRetaining a client costs 5x less than acquiring a new one. Focus on keeping clients for life, not just for the next appointment.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-012-exercise",
                "type": "exercise",
                "order": 2,
                "title": "Retention Strategy Plan",
                "estimatedMinutes": 25,
                "content": {
                    "instructions": "Design a comprehensive client retention strategy including: welcome sequence for new clients, regular check-ins, loyalty rewards, and win-back campaigns for inactive clients.",
                    "timeLimit": 25,
                    "submissionType": "text",
                    "submissionRequired": true
                }
            }
        ],
        "completionCriteria": {
            "type": "exercise",
            "threshold": 100
        }
    }',
    35,
    4,
    true,
    '{}'
);

-- ==============================================================
-- MODULE 4: Pricing & Premium Services
-- ==============================================================
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
    cover_image_url
) VALUES (
    'mod-004-pricing-premium',
    'Pricing & Premium Services',
    'Master value-based pricing and create premium service offerings that command higher prices',
    4,
    135,
    '{
        "overview": {
            "objectives": [
                "Understand value-based pricing vs cost-plus pricing",
                "Develop premium service packages and experiences",
                "Implement strategic price increases without losing clients",
                "Create tiered service offerings for different client segments",
                "Build confidence in charging premium prices"
            ],
            "outcomes": [
                "Pricing strategy that maximizes profit per client",
                "Premium service offerings generating 30-50% higher revenue",
                "Confidence to charge what you are worth",
                "Systematic approach to price optimization"
            ],
            "keyTakeaways": [
                "Price is a reflection of value, not just cost",
                "Premium clients prefer premium experiences",
                "Gradual price increases are more acceptable than sudden jumps"
            ]
        },
        "resources": [
            {
                "title": "Pricing Strategy Workbook",
                "url": "/downloads/pricing-workbook.pdf",
                "type": "template",
                "description": "Complete guide to pricing optimization"
            },
            {
                "title": "Premium Service Ideas Library",
                "url": "/downloads/premium-services.pdf",
                "type": "document",
                "description": "50+ premium service concepts"
            }
        ]
    }',
    '{"mod-001-foundation-mindset", "mod-002-business-systems", "mod-003-marketing-acquisition"}',
    true,
    'advanced',
    '{"pricing", "premium-services", "value-pricing", "profit-optimization"}',
    '/images/modules/pricing-premium.jpg'
);

-- Module 4 Lessons
INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites
) VALUES
(
    'les-004-01-value-pricing',
    'mod-004-pricing-premium',
    'Value-Based Pricing Fundamentals',
    'video',
    '{
        "description": "Learn to price based on value delivered rather than time or cost",
        "blocks": [
            {
                "id": "block-013-pricing",
                "type": "video",
                "order": 1,
                "title": "The Psychology of Pricing",
                "estimatedMinutes": 20,
                "content": {
                    "videoUrl": "/videos/lessons/value-pricing.mp4",
                    "duration": 1200,
                    "chapters": [
                        {"title": "Value vs Cost Pricing", "startTime": 0},
                        {"title": "Price Anchoring", "startTime": 400},
                        {"title": "Premium Positioning", "startTime": 800}
                    ]
                }
            },
            {
                "id": "block-013-calculator",
                "type": "interactive",
                "order": 2,
                "title": "Pricing Optimization Tool",
                "estimatedMinutes": 15,
                "content": {
                    "component": "RevenuePricingCalculator",
                    "props": {
                        "title": "Optimize Your Pricing Strategy",
                        "includePremiumTiers": true,
                        "showValueCalculation": true
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    35,
    1,
    true,
    '{}'
),
(
    'les-004-02-premium-experiences',
    'mod-004-pricing-premium',
    'Creating Premium Experiences',
    'interactive',
    '{
        "description": "Design and implement premium service experiences that justify higher prices",
        "blocks": [
            {
                "id": "block-014-premium",
                "type": "text",
                "order": 1,
                "title": "Elements of Premium Service",
                "content": {
                    "text": "# Creating Premium Experiences\\n\\n## The Premium Service Stack\\n1. **Ambiance**: Environment and atmosphere\\n2. **Service**: Exceptional attention to detail\\n3. **Convenience**: Make it easy for clients\\n4. **Personalization**: Tailored to individual preferences\\n5. **Exclusivity**: Limited availability or access",
                    "format": "markdown"
                }
            },
            {
                "id": "block-014-designer",
                "type": "interactive",
                "order": 2,
                "title": "Premium Service Designer",
                "estimatedMinutes": 25,
                "content": {
                    "component": "ServicePackageDesigner",
                    "props": {
                        "title": "Design Premium Service Packages",
                        "includeAddOns": true,
                        "includePricing": true,
                        "serviceTypes": ["Signature Experience", "VIP Treatment", "Executive Service", "Special Occasion Package"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    40,
    2,
    true,
    '{}'
),
(
    'les-004-03-price-implementation',
    'mod-004-pricing-premium',
    'Implementing Price Changes',
    'text',
    '{
        "description": "Strategic approaches to raising prices while maintaining client relationships",
        "blocks": [
            {
                "id": "block-015-implementation",
                "type": "text",
                "order": 1,
                "title": "Price Increase Strategies",
                "content": {
                    "text": "# Implementing Price Changes Successfully\\n\\n## The Gradual Approach\\n- Increase prices 10-15% annually\\n- Give advance notice (30-60 days)\\n- Explain value improvements\\n- Grandfather loyal clients temporarily\\n\\n## Communication Scripts\\n- Focus on value, not price\\n- Be confident and matter-of-fact\\n- Offer alternatives if needed",
                    "format": "markdown"
                }
            },
            {
                "id": "block-015-quiz",
                "type": "quiz",
                "order": 2,
                "title": "Price Implementation Quiz",
                "estimatedMinutes": 10,
                "content": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": "What is the recommended maximum annual price increase for existing clients?",
                            "type": "multiple-choice",
                            "options": ["5-8%", "10-15%", "20-25%", "30%+"],
                            "correctAnswer": "10-15%",
                            "explanation": "10-15% is generally acceptable and tracks with business growth and inflation.",
                            "points": 10
                        }
                    ],
                    "passingScore": 80,
                    "allowRetries": true,
                    "showResults": true
                }
            }
        ],
        "completionCriteria": {
            "type": "quiz",
            "threshold": 80
        }
    }',
    30,
    3,
    true,
    '{}'
),
(
    'les-004-04-profit-optimization',
    'mod-004-pricing-premium',
    'Profit Optimization Strategies',
    'exercise',
    '{
        "description": "Analyze and optimize your profit margins through strategic pricing and cost management",
        "blocks": [
            {
                "id": "block-016-profit",
                "type": "text",
                "order": 1,
                "title": "Profit Optimization Framework",
                "content": {
                    "text": "# Maximizing Profit Margins\\n\\nProfit optimization involves both revenue optimization and cost management. Focus on high-margin services and efficient operations.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-016-exercise",
                "type": "exercise",
                "order": 2,
                "title": "Profit Analysis & Optimization Plan",
                "estimatedMinutes": 25,
                "content": {
                    "instructions": "Analyze your current profit margins by service type. Identify opportunities to increase profits through pricing adjustments, cost reductions, or service mix optimization.",
                    "timeLimit": 25,
                    "submissionType": "text",
                    "submissionRequired": true
                }
            }
        ],
        "completionCriteria": {
            "type": "exercise",
            "threshold": 100
        }
    }',
    30,
    4,
    true,
    '{}'
);

-- ==============================================================
-- MODULE 5: Growth & Scaling
-- ==============================================================
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
    cover_image_url
) VALUES (
    'mod-005-growth-scaling',
    'Growth & Scaling',
    'Scale your barbering business beyond personal capacity through strategic growth initiatives',
    5,
    165,
    '{
        "overview": {
            "objectives": [
                "Understand the difference between growth and scaling",
                "Develop multiple revenue streams beyond cutting hair",
                "Build systems that work without constant oversight",
                "Explore expansion opportunities and partnerships",
                "Create passive income streams in the beauty industry"
            ],
            "outcomes": [
                "Clear scaling strategy with defined milestones",
                "Multiple revenue streams reducing dependency on personal service",
                "Systems that enable business growth without proportional time increase",
                "Network of strategic partnerships and opportunities"
            ],
            "keyTakeaways": [
                "Scaling requires systems, not just more work",
                "Diversification reduces business risk",
                "Strategic partnerships accelerate growth"
            ]
        },
        "resources": [
            {
                "title": "Scaling Roadmap Template",
                "url": "/downloads/scaling-roadmap.pdf",
                "type": "template",
                "description": "Step-by-step scaling planning template"
            },
            {
                "title": "Revenue Stream Ideas",
                "url": "/downloads/revenue-streams.pdf",
                "type": "document",
                "description": "25+ revenue stream concepts for barbers"
            }
        ]
    }',
    '{"mod-001-foundation-mindset", "mod-002-business-systems", "mod-003-marketing-acquisition", "mod-004-pricing-premium"}',
    true,
    'advanced',
    '{"scaling", "growth", "revenue-streams", "automation", "expansion"}',
    '/images/modules/growth-scaling.jpg'
);

-- Module 5 Lessons
INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites
) VALUES
(
    'les-005-01-scaling-foundations',
    'mod-005-growth-scaling',
    'Foundations of Scalable Business',
    'video',
    '{
        "description": "Understand the principles and requirements for building a scalable barbering business",
        "blocks": [
            {
                "id": "block-017-scaling",
                "type": "video",
                "order": 1,
                "title": "Growth vs Scaling",
                "estimatedMinutes": 25,
                "content": {
                    "videoUrl": "/videos/lessons/scaling-foundations.mp4",
                    "duration": 1500,
                    "chapters": [
                        {"title": "Growth vs Scaling Defined", "startTime": 0},
                        {"title": "Scalability Requirements", "startTime": 500},
                        {"title": "Common Scaling Mistakes", "startTime": 1000}
                    ]
                }
            },
            {
                "id": "block-017-assessment",
                "type": "interactive",
                "order": 2,
                "title": "Scaling Readiness Assessment",
                "estimatedMinutes": 20,
                "content": {
                    "component": "BusinessAssessmentTemplate",
                    "props": {
                        "title": "Assess Your Scaling Readiness",
                        "sections": ["Current Systems", "Financial Position", "Market Opportunity", "Personal Capacity"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    45,
    1,
    true,
    '{}'
),
(
    'les-005-02-revenue-streams',
    'mod-005-growth-scaling',
    'Developing Multiple Revenue Streams',
    'interactive',
    '{
        "description": "Identify and implement additional revenue streams to diversify your income",
        "blocks": [
            {
                "id": "block-018-revenue",
                "type": "text",
                "order": 1,
                "title": "Revenue Stream Categories",
                "content": {
                    "text": "# Multiple Revenue Streams for Barbers\\n\\n## Product Sales\\n- Hair care products\\n- Styling tools and accessories\\n- Private label products\\n\\n## Educational Services\\n- One-on-one coaching\\n- Group workshops\\n- Online courses\\n\\n## Passive Income\\n- Affiliate commissions\\n- Digital product sales\\n- Licensing agreements",
                    "format": "markdown"
                }
            },
            {
                "id": "block-018-planner",
                "type": "interactive",
                "order": 2,
                "title": "Revenue Stream Planner",
                "estimatedMinutes": 30,
                "content": {
                    "component": "BusinessAssessmentTemplate",
                    "props": {
                        "title": "Plan Your Revenue Streams",
                        "sections": ["Current Streams", "Potential Opportunities", "Implementation Timeline", "Resource Requirements"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    40,
    2,
    true,
    '{}'
),
(
    'les-005-03-automation-systems',
    'mod-005-growth-scaling',
    'Business Automation & Delegation',
    'text',
    '{
        "description": "Implement automation and delegation strategies to scale beyond personal capacity",
        "blocks": [
            {
                "id": "block-019-automation",
                "type": "text",
                "order": 1,
                "title": "Automation Opportunities",
                "content": {
                    "text": "# Business Automation for Barbers\\n\\n## Client-Facing Automation\\n- Online booking and scheduling\\n- Automated appointment reminders\\n- Follow-up sequences\\n- Review request automation\\n\\n## Backend Automation\\n- Inventory management\\n- Financial reporting\\n- Marketing campaigns\\n- Client database updates",
                    "format": "markdown"
                }
            },
            {
                "id": "block-019-quiz",
                "type": "quiz",
                "order": 2,
                "title": "Automation Strategy Quiz",
                "estimatedMinutes": 12,
                "content": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": "What should be the first process to automate in a barbering business?",
                            "type": "multiple-choice",
                            "options": ["Inventory management", "Booking and scheduling", "Social media posting", "Financial reporting"],
                            "correctAnswer": "Booking and scheduling",
                            "explanation": "Booking automation saves the most time and improves client experience immediately.",
                            "points": 10
                        }
                    ],
                    "passingScore": 80,
                    "allowRetries": true,
                    "showResults": true
                }
            }
        ],
        "completionCriteria": {
            "type": "quiz",
            "threshold": 80
        }
    }',
    35,
    3,
    true,
    '{}'
),
(
    'les-005-04-expansion-strategies',
    'mod-005-growth-scaling',
    'Strategic Expansion Planning',
    'exercise',
    '{
        "description": "Develop strategies for expanding your business through new locations, partnerships, or formats",
        "blocks": [
            {
                "id": "block-020-expansion",
                "type": "text",
                "order": 1,
                "title": "Expansion Options",
                "content": {
                    "text": "# Strategic Expansion Planning\\n\\nExpansion should be strategic and well-planned. Consider your resources, market conditions, and long-term goals before expanding.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-020-exercise",
                "type": "exercise",
                "order": 2,
                "title": "Expansion Strategy Plan",
                "estimatedMinutes": 30,
                "content": {
                    "instructions": "Develop a comprehensive expansion strategy. Consider: new locations, additional services, franchising opportunities, partnerships, or acquisition possibilities. Include timeline, resources needed, and risk assessment.",
                    "timeLimit": 30,
                    "submissionType": "text",
                    "submissionRequired": true
                }
            }
        ],
        "completionCriteria": {
            "type": "exercise",
            "threshold": 100
        }
    }',
    40,
    4,
    true,
    '{}'
);

-- ==============================================================
-- MODULE 6: Advanced Business Strategies
-- ==============================================================
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
    cover_image_url
) VALUES (
    'mod-006-advanced-strategies',
    'Advanced Business Strategies',
    'Master advanced techniques for optimizing performance, building wealth, and creating lasting success',
    6,
    145,
    '{
        "overview": {
            "objectives": [
                "Implement advanced financial strategies and wealth building",
                "Develop leadership skills for team management",
                "Create strategic partnerships and joint ventures",
                "Build personal brand authority in the industry",
                "Plan for long-term business sustainability and exit strategies"
            ],
            "outcomes": [
                "Advanced financial management and investment strategies",
                "Leadership capabilities for managing teams",
                "Strategic partnerships that drive growth",
                "Industry recognition and thought leadership position"
            ],
            "keyTakeaways": [
                "Advanced strategies require strong fundamentals",
                "Leadership is essential for scaling beyond personal capacity",
                "Strategic thinking separates good businesses from great ones"
            ]
        },
        "resources": [
            {
                "title": "Advanced Strategy Playbook",
                "url": "/downloads/advanced-playbook.pdf",
                "type": "document",
                "description": "Comprehensive guide to advanced business strategies"
            },
            {
                "title": "Financial Planning Worksheets",
                "url": "/downloads/financial-planning.xlsx",
                "type": "template",
                "description": "Advanced financial planning and analysis tools"
            }
        ]
    }',
    '{"mod-001-foundation-mindset", "mod-002-business-systems", "mod-003-marketing-acquisition", "mod-004-pricing-premium", "mod-005-growth-scaling"}',
    true,
    'expert',
    '{"advanced-strategies", "leadership", "wealth-building", "partnerships", "sustainability"}',
    '/images/modules/advanced-strategies.jpg'
);

-- Module 6 Lessons
INSERT INTO workshop_lessons (
    id,
    module_id,
    title,
    type,
    content,
    estimated_minutes,
    sort_order,
    is_published,
    prerequisites
) VALUES
(
    'les-006-01-wealth-building',
    'mod-006-advanced-strategies',
    'Wealth Building & Financial Optimization',
    'video',
    '{
        "description": "Advanced financial strategies for building long-term wealth through your barbering business",
        "blocks": [
            {
                "id": "block-021-wealth",
                "type": "video",
                "order": 1,
                "title": "Wealth Building Fundamentals",
                "estimatedMinutes": 25,
                "content": {
                    "videoUrl": "/videos/lessons/wealth-building.mp4",
                    "duration": 1500,
                    "chapters": [
                        {"title": "Business vs Personal Wealth", "startTime": 0},
                        {"title": "Investment Strategies", "startTime": 500},
                        {"title": "Tax Optimization", "startTime": 1000}
                    ]
                }
            },
            {
                "id": "block-021-calculator",
                "type": "interactive",
                "order": 2,
                "title": "Wealth Building Calculator",
                "estimatedMinutes": 20,
                "content": {
                    "component": "RevenuePricingCalculator",
                    "props": {
                        "title": "Calculate Your Wealth Building Path",
                        "includeInvestmentProjections": true,
                        "includeTaxOptimization": true
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    45,
    1,
    true,
    '{}'
),
(
    'les-006-02-leadership-development',
    'mod-006-advanced-strategies',
    'Leadership & Team Development',
    'interactive',
    '{
        "description": "Develop leadership skills necessary for managing teams and scaling operations",
        "blocks": [
            {
                "id": "block-022-leadership",
                "type": "text",
                "order": 1,
                "title": "Leadership Fundamentals",
                "content": {
                    "text": "# Leadership in the Barbering Industry\\n\\n## Key Leadership Skills\\n1. **Vision Setting**: Create compelling future direction\\n2. **Team Building**: Recruit and develop talent\\n3. **Communication**: Clear, consistent messaging\\n4. **Decision Making**: Quick, informed choices\\n5. **Culture Creation**: Build positive work environment",
                    "format": "markdown"
                }
            },
            {
                "id": "block-022-assessment",
                "type": "interactive",
                "order": 2,
                "title": "Leadership Assessment & Development Plan",
                "estimatedMinutes": 25,
                "content": {
                    "component": "BusinessAssessmentTemplate",
                    "props": {
                        "title": "Assess Your Leadership Skills",
                        "sections": ["Current Strengths", "Development Areas", "Leadership Style", "Team Building Plan"]
                    },
                    "saveProgress": true,
                    "requireCompletion": true
                }
            }
        ],
        "completionCriteria": {
            "type": "interaction",
            "threshold": 100
        }
    }',
    35,
    2,
    true,
    '{}'
),
(
    'les-006-03-strategic-partnerships',
    'mod-006-advanced-strategies',
    'Building Strategic Partnerships',
    'text',
    '{
        "description": "Identify and develop strategic partnerships that accelerate business growth",
        "blocks": [
            {
                "id": "block-023-partnerships",
                "type": "text",
                "order": 1,
                "title": "Partnership Strategy Framework",
                "content": {
                    "text": "# Strategic Partnerships for Barbers\\n\\n## Types of Partnerships\\n- **Cross-referral**: Exchange clients with complementary businesses\\n- **Joint ventures**: Collaborate on new products or services\\n- **Supplier partnerships**: Negotiate better terms and exclusive access\\n- **Technology partnerships**: Integrate systems for efficiency\\n\\n## Partnership Success Factors\\n- Aligned values and goals\\n- Clear agreements and expectations\\n- Mutual benefit and value creation\\n- Regular communication and review",
                    "format": "markdown"
                }
            },
            {
                "id": "block-023-quiz",
                "type": "quiz",
                "order": 2,
                "title": "Partnership Strategy Quiz",
                "estimatedMinutes": 10,
                "content": {
                    "questions": [
                        {
                            "id": "q1",
                            "question": "What is the most important factor for successful partnerships?",
                            "type": "multiple-choice",
                            "options": ["Similar business size", "Geographic proximity", "Aligned values and goals", "Same target market"],
                            "correctAnswer": "Aligned values and goals",
                            "explanation": "Shared values and aligned goals create the foundation for lasting partnerships.",
                            "points": 10
                        }
                    ],
                    "passingScore": 80,
                    "allowRetries": true,
                    "showResults": true
                }
            }
        ],
        "completionCriteria": {
            "type": "quiz",
            "threshold": 80
        }
    }',
    30,
    3,
    true,
    '{}'
),
(
    'les-006-04-legacy-planning',
    'mod-006-advanced-strategies',
    'Business Legacy & Exit Planning',
    'exercise',
    '{
        "description": "Plan for long-term business sustainability and eventual exit strategies",
        "blocks": [
            {
                "id": "block-024-legacy",
                "type": "text",
                "order": 1,
                "title": "Legacy Planning Fundamentals",
                "content": {
                    "text": "# Building a Business Legacy\\n\\nThink beyond immediate success to create lasting impact and value. Consider how your business can continue to thrive and benefit others long-term.",
                    "format": "markdown"
                }
            },
            {
                "id": "block-024-exercise",
                "type": "exercise",
                "order": 2,
                "title": "Legacy & Exit Strategy Plan",
                "estimatedMinutes": 35,
                "content": {
                    "instructions": "Develop a comprehensive legacy plan including: long-term vision, succession planning, exit strategy options, and impact goals. Consider how you want to be remembered in the industry.",
                    "timeLimit": 35,
                    "submissionType": "text",
                    "submissionRequired": true
                }
            }
        ],
        "completionCriteria": {
            "type": "exercise",
            "threshold": 100
        }
    }',
    35,
    4,
    true,
    '{}'
);

-- ==============================================================
-- UPDATE SEARCH VECTORS
-- ==============================================================
DO $$
BEGIN
    RAISE NOTICE 'Updating search vectors for all content...';

    -- Update search vectors (triggers will handle this automatically for new inserts)
    UPDATE workshop_modules SET updated_at = CURRENT_TIMESTAMP;
    UPDATE workshop_lessons SET updated_at = CURRENT_TIMESTAMP;

    RAISE NOTICE 'Search vectors updated successfully.';
END $$;

-- ==============================================================
-- VERIFICATION QUERIES
-- ==============================================================
DO $$
DECLARE
    module_count INTEGER;
    lesson_count INTEGER;
    published_modules INTEGER;
    published_lessons INTEGER;
BEGIN
    -- Count modules and lessons
    SELECT COUNT(*) INTO module_count FROM workshop_modules;
    SELECT COUNT(*) INTO lesson_count FROM workshop_lessons;
    SELECT COUNT(*) INTO published_modules FROM workshop_modules WHERE is_published = true;
    SELECT COUNT(*) INTO published_lessons FROM workshop_lessons WHERE is_published = true;

    RAISE NOTICE '=================================================================';
    RAISE NOTICE '6FB Workshop Content Seeding Complete!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Content Summary:';
    RAISE NOTICE '- Total Modules: % (% published)', module_count, published_modules;
    RAISE NOTICE '- Total Lessons: % (% published)', lesson_count, published_lessons;
    RAISE NOTICE '';
    RAISE NOTICE 'Module Structure:';
    RAISE NOTICE '1. Foundation & Mindset (4 lessons)';
    RAISE NOTICE '2. Business Systems & Operations (4 lessons)';
    RAISE NOTICE '3. Marketing & Client Acquisition (4 lessons)';
    RAISE NOTICE '4. Pricing & Premium Services (4 lessons)';
    RAISE NOTICE '5. Growth & Scaling (4 lessons)';
    RAISE NOTICE '6. Advanced Business Strategies (4 lessons)';
    RAISE NOTICE '';
    RAISE NOTICE 'All modules include:';
    RAISE NOTICE '- Comprehensive learning objectives and outcomes';
    RAISE NOTICE '- Mixed content types (video, interactive, text, exercise)';
    RAISE NOTICE '- Progressive difficulty levels';
    RAISE NOTICE '- Proper prerequisite chains';
    RAISE NOTICE '- Full-text search capabilities';
    RAISE NOTICE '- Assessment and completion tracking';
    RAISE NOTICE '=================================================================';
END $$;

-- Detailed verification query
SELECT
    m.title as module_title,
    m.module_order,
    m.difficulty_level,
    COUNT(l.id) as lesson_count,
    SUM(l.estimated_minutes) as total_duration
FROM workshop_modules m
LEFT JOIN workshop_lessons l ON m.id = l.module_id
WHERE m.is_published = true
GROUP BY m.id, m.title, m.module_order, m.difficulty_level
ORDER BY m.module_order;

COMMIT;

-- Success message with next steps
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test API endpoints with sample user progress tracking';
    RAISE NOTICE '2. Verify search functionality across modules and lessons';
    RAISE NOTICE '3. Test interactive components and completion tracking';
    RAISE NOTICE '4. Implement audio recording and transcription workflows';
    RAISE NOTICE '5. Set up user authentication and progress persistence';
    RAISE NOTICE '';
    RAISE NOTICE 'Database is ready for 6FB workbook system testing!';
END $$;