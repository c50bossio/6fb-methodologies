/**
 * 6FB Workshop Content Data
 * Complete Six Figure Barber methodology content structure
 */

import { WorkshopModule, WorkshopLesson, ContentBlock } from '../src/types/workshop-content';

// Module 1: Foundation & Mindset
export const module1: WorkshopModule = {
  id: 'mod-001-foundation-mindset',
  title: 'Foundation & Mindset',
  description: 'Establish the foundational mindset and principles for building a six-figure barbering business',
  moduleOrder: 1,
  durationMinutes: 120,
  difficultyLevel: 'beginner',
  tags: ['foundation', 'mindset', 'business-basics', 'goal-setting'],
  coverImageUrl: '/images/modules/foundation-mindset.jpg',
  videoIntroUrl: '/videos/modules/foundation-intro.mp4',
  prerequisites: [],
  isPublished: true,
  content: {
    overview: {
      objectives: [
        'Understand the Six Figure Barber methodology and framework',
        'Develop the proper mindset for business success',
        'Set clear, actionable goals for your barbering career',
        'Identify and overcome limiting beliefs',
        'Create a personal mission statement and vision'
      ],
      outcomes: [
        'Clear understanding of what it takes to build a six-figure barbering business',
        'A personal action plan with specific, measurable goals',
        'Confidence and clarity about your barbering career path',
        'Tools to maintain motivation and overcome challenges'
      ],
      keyTakeaways: [
        'Success in barbering requires more than just cutting skills',
        'Your mindset directly impacts your business results',
        'Goal setting is the foundation of business growth',
        'Consistency and persistence are key to reaching six figures'
      ]
    },
    lessons: [
      {
        id: 'les-001-01-intro-6fb',
        moduleId: 'mod-001-foundation-mindset',
        title: 'Introduction to the Six Figure Barber System',
        description: 'Overview of the complete methodology and what sets six-figure barbers apart',
        type: 'video',
        estimatedMinutes: 25,
        sortOrder: 1,
        isPublished: true,
        content: {
          blocks: [
            {
              id: 'block-001-intro',
              type: 'video',
              order: 1,
              title: 'Welcome to the Six Figure Barber Program',
              estimatedMinutes: 15,
              content: {
                videoUrl: '/videos/lessons/6fb-intro.mp4',
                duration: 900,
                chapters: [
                  { title: 'Program Overview', startTime: 0 },
                  { title: 'The 6FB Methodology', startTime: 300 },
                  { title: 'Success Stories', startTime: 600 },
                  { title: 'Your Journey Ahead', startTime: 750 }
                ]
              }
            },
            {
              id: 'block-001-callout',
              type: 'callout',
              order: 2,
              content: {
                text: 'The average barber makes $35,000 per year. Six-figure barbers make $100,000+. The difference isn\'t just skill - it\'s methodology.',
                style: 'info',
                icon: 'trophy',
                dismissible: false
              }
            },
            {
              id: 'block-001-text',
              type: 'text',
              order: 3,
              title: 'What You\'ll Learn',
              content: {
                text: `# The Six Figure Barber Framework

This program is built on four core pillars:

1. **Mindset & Foundation** - The mental framework for success
2. **Business Systems** - Operational excellence and efficiency
3. **Marketing & Branding** - Attracting and retaining high-value clients
4. **Growth & Scaling** - Taking your business to the next level

Each module builds upon the previous one, creating a complete roadmap to six-figure success.`,
                format: 'markdown'
              }
            },
            {
              id: 'block-001-quiz',
              type: 'quiz',
              order: 4,
              title: 'Knowledge Check: Program Overview',
              estimatedMinutes: 5,
              content: {
                questions: [
                  {
                    id: 'q1',
                    question: 'What are the four core pillars of the Six Figure Barber framework?',
                    type: 'multiple-choice',
                    options: [
                      'Cutting, Styling, Marketing, Money',
                      'Mindset, Business Systems, Marketing, Growth',
                      'Tools, Techniques, Clients, Revenue',
                      'Location, Equipment, Staff, Promotion'
                    ],
                    correctAnswer: 'Mindset, Business Systems, Marketing, Growth',
                    explanation: 'The four pillars work together to create a complete business system.',
                    points: 10
                  },
                  {
                    id: 'q2',
                    question: 'What\'s the average income difference between regular barbers and six-figure barbers?',
                    type: 'multiple-choice',
                    options: [
                      'About $25,000',
                      'About $50,000',
                      'About $65,000',
                      'About $85,000'
                    ],
                    correctAnswer: 'About $65,000',
                    explanation: 'Six-figure barbers typically earn $100,000+ vs the $35,000 average.',
                    points: 10
                  }
                ],
                passingScore: 70,
                allowRetries: true,
                showResults: true
              }
            }
          ],
          completionCriteria: {
            type: 'quiz',
            threshold: 70
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'les-001-02-success-mindset',
        moduleId: 'mod-001-foundation-mindset',
        title: 'Developing a Success Mindset',
        description: 'Transform your thinking patterns to align with six-figure success',
        type: 'interactive',
        estimatedMinutes: 30,
        sortOrder: 2,
        isPublished: true,
        content: {
          blocks: [
            {
              id: 'block-002-intro',
              type: 'text',
              order: 1,
              title: 'The Power of Mindset',
              content: {
                text: `# Why Mindset Matters

Your mindset is the foundation of everything you achieve. The difference between a $35K barber and a $100K+ barber often starts in their thinking.

## Fixed vs Growth Mindset

- **Fixed Mindset**: "I'm just not a business person"
- **Growth Mindset**: "I can learn business skills"

## Abundance vs Scarcity

- **Scarcity**: "There aren't enough good clients"
- **Abundance**: "I can create value that attracts great clients"`,
                format: 'markdown'
              }
            },
            {
              id: 'block-002-interactive',
              type: 'interactive',
              order: 2,
              title: 'Mindset Assessment & Goal Setting',
              estimatedMinutes: 20,
              content: {
                component: 'GoalSettingWorksheet',
                props: {
                  title: 'Six Figure Barber Goals',
                  categories: [
                    'Income Goals',
                    'Business Development',
                    'Skill Enhancement',
                    'Personal Growth'
                  ],
                  timeframes: ['90 days', '6 months', '1 year', '3 years']
                },
                saveProgress: true,
                requireCompletion: true
              }
            },
            {
              id: 'block-002-reflection',
              type: 'reflection',
              order: 3,
              title: 'Limiting Beliefs Exercise',
              estimatedMinutes: 10,
              content: {
                prompt: 'Identify three limiting beliefs that might be holding you back from reaching six figures.',
                guidingQuestions: [
                  'What negative thoughts do you have about your earning potential?',
                  'What fears do you have about growing your business?',
                  'What assumptions do you make about your market or competition?'
                ],
                minLength: 100,
                private: true
              }
            }
          ],
          completionCriteria: {
            type: 'interaction',
            threshold: 100
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'les-001-03-business-fundamentals',
        moduleId: 'mod-001-foundation-mindset',
        title: 'Business Fundamentals for Barbers',
        description: 'Essential business concepts every six-figure barber must understand',
        type: 'text',
        estimatedMinutes: 35,
        sortOrder: 3,
        isPublished: true,
        content: {
          blocks: [
            {
              id: 'block-003-fundamentals',
              type: 'text',
              order: 1,
              title: 'Business Basics Every Barber Needs',
              content: {
                text: `# Business Fundamentals for Barbers

## Revenue vs Profit
- **Revenue**: Total money coming in
- **Profit**: Money left after expenses
- **Goal**: Maximize profit, not just revenue

## Key Business Metrics
1. **Average Ticket**: Revenue per client visit
2. **Client Retention Rate**: Percentage who return
3. **Booking Rate**: How full your schedule is
4. **Profit Margin**: Percentage of revenue that's profit

## The Six Figure Formula
\`\`\`
40 clients/week × $50 average × 50 weeks = $100,000
\`\`\`

## Business vs Job Mindset
- **Job**: Trade time for money
- **Business**: Create systems that generate value`,
                format: 'markdown'
              }
            },
            {
              id: 'block-003-calculator',
              type: 'interactive',
              order: 2,
              title: 'Revenue Calculator',
              estimatedMinutes: 15,
              content: {
                component: 'RevenuePricingCalculator',
                props: {
                  title: 'Calculate Your Six Figure Path',
                  defaultValues: {
                    weeklyClients: 30,
                    averagePrice: 35,
                    workingWeeks: 50
                  }
                },
                saveProgress: true,
                requireCompletion: true
              }
            },
            {
              id: 'block-003-checklist',
              type: 'checklist',
              order: 3,
              title: 'Business Foundation Checklist',
              content: {
                items: [
                  {
                    id: 'legal-structure',
                    text: 'Choose legal business structure (LLC recommended)',
                    isRequired: false,
                    helpText: 'Protects personal assets and provides tax benefits'
                  },
                  {
                    id: 'business-bank',
                    text: 'Open dedicated business bank account',
                    isRequired: true,
                    helpText: 'Essential for tracking business finances'
                  },
                  {
                    id: 'accounting-system',
                    text: 'Set up accounting/bookkeeping system',
                    isRequired: true,
                    helpText: 'QuickBooks, Wave, or similar software'
                  },
                  {
                    id: 'business-license',
                    text: 'Obtain required business licenses',
                    isRequired: true,
                    helpText: 'Check local and state requirements'
                  },
                  {
                    id: 'insurance',
                    text: 'Get liability insurance',
                    isRequired: true,
                    helpText: 'Protects against potential lawsuits'
                  }
                ],
                requireAll: false
              }
            }
          ],
          completionCriteria: {
            type: 'interaction',
            threshold: 80
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'les-001-04-action-planning',
        moduleId: 'mod-001-foundation-mindset',
        title: 'Creating Your Action Plan',
        description: 'Develop a concrete 90-day action plan to start your six-figure journey',
        type: 'exercise',
        estimatedMinutes: 30,
        sortOrder: 4,
        isPublished: true,
        content: {
          blocks: [
            {
              id: 'block-004-planning',
              type: 'text',
              order: 1,
              title: 'The Power of Action Planning',
              content: {
                text: `# Creating Your Six Figure Action Plan

A goal without a plan is just a wish. Let's turn your six-figure goal into a concrete action plan.

## The 90-Day Focus
- Long enough to see real progress
- Short enough to maintain motivation
- Perfect timeframe for building momentum

## Key Areas to Address
1. **Income Improvement** - Immediate revenue increases
2. **Business Systems** - Foundation building
3. **Skill Development** - Continuous improvement
4. **Marketing** - Client attraction and retention`,
                format: 'markdown'
              }
            },
            {
              id: 'block-004-exercise',
              type: 'exercise',
              order: 2,
              title: 'Your 90-Day Action Plan',
              estimatedMinutes: 25,
              content: {
                instructions: `Create a detailed 90-day action plan with specific, measurable goals and weekly milestones. Include:

1. **Income Goals**: Target weekly/monthly revenue
2. **New Clients**: How many new clients to acquire
3. **Price Increases**: Any service price adjustments
4. **Systems**: What business systems to implement
5. **Skills**: What new skills to develop
6. **Marketing**: Specific marketing activities

Make each goal SMART (Specific, Measurable, Achievable, Relevant, Time-bound).`,
                timeLimit: 25,
                submissionType: 'text',
                submissionRequired: true
              }
            },
            {
              id: 'block-004-download',
              type: 'download',
              order: 3,
              title: 'Action Plan Template',
              content: {
                fileUrl: '/downloads/templates/90-day-action-plan.pdf',
                fileName: '90-Day Action Plan Template.pdf',
                fileSize: 245000,
                fileType: 'pdf',
                description: 'Printable template to help structure your action plan',
                requireCompletion: false
              }
            }
          ],
          completionCriteria: {
            type: 'exercise',
            threshold: 100
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    resources: [
      {
        title: 'Six Figure Barber Worksheet',
        url: '/downloads/6fb-worksheet.pdf',
        type: 'template',
        description: 'Complete worksheet for tracking your progress'
      },
      {
        title: 'Business Structure Guide',
        url: '/downloads/business-structure-guide.pdf',
        type: 'document',
        description: 'Detailed guide to choosing your business structure'
      },
      {
        title: 'Recommended Accounting Software',
        url: '/resources/accounting-software',
        type: 'reference',
        description: 'Comparison of popular accounting solutions'
      }
    ],
    assessment: {
      type: 'quiz',
      passingScore: 80,
      questions: [
        {
          question: 'What is the primary difference between six-figure barbers and average barbers?',
          options: ['Better cutting skills', 'More expensive tools', 'Business mindset and systems', 'Lucky breaks'],
          correct: 2
        },
        {
          question: 'What weekly client volume at $50 average would generate $100,000 annually?',
          options: ['30 clients', '35 clients', '40 clients', '45 clients'],
          correct: 2
        }
      ]
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Module 2: Business Systems & Operations
export const module2: WorkshopModule = {
  id: 'mod-002-business-systems',
  title: 'Business Systems & Operations',
  description: 'Build efficient systems that enable consistent growth and higher profitability',
  moduleOrder: 2,
  durationMinutes: 150,
  difficultyLevel: 'intermediate',
  tags: ['systems', 'operations', 'efficiency', 'automation'],
  coverImageUrl: '/images/modules/business-systems.jpg',
  prerequisites: ['mod-001-foundation-mindset'],
  isPublished: true,
  content: {
    overview: {
      objectives: [
        'Design efficient booking and scheduling systems',
        'Create standard operating procedures for consistency',
        'Implement inventory management and cost controls',
        'Develop client management and retention systems',
        'Build financial tracking and reporting systems'
      ],
      outcomes: [
        'Streamlined operations that save 10+ hours per week',
        'Improved client experience and satisfaction',
        'Better financial visibility and control',
        'Scalable systems ready for growth'
      ],
      keyTakeaways: [
        'Systems create freedom and consistency',
        'Good systems improve both efficiency and quality',
        'Investment in systems pays dividends long-term'
      ]
    },
    lessons: [
      {
        id: 'les-002-01-scheduling-systems',
        moduleId: 'mod-002-business-systems',
        title: 'Advanced Scheduling & Booking Systems',
        description: 'Optimize your time and maximize revenue through strategic scheduling',
        type: 'video',
        estimatedMinutes: 40,
        sortOrder: 1,
        isPublished: true,
        content: {
          blocks: [
            {
              id: 'block-005-scheduling',
              type: 'video',
              order: 1,
              title: 'Scheduling for Six Figures',
              estimatedMinutes: 20,
              content: {
                videoUrl: '/videos/lessons/advanced-scheduling.mp4',
                duration: 1200,
                chapters: [
                  { title: 'Time Block Strategy', startTime: 0 },
                  { title: 'Premium Time Slots', startTime: 300 },
                  { title: 'Booking Policies', startTime: 600 },
                  { title: 'No-Show Prevention', startTime: 900 }
                ]
              }
            },
            {
              id: 'block-005-interactive',
              type: 'interactive',
              order: 2,
              title: 'Service Package Designer',
              estimatedMinutes: 20,
              content: {
                component: 'ServicePackageDesigner',
                props: {
                  title: 'Design Your Service Packages',
                  serviceTypes: [
                    'Basic Cut',
                    'Premium Cut & Style',
                    'Full Service Experience',
                    'VIP Package'
                  ]
                },
                saveProgress: true,
                requireCompletion: true
              }
            }
          ],
          completionCriteria: {
            type: 'interaction',
            threshold: 100
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      // Additional lessons would continue here...
    ],
    resources: [
      {
        title: 'Scheduling Software Comparison',
        url: '/downloads/scheduling-comparison.pdf',
        type: 'document'
      }
    ]
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Export all modules
export const sixFigureBarberModules: WorkshopModule[] = [
  module1,
  module2,
  // Additional modules would be added here...
  // Module 3: Marketing & Client Acquisition
  // Module 4: Pricing & Premium Services
  // Module 5: Growth & Scaling
  // Module 6: Advanced Business Strategies
];

// Helper function to generate all lessons from modules
export function getAllLessons(): WorkshopLesson[] {
  return sixFigureBarberModules.flatMap(module => module.content.lessons);
}