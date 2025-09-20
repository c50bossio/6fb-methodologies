'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Save,
  Plus,
  Search,
  Filter,
  Tag,
  Clock,
  Calendar,
  FileText,
  Trash2,
  Edit3,
  MoreHorizontal,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Download,
  Upload,
  Share2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkPlus,
  MessageSquare,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Quote,
  Code,
  Hash,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  PaperclipIcon,
  ImageIcon,
  Mic,
  Video,
  MapPin,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CreateNoteRequestBody,
  UpdateNoteRequestBody,
  NotesListResponse,
  NoteDetailsResponse,
  SearchNotesRequestBody,
  SearchNotesResponse,
  WorkbookNote,
  DetailedNote,
  NoteCategory,
  NotePriority,
  ActionItem,
  ApiResponse,
} from '@/types/workbook-api';

/**
 * Note formatting and styling options
 */
interface FormattingOptions {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: 'small' | 'normal' | 'large';
  alignment: 'left' | 'center' | 'right';
  listType: 'none' | 'bullet' | 'numbered';
}

/**
 * Auto-save configuration
 */
interface AutoSaveConfig {
  enabled: boolean;
  intervalSeconds: number;
  showIndicator: boolean;
  onConflict: 'overwrite' | 'merge' | 'prompt';
}

/**
 * Search and filter state
 */
interface SearchFilters {
  query: string;
  category?: NoteCategory;
  priority?: NotePriority;
  hasActionItems: boolean;
  isBookmarked: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  tags: string[];
  moduleId?: string;
  lessonId?: string;
}

/**
 * Note editor state
 */
interface EditorState {
  content: string;
  title: string;
  category: NoteCategory;
  priority: NotePriority;
  tags: string[];
  isBookmarked: boolean;
  isPrivate: boolean;
  hasUnsavedChanges: boolean;
  lastSaved?: Date;
  isAutoSaving: boolean;
  actionItems: ActionItem[];
}

/**
 * Enhanced NoteTaker component props
 */
interface NoteTakerProps {
  /** User ID for authentication and note ownership */
  userId?: string;
  /** Current module ID for context */
  moduleId?: string;
  /** Current lesson ID for context */
  lessonId?: string;
  /** Session information for automatic tagging */
  sessionInfo?: {
    sessionId?: string;
    day?: 1 | 2;
    session?: string;
    speaker?: string;
  };
  /** Whether to show advanced note features */
  showAdvancedFeatures?: boolean;
  /** Whether to enable real-time collaboration */
  enableCollaboration?: boolean;
  /** Auto-save configuration */
  autoSaveConfig?: Partial<AutoSaveConfig>;
  /** Maximum note content length */
  maxContentLength?: number;
  /** Custom class name for styling */
  className?: string;
  /** Callback when a note is created */
  onNoteCreated?: (note: DetailedNote) => void;
  /** Callback when a note is updated */
  onNoteUpdated?: (note: DetailedNote) => void;
  /** Callback when a note is deleted */
  onNoteDeleted?: (noteId: string) => void;
  /** Callback when action items are updated */
  onActionItemsChanged?: (actionItems: ActionItem[]) => void;
  /** Callback for error handling */
  onError?: (error: string, context?: string) => void;
}

/**
 * Rich text formatting toolbar
 */
const FormattingToolbar: React.FC<{
  formatting: FormattingOptions;
  onFormatChange: (format: Partial<FormattingOptions>) => void;
  disabled?: boolean;
}> = ({ formatting, onFormatChange, disabled = false }) => {
  return (
    <div className='flex items-center gap-1 p-2 border-b border-border-primary bg-background-accent'>
      {/* Text Style */}
      <div className='flex items-center gap-1 pr-2 border-r border-border-primary'>
        <Button
          variant={formatting.bold ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ bold: !formatting.bold })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <Bold className='w-4 h-4' />
        </Button>
        <Button
          variant={formatting.italic ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ italic: !formatting.italic })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <Italic className='w-4 h-4' />
        </Button>
        <Button
          variant={formatting.underline ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ underline: !formatting.underline })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <Underline className='w-4 h-4' />
        </Button>
      </div>

      {/* Lists */}
      <div className='flex items-center gap-1 pr-2 border-r border-border-primary'>
        <Button
          variant={formatting.listType === 'bullet' ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ listType: formatting.listType === 'bullet' ? 'none' : 'bullet' })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <List className='w-4 h-4' />
        </Button>
        <Button
          variant={formatting.listType === 'numbered' ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ listType: formatting.listType === 'numbered' ? 'none' : 'numbered' })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <ListOrdered className='w-4 h-4' />
        </Button>
      </div>

      {/* Alignment */}
      <div className='flex items-center gap-1 pr-2 border-r border-border-primary'>
        <Button
          variant={formatting.alignment === 'left' ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ alignment: 'left' })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <AlignLeft className='w-4 h-4' />
        </Button>
        <Button
          variant={formatting.alignment === 'center' ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ alignment: 'center' })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <AlignCenter className='w-4 h-4' />
        </Button>
        <Button
          variant={formatting.alignment === 'right' ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onFormatChange({ alignment: 'right' })}
          disabled={disabled}
          className='w-8 h-8 p-0'
        >
          <AlignRight className='w-4 h-4' />
        </Button>
      </div>

      {/* Font Size */}
      <div className='flex items-center gap-1'>
        <select
          value={formatting.fontSize}
          onChange={(e) => onFormatChange({ fontSize: e.target.value as FormattingOptions['fontSize'] })}
          disabled={disabled}
          className='px-2 py-1 text-xs bg-background-secondary border border-border-primary rounded focus:outline-none focus:ring-1 focus:ring-tomb45-green'
        >
          <option value='small'>Small</option>
          <option value='normal'>Normal</option>
          <option value='large'>Large</option>
        </select>
      </div>
    </div>
  );
};

/**
 * Action items manager
 */
const ActionItemsManager: React.FC<{
  actionItems: ActionItem[];
  onActionItemsChange: (items: ActionItem[]) => void;
  disabled?: boolean;
}> = ({ actionItems, onActionItemsChange, disabled = false }) => {
  const [newItemText, setNewItemText] = useState('');

  const addActionItem = useCallback(() => {
    if (!newItemText.trim()) return;

    const newItem: ActionItem = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: newItemText.trim(),
      completed: false,
      priority: 'medium',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onActionItemsChange([...actionItems, newItem]);
    setNewItemText('');
  }, [newItemText, actionItems, onActionItemsChange]);

  const updateActionItem = useCallback((id: string, updates: Partial<ActionItem>) => {
    const updatedItems = actionItems.map(item =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item
    );
    onActionItemsChange(updatedItems);
  }, [actionItems, onActionItemsChange]);

  const removeActionItem = useCallback((id: string) => {
    onActionItemsChange(actionItems.filter(item => item.id !== id));
  }, [actionItems, onActionItemsChange]);

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h4 className='font-medium text-text-primary'>Action Items</h4>
        <Badge variant='outline' className='text-xs'>
          {actionItems.filter(item => !item.completed).length} pending
        </Badge>
      </div>

      {/* Add new action item */}
      <div className='flex gap-2'>
        <input
          type='text'
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addActionItem()}
          placeholder='Add action item...'
          disabled={disabled}
          className='flex-1 px-3 py-2 text-sm bg-background-secondary border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-tomb45-green'
        />
        <Button
          onClick={addActionItem}
          disabled={disabled || !newItemText.trim()}
          size='sm'
        >
          <Plus className='w-4 h-4' />
        </Button>
      </div>

      {/* Action items list */}
      <div className='space-y-2 max-h-48 overflow-y-auto'>
        {actionItems.map((item) => (
          <div
            key={item.id}
            className='flex items-start gap-3 p-3 bg-background-accent rounded-lg border border-border-primary'
          >
            <Button
              variant='ghost'
              size='sm'
              onClick={() => updateActionItem(item.id, { completed: !item.completed })}
              disabled={disabled}
              className='w-6 h-6 p-0 mt-0.5'
            >
              {item.completed ? (
                <CheckSquare className='w-4 h-4 text-green-500' />
              ) : (
                <Square className='w-4 h-4 text-gray-400' />
              )}
            </Button>

            <div className='flex-1 min-w-0'>
              <p className={`text-sm ${item.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                {item.content}
              </p>
              <div className='flex items-center gap-2 mt-1'>
                <Badge variant='outline' className='text-xs'>
                  {item.priority}
                </Badge>
                {item.dueDate && (
                  <span className='text-xs text-text-secondary'>
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <Button
              variant='ghost'
              size='sm'
              onClick={() => removeActionItem(item.id)}
              disabled={disabled}
              className='w-6 h-6 p-0 text-red-500 hover:text-red-600'
            >
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>
        ))}
      </div>

      {actionItems.length === 0 && (
        <div className='text-center py-6 text-text-secondary'>
          <CheckSquare className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>No action items yet</p>
        </div>
      )}
    </div>
  );
};

/**
 * Notes list with search and filtering
 */
const NotesList: React.FC<{
  notes: WorkbookNote[];
  selectedNoteId?: string;
  onNoteSelect: (note: WorkbookNote) => void;
  onNoteDelete: (noteId: string) => void;
  searchFilters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  loading?: boolean;
}> = ({ notes, selectedNoteId, onNoteSelect, onNoteDelete, searchFilters, onFiltersChange, loading = false }) => {
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Text search
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase();
        const searchText = `${note.title} ${note.content}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      // Category filter
      if (searchFilters.category && note.category !== searchFilters.category) {
        return false;
      }

      // Priority filter
      if (searchFilters.priority && note.priority !== searchFilters.priority) {
        return false;
      }

      // Bookmark filter
      if (searchFilters.isBookmarked && !note.isBookmarked) {
        return false;
      }

      // Action items filter
      if (searchFilters.hasActionItems && (!note.actionItems || note.actionItems.length === 0)) {
        return false;
      }

      // Tags filter
      if (searchFilters.tags.length > 0) {
        const noteTags = note.tags || [];
        const hasAllTags = searchFilters.tags.every(tag => noteTags.includes(tag));
        if (!hasAllTags) return false;
      }

      // Module filter
      if (searchFilters.moduleId && note.moduleId !== searchFilters.moduleId) {
        return false;
      }

      // Lesson filter
      if (searchFilters.lessonId && note.lessonId !== searchFilters.lessonId) {
        return false;
      }

      return true;
    });
  }, [notes, searchFilters]);

  return (
    <div className='space-y-4'>
      {/* Search and Filter Header */}
      <div className='space-y-3'>
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary' />
            <input
              type='text'
              placeholder='Search notes...'
              value={searchFilters.query}
              onChange={(e) => onFiltersChange({ ...searchFilters, query: e.target.value })}
              className='w-full pl-10 pr-4 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className='w-4 h-4 mr-2' />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className='bg-background-accent border-border-primary'>
            <CardContent className='p-4 space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-text-primary mb-1'>Category</label>
                  <select
                    value={searchFilters.category || ''}
                    onChange={(e) => onFiltersChange({
                      ...searchFilters,
                      category: e.target.value as NoteCategory || undefined
                    })}
                    className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
                  >
                    <option value=''>All Categories</option>
                    <option value='personal'>Personal</option>
                    <option value='session-note'>Session Note</option>
                    <option value='action-item'>Action Item</option>
                    <option value='summary'>Summary</option>
                    <option value='question'>Question</option>
                    <option value='idea'>Idea</option>
                    <option value='reflection'>Reflection</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-text-primary mb-1'>Priority</label>
                  <select
                    value={searchFilters.priority || ''}
                    onChange={(e) => onFiltersChange({
                      ...searchFilters,
                      priority: e.target.value as NotePriority || undefined
                    })}
                    className='w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
                  >
                    <option value=''>All Priorities</option>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                    <option value='urgent'>Urgent</option>
                  </select>
                </div>

                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-text-primary'>Quick Filters</label>
                  <div className='flex flex-wrap gap-2'>
                    <label className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={searchFilters.isBookmarked}
                        onChange={(e) => onFiltersChange({ ...searchFilters, isBookmarked: e.target.checked })}
                        className='rounded border-border-primary'
                      />
                      Bookmarked
                    </label>
                    <label className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={searchFilters.hasActionItems}
                        onChange={(e) => onFiltersChange({ ...searchFilters, hasActionItems: e.target.checked })}
                        className='rounded border-border-primary'
                      />
                      Has Action Items
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes Count */}
      <div className='flex items-center justify-between text-sm text-text-secondary'>
        <span>{filteredNotes.length} notes found</span>
        <span>Total: {notes.length}</span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='w-6 h-6 animate-spin text-tomb45-green' />
          <span className='ml-2 text-text-secondary'>Loading notes...</span>
        </div>
      )}

      {/* Notes List */}
      <div className='space-y-2 max-h-96 overflow-y-auto'>
        {filteredNotes.map((note) => (
          <Card
            key={note.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedNoteId === note.id
                ? 'bg-tomb45-green/10 border-tomb45-green'
                : 'bg-background-secondary border-border-primary hover:border-tomb45-green/30'
            }`}
            onClick={() => onNoteSelect(note)}
          >
            <CardContent className='p-4'>
              <div className='flex items-start justify-between mb-2'>
                <h4 className={`font-medium truncate ${
                  selectedNoteId === note.id ? 'text-tomb45-green' : 'text-text-primary'
                }`}>
                  {note.title || 'Untitled Note'}
                </h4>
                <div className='flex items-center gap-1 ml-2'>
                  {note.isBookmarked && <Star className='w-4 h-4 text-yellow-500' />}
                  {note.priority === 'urgent' && <AlertCircle className='w-4 h-4 text-red-500' />}
                  {note.priority === 'high' && <AlertCircle className='w-4 h-4 text-orange-500' />}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={(e) => {
                      e.stopPropagation();
                      onNoteDelete(note.id);
                    }}
                    className='w-6 h-6 p-0 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <Trash2 className='w-3 h-3' />
                  </Button>
                </div>
              </div>

              <p className='text-sm text-text-secondary line-clamp-2 mb-3'>
                {note.content || 'No content'}
              </p>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-xs'>
                    {note.category}
                  </Badge>
                  {note.actionItems && note.actionItems.length > 0 && (
                    <Badge variant='outline' className='text-xs'>
                      {note.actionItems.filter(item => !item.completed).length} todos
                    </Badge>
                  )}
                </div>
                <span className='text-xs text-text-secondary'>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {note.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant='outline' className='text-xs'>
                      #{tag}
                    </Badge>
                  ))}
                  {note.tags.length > 3 && (
                    <Badge variant='outline' className='text-xs'>
                      +{note.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!loading && filteredNotes.length === 0 && (
        <div className='text-center py-8'>
          <FileText className='w-12 h-12 mx-auto mb-4 text-text-secondary opacity-50' />
          <h3 className='font-medium text-text-primary mb-2'>No notes found</h3>
          <p className='text-sm text-text-secondary'>
            {searchFilters.query || showFilters
              ? 'Try adjusting your search criteria'
              : 'Create your first note to get started'}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Main NoteTaker Component
 */
export const NoteTaker: React.FC<NoteTakerProps> = ({
  userId,
  moduleId,
  lessonId,
  sessionInfo,
  showAdvancedFeatures = true,
  enableCollaboration = false,
  autoSaveConfig = {},
  maxContentLength = 50000,
  className = '',
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onActionItemsChanged,
  onError,
}) => {
  // Core state
  const [notes, setNotes] = useState<WorkbookNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<DetailedNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    title: '',
    category: 'personal',
    priority: 'medium',
    tags: [],
    isBookmarked: false,
    isPrivate: true,
    hasUnsavedChanges: false,
    isAutoSaving: false,
    actionItems: [],
  });

  // UI state
  const [formatting, setFormatting] = useState<FormattingOptions>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: 'normal',
    alignment: 'left',
    listType: 'none',
  });

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    hasActionItems: false,
    isBookmarked: false,
    tags: [],
    moduleId,
    lessonId,
  });

  const [showNotesList, setShowNotesList] = useState(true);
  const [showActionItems, setShowActionItems] = useState(false);

  // Auto-save configuration
  const autoSave: AutoSaveConfig = {
    enabled: true,
    intervalSeconds: 30,
    showIndicator: true,
    onConflict: 'prompt',
    ...autoSaveConfig,
  };

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch notes from the backend
   */
  const fetchNotes = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        ...(moduleId && { moduleId }),
        ...(lessonId && { lessonId }),
      });

      const response = await fetch(`/api/workbook/notes?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch notes');
      }

      const data: NotesListResponse = await response.json();

      if (data.success && data.data) {
        setNotes(data.data);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load notes';
      setError(errorMessage);
      onError?.(errorMessage, 'fetch_notes');
    } finally {
      setLoading(false);
    }
  }, [userId, moduleId, lessonId, onError]);

  /**
   * Save note to backend
   */
  const saveNote = useCallback(async (noteData: Partial<EditorState>, noteId?: string) => {
    if (!userId) return null;

    try {
      setEditorState(prev => ({ ...prev, isAutoSaving: true }));

      const requestBody: CreateNoteRequestBody | UpdateNoteRequestBody = {
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        category: noteData.category || 'personal',
        priority: noteData.priority || 'medium',
        tags: noteData.tags || [],
        isBookmarked: noteData.isBookmarked || false,
        isPrivate: noteData.isPrivate ?? true,
        actionItems: noteData.actionItems || [],
        ...(moduleId && { moduleId }),
        ...(lessonId && { lessonId }),
        ...(sessionInfo?.sessionId && { sessionId: sessionInfo.sessionId }),
      };

      const response = await fetch(
        noteId ? `/api/workbook/notes/${noteId}` : '/api/workbook/notes',
        {
          method: noteId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${noteId ? 'update' : 'create'} note`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const note = data.data;

        // Update local state
        if (noteId) {
          setNotes(prev => prev.map(n => n.id === noteId ? note : n));
          onNoteUpdated?.(note);
        } else {
          setNotes(prev => [note, ...prev]);
          onNoteCreated?.(note);
        }

        setSelectedNote(note);
        setEditorState(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));

        return note;
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save note';
      setError(errorMessage);
      onError?.(errorMessage, 'save_note');
      return null;
    } finally {
      setEditorState(prev => ({ ...prev, isAutoSaving: false }));
    }
  }, [userId, moduleId, lessonId, sessionInfo?.sessionId, onNoteCreated, onNoteUpdated, onError]);

  /**
   * Delete note
   */
  const deleteNote = useCallback(async (noteId: string) => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/workbook/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete note');
      }

      // Update local state
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setEditorState({
          content: '',
          title: '',
          category: 'personal',
          priority: 'medium',
          tags: [],
          isBookmarked: false,
          isPrivate: true,
          hasUnsavedChanges: false,
          isAutoSaving: false,
          actionItems: [],
        });
      }

      onNoteDeleted?.(noteId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
      setError(errorMessage);
      onError?.(errorMessage, 'delete_note');
    }
  }, [userId, selectedNote?.id, onNoteDeleted, onError]);

  /**
   * Auto-save functionality
   */
  useEffect(() => {
    if (!autoSave.enabled || !editorState.hasUnsavedChanges || !selectedNote?.id) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveNote(editorState, selectedNote.id);
    }, autoSave.intervalSeconds * 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editorState.hasUnsavedChanges, editorState.content, editorState.title, autoSave.enabled, autoSave.intervalSeconds, selectedNote?.id, saveNote]);

  /**
   * Initialize component
   */
  useEffect(() => {
    if (userId) {
      fetchNotes();
    }
  }, [userId, fetchNotes]);

  /**
   * Handle content changes
   */
  const handleContentChange = useCallback((field: keyof EditorState, value: any) => {
    setEditorState(prev => ({
      ...prev,
      [field]: value,
      hasUnsavedChanges: true,
    }));

    if (field === 'actionItems') {
      onActionItemsChanged?.(value);
    }
  }, [onActionItemsChanged]);

  /**
   * Handle note selection
   */
  const handleNoteSelect = useCallback(async (note: WorkbookNote) => {
    try {
      setLoading(true);

      // Fetch detailed note
      const response = await fetch(`/api/workbook/notes/${note.id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch note details');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const detailedNote = data.data;
        setSelectedNote(detailedNote);
        setEditorState({
          content: detailedNote.content || '',
          title: detailedNote.title || '',
          category: detailedNote.category || 'personal',
          priority: detailedNote.priority || 'medium',
          tags: detailedNote.tags || [],
          isBookmarked: detailedNote.isBookmarked || false,
          isPrivate: detailedNote.isPrivate ?? true,
          hasUnsavedChanges: false,
          lastSaved: new Date(detailedNote.updatedAt),
          isAutoSaving: false,
          actionItems: detailedNote.actionItems || [],
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load note';
      setError(errorMessage);
      onError?.(errorMessage, 'select_note');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  /**
   * Create new note
   */
  const createNewNote = useCallback(() => {
    setSelectedNote(null);
    setEditorState({
      content: '',
      title: '',
      category: 'personal',
      priority: 'medium',
      tags: [],
      isBookmarked: false,
      isPrivate: true,
      hasUnsavedChanges: false,
      isAutoSaving: false,
      actionItems: [],
    });
  }, []);

  /**
   * Apply text formatting
   */
  const applyFormatting = useCallback((format: Partial<FormattingOptions>) => {
    setFormatting(prev => ({ ...prev, ...format }));

    // Apply formatting to textarea (basic implementation)
    if (contentRef.current) {
      const textarea = contentRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      if (selectedText) {
        let formattedText = selectedText;

        // Apply basic markdown-style formatting
        if (format.bold !== undefined && format.bold) {
          formattedText = `**${formattedText}**`;
        }
        if (format.italic !== undefined && format.italic) {
          formattedText = `*${formattedText}*`;
        }

        const newContent =
          textarea.value.substring(0, start) +
          formattedText +
          textarea.value.substring(end);

        handleContentChange('content', newContent);
      }
    }
  }, [handleContentChange]);

  const contentStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      textAlign: formatting.alignment,
      fontSize: formatting.fontSize === 'small' ? '14px' : formatting.fontSize === 'large' ? '18px' : '16px',
      fontWeight: formatting.bold ? 'bold' : 'normal',
      fontStyle: formatting.italic ? 'italic' : 'normal',
      textDecoration: formatting.underline ? 'underline' : 'none',
    };
    return styles;
  }, [formatting]);

  return (
    <div className={`flex h-[600px] bg-background-secondary border border-border-primary rounded-lg overflow-hidden ${className}`}>
      {/* Notes List Sidebar */}
      {showNotesList && (
        <div className='w-80 border-r border-border-primary flex flex-col'>
          <div className='p-4 border-b border-border-primary bg-background-accent'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-semibold text-text-primary'>Notes</h3>
              <div className='flex gap-2'>
                <Button onClick={createNewNote} size='sm'>
                  <Plus className='w-4 h-4 mr-1' />
                  New
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowNotesList(false)}
                >
                  <ChevronLeft className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </div>

          <div className='flex-1 overflow-hidden p-4'>
            <NotesList
              notes={notes}
              selectedNoteId={selectedNote?.id}
              onNoteSelect={handleNoteSelect}
              onNoteDelete={deleteNote}
              searchFilters={searchFilters}
              onFiltersChange={setSearchFilters}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className='flex-1 flex flex-col'>
        {/* Editor Header */}
        <div className='p-4 border-b border-border-primary bg-background-accent'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-3'>
              {!showNotesList && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowNotesList(true)}
                >
                  <ChevronRight className='w-4 h-4' />
                </Button>
              )}
              <div className='flex items-center gap-2'>
                {editorState.isAutoSaving && (
                  <Loader2 className='w-4 h-4 animate-spin text-tomb45-green' />
                )}
                {autoSave.showIndicator && editorState.lastSaved && (
                  <span className='text-xs text-text-secondary'>
                    Saved {new Date(editorState.lastSaved).toLocaleTimeString()}
                  </span>
                )}
                {editorState.hasUnsavedChanges && (
                  <span className='text-xs text-orange-500'>Unsaved changes</span>
                )}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {showAdvancedFeatures && (
                <Button
                  variant={showActionItems ? 'secondary' : 'ghost'}
                  size='sm'
                  onClick={() => setShowActionItems(!showActionItems)}
                >
                  <CheckSquare className='w-4 h-4 mr-1' />
                  Actions
                </Button>
              )}

              <Button
                onClick={() => selectedNote ? saveNote(editorState, selectedNote.id) : saveNote(editorState)}
                disabled={!editorState.hasUnsavedChanges || editorState.isAutoSaving}
                size='sm'
              >
                <Save className='w-4 h-4 mr-1' />
                Save
              </Button>
            </div>
          </div>

          {/* Note Metadata */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3 text-sm'>
            <div>
              <label className='block text-text-secondary mb-1'>Category</label>
              <select
                value={editorState.category}
                onChange={(e) => handleContentChange('category', e.target.value as NoteCategory)}
                className='w-full px-2 py-1 bg-background-secondary border border-border-primary rounded text-text-primary'
              >
                <option value='personal'>Personal</option>
                <option value='session-note'>Session Note</option>
                <option value='action-item'>Action Item</option>
                <option value='summary'>Summary</option>
                <option value='question'>Question</option>
                <option value='idea'>Idea</option>
                <option value='reflection'>Reflection</option>
              </select>
            </div>

            <div>
              <label className='block text-text-secondary mb-1'>Priority</label>
              <select
                value={editorState.priority}
                onChange={(e) => handleContentChange('priority', e.target.value as NotePriority)}
                className='w-full px-2 py-1 bg-background-secondary border border-border-primary rounded text-text-primary'
              >
                <option value='low'>Low</option>
                <option value='medium'>Medium</option>
                <option value='high'>High</option>
                <option value='urgent'>Urgent</option>
              </select>
            </div>

            <div className='flex items-end gap-2'>
              <label className='flex items-center gap-2 text-text-secondary'>
                <input
                  type='checkbox'
                  checked={editorState.isBookmarked}
                  onChange={(e) => handleContentChange('isBookmarked', e.target.checked)}
                  className='rounded border-border-primary'
                />
                Bookmark
              </label>
              <label className='flex items-center gap-2 text-text-secondary'>
                <input
                  type='checkbox'
                  checked={editorState.isPrivate}
                  onChange={(e) => handleContentChange('isPrivate', e.target.checked)}
                  className='rounded border-border-primary'
                />
                Private
              </label>
            </div>

            <div>
              <label className='block text-text-secondary mb-1'>Tags</label>
              <input
                type='text'
                placeholder='comma-separated'
                value={editorState.tags.join(', ')}
                onChange={(e) => handleContentChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                className='w-full px-2 py-1 bg-background-secondary border border-border-primary rounded text-text-primary'
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className='p-4 bg-red-50 border-b border-red-200 text-red-700'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='w-4 h-4' />
              <span>{error}</span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setError(null)}
                className='ml-auto text-red-600 hover:text-red-700'
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Formatting Toolbar */}
        <FormattingToolbar
          formatting={formatting}
          onFormatChange={applyFormatting}
          disabled={editorState.isAutoSaving}
        />

        <div className='flex-1 flex'>
          {/* Main Content Area */}
          <div className='flex-1 flex flex-col'>
            {/* Title Input */}
            <div className='p-4 border-b border-border-primary'>
              <input
                type='text'
                placeholder='Note title...'
                value={editorState.title}
                onChange={(e) => handleContentChange('title', e.target.value)}
                className='w-full text-xl font-semibold bg-transparent border-none outline-none text-text-primary placeholder-text-secondary'
              />
            </div>

            {/* Content Editor */}
            <div className='flex-1 p-4'>
              <textarea
                ref={contentRef}
                placeholder='Start writing your note...'
                value={editorState.content}
                onChange={(e) => handleContentChange('content', e.target.value)}
                style={contentStyles}
                maxLength={maxContentLength}
                className='w-full h-full resize-none bg-transparent border-none outline-none text-text-primary placeholder-text-secondary'
              />
            </div>

            {/* Character Count */}
            <div className='px-4 py-2 border-t border-border-primary bg-background-accent text-xs text-text-secondary text-right'>
              {editorState.content.length} / {maxContentLength} characters
            </div>
          </div>

          {/* Action Items Sidebar */}
          {showActionItems && (
            <div className='w-80 border-l border-border-primary bg-background-accent'>
              <div className='p-4 h-full overflow-y-auto'>
                <ActionItemsManager
                  actionItems={editorState.actionItems}
                  onActionItemsChange={(items) => handleContentChange('actionItems', items)}
                  disabled={editorState.isAutoSaving}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Export NoteTaker and related types
 */
export default NoteTaker;
export type { NoteTakerProps, EditorState, SearchFilters, FormattingOptions };
export { NoteTaker, FormattingToolbar, ActionItemsManager, NotesList };