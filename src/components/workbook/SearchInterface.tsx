'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Search,
  Filter,
  SortDesc,
  SortAsc,
  Calendar,
  Tag,
  User,
  FileText,
  Video,
  Mic,
  BookOpen,
  GraduationCap,
  Clock,
  Star,
  Hash,
  Zap,
  TrendingUp,
  Eye,
  Download,
  Share2,
  Bookmark,
  Play,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  Grid,
  List,
  MapPin,
  Target,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchFilters as APISearchFilters,
  SearchSortOptions,
  ContentType,
  DifficultyLevel,
  ProgressStatus,
  NoteCategory,
  NotePriority,
  TranscriptionStatus,
} from '@/types/workbook-api';

/**
 * Enhanced search filters for the UI
 */
interface ExtendedSearchFilters extends APISearchFilters {
  // UI-specific filters
  showFilters: boolean;
  activeTab:
    | 'all'
    | 'modules'
    | 'lessons'
    | 'notes'
    | 'transcriptions'
    | 'recordings';
  viewMode: 'grid' | 'list';
  groupBy: 'none' | 'contentType' | 'moduleId' | 'date' | 'category';

  // Date range helpers
  dateRangePreset: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'custom';

  // Content-specific filters
  hasActionItems?: boolean;
  isBookmarked?: boolean;
  transcriptionStatus?: TranscriptionStatus;
  progressRange?: {
    min: number;
    max: number;
  };
}

/**
 * Search suggestion and history
 */
interface SearchSuggestion {
  id: string;
  query: string;
  type: 'recent' | 'popular' | 'suggested';
  frequency?: number;
  lastUsed?: string;
}

/**
 * Search analytics and insights
 */
interface SearchAnalytics {
  totalResults: number;
  resultsByType: Record<ContentType, number>;
  searchTime: number;
  suggestedFilters: string[];
  relatedTopics: string[];
  popularQueries: SearchSuggestion[];
}

/**
 * Component props
 */
interface SearchInterfaceProps {
  /** User ID for personalized search */
  userId?: string;
  /** Current module context for scoped search */
  moduleId?: string;
  /** Current lesson context for scoped search */
  lessonId?: string;
  /** Whether to show advanced search features */
  showAdvancedFeatures?: boolean;
  /** Whether to enable search analytics */
  enableAnalytics?: boolean;
  /** Whether to show search suggestions */
  showSuggestions?: boolean;
  /** Maximum results per page */
  pageSize?: number;
  /** Custom class name */
  className?: string;
  /** Callback when a search result is selected */
  onResultSelect?: (result: SearchResult) => void;
  /** Callback when search analytics change */
  onAnalyticsChange?: (analytics: SearchAnalytics) => void;
  /** Callback for error handling */
  onError?: (error: string, context?: string) => void;
}

/**
 * Search result item component
 */
const SearchResultItem: React.FC<{
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  viewMode: 'grid' | 'list';
  showPreview?: boolean;
}> = ({ result, onSelect, viewMode, showPreview = true }) => {
  const [showFullContent, setShowFullContent] = useState(false);

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'module':
        return <BookOpen className='w-4 h-4 text-blue-500' />;
      case 'lesson':
        return <GraduationCap className='w-4 h-4 text-green-500' />;
      case 'note':
        return <FileText className='w-4 h-4 text-purple-500' />;
      case 'transcription':
        return <Mic className='w-4 h-4 text-orange-500' />;
      case 'recording':
        return <Video className='w-4 h-4 text-red-500' />;
      default:
        return <FileText className='w-4 h-4 text-gray-500' />;
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  if (viewMode === 'grid') {
    return (
      <Card
        className='cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-tomb45-green/30 group'
        onClick={() => onSelect(result)}
      >
        <CardContent className='p-4'>
          <div className='flex items-start justify-between mb-3'>
            <div className='flex items-center gap-2'>
              {getContentTypeIcon(result.contentType)}
              <Badge variant='outline' className='text-xs'>
                {result.contentType}
              </Badge>
              {result.relevanceScore && (
                <Badge
                  variant='outline'
                  className={`text-xs ${getRelevanceColor(result.relevanceScore)}`}
                >
                  {Math.round(result.relevanceScore * 100)}%
                </Badge>
              )}
            </div>

            <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
              {result.metadata?.isBookmarked && (
                <Star className='w-4 h-4 text-yellow-500' />
              )}
              <Button variant='ghost' size='sm' className='w-6 h-6 p-0'>
                <MoreHorizontal className='w-3 h-3' />
              </Button>
            </div>
          </div>

          <h3 className='font-semibold text-text-primary mb-2 line-clamp-2 group-hover:text-tomb45-green transition-colors'>
            {result.title}
          </h3>

          {showPreview && result.snippet && (
            <p className='text-sm text-text-secondary mb-3 line-clamp-3'>
              {result.snippet}
            </p>
          )}

          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-xs text-text-secondary'>
              <Clock className='w-3 h-3' />
              <span>{formatDate(result.lastModified)}</span>
            </div>

            {result.metadata?.moduleTitle && (
              <Badge variant='outline' className='text-xs'>
                {result.metadata.moduleTitle}
              </Badge>
            )}
          </div>

          {result.highlights && result.highlights.length > 0 && (
            <div className='mt-2 pt-2 border-t border-border-primary'>
              <div className='text-xs text-text-secondary mb-1'>Matches:</div>
              <div className='space-y-1'>
                {result.highlights.slice(0, 2).map((highlight, index) => (
                  <div
                    key={index}
                    className='text-xs text-text-primary bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded'
                  >
                    <span dangerouslySetInnerHTML={{ __html: highlight }} />
                  </div>
                ))}
                {result.highlights.length > 2 && (
                  <div className='text-xs text-text-secondary'>
                    +{result.highlights.length - 2} more matches
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className='cursor-pointer transition-all duration-200 hover:shadow-md hover:border-tomb45-green/30 group'
      onClick={() => onSelect(result)}
    >
      <CardContent className='p-4'>
        <div className='flex items-start gap-4'>
          <div className='flex-shrink-0 pt-1'>
            {getContentTypeIcon(result.contentType)}
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between mb-2'>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='font-semibold text-text-primary group-hover:text-tomb45-green transition-colors'>
                  {result.title}
                </h3>
                <Badge variant='outline' className='text-xs'>
                  {result.contentType}
                </Badge>
                {result.relevanceScore && (
                  <Badge
                    variant='outline'
                    className={`text-xs ${getRelevanceColor(result.relevanceScore)}`}
                  >
                    {Math.round(result.relevanceScore * 100)}%
                  </Badge>
                )}
              </div>

              <div className='flex items-center gap-2'>
                {result.metadata?.isBookmarked && (
                  <Star className='w-4 h-4 text-yellow-500' />
                )}
                <span className='text-xs text-text-secondary'>
                  {formatDate(result.lastModified)}
                </span>
              </div>
            </div>

            {showPreview && result.snippet && (
              <p
                className={`text-sm text-text-secondary mb-3 ${showFullContent ? '' : 'line-clamp-2'}`}
              >
                {result.snippet}
                {result.snippet.length > 150 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowFullContent(!showFullContent);
                    }}
                    className='ml-2 text-tomb45-green hover:underline'
                  >
                    {showFullContent ? 'Show less' : 'Show more'}
                  </button>
                )}
              </p>
            )}

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                {result.metadata?.moduleTitle && (
                  <div className='flex items-center gap-1 text-xs text-text-secondary'>
                    <BookOpen className='w-3 h-3' />
                    <span>{result.metadata.moduleTitle}</span>
                  </div>
                )}

                {result.metadata?.tags && result.metadata.tags.length > 0 && (
                  <div className='flex items-center gap-1'>
                    {result.metadata.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant='outline' className='text-xs'>
                        #{tag}
                      </Badge>
                    ))}
                    {result.metadata.tags.length > 3 && (
                      <span className='text-xs text-text-secondary'>
                        +{result.metadata.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant='ghost'
                size='sm'
                className='opacity-0 group-hover:opacity-100 transition-opacity'
              >
                <ChevronRight className='w-4 h-4' />
              </Button>
            </div>

            {result.highlights && result.highlights.length > 0 && (
              <div className='mt-3 pt-3 border-t border-border-primary'>
                <div className='text-xs text-text-secondary mb-2'>
                  Highlighted matches:
                </div>
                <div className='space-y-1'>
                  {result.highlights.slice(0, 3).map((highlight, index) => (
                    <div
                      key={index}
                      className='text-xs text-text-primary bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded'
                    >
                      <span dangerouslySetInnerHTML={{ __html: highlight }} />
                    </div>
                  ))}
                  {result.highlights.length > 3 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowFullContent(!showFullContent);
                      }}
                      className='text-xs text-tomb45-green hover:underline'
                    >
                      Show {result.highlights.length - 3} more matches
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Search suggestions component
 */
const SearchSuggestions: React.FC<{
  suggestions: SearchSuggestion[];
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  onClearHistory: () => void;
  visible: boolean;
}> = ({ suggestions, onSuggestionSelect, onClearHistory, visible }) => {
  if (!visible || suggestions.length === 0) return null;

  const groupedSuggestions = useMemo(() => {
    const recent = suggestions.filter(s => s.type === 'recent').slice(0, 3);
    const popular = suggestions.filter(s => s.type === 'popular').slice(0, 3);
    const suggested = suggestions
      .filter(s => s.type === 'suggested')
      .slice(0, 3);

    return { recent, popular, suggested };
  }, [suggestions]);

  return (
    <Card className='absolute top-full left-0 right-0 z-10 mt-1 bg-background-secondary border-border-primary shadow-lg'>
      <CardContent className='p-4 space-y-4'>
        {groupedSuggestions.recent.length > 0 && (
          <div>
            <div className='flex items-center justify-between mb-2'>
              <h4 className='text-sm font-medium text-text-primary'>
                Recent Searches
              </h4>
              <Button
                variant='ghost'
                size='sm'
                onClick={onClearHistory}
                className='text-xs text-text-secondary hover:text-text-primary'
              >
                Clear
              </Button>
            </div>
            <div className='space-y-1'>
              {groupedSuggestions.recent.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionSelect(suggestion)}
                  className='w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-background-accent text-text-primary transition-colors'
                >
                  <div className='flex items-center gap-2'>
                    <Clock className='w-3 h-3 text-text-secondary' />
                    <span>{suggestion.query}</span>
                    {suggestion.lastUsed && (
                      <span className='ml-auto text-xs text-text-secondary'>
                        {new Date(suggestion.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {groupedSuggestions.popular.length > 0 && (
          <div>
            <h4 className='text-sm font-medium text-text-primary mb-2'>
              Popular Searches
            </h4>
            <div className='space-y-1'>
              {groupedSuggestions.popular.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionSelect(suggestion)}
                  className='w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-background-accent text-text-primary transition-colors'
                >
                  <div className='flex items-center gap-2'>
                    <TrendingUp className='w-3 h-3 text-text-secondary' />
                    <span>{suggestion.query}</span>
                    {suggestion.frequency && (
                      <Badge variant='outline' className='ml-auto text-xs'>
                        {suggestion.frequency}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {groupedSuggestions.suggested.length > 0 && (
          <div>
            <h4 className='text-sm font-medium text-text-primary mb-2'>
              Suggested
            </h4>
            <div className='space-y-1'>
              {groupedSuggestions.suggested.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionSelect(suggestion)}
                  className='w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-background-accent text-text-primary transition-colors'
                >
                  <div className='flex items-center gap-2'>
                    <Zap className='w-3 h-3 text-text-secondary' />
                    <span>{suggestion.query}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Advanced filters component
 */
const AdvancedFilters: React.FC<{
  filters: ExtendedSearchFilters;
  onFiltersChange: (filters: ExtendedSearchFilters) => void;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, onClearFilters }) => {
  const updateFilter = useCallback(
    <K extends keyof ExtendedSearchFilters>(
      key: K,
      value: ExtendedSearchFilters[K]
    ) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const setDateRangePreset = useCallback(
    (preset: ExtendedSearchFilters['dateRangePreset']) => {
      let dateFrom: string | undefined;
      let dateTo: string | undefined;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (preset) {
        case 'today':
          dateFrom = today.toISOString();
          dateTo = new Date(
            today.getTime() + 24 * 60 * 60 * 1000
          ).toISOString();
          break;
        case 'week':
          dateFrom = new Date(
            today.getTime() - 7 * 24 * 60 * 60 * 1000
          ).toISOString();
          dateTo = now.toISOString();
          break;
        case 'month':
          dateFrom = new Date(
            today.getTime() - 30 * 24 * 60 * 60 * 1000
          ).toISOString();
          dateTo = now.toISOString();
          break;
        case 'quarter':
          dateFrom = new Date(
            today.getTime() - 90 * 24 * 60 * 60 * 1000
          ).toISOString();
          dateTo = now.toISOString();
          break;
        case 'all':
        case 'custom':
        default:
          dateFrom = undefined;
          dateTo = undefined;
          break;
      }

      onFiltersChange({
        ...filters,
        dateRangePreset: preset,
        dateFrom,
        dateTo,
      });
    },
    [filters, onFiltersChange]
  );

  return (
    <Card className='bg-background-accent border-border-primary'>
      <CardContent className='p-4 space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='font-medium text-text-primary'>Advanced Filters</h3>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClearFilters}
            className='text-text-secondary hover:text-text-primary'
          >
            Clear All
          </Button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Content Types */}
          <div>
            <label className='block text-sm font-medium text-text-primary mb-2'>
              Content Types
            </label>
            <div className='space-y-2'>
              {(
                [
                  'module',
                  'lesson',
                  'note',
                  'transcription',
                  'recording',
                ] as ContentType[]
              ).map(type => (
                <label key={type} className='flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={filters.contentTypes?.includes(type) || false}
                    onChange={e => {
                      const currentTypes = filters.contentTypes || [];
                      const newTypes = e.target.checked
                        ? [...currentTypes, type]
                        : currentTypes.filter(t => t !== type);
                      updateFilter('contentTypes', newTypes);
                    }}
                    className='rounded border-border-primary'
                  />
                  <span className='capitalize'>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className='block text-sm font-medium text-text-primary mb-2'>
              Date Range
            </label>
            <div className='space-y-2'>
              <select
                value={filters.dateRangePreset}
                onChange={e =>
                  setDateRangePreset(
                    e.target.value as ExtendedSearchFilters['dateRangePreset']
                  )
                }
                className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
              >
                <option value='all'>All Time</option>
                <option value='today'>Today</option>
                <option value='week'>Last Week</option>
                <option value='month'>Last Month</option>
                <option value='quarter'>Last Quarter</option>
                <option value='custom'>Custom Range</option>
              </select>

              {filters.dateRangePreset === 'custom' && (
                <div className='space-y-2'>
                  <input
                    type='date'
                    value={filters.dateFrom?.split('T')[0] || ''}
                    onChange={e =>
                      updateFilter(
                        'dateFrom',
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined
                      )
                    }
                    className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary'
                    placeholder='From'
                  />
                  <input
                    type='date'
                    value={filters.dateTo?.split('T')[0] || ''}
                    onChange={e =>
                      updateFilter(
                        'dateTo',
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined
                      )
                    }
                    className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary'
                    placeholder='To'
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress & Status */}
          <div>
            <label className='block text-sm font-medium text-text-primary mb-2'>
              Progress & Status
            </label>
            <div className='space-y-2'>
              <select
                value={filters.progressStatus || ''}
                onChange={e =>
                  updateFilter(
                    'progressStatus',
                    (e.target.value as ProgressStatus) || undefined
                  )
                }
                className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
              >
                <option value=''>Any Progress</option>
                <option value='not_started'>Not Started</option>
                <option value='in_progress'>In Progress</option>
                <option value='completed'>Completed</option>
              </select>

              <select
                value={filters.difficultyLevel || ''}
                onChange={e =>
                  updateFilter(
                    'difficultyLevel',
                    (e.target.value as DifficultyLevel) || undefined
                  )
                }
                className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
              >
                <option value=''>Any Difficulty</option>
                <option value='beginner'>Beginner</option>
                <option value='intermediate'>Intermediate</option>
                <option value='advanced'>Advanced</option>
              </select>
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <label className='block text-sm font-medium text-text-primary mb-2'>
              Quick Filters
            </label>
            <div className='space-y-2'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={filters.isBookmarked || false}
                  onChange={e => updateFilter('isBookmarked', e.target.checked)}
                  className='rounded border-border-primary'
                />
                Bookmarked Only
              </label>

              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={filters.hasActionItems || false}
                  onChange={e =>
                    updateFilter('hasActionItems', e.target.checked)
                  }
                  className='rounded border-border-primary'
                />
                Has Action Items
              </label>

              <input
                type='text'
                placeholder='Tags (comma-sep)'
                value={filters.tags?.join(', ') || ''}
                onChange={e =>
                  updateFilter(
                    'tags',
                    e.target.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(Boolean)
                  )
                }
                className='w-full px-3 py-1 text-sm bg-background-secondary border border-border-primary rounded text-text-primary'
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main SearchInterface Component
 */
export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  userId,
  moduleId,
  lessonId,
  showAdvancedFeatures = true,
  enableAnalytics = true,
  showSuggestions = true,
  pageSize = 20,
  className = '',
  onResultSelect,
  onAnalyticsChange,
  onError,
}) => {
  // Core state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Extended filters
  const [filters, setFilters] = useState<ExtendedSearchFilters>({
    showFilters: false,
    activeTab: 'all',
    viewMode: 'list',
    groupBy: 'none',
    dateRangePreset: 'all',
    moduleId,
    lessonId,
  });

  // Search suggestions
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);

  // Search analytics
  const [analytics, setAnalytics] = useState<SearchAnalytics>({
    totalResults: 0,
    resultsByType: {
      module: 0,
      lesson: 0,
      note: 0,
      transcription: 0,
      recording: 0,
    },
    searchTime: 0,
    suggestedFilters: [],
    relatedTopics: [],
    popularQueries: [],
  });

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Perform search with current query and filters
   */
  const performSearch = useCallback(
    async (
      query: string = searchQuery,
      currentFilters: ExtendedSearchFilters = filters,
      page: number = 1
    ) => {
      if (
        !query.trim() &&
        !Object.keys(currentFilters).some(key => {
          const value = currentFilters[key as keyof ExtendedSearchFilters];
          return (
            value &&
            value !== 'all' &&
            value !== 'none' &&
            (Array.isArray(value) ? value.length > 0 : true)
          );
        })
      ) {
        setSearchResults([]);
        setTotalResults(0);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const startTime = Date.now();

        // Build search request
        const searchRequest: SearchRequest = {
          query: query.trim(),
          filters: {
            contentTypes: currentFilters.contentTypes,
            moduleId: currentFilters.moduleId,
            lessonId: currentFilters.lessonId,
            dateFrom: currentFilters.dateFrom,
            dateTo: currentFilters.dateTo,
            tags: currentFilters.tags,
            difficultyLevel: currentFilters.difficultyLevel,
            progressStatus: currentFilters.progressStatus,
            isBookmarked: currentFilters.isBookmarked,
          },
          sortBy: currentFilters.sortBy || 'relevance',
          sortOrder: currentFilters.sortOrder || 'desc',
          page,
          limit: pageSize,
          includeHighlights: true,
          includeSnippets: true,
        };

        const response = await fetch('/api/workbook/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(searchRequest),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Search failed');
        }

        const data: SearchResponse = await response.json();

        if (data.success && data.data) {
          const searchTime = Date.now() - startTime;

          setSearchResults(data.data.results);
          setTotalResults(data.data.total);
          setCurrentPage(page);

          // Update analytics
          if (enableAnalytics) {
            const newAnalytics: SearchAnalytics = {
              totalResults: data.data.total,
              resultsByType:
                data.data.aggregations?.contentTypes || analytics.resultsByType,
              searchTime,
              suggestedFilters: data.data.suggestedFilters || [],
              relatedTopics: data.data.relatedQueries || [],
              popularQueries: analytics.popularQueries,
            };

            setAnalytics(newAnalytics);
            onAnalyticsChange?.(newAnalytics);
          }

          // Add to search history
          if (query.trim()) {
            const suggestion: SearchSuggestion = {
              id: `search_${Date.now()}`,
              query: query.trim(),
              type: 'recent',
              lastUsed: new Date().toISOString(),
            };

            setSuggestions(prev => [
              suggestion,
              ...prev.filter(s => s.query !== query.trim()).slice(0, 9),
            ]);
          }
        } else {
          throw new Error(data.error || 'Invalid search response');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Search failed';
        setError(errorMessage);
        onError?.(errorMessage, 'search');
      } finally {
        setLoading(false);
      }
    },
    [
      searchQuery,
      filters,
      pageSize,
      enableAnalytics,
      analytics.resultsByType,
      analytics.popularQueries,
      onAnalyticsChange,
      onError,
    ]
  );

  /**
   * Debounced search
   */
  const debouncedSearch = useCallback(
    (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    },
    [performSearch]
  );

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);

      if (value.trim()) {
        debouncedSearch(value);
        setShowSuggestionsPanel(false);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    },
    [debouncedSearch]
  );

  /**
   * Handle filter changes
   */
  const handleFiltersChange = useCallback(
    (newFilters: ExtendedSearchFilters) => {
      setFilters(newFilters);
      setCurrentPage(1);
      performSearch(searchQuery, newFilters, 1);
    },
    [searchQuery, performSearch]
  );

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    const clearedFilters: ExtendedSearchFilters = {
      showFilters: filters.showFilters,
      activeTab: 'all',
      viewMode: filters.viewMode,
      groupBy: 'none',
      dateRangePreset: 'all',
      moduleId,
      lessonId,
    };

    setFilters(clearedFilters);
    setCurrentPage(1);
    performSearch(searchQuery, clearedFilters, 1);
  }, [
    filters.showFilters,
    filters.viewMode,
    moduleId,
    lessonId,
    searchQuery,
    performSearch,
  ]);

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setSearchQuery(suggestion.query);
      setShowSuggestionsPanel(false);
      performSearch(suggestion.query);
    },
    [performSearch]
  );

  /**
   * Clear search history
   */
  const clearSearchHistory = useCallback(() => {
    setSuggestions(prev => prev.filter(s => s.type !== 'recent'));
  }, []);

  /**
   * Group search results
   */
  const groupedResults = useMemo(() => {
    if (filters.groupBy === 'none') {
      return { ungrouped: searchResults };
    }

    const grouped: Record<string, SearchResult[]> = {};

    searchResults.forEach(result => {
      let key = 'Other';

      switch (filters.groupBy) {
        case 'contentType':
          key = result.contentType;
          break;
        case 'moduleId':
          key = result.metadata?.moduleTitle || 'No Module';
          break;
        case 'date':
          const date = new Date(result.lastModified);
          key = date.toLocaleDateString();
          break;
        case 'category':
          key = result.metadata?.category || 'No Category';
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(result);
    });

    return grouped;
  }, [searchResults, filters.groupBy]);

  /**
   * Get active filter count
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.contentTypes && filters.contentTypes.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.difficultyLevel) count++;
    if (filters.progressStatus) count++;
    if (filters.isBookmarked) count++;
    if (filters.hasActionItems) count++;

    return count;
  }, [filters]);

  // Initialize suggestions
  useEffect(() => {
    // Load popular queries and suggestions
    const popularQueries: SearchSuggestion[] = [
      {
        id: 'p1',
        query: 'business foundations',
        type: 'popular',
        frequency: 45,
      },
      {
        id: 'p2',
        query: 'marketing strategies',
        type: 'popular',
        frequency: 38,
      },
      { id: 'p3', query: 'six figure barber', type: 'popular', frequency: 32 },
    ];

    const suggestedQueries: SearchSuggestion[] = [
      { id: 's1', query: 'action items', type: 'suggested' },
      { id: 's2', query: 'completed modules', type: 'suggested' },
      { id: 's3', query: 'workshop notes', type: 'suggested' },
    ];

    setSuggestions([...popularQueries, ...suggestedQueries]);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <Card className='bg-background-secondary border-border-primary'>
        <CardContent className='p-6'>
          <div className='space-y-4'>
            {/* Main Search Bar */}
            <div className='relative'>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary' />
                <input
                  ref={searchInputRef}
                  type='text'
                  placeholder='Search across all content - modules, lessons, notes, recordings...'
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() =>
                    setShowSuggestionsPanel(
                      showSuggestions && suggestions.length > 0
                    )
                  }
                  onBlur={() =>
                    setTimeout(() => setShowSuggestionsPanel(false), 150)
                  }
                  className='w-full pl-12 pr-12 py-4 text-lg bg-background-accent border border-border-primary rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-tomb45-green focus:border-transparent transition-all'
                />
                {loading && (
                  <Loader2 className='absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-tomb45-green' />
                )}
                {searchQuery && !loading && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleSearchChange('')}
                    className='absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 p-0'
                  >
                    <X className='w-4 h-4' />
                  </Button>
                )}
              </div>

              {/* Search Suggestions */}
              <SearchSuggestions
                suggestions={suggestions}
                onSuggestionSelect={handleSuggestionSelect}
                onClearHistory={clearSearchHistory}
                visible={showSuggestionsPanel}
              />
            </div>

            {/* Search Controls */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                {/* Content Type Tabs */}
                <div className='flex items-center bg-background-accent rounded-lg p-1'>
                  {(
                    [
                      'all',
                      'modules',
                      'lessons',
                      'notes',
                      'transcriptions',
                      'recordings',
                    ] as const
                  ).map(tab => (
                    <Button
                      key={tab}
                      variant={
                        filters.activeTab === tab ? 'secondary' : 'ghost'
                      }
                      size='sm'
                      onClick={() => {
                        const contentTypes =
                          tab === 'all'
                            ? undefined
                            : tab === 'modules'
                              ? ['module']
                              : tab === 'lessons'
                                ? ['lesson']
                                : tab === 'notes'
                                  ? ['note']
                                  : tab === 'transcriptions'
                                    ? ['transcription']
                                    : ['recording'];

                        handleFiltersChange({
                          ...filters,
                          activeTab: tab,
                          contentTypes,
                        });
                      }}
                      className='capitalize'
                    >
                      {tab}
                    </Button>
                  ))}
                </div>

                {/* Filter Toggle */}
                <Button
                  variant={filters.showFilters ? 'secondary' : 'outline'}
                  onClick={() =>
                    setFilters(prev => ({
                      ...prev,
                      showFilters: !prev.showFilters,
                    }))
                  }
                >
                  <Filter className='w-4 h-4 mr-2' />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant='outline' className='ml-2 text-xs'>
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </div>

              <div className='flex items-center gap-2'>
                {/* View Mode Toggle */}
                <div className='flex items-center bg-background-accent rounded-lg p-1'>
                  <Button
                    variant={
                      filters.viewMode === 'list' ? 'secondary' : 'ghost'
                    }
                    size='sm'
                    onClick={() =>
                      setFilters(prev => ({ ...prev, viewMode: 'list' }))
                    }
                    className='w-8 h-8 p-0'
                  >
                    <List className='w-4 h-4' />
                  </Button>
                  <Button
                    variant={
                      filters.viewMode === 'grid' ? 'secondary' : 'ghost'
                    }
                    size='sm'
                    onClick={() =>
                      setFilters(prev => ({ ...prev, viewMode: 'grid' }))
                    }
                    className='w-8 h-8 p-0'
                  >
                    <Grid className='w-4 h-4' />
                  </Button>
                </div>

                {/* Sort Options */}
                <select
                  value={`${filters.sortBy || 'relevance'}_${filters.sortOrder || 'desc'}`}
                  onChange={e => {
                    const [sortBy, sortOrder] = e.target.value.split('_') as [
                      SearchSortOptions,
                      'asc' | 'desc',
                    ];
                    handleFiltersChange({
                      ...filters,
                      sortBy,
                      sortOrder,
                    });
                  }}
                  className='px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
                >
                  <option value='relevance_desc'>Most Relevant</option>
                  <option value='lastModified_desc'>Recently Updated</option>
                  <option value='lastModified_asc'>Oldest First</option>
                  <option value='title_asc'>Title A-Z</option>
                  <option value='title_desc'>Title Z-A</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {filters.showFilters && showAdvancedFeatures && (
        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearAllFilters}
        />
      )}

      {/* Search Analytics */}
      {enableAnalytics && (searchResults.length > 0 || error) && (
        <Card className='bg-background-accent border-border-primary'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-6'>
                <div className='text-sm text-text-secondary'>
                  <span className='font-medium text-text-primary'>
                    {totalResults.toLocaleString()}
                  </span>{' '}
                  results
                  {analytics.searchTime > 0 && (
                    <span className='ml-2'>in {analytics.searchTime}ms</span>
                  )}
                </div>

                {Object.values(analytics.resultsByType).some(
                  count => count > 0
                ) && (
                  <div className='flex items-center gap-3 text-sm'>
                    {(
                      Object.entries(analytics.resultsByType) as [
                        ContentType,
                        number,
                      ][]
                    ).map(
                      ([type, count]) =>
                        count > 0 && (
                          <Badge
                            key={type}
                            variant='outline'
                            className='text-xs'
                          >
                            {count} {type}s
                          </Badge>
                        )
                    )}
                  </div>
                )}
              </div>

              <div className='flex items-center gap-2'>
                {analytics.suggestedFilters.length > 0 && (
                  <div className='text-xs text-text-secondary'>
                    Try: {analytics.suggestedFilters.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className='bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3 text-red-600 dark:text-red-400'>
              <AlertCircle className='w-5 h-5' />
              <div>
                <h4 className='font-medium'>Search Error</h4>
                <p className='text-sm'>{error}</p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setError(null)}
                className='ml-auto'
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className='space-y-6'>
          {Object.entries(groupedResults).map(([groupKey, results]) => (
            <div key={groupKey}>
              {filters.groupBy !== 'none' && (
                <h3 className='text-lg font-semibold text-text-primary mb-4 flex items-center gap-2'>
                  {groupKey}
                  <Badge variant='outline' className='text-xs'>
                    {results.length}
                  </Badge>
                </h3>
              )}

              <div
                className={
                  filters.viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                }
              >
                {results.map(result => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    onSelect={result => onResultSelect?.(result)}
                    viewMode={filters.viewMode}
                    showPreview={true}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalResults > pageSize && (
            <div className='flex items-center justify-center gap-4 pt-6'>
              <Button
                variant='outline'
                disabled={currentPage === 1}
                onClick={() => {
                  const newPage = currentPage - 1;
                  setCurrentPage(newPage);
                  performSearch(searchQuery, filters, newPage);
                }}
              >
                Previous
              </Button>

              <div className='flex items-center gap-2'>
                <span className='text-sm text-text-secondary'>
                  Page {currentPage} of {Math.ceil(totalResults / pageSize)}
                </span>
              </div>

              <Button
                variant='outline'
                disabled={currentPage >= Math.ceil(totalResults / pageSize)}
                onClick={() => {
                  const newPage = currentPage + 1;
                  setCurrentPage(newPage);
                  performSearch(searchQuery, filters, newPage);
                }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && searchQuery && searchResults.length === 0 && !error && (
        <Card className='bg-background-secondary border-border-primary'>
          <CardContent className='p-8 text-center'>
            <Search className='w-16 h-16 mx-auto mb-4 text-text-secondary opacity-50' />
            <h3 className='text-xl font-semibold text-text-primary mb-2'>
              No results found
            </h3>
            <p className='text-text-secondary mb-6'>
              Try adjusting your search query or filters to find what you're
              looking for.
            </p>
            <div className='flex justify-center gap-3'>
              <Button onClick={clearAllFilters} variant='outline'>
                Clear Filters
              </Button>
              <Button onClick={() => handleSearchChange('')} variant='ghost'>
                Clear Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome State */}
      {!loading && !searchQuery && searchResults.length === 0 && (
        <Card className='bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20'>
          <CardContent className='p-8 text-center'>
            <div className='p-4 bg-tomb45-green/20 rounded-xl inline-block mb-6'>
              <Search className='w-12 h-12 text-tomb45-green' />
            </div>
            <h3 className='text-2xl font-bold text-text-primary mb-2'>
              Comprehensive Workshop Search
            </h3>
            <p className='text-text-secondary mb-6 max-w-2xl mx-auto'>
              Search across all your workshop content including modules,
              lessons, notes, recordings, and transcriptions. Use advanced
              filters to find exactly what you need.
            </p>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto'>
              <div className='text-center p-4'>
                <BookOpen className='w-8 h-8 mx-auto mb-2 text-blue-500' />
                <h4 className='font-medium text-text-primary mb-1'>
                  Workshop Content
                </h4>
                <p className='text-sm text-text-secondary'>
                  Search modules and lessons
                </p>
              </div>
              <div className='text-center p-4'>
                <FileText className='w-8 h-8 mx-auto mb-2 text-purple-500' />
                <h4 className='font-medium text-text-primary mb-1'>
                  Personal Notes
                </h4>
                <p className='text-sm text-text-secondary'>
                  Find your notes and action items
                </p>
              </div>
              <div className='text-center p-4'>
                <Mic className='w-8 h-8 mx-auto mb-2 text-orange-500' />
                <h4 className='font-medium text-text-primary mb-1'>
                  Audio Content
                </h4>
                <p className='text-sm text-text-secondary'>
                  Search recordings and transcriptions
                </p>
              </div>
            </div>

            {suggestions.filter(s => s.type === 'popular').length > 0 && (
              <div className='mt-6'>
                <p className='text-sm text-text-secondary mb-3'>
                  Popular searches:
                </p>
                <div className='flex justify-center gap-2 flex-wrap'>
                  {suggestions
                    .filter(s => s.type === 'popular')
                    .slice(0, 3)
                    .map(suggestion => (
                      <Button
                        key={suggestion.id}
                        variant='outline'
                        size='sm'
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.query}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Export SearchInterface and related types
 */
export default SearchInterface;
export type {
  SearchInterfaceProps,
  ExtendedSearchFilters,
  SearchSuggestion,
  SearchAnalytics,
};
export {
  SearchInterface,
  SearchResultItem,
  SearchSuggestions,
  AdvancedFilters,
};
