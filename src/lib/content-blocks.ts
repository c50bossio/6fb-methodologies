/**
 * Content Block Factory - Creates content blocks for existing workshop content
 *
 * This module provides factory functions to create content blocks that integrate
 * with our interactive workbook components (QuizEngine, GoalSettingWorksheet, etc.)
 */

import {
  ContentBlock,
  InteractiveContentBlock,
  TextContentBlock,
  VideoContentBlock,
  Assessment,
  QuizQuestion,
} from '@/types/workshop-module';

// =============================================================================
// Interactive Content Block Factories
// =============================================================================

/**
 * Creates a Quiz/Assessment content block
 */
export function createQuizContentBlock(
  id: string,
  title: string,
  assessment: Assessment,
  order: number = 0,
  required: boolean = true
): InteractiveContentBlock {
  return {
    id,
    type: 'interactive',
    order,
    required,
    title,
    description: assessment.description,
    metadata: {
      component: 'QuizEngine',
      category: 'assessment',
      estimatedDuration: assessment.timeLimit || 30,
    },
    content: {
      interactionType: 'quiz',
      configuration: {
        assessment,
        allowRetake: assessment.maxAttempts ? assessment.maxAttempts > 1 : true,
        showDetailedResults: assessment.showCorrectAnswers,
        timeLimit: assessment.timeLimit,
        passingScore: assessment.passingScore,
        shuffleQuestions: assessment.shuffleQuestions,
        allowReview: assessment.allowReview,
      },
      expectedOutcome: `Complete assessment with minimum ${assessment.passingScore}% score`,
      validationRules: {
        minScore: assessment.passingScore,
        maxAttempts: assessment.maxAttempts,
      },
      feedback: {
        correct: 'Great job! You\'ve mastered this concept.',
        incorrect: 'Review the material and try again to improve your understanding.',
        hint: 'Take your time and think through each question carefully.',
      },
    },
  };
}

/**
 * Creates a Goal Setting Worksheet content block
 */
export function createGoalSettingWorksheetBlock(
  id: string,
  title: string = 'Business Goal Setting Worksheet',
  order: number = 0,
  required: boolean = true
): InteractiveContentBlock {
  return {
    id,
    type: 'interactive',
    order,
    required,
    title,
    description: 'Set SMART goals for your barbershop business growth',
    metadata: {
      component: 'GoalSettingWorksheet',
      category: 'worksheet',
      estimatedDuration: 45,
    },
    content: {
      interactionType: 'form',
      configuration: {
        sections: [
          'current-state',
          'vision-goals',
          'smart-goals',
          'progress-tracking',
        ],
        allowSave: true,
        autoSave: true,
        showProgress: true,
      },
      expectedOutcome: 'Complete business goal setting with specific, measurable objectives',
      validationRules: {
        requiredSections: ['current-state', 'vision-goals', 'smart-goals'],
        minGoals: 3,
      },
      feedback: {
        correct: 'Excellent! Your goals are well-defined and achievable.',
        incorrect: 'Please complete all required sections with specific details.',
        hint: 'Make sure your goals are Specific, Measurable, Achievable, Relevant, and Time-bound.',
      },
    },
  };
}

/**
 * Creates a Revenue/Pricing Calculator content block
 */
export function createRevenuePricingCalculatorBlock(
  id: string,
  title: string = 'Revenue & Pricing Calculator',
  order: number = 0,
  required: boolean = true
): InteractiveContentBlock {
  return {
    id,
    type: 'interactive',
    order,
    required,
    title,
    description: 'Calculate optimal pricing and revenue projections for your services',
    metadata: {
      component: 'RevenuePricingCalculator',
      category: 'calculator',
      estimatedDuration: 60,
    },
    content: {
      interactionType: 'calculator',
      configuration: {
        sections: [
          'business-info',
          'costs',
          'time',
          'services',
          'goals',
          'results',
        ],
        showAnalytics: true,
        allowExport: true,
        autoCalculate: true,
      },
      expectedOutcome: 'Complete pricing analysis with profit projections and recommendations',
      validationRules: {
        requiredSections: ['business-info', 'costs', 'services', 'goals'],
        minServices: 1,
        validProfitMargin: true,
      },
      feedback: {
        correct: 'Your pricing strategy is well-optimized for profitability.',
        incorrect: 'Complete all sections with accurate financial information.',
        hint: 'Consider market rates and your operating costs when setting prices.',
      },
    },
  };
}

