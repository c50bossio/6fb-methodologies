'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  ClipboardList,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Target,
  Users,
  DollarSign,
  Clock,
  Star,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
  Save,
  Download,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { Separator } from '@/components/ui/Separator';

interface AssessmentQuestion {
  id: string;
  category: string;
  question: string;
  type: 'scale' | 'yes_no' | 'multiple_choice' | 'number' | 'text';
  options?: string[];
  weight: number;
  description?: string;
}

interface AssessmentAnswer {
  questionId: string;
  value: any;
  score: number;
}

interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  level: 'poor' | 'fair' | 'good' | 'excellent';
  recommendations: string[];
}

interface AssessmentResults {
  overallScore: number;
  overallPercentage: number;
  overallLevel: 'poor' | 'fair' | 'good' | 'excellent';
  categoryScores: CategoryScore[];
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface BusinessAssessmentTemplateProps {
  onComplete?: (results: AssessmentResults, answers: AssessmentAnswer[]) => void;
  onSave?: (answers: AssessmentAnswer[]) => void;
  initialAnswers?: AssessmentAnswer[];
  readonly?: boolean;
  showDetailedResults?: boolean;
}

const assessmentQuestions: AssessmentQuestion[] = [
  // Financial Management
  {
    id: 'f1',
    category: 'Financial Management',
    question: 'How well do you track your daily revenue and expenses?',
    type: 'scale',
    weight: 3,
    description: 'Regular financial tracking is essential for business growth'
  },
  {
    id: 'f2',
    category: 'Financial Management',
    question: 'What is your average monthly profit margin?',
    type: 'multiple_choice',
    options: ['Less than 10%', '10-20%', '20-30%', '30-40%', 'More than 40%'],
    weight: 4,
  },
  {
    id: 'f3',
    category: 'Financial Management',
    question: 'Do you have a separate business bank account?',
    type: 'yes_no',
    weight: 2,
  },
  {
    id: 'f4',
    category: 'Financial Management',
    question: 'How many months of operating expenses do you have saved?',
    type: 'number',
    weight: 3,
  },

  // Customer Service
  {
    id: 'c1',
    category: 'Customer Service',
    question: 'How do you rate your customer retention rate?',
    type: 'scale',
    weight: 4,
    description: 'High retention rates indicate excellent customer satisfaction'
  },
  {
    id: 'c2',
    category: 'Customer Service',
    question: 'Do you actively collect customer feedback?',
    type: 'yes_no',
    weight: 2,
  },
  {
    id: 'c3',
    category: 'Customer Service',
    question: 'How quickly do you typically respond to customer complaints?',
    type: 'multiple_choice',
    options: ['Same day', 'Within 24 hours', '2-3 days', 'More than 3 days', 'I don\'t track this'],
    weight: 3,
  },
  {
    id: 'c4',
    category: 'Customer Service',
    question: 'What percentage of your business comes from repeat customers?',
    type: 'multiple_choice',
    options: ['Less than 30%', '30-50%', '50-70%', '70-85%', 'More than 85%'],
    weight: 4,
  },

  // Marketing & Growth
  {
    id: 'm1',
    category: 'Marketing & Growth',
    question: 'How effective are your current marketing efforts?',
    type: 'scale',
    weight: 3,
  },
  {
    id: 'm2',
    category: 'Marketing & Growth',
    question: 'Do you have an active social media presence?',
    type: 'yes_no',
    weight: 2,
  },
  {
    id: 'm3',
    category: 'Marketing & Growth',
    question: 'How do most new customers find you?',
    type: 'multiple_choice',
    options: ['Word of mouth', 'Social media', 'Google search', 'Walk-ins', 'Advertising'],
    weight: 2,
  },
  {
    id: 'm4',
    category: 'Marketing & Growth',
    question: 'What is your customer acquisition cost?',
    type: 'multiple_choice',
    options: ['I don\'t track this', 'Less than $10', '$10-25', '$25-50', 'More than $50'],
    weight: 3,
  },

  // Operations & Efficiency
  {
    id: 'o1',
    category: 'Operations & Efficiency',
    question: 'How well organized are your daily operations?',
    type: 'scale',
    weight: 3,
  },
  {
    id: 'o2',
    category: 'Operations & Efficiency',
    question: 'Do you use appointment booking software?',
    type: 'yes_no',
    weight: 2,
  },
  {
    id: 'o3',
    category: 'Operations & Efficiency',
    question: 'What is your typical appointment no-show rate?',
    type: 'multiple_choice',
    options: ['Less than 5%', '5-10%', '10-15%', '15-20%', 'More than 20%'],
    weight: 3,
  },
  {
    id: 'o4',
    category: 'Operations & Efficiency',
    question: 'How many clients do you typically serve per day?',
    type: 'number',
    weight: 2,
  },

  // Professional Development
  {
    id: 'p1',
    category: 'Professional Development',
    question: 'How often do you attend industry training or workshops?',
    type: 'multiple_choice',
    options: ['Never', 'Once a year', '2-3 times a year', 'Quarterly', 'Monthly or more'],
    weight: 2,
  },
  {
    id: 'p2',
    category: 'Professional Development',
    question: 'How confident are you in your technical skills?',
    type: 'scale',
    weight: 3,
  },
  {
    id: 'p3',
    category: 'Professional Development',
    question: 'Do you stay current with industry trends and techniques?',
    type: 'yes_no',
    weight: 2,
  },
  {
    id: 'p4',
    category: 'Professional Development',
    question: 'How would you rate your business knowledge and skills?',
    type: 'scale',
    weight: 3,
  },

  // Work-Life Balance
  {
    id: 'w1',
    category: 'Work-Life Balance',
    question: 'How satisfied are you with your current work-life balance?',
    type: 'scale',
    weight: 3,
  },
  {
    id: 'w2',
    category: 'Work-Life Balance',
    question: 'How many hours do you typically work per week?',
    type: 'number',
    weight: 2,
  },
  {
    id: 'w3',
    category: 'Work-Life Balance',
    question: 'Do you take regular time off or vacations?',
    type: 'yes_no',
    weight: 2,
  },
  {
    id: 'w4',
    category: 'Work-Life Balance',
    question: 'How stressed do you feel about your business on a daily basis?',
    type: 'scale',
    weight: 3,
  },
];

const categoryColors = {
  'Financial Management': 'bg-green-100 text-green-800',
  'Customer Service': 'bg-blue-100 text-blue-800',
  'Marketing & Growth': 'bg-purple-100 text-purple-800',
  'Operations & Efficiency': 'bg-orange-100 text-orange-800',
  'Professional Development': 'bg-indigo-100 text-indigo-800',
  'Work-Life Balance': 'bg-pink-100 text-pink-800',
};

const levelColors = {
  poor: 'text-red-600',
  fair: 'text-orange-600',
  good: 'text-blue-600',
  excellent: 'text-green-600',
};

const levelIcons = {
  poor: TrendingDown,
  fair: AlertCircle,
  good: TrendingUp,
  excellent: CheckCircle,
};

export default function BusinessAssessmentTemplate({
  onComplete,
  onSave,
  initialAnswers = [],
  readonly = false,
  showDetailedResults = true,
}: BusinessAssessmentTemplateProps) {
  const [answers, setAnswers] = useState<AssessmentAnswer[]>(initialAnswers);
  const [currentCategory, setCurrentCategory] = useState('Financial Management');
  const [isComplete, setIsComplete] = useState(false);

  const categories = [...new Set(assessmentQuestions.map(q => q.category))];

  const getAnswer = (questionId: string): AssessmentAnswer | undefined => {
    return answers.find(a => a.questionId === questionId);
  };

  const updateAnswer = (questionId: string, value: any) => {
    if (readonly) return;

    const question = assessmentQuestions.find(q => q.id === questionId);
    if (!question) return;

    let score = 0;

    switch (question.type) {
      case 'scale':
        score = (Number(value) / 5) * question.weight * 20; // Convert 1-5 scale to percentage
        break;
      case 'yes_no':
        score = value === 'yes' ? question.weight * 20 : 0;
        break;
      case 'multiple_choice':
        if (question.options) {
          const optionIndex = question.options.indexOf(value);
          score = ((question.options.length - optionIndex) / question.options.length) * question.weight * 20;
        }
        break;
      case 'number':
        // Custom scoring logic for number questions
        if (question.id === 'f4') { // Emergency fund months
          score = Math.min(Number(value) / 6, 1) * question.weight * 20; // 6 months = 100%
        } else if (question.id === 'o4') { // Clients per day
          score = Math.min(Number(value) / 15, 1) * question.weight * 20; // 15 clients = 100%
        } else if (question.id === 'w2') { // Hours per week
          const hours = Number(value);
          score = hours > 60 ? 0 : hours < 30 ? (hours / 30) * question.weight * 20 : question.weight * 20;
        } else {
          score = Number(value) > 0 ? question.weight * 20 : 0;
        }
        break;
      default:
        score = 0;
    }

    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== questionId);
      return [...filtered, { questionId, value, score }];
    });
  };

  const results = useMemo((): AssessmentResults => {
    const categoryScores: CategoryScore[] = categories.map(category => {
      const categoryQuestions = assessmentQuestions.filter(q => q.category === category);
      const categoryAnswers = answers.filter(a =>
        categoryQuestions.some(q => q.id === a.questionId)
      );

      const totalScore = categoryAnswers.reduce((sum, answer) => sum + answer.score, 0);
      const maxScore = categoryQuestions.reduce((sum, question) => sum + (question.weight * 20), 0);
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      let level: 'poor' | 'fair' | 'good' | 'excellent';
      if (percentage >= 80) level = 'excellent';
      else if (percentage >= 60) level = 'good';
      else if (percentage >= 40) level = 'fair';
      else level = 'poor';

      const recommendations = getCategoryRecommendations(category, percentage, categoryAnswers);

      return {
        category,
        score: totalScore,
        maxScore,
        percentage,
        level,
        recommendations,
      };
    });

    const overallScore = categoryScores.reduce((sum, cat) => sum + cat.score, 0);
    const overallMaxScore = categoryScores.reduce((sum, cat) => sum + cat.maxScore, 0);
    const overallPercentage = overallMaxScore > 0 ? (overallScore / overallMaxScore) * 100 : 0;

    let overallLevel: 'poor' | 'fair' | 'good' | 'excellent';
    if (overallPercentage >= 80) overallLevel = 'excellent';
    else if (overallPercentage >= 60) overallLevel = 'good';
    else if (overallPercentage >= 40) overallLevel = 'fair';
    else overallLevel = 'poor';

    const strengths = categoryScores
      .filter(cat => cat.percentage >= 70)
      .map(cat => cat.category);

    const weaknesses = categoryScores
      .filter(cat => cat.percentage < 50)
      .map(cat => cat.category);

    const priorities = categoryScores
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3)
      .map(cat => cat.category);

    const actionPlan = generateActionPlan(categoryScores, answers);

    return {
      overallScore,
      overallPercentage,
      overallLevel,
      categoryScores,
      strengths,
      weaknesses,
      priorities,
      actionPlan,
    };
  }, [answers, categories]);

  const getCategoryRecommendations = (category: string, percentage: number, categoryAnswers: AssessmentAnswer[]): string[] => {
    const recommendations: string[] = [];

    switch (category) {
      case 'Financial Management':
        if (percentage < 60) {
          recommendations.push('Implement daily revenue tracking system');
          recommendations.push('Separate business and personal finances');
          recommendations.push('Build emergency fund (3-6 months expenses)');
        }
        break;
      case 'Customer Service':
        if (percentage < 60) {
          recommendations.push('Create customer feedback collection system');
          recommendations.push('Develop customer retention strategies');
          recommendations.push('Improve response time to customer concerns');
        }
        break;
      case 'Marketing & Growth':
        if (percentage < 60) {
          recommendations.push('Develop social media marketing strategy');
          recommendations.push('Track customer acquisition costs');
          recommendations.push('Create referral program for existing clients');
        }
        break;
      case 'Operations & Efficiency':
        if (percentage < 60) {
          recommendations.push('Implement appointment booking software');
          recommendations.push('Reduce no-show rates with confirmation system');
          recommendations.push('Optimize daily schedule and workflow');
        }
        break;
      case 'Professional Development':
        if (percentage < 60) {
          recommendations.push('Attend industry workshops and training');
          recommendations.push('Stay current with barbering trends');
          recommendations.push('Develop business management skills');
        }
        break;
      case 'Work-Life Balance':
        if (percentage < 60) {
          recommendations.push('Set boundaries between work and personal time');
          recommendations.push('Schedule regular time off and vacations');
          recommendations.push('Implement stress management techniques');
        }
        break;
    }

    return recommendations;
  };

  const generateActionPlan = (categoryScores: CategoryScore[], answers: AssessmentAnswer[]) => {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    const worstCategories = categoryScores
      .filter(cat => cat.percentage < 40)
      .sort((a, b) => a.percentage - b.percentage);

    const fairCategories = categoryScores
      .filter(cat => cat.percentage >= 40 && cat.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage);

    // Immediate actions (next 30 days)
    worstCategories.slice(0, 2).forEach(cat => {
      immediate.push(...cat.recommendations.slice(0, 1));
    });

    // Short-term actions (next 90 days)
    worstCategories.forEach(cat => {
      shortTerm.push(...cat.recommendations.slice(1, 2));
    });
    fairCategories.slice(0, 2).forEach(cat => {
      shortTerm.push(...cat.recommendations.slice(0, 1));
    });

    // Long-term actions (next 12 months)
    categoryScores
      .filter(cat => cat.percentage < 70)
      .forEach(cat => {
        longTerm.push(...cat.recommendations.slice(-1));
      });

    return { immediate, shortTerm, longTerm };
  };

  const getCompletionPercentage = () => {
    return (answers.length / assessmentQuestions.length) * 100;
  };

  const handleSave = () => {
    if (onSave) {
      onSave(answers);
    }
  };

  const handleComplete = () => {
    if (answers.length === assessmentQuestions.length) {
      setIsComplete(true);
      if (onComplete) {
        onComplete(results, answers);
      }
    }
  };

  const renderQuestionInput = (question: AssessmentQuestion) => {
    const answer = getAnswer(question.id);

    switch (question.type) {
      case 'scale':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <Button
                  key={value}
                  variant={answer?.value === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateAnswer(question.id, value)}
                  disabled={readonly}
                  className="flex-1"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'yes_no':
        return (
          <div className="flex gap-2">
            <Button
              variant={answer?.value === 'yes' ? 'default' : 'outline'}
              onClick={() => updateAnswer(question.id, 'yes')}
              disabled={readonly}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              variant={answer?.value === 'no' ? 'default' : 'outline'}
              onClick={() => updateAnswer(question.id, 'no')}
              disabled={readonly}
              className="flex-1"
            >
              No
            </Button>
          </div>
        );

      case 'multiple_choice':
        return (
          <Select
            value={answer?.value || ''}
            onValueChange={(value) => updateAnswer(question.id, value)}
            disabled={readonly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={answer?.value || ''}
            onChange={(e) => updateAnswer(question.id, Number(e.target.value))}
            placeholder="Enter a number"
            disabled={readonly}
          />
        );

      case 'text':
        return (
          <Textarea
            value={answer?.value || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Enter your answer"
            disabled={readonly}
            rows={3}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Business Assessment
          </CardTitle>
          <div className="space-y-2">
            <Progress value={getCompletionPercentage()} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {answers.length} of {assessmentQuestions.length} questions completed
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={currentCategory} onValueChange={setCurrentCategory}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => {
                const categoryQuestions = assessmentQuestions.filter(q => q.category === category);
                const answeredCount = answers.filter(a =>
                  categoryQuestions.some(q => q.id === a.questionId)
                ).length;

                return (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    <div className="flex flex-col items-center">
                      <span className="truncate">{category.split(' ')[0]}</span>
                      <span className="text-xs text-muted-foreground">
                        {answeredCount}/{categoryQuestions.length}
                      </span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category} className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[category]} variant="secondary">
                    {category}
                  </Badge>
                  {results.categoryScores.find(cs => cs.category === category) && (
                    <Badge variant="outline">
                      Score: {results.categoryScores.find(cs => cs.category === category)?.percentage.toFixed(0)}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-6">
                  {assessmentQuestions
                    .filter(q => q.category === category)
                    .map((question) => (
                      <Card key={question.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">{question.question}</h4>
                              {question.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {question.description}
                                </p>
                              )}
                            </div>

                            {renderQuestionInput(question)}

                            {getAnswer(question.id) && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Answer recorded
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}

            {/* Results Tab */}
            {answers.length > 0 && (
              <TabsContent value="results" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Assessment Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold">Overall Business Health</h3>
                        <div className="flex items-center justify-center gap-2">
                          <div className={`text-6xl font-bold ${levelColors[results.overallLevel]}`}>
                            {results.overallPercentage.toFixed(0)}%
                          </div>
                          {React.createElement(levelIcons[results.overallLevel], {
                            className: `h-12 w-12 ${levelColors[results.overallLevel]}`
                          })}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-lg px-4 py-2 ${levelColors[results.overallLevel]}`}
                        >
                          {results.overallLevel.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Category Breakdown */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Category Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.categoryScores.map((categoryScore) => (
                          <Card key={categoryScore.category}>
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge className={categoryColors[categoryScore.category]} variant="secondary">
                                    {categoryScore.category}
                                  </Badge>
                                  {React.createElement(levelIcons[categoryScore.level], {
                                    className: `h-4 w-4 ${levelColors[categoryScore.level]}`
                                  })}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Score</span>
                                    <span className="font-medium">
                                      {categoryScore.percentage.toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress value={categoryScore.percentage} className="h-2" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {showDetailedResults && (
                      <>
                        <Separator />

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Strengths
                            </h4>
                            {results.strengths.length > 0 ? (
                              <div className="space-y-2">
                                {results.strengths.map((strength) => (
                                  <Badge key={strength} variant="outline" className="text-green-700 border-green-200">
                                    {strength}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Focus on improving scores to build strengths
                              </p>
                            )}
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              Areas for Improvement
                            </h4>
                            {results.weaknesses.length > 0 ? (
                              <div className="space-y-2">
                                {results.weaknesses.map((weakness) => (
                                  <Badge key={weakness} variant="outline" className="text-orange-700 border-orange-200">
                                    {weakness}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Great! No major weaknesses identified
                              </p>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Action Plan */}
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Recommended Action Plan
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-red-600" />
                                  Immediate (30 days)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {results.actionPlan.immediate.map((action, index) => (
                                  <div key={index} className="text-sm p-2 bg-red-50 rounded text-red-800">
                                    {action}
                                  </div>
                                ))}
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-orange-600" />
                                  Short-term (90 days)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {results.actionPlan.shortTerm.map((action, index) => (
                                  <div key={index} className="text-sm p-2 bg-orange-50 rounded text-orange-800">
                                    {action}
                                  </div>
                                ))}
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-blue-600" />
                                  Long-term (12 months)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {results.actionPlan.longTerm.map((action, index) => (
                                  <div key={index} className="text-sm p-2 bg-blue-50 rounded text-blue-800">
                                    {action}
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        <Separator />

                        {/* Recommendations by Category */}
                        <div className="space-y-4">
                          <h4 className="font-semibold">Detailed Recommendations</h4>
                          <div className="space-y-4">
                            {results.categoryScores
                              .filter(cat => cat.recommendations.length > 0)
                              .map((categoryScore) => (
                                <Card key={categoryScore.category}>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Badge className={categoryColors[categoryScore.category]} variant="secondary">
                                        {categoryScore.category}
                                      </Badge>
                                      <span className={levelColors[categoryScore.level]}>
                                        {categoryScore.percentage.toFixed(0)}%
                                      </span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ul className="space-y-1">
                                      {categoryScore.recommendations.map((rec, index) => (
                                        <li key={index} className="text-sm flex items-start gap-2">
                                          <span className="text-muted-foreground">•</span>
                                          {rec}
                                        </li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6">
            <div className="flex gap-2">
              {!readonly && (
                <Button onClick={handleSave} variant="outline" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Progress
                </Button>
              )}

              {answers.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentCategory('results')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Results
                </Button>
              )}

              {showDetailedResults && answers.length === assessmentQuestions.length && (
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {!readonly && answers.length < assessmentQuestions.length && (
                <Button
                  onClick={() => {
                    const nextCategory = categories[categories.indexOf(currentCategory) + 1];
                    if (nextCategory) setCurrentCategory(nextCategory);
                  }}
                  variant="outline"
                >
                  Next Section
                </Button>
              )}

              {answers.length === assessmentQuestions.length && (
                <Button onClick={handleComplete} className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Complete Assessment
                </Button>
              )}
            </div>
          </div>

          {/* Completion Status */}
          {isComplete && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Assessment completed! Review your results and action plan above.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}