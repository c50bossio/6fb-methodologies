'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Typography } from '@tiptap/extension-typography';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Highlighter as HighlightIcon,
  Table as TableIcon,
  CheckSquare,
  Save,
  Search,
  Tag,
  Download,
  Share,
  Clock,
  Trash2,
  MoreHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  Filter,
  Star,
  StarOff,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Bookmark,
  BookmarkPlus,
  Copy,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { AudioTimestamp, formatTimestamp } from './extensions/AudioTimestamp';

interface Note {
  id: string;
  title: string;
  content: string;
  rich_content?: any;
  type: 'lesson-note' | 'reflection' | 'action-item' | 'manual';
  tags: string[];
  session_id?: string;
  transcription_id?: string;
  lesson_id?: string;
  module_id?: string;
  timestamp_in_session?: number;
  highlighted_text?: string;
  is_action_item: boolean;
  action_item_completed: boolean;
  action_item_due_date?: string;
  importance: number;
  is_private: boolean;
  is_public: boolean;
  parent_note_id?: string;
  child_notes_count: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface TiptapNoteTakerProps {
  userId?: string;
  sessionId?: string;
  lessonId?: string;
  moduleId?: string;
  currentTimestamp?: number;
  sessionInfo?: {
    sessionId?: string;
    day?: 1 | 2;
    session?: string;
    speaker?: string;
  };
  onNoteCreated?: (note: Note) => void;
  onNoteUpdated?: (note: Note) => void;
  onNoteDeleted?: (noteId: string) => void;
  className?: string;
}

const NOTE_TEMPLATES = {
  'lesson-note': {
    title: 'Lesson Notes',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Key Concepts' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Important Points' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Questions' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] },
      ],
    },
    type: 'lesson-note' as const,
  },
  'reflection': {
    title: 'Personal Reflection',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What I Learned' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'How I Can Apply This' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Next Steps' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] },
      ],
    },
    type: 'reflection' as const,
  },
  'action-item': {
    title: 'Action Items',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Required' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Due Date' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Resources Needed' }] },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] }] },
      ],
    },
    type: 'action-item' as const,
  },
  'manual': {
    title: 'New Note',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    type: 'manual' as const,
  },
};