/**
 * Creates a Service Package Designer content block
 */
export function createServicePackageDesignerBlock(
  id: string,
  title: string = 'Service Package Designer',
  order: number = 0,
  required: boolean = true
): InteractiveContentBlock {
  return {
    id,
    type: 'interactive',
    order,
    required,
    title,
    description: 'Design and optimize service packages to increase revenue',
    metadata: {
      component: 'ServicePackageDesigner',
      category: 'designer',
      estimatedDuration: 45,
    },
    content: {
      interactionType: 'form',
      configuration: {
        allowMultiplePackages: true,
        showAnalytics: true,
        competitiveAnalysis: true,
        demandForecasting: true,
      },
      expectedOutcome: 'Create at least 3 service packages with optimized pricing',
      validationRules: {
        minPackages: 1,
        validPricing: true,
        profitMarginCheck: true,
      },
      feedback: {
        correct: 'Your service packages are well-designed for market positioning.',
        incorrect: 'Create packages with clear value propositions and competitive pricing.',
        hint: 'Bundle complementary services to increase average ticket value.',
      },
    },
  };
}

/**
 * Creates a Business Assessment content block
 */
export function createBusinessAssessmentBlock(
  id: string,
  title: string = 'Business Health Assessment',
  order: number = 0,
  required: boolean = true
): InteractiveContentBlock {
  return {
    id,
    type: 'interactive',
    order,
    required,
    title,
    description: 'Comprehensive assessment of your business performance and growth opportunities',
    metadata: {
      component: 'BusinessAssessmentTemplate',
      category: 'assessment',
      estimatedDuration: 30,
    },
    content: {
      interactionType: 'form',
      configuration: {
        categories: [
          'Financial Management',
          'Customer Service',
          'Marketing & Growth',
          'Operations & Efficiency',
          'Professional Development',
          'Work-Life Balance',
        ],
        showDetailedResults: true,
        generateActionPlan: true,
        allowExport: true,
      },
      expectedOutcome: 'Complete business assessment with personalized action plan',
      validationRules: {
        allQuestionsRequired: true,
        minimumScore: 40,
      },
      feedback: {
        correct: 'Assessment complete! Review your results and action plan.',
        incorrect: 'Please answer all questions to get accurate results.',
        hint: 'Be honest in your responses to get the most valuable insights.',
      },
    },
  };
}

// =============================================================================
// Content Block Collections for Common Workshop Scenarios
// =============================================================================

/**
 * Creates a complete set of content blocks for a business fundamentals module
 */
export function createBusinessFundamentalsContentBlocks(): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Introduction text
  blocks.push(createTextContentBlock(
    'intro-text',
    'Business Fundamentals Introduction',
    `Welcome to the Business Fundamentals module. In this comprehensive workshop, you'll learn the essential skills needed to run a successful barbershop business.

    This module covers:
    - Financial management and pricing strategies
    - Service package design and optimization
    - Business performance assessment
    - Goal setting and strategic planning

    Each section includes interactive tools to help you apply these concepts directly to your business.`,
    0,
    true
  ));

  // Business Assessment (should come first)
  blocks.push(createBusinessAssessmentBlock(
    'business-assessment',
    'Current Business Health Check',
    1,
    true
  ));

  // Goal Setting Worksheet
  blocks.push(createGoalSettingWorksheetBlock(
    'goal-setting',
    'Strategic Business Goals',
    2,
    true
  ));

  // Revenue Calculator
  blocks.push(createRevenuePricingCalculatorBlock(
    'revenue-calculator',
    'Pricing Strategy & Revenue Optimization',
    3,
    true
  ));

  // Service Package Designer
  blocks.push(createServicePackageDesignerBlock(
    'package-designer',
    'Service Package Creation',
    4,
    true
  ));

  // Final assessment quiz
  const finalAssessment: Assessment = createBusinessFundamentalsQuiz();
  blocks.push(createQuizContentBlock(
    'final-quiz',
    'Business Fundamentals Knowledge Check',
    finalAssessment,
    5,
    true
  ));

  return blocks;
}

/**
 * Creates content blocks for a pricing mastery workshop
 */
export function createPricingMasteryContentBlocks(): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  blocks.push(createTextContentBlock(
    'pricing-intro',
    'Mastering Your Pricing Strategy',
    `Pricing is one of the most critical decisions in your barbershop business. Get it right, and you'll attract the right clients while maximizing profitability. Get it wrong, and you'll either leave money on the table or price yourself out of the market.

    In this module, you'll learn:
    - How to calculate your true costs
    - Market positioning and competitive analysis
    - Value-based pricing strategies
    - Package pricing for increased revenue`,
    0,
    true
  ));

  blocks.push(createRevenuePricingCalculatorBlock(
    'pricing-calculator',
    'Comprehensive Pricing Analysis',
    1,
    true
  ));

  blocks.push(createServicePackageDesignerBlock(
    'package-pricing',
    'Strategic Package Design',
    2,
    true
  ));

  const pricingQuiz: Assessment = createPricingMasteryQuiz();
  blocks.push(createQuizContentBlock(
    'pricing-quiz',
    'Pricing Strategy Mastery Check',
    pricingQuiz,
    3,
    true
  ));

  return blocks;
}

// =============================================================================
// Helper Functions for Content Creation
// =============================================================================

/**
 * Creates a text content block with standard formatting
 */
export function createTextContentBlock(
  id: string,
  title: string,
  text: string,
  order: number = 0,
  required: boolean = false
): TextContentBlock {
  const wordCount = text.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

  return {
    id,
    type: 'text',
    order,
    required,
    title,
    metadata: {
      category: 'instructional',
    },
    content: {
      text,
      format: 'markdown',
      wordCount,
      readingTimeMinutes: readingTime,
    },
  };
}

/**
 * Creates a video content block with standard configuration
 */
export function createVideoContentBlock(
  id: string,
  title: string,
  videoUrl: string,
  duration: number,
  order: number = 0,
  required: boolean = false
): VideoContentBlock {
  return {
    id,
    type: 'video',
    order,
    required,
    title,
    metadata: {
      category: 'instructional',
    },
    content: {
      url: videoUrl,
      duration,
      quality: {
        '720p': videoUrl,
        '1080p': videoUrl.replace('.mp4', '_1080p.mp4'),
      },
    },
  };
}

// =============================================================================
// Assessment Content Creation
// =============================================================================

/**
 * Creates a comprehensive business fundamentals quiz
 */
export function createBusinessFundamentalsQuiz(): Assessment {
  const questions: QuizQuestion[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What is the most important factor in setting service prices?',
      explanation: 'Understanding your costs ensures profitability while remaining competitive.',
      points: 10,
      order: 1,
      required: true,
      options: [
        { id: 'a', text: 'What competitors charge', isCorrect: false },
        { id: 'b', text: 'Your operating costs plus desired profit margin', isCorrect: true },
        { id: 'c', text: 'What clients say they can afford', isCorrect: false },
        { id: 'd', text: 'Industry average pricing', isCorrect: false },
      ],
      metadata: {},
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'How often should you review your business goals?',
      explanation: 'Quarterly reviews allow for timely adjustments while maintaining long-term focus.',
      points: 10,
      order: 2,
      required: true,
      options: [
        { id: 'a', text: 'Once a year', isCorrect: false },
        { id: 'b', text: 'Every quarter', isCorrect: true },
        { id: 'c', text: 'Only when problems arise', isCorrect: false },
        { id: 'd', text: 'Every month', isCorrect: false },
      ],
      metadata: {},
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      question: 'What is the primary benefit of service packages?',
      explanation: 'Packages increase average transaction value and provide perceived value to customers.',
      points: 10,
      order: 3,
      required: true,
      options: [
        { id: 'a', text: 'Easier scheduling', isCorrect: false },
        { id: 'b', text: 'Higher average ticket value', isCorrect: true },
        { id: 'c', text: 'Reduced supply costs', isCorrect: false },
        { id: 'd', text: 'Less marketing needed', isCorrect: false },
      ],
      metadata: {},
    },
  ];

  return {
    id: 'business-fundamentals-assessment',
    title: 'Business Fundamentals Knowledge Check',
    description: 'Test your understanding of key business concepts',
    instructions: 'Answer all questions to complete the assessment. You need 70% to pass.',
    timeLimit: 15,
    maxAttempts: 3,
    passingScore: 70,
    shuffleQuestions: false,
    showCorrectAnswers: true,
    allowReview: true,
    questions,
    metadata: {
      category: 'business-fundamentals',
      difficulty: 'intermediate',
    },
  };
}

/**
 * Creates a pricing mastery quiz
 */
export function createPricingMasteryQuiz(): Assessment {
  const questions: QuizQuestion[] = [
    {
      id: 'p1',
      type: 'multiple_choice',
      question: 'What should be your minimum profit margin for sustainability?',
      explanation: '20-30% margin ensures business sustainability and growth investment.',
      points: 15,
      order: 1,
      required: true,
      options: [
        { id: 'a', text: '5-10%', isCorrect: false },
        { id: 'b', text: '10-15%', isCorrect: false },
        { id: 'c', text: '20-30%', isCorrect: true },
        { id: 'd', text: '50%+', isCorrect: false },
      ],
      metadata: {},
    },
    {
      id: 'p2',
      type: 'multiple_choice',
      question: 'When bundling services, what discount range maintains profitability?',
      explanation: '5-15% discount encourages purchases while maintaining healthy margins.',
      points: 15,
      order: 2,
      required: true,
      options: [
        { id: 'a', text: '5-15%', isCorrect: true },
        { id: 'b', text: '20-30%', isCorrect: false },
        { id: 'c', text: '35-50%', isCorrect: false },
        { id: 'd', text: 'No discount needed', isCorrect: false },
      ],
      metadata: {},
    },
  ];

  return {
    id: 'pricing-mastery-assessment',
    title: 'Pricing Strategy Mastery',
    description: 'Demonstrate your pricing expertise',
    instructions: 'Complete this assessment to show mastery of pricing concepts.',
    timeLimit: 10,
    maxAttempts: 2,
    passingScore: 80,
    shuffleQuestions: false,
    showCorrectAnswers: true,
    allowReview: true,
    questions,
    metadata: {
      category: 'pricing',
      difficulty: 'advanced',
    },
  };
}

// =============================================================================
// Content Block Validation and Utilities
// =============================================================================

/**
 * Validates a content block for proper interactive component configuration
 */
export function validateInteractiveContentBlock(block: InteractiveContentBlock): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!block.content.interactionType) {
    errors.push('Missing interaction type');
  }

  if (!block.content.configuration) {
    errors.push('Missing configuration object');
  }

  if (!block.metadata.component) {
    errors.push('Missing component specification in metadata');
  }

  // Validate specific interaction types
  switch (block.content.interactionType) {
    case 'quiz':
      if (!block.content.configuration.assessment) {
        errors.push('Quiz blocks require assessment configuration');
      }
      break;
    case 'calculator':
      if (!block.content.configuration.sections) {
        errors.push('Calculator blocks require sections configuration');
      }
      break;
    case 'form':
      if (!block.content.expectedOutcome) {
        errors.push('Form blocks require expected outcome specification');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sorts content blocks by order for proper rendering sequence
 */
export function sortContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

/**
 * Filters content blocks by type
 */
export function filterContentBlocksByType<T extends ContentBlock>(
  blocks: ContentBlock[],
  type: T['type']
): T[] {
  return blocks.filter((block): block is T => block.type === type);
}

/**
 * Gets interactive content blocks that use specific components
 */
export function getInteractiveBlocksByComponent(
  blocks: ContentBlock[],
  componentName: string
): InteractiveContentBlock[] {
  return filterContentBlocksByType(blocks, 'interactive').filter(
    block => block.metadata.component === componentName
  );
}

// =============================================================================
// Export all factory functions and utilities
// =============================================================================

export const ContentBlockFactories = {
  createQuizContentBlock,
  createGoalSettingWorksheetBlock,
  createRevenuePricingCalculatorBlock,
  createServicePackageDesignerBlock,
  createBusinessAssessmentBlock,
  createTextContentBlock,
  createVideoContentBlock,
};

export const ContentBlockCollections = {
  createBusinessFundamentalsContentBlocks,
  createPricingMasteryContentBlocks,
};

export const ContentBlockUtils = {
  validateInteractiveContentBlock,
  sortContentBlocks,
  filterContentBlocksByType,
  getInteractiveBlocksByComponent,
};

export const AssessmentFactories = {
  createBusinessFundamentalsQuiz,
  createPricingMasteryQuiz,
};