'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Tag,
  FileText,
  Clock,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  CheckSquare,
  BookOpen,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  highlighted_title?: string;
  highlighted_content?: string;
  type: string;
  tags: string[];
  relevance_score: number;
  is_action_item: boolean;
  action_item_completed: boolean;
  importance: number;
  is_private: boolean;
  session_title?: string;
  workshop_module?: string;
  created_at: string;
  updated_at: string;
}

interface SearchFilters {
  query: string;
  type?: string;
  tags?: string[];
  sessionId?: string;
  lessonId?: string;
  moduleId?: string;
  isActionItem?: boolean;
  importance?: number;
  isPrivate?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface SearchSuggestions {
  popularTags: { tag: string; count: number }[];
  noteTypes: { type: string; count: number }[];
  sessionsWithNotes: { id: string; title: string; noteCount: number }[];
}

interface NotesSearchProps {
  onNoteSelect: (noteId: string) => void;
  initialFilters?: Partial<SearchFilters>;
  className?: string;
}

export const NotesSearch: React.FC<NotesSearchProps> = ({
  onNoteSelect,
  initialFilters = {},
  className = '',
}) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    ...initialFilters,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (filters.query.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performSearch();
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [filters]);

  const loadSuggestions = async () => {
    try {
      const response = await fetch('/api/workbook/notes/search', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      console.warn('Failed to load search suggestions:', error);
    }
  };

  const performSearch = async () => {
    if (!filters.query.trim() || filters.query.trim().length < 2) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();

      const response = await fetch('/api/workbook/notes/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...filters,
          includeHighlights: true,
          limit: 50,
          offset: 0,
        }),
      });

      const endTime = Date.now();
      setSearchTime(endTime - startTime);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
        setTotalResults(data.pagination.total);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const addTagFilter = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: [...(prev.tags || []), tag],
    }));
  }, []);

  const removeTagFilter = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ query: filters.query });
  }, [filters.query]);

  const formatSnippet = (text: string, highlighted?: string) => {
    if (highlighted) {
      return { __html: highlighted };
    }
    return { __html: text.substring(0, 150) + (text.length > 150 ? '...' : '') };
  };

  const getImportanceColor = (importance: number) => {
    switch (importance) {
      case 5: return 'text-red-600';
      case 4: return 'text-orange-600';
      case 3: return 'text-yellow-600';
      case 2: return 'text-blue-600';
      case 1: return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getImportanceLabel = (importance: number) => {
    switch (importance) {
      case 5: return 'Critical';
      case 4: return 'High';
      case 3: return 'Medium';
      case 2: return 'Low';
      case 1: return 'Very Low';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search your notes..."
              value={filters.query}
              onChange={e => updateFilter('query', e.target.value)}
              className="pl-10 pr-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
              {showAdvancedFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {(filters.type || filters.tags?.length || filters.isActionItem !== undefined) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Note Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Note Type</label>
                  <select
                    value={filters.type || ''}
                    onChange={e => updateFilter('type', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="manual">Manual</option>
                    <option value="lesson-note">Lesson Note</option>
                    <option value="reflection">Reflection</option>
                    <option value="action-item">Action Item</option>
                  </select>
                </div>

                {/* Importance Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Importance</label>
                  <select
                    value={filters.importance || ''}
                    onChange={e => updateFilter('importance', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Levels</option>
                    <option value="5">Critical</option>
                    <option value="4">High</option>
                    <option value="3">Medium</option>
                    <option value="2">Low</option>
                    <option value="1">Very Low</option>
                  </select>
                </div>

                {/* Action Items Filter */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.isActionItem === true}
                      onChange={e => updateFilter('isActionItem', e.target.checked ? true : undefined)}
                      className="rounded"
                    />
                    Action Items Only
                  </label>
                </div>
              </div>

              {/* Popular Tags */}
              {suggestions?.popularTags && suggestions.popularTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Popular Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.popularTags.slice(0, 10).map(({ tag, count }) => (
                      <Badge
                        key={tag}
                        variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          if (filters.tags?.includes(tag)) {
                            removeTagFilter(tag);
                          } else {
                            addTagFilter(tag);
                          }
                        }}
                      >
                        {tag} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Tags */}
              {filters.tags && filters.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Selected Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {filters.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="default"
                        className="cursor-pointer"
                        onClick={() => removeTagFilter(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Stats */}
          {filters.query.trim().length >= 2 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {isLoading ? 'Searching...' : `${totalResults} results found`}
                {searchTime && ` in ${searchTime}ms`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map(result => (
            <Card
              key={result.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNoteSelect(result.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Note Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-medium text-base leading-tight"
                        dangerouslySetInnerHTML={formatSnippet(
                          result.title,
                          result.highlighted_title
                        )}
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {result.type.replace('-', ' ')}
                        </Badge>
                        {result.is_action_item && (
                          <Badge
                            variant={result.action_item_completed ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            <CheckSquare className="w-3 h-3 mr-1" />
                            {result.action_item_completed ? 'Completed' : 'Pending'}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getImportanceColor(result.importance)}`}
                        >
                          {getImportanceLabel(result.importance)}
                        </Badge>
                        {result.relevance_score > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.relevance_score * 100)}% match
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {!result.is_private && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(result.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Note Content Preview */}
                  <div
                    className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={formatSnippet(
                      result.content,
                      result.highlighted_content
                    )}
                  />

                  {/* Note Metadata */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {result.session_title && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{result.session_title}</span>
                        </div>
                      )}
                      {result.workshop_module && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{result.workshop_module}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 3).map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-gray-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              addTagFilter(tag);
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {result.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{result.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {filters.query.trim().length >= 2 && !isLoading && searchResults.length === 0 && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium text-gray-900 mb-2">No notes found</h3>
            <p className="text-sm text-gray-500 mb-4">
              Try adjusting your search query or filters
            </p>
            {suggestions?.popularTags && suggestions.popularTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.popularTags.slice(0, 5).map(({ tag }) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => updateFilter('query', tag)}
                    >
                      {tag}
                    </Badge>
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