export const TiptapNoteTaker: React.FC<TiptapNoteTakerProps> = ({
  userId,
  sessionId,
  lessonId,
  moduleId,
  currentTimestamp,
  sessionInfo,
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  className = '',
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNotesList, setShowNotesList] = useState(true);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteType, setNoteType] = useState<Note['type']>('manual');
  const [importance, setImportance] = useState(3);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isActionItem, setIsActionItem] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);

  // Initialize Tiptap editor
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your notes...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-tomb45-green underline hover:text-tomb45-green/80 cursor-pointer',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Color,
      TextStyle,
      Typography,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      AudioTimestamp,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Only set hasUnsavedChanges after component is initialized and editor is ready
      if (isInitializedRef.current && editor && !editor.isDestroyed) {
        setHasUnsavedChanges(true);

        // Auto-save after 3 seconds of inactivity
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          if (currentNote) {
            handleSaveNote();
          }
        }, 3000);
      }
    },
  });

  // Mark component as initialized immediately after mount (synchronous)
  useLayoutEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // Load notes on component mount
  useEffect(() => {
    if (userId) {
      loadNotes();
    }
  }, [userId, sessionId, lessonId, moduleId]);

  // Update editor content when current note changes
  useEffect(() => {
    if (editor && currentNote) {
      editor.commands.setContent(currentNote.rich_content || currentNote.content || '');
      setNoteTitle(currentNote.title);
      setNoteType(currentNote.type);
      setImportance(currentNote.importance);
      setIsPrivate(currentNote.is_private);
      setIsActionItem(currentNote.is_action_item);
      setDueDate(currentNote.action_item_due_date || '');
      setHasUnsavedChanges(false);
    }
  }, [editor, currentNote?.id]);

  // Listen for audio timestamp clicks
  useEffect(() => {
    const handleAudioTimestampClick = (event: CustomEvent) => {
      const { timestamp, sessionId: audioSessionId, recordingId } = event.detail;
      console.log('Audio timestamp clicked:', { timestamp, audioSessionId, recordingId });
      // Here you would integrate with your audio player
      // For example: seekToTimestamp(timestamp, audioSessionId);
    };

    window.addEventListener('audioTimestampClick', handleAudioTimestampClick as EventListener);
    return () => {
      window.removeEventListener('audioTimestampClick', handleAudioTimestampClick as EventListener);
    };
  }, []);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('sessionId', sessionId);
      if (lessonId) params.append('lessonId', lessonId);
      if (moduleId) params.append('moduleId', moduleId);

      const response = await fetch(`/api/workbook/notes?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to load notes');

      const data = await response.json();
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!editor || (!noteTitle.trim() && !editor.getText().trim())) return;

    setIsSaving(true);
    try {
      const method = currentNote ? 'PUT' : 'POST';
      const url = currentNote ? `/api/workbook/notes/${currentNote.id}` : '/api/workbook/notes';

      const noteData = {
        title: noteTitle.trim() || 'Untitled Note',
        content: editor.getText(),
        richContent: editor.getJSON(),
        type: noteType,
        tags: selectedTags,
        sessionId: sessionId || sessionInfo?.sessionId,
        lessonId,
        moduleId,
        timestampInSession: currentTimestamp,
        isActionItem,
        actionItemDueDate: dueDate || null,
        importance,
        isPrivate,
        metadata: {
          characterCount: editor.storage.characterCount?.characters() || 0,
          wordCount: editor.storage.characterCount?.words() || 0,
        },
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(noteData),
      });

      if (!response.ok) throw new Error('Failed to save note');

      const data = await response.json();
      if (data.success) {
        const savedNote = data.note;

        if (currentNote) {
          setNotes(prev => prev.map(n => n.id === currentNote.id ? savedNote : n));
          onNoteUpdated?.(savedNote);
        } else {
          setNotes(prev => [savedNote, ...prev]);
          onNoteCreated?.(savedNote);
        }

        setCurrentNote(savedNote);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const createNewNote = (template?: keyof typeof NOTE_TEMPLATES) => {
    const templateData = template ? NOTE_TEMPLATES[template] : NOTE_TEMPLATES.manual;

    setCurrentNote(null);
    setNoteTitle(templateData.title);
    setNoteType(templateData.type);
    setImportance(3);
    setIsPrivate(true);
    setIsActionItem(templateData.type === 'action-item');
    setDueDate('');
    setSelectedTags([]);
    setHasUnsavedChanges(false);

    if (editor) {
      editor.commands.setContent(templateData.content);
    }
  };

  const selectNote = async (note: Note) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workbook/notes/${note.id}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to load note details');

      const data = await response.json();
      if (data.success) {
        setCurrentNote(data.note);
      }
    } catch (error) {
      console.error('Error loading note details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/workbook/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete note');

      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (currentNote?.id === noteId) {
        setCurrentNote(null);
        if (editor) {
          editor.commands.clearContent();
        }
        setNoteTitle('');
        setSelectedTags([]);
      }
      onNoteDeleted?.(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const insertAudioTimestamp = () => {
    if (editor && currentTimestamp !== undefined) {
      editor.chain().focus().insertAudioTimestamp({
        timestamp: currentTimestamp,
        sessionId: sessionId || sessionInfo?.sessionId,
        label: formatTimestamp(currentTimestamp),
      }).run();
    }
  };

  const addTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
      setHasUnsavedChanges(true);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
    setHasUnsavedChanges(true);
  };

  const exportToMarkdown = () => {
    if (!editor) return;

    // Simple markdown conversion - in production you'd want a more robust solution
    const content = editor.getText();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => note.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-tomb45-green" />
        <span className="ml-2">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 h-full ${className}`}>
      {/* Notes List */}
      {showNotesList && (
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Notes</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="bg-tomb45-green hover:bg-tomb45-green/90"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNotesList(false)}
                    className="lg:hidden"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tag Filters */}
              {allTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter by tags:</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 5).map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Templates */}
              {showTemplates && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm font-medium">Choose a template:</label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(NOTE_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          createNewNote(key as keyof typeof NOTE_TEMPLATES);
                          setShowTemplates(false);
                        }}
                        className="text-xs justify-start"
                      >
                        {template.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading notes...
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {notes.length === 0 ? 'No notes yet' : 'No notes match your search'}
                  </div>
                ) : (
                  filteredNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                        currentNote?.id === note.id
                          ? 'bg-tomb45-green/10 border border-tomb45-green/20'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{note.title}</h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {note.content.substring(0, 100)}...
                          </p>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {note.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {note.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{note.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {note.is_action_item && (
                            <CheckSquare className={`w-4 h-4 ${
                              note.action_item_completed ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note.id);
                            }}
                            className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Editor */}
      <div className={`${showNotesList ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!showNotesList && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNotesList(true)}
                      className="lg:hidden"
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  )}
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  )}
                  {lastSaved && (
                    <span className="text-xs text-gray-500">
                      Saved {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-xs">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={isSaving || (!hasUnsavedChanges && !noteTitle.trim())}
                    className="bg-tomb45-green hover:bg-tomb45-green/90"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={exportToMarkdown}
                    title="Export to Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Note Title */}
              <Input
                value={noteTitle}
                onChange={e => {
                  setNoteTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Note title..."
                className="text-lg font-medium border-none shadow-none p-0 focus-visible:ring-0"
              />

              {/* Note Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="block text-gray-600 mb-1">Type</label>
                  <select
                    value={noteType}
                    onChange={e => {
                      setNoteType(e.target.value as Note['type']);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="manual">Manual</option>
                    <option value="lesson-note">Lesson Note</option>
                    <option value="reflection">Reflection</option>
                    <option value="action-item">Action Item</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Importance</label>
                  <select
                    value={importance}
                    onChange={e => {
                      setImportance(parseInt(e.target.value, 10));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Below Average</option>
                    <option value={3}>Average</option>
                    <option value={4}>High</option>
                    <option value={5}>Critical</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isActionItem}
                      onChange={e => {
                        setIsActionItem(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="rounded"
                    />
                    Action Item
                  </label>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={e => {
                        setIsPrivate(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="rounded"
                    />
                    Private
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  {selectedTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-200"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addTag()}
                      placeholder="Add tag..."
                      className="w-24 h-6 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addTag}
                      className="h-6 px-2 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 rounded-lg">
                {/* Text Formatting */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={editor.isActive('bold') ? 'bg-gray-200' : ''}
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={editor.isActive('italic') ? 'bg-gray-200' : ''}
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={editor.isActive('underline') ? 'bg-gray-200' : ''}
                >
                  <UnderlineIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={editor.isActive('strike') ? 'bg-gray-200' : ''}
                >
                  <Strikethrough className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Headings */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
                >
                  <Heading1 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
                >
                  <Heading2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
                >
                  <Heading3 className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Lists */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
                >
                  <ListOrdered className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                  className={editor.isActive('taskList') ? 'bg-gray-200' : ''}
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Other formatting */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
                >
                  <Quote className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={editor.isActive('code') ? 'bg-gray-200' : ''}
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHighlight().run()}
                  className={editor.isActive('highlight') ? 'bg-gray-200' : ''}
                >
                  <HighlightIcon className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Alignment */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
                >
                  <AlignRight className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Audio Timestamp */}
                {currentTimestamp !== undefined && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={insertAudioTimestamp}
                    title="Insert current audio timestamp"
                    className="text-tomb45-green hover:bg-tomb45-green/10"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                )}

                {/* Undo/Redo */}
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <EditorContent
                  editor={editor}
                  className="prose prose-sm max-w-none min-h-full focus:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-4"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  {editor.storage.characterCount && (
                    <span>
                      {editor.storage.characterCount.characters()} characters
                    </span>
                  )}
                  {editor.storage.characterCount && (
                    <span>
                      {editor.storage.characterCount.words()} words
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={noteType === 'action-item' ? 'default' : 'secondary'}>
                    {noteType.replace('-', ' ')}
                  </Badge>
                  {isActionItem && (
                    <Badge variant="outline">
                      Action Item
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TiptapNoteTaker;