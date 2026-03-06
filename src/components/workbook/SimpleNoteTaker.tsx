'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Download,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  sessionId?: string;
  sessionTitle?: string;
  created: string;
  updated: string;
}

interface SimpleNoteTakerProps {
  sessionId?: string;
  sessionTitle?: string;
  className?: string;
}

export const SimpleNoteTaker: React.FC<SimpleNoteTakerProps> = ({
  sessionId,
  sessionTitle = 'Workshop Session',
  className = '',
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const storageKey = `notes-${sessionId || 'default'}`;
    const savedNotes = localStorage.getItem(storageKey);
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error loading notes from localStorage:', error);
      }
    }
  }, [sessionId]);

  // Auto-save functionality
  useEffect(() => {
    if (isEditing && (noteTitle.trim() || noteContent.trim())) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSaveNote();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [noteTitle, noteContent, isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [noteContent]);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const saveNotesToStorage = (updatedNotes: Note[]) => {
    const storageKey = `notes-${sessionId || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const now = new Date().toISOString();
      const noteData: Note = {
        id: currentNote?.id || generateId(),
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        timestamp: Date.now(),
        sessionId,
        sessionTitle,
        created: currentNote?.created || now,
        updated: now,
      };

      let updatedNotes: Note[];
      if (currentNote) {
        // Update existing note
        updatedNotes = notes.map(note =>
          note.id === currentNote.id ? noteData : note
        );
      } else {
        // Add new note
        updatedNotes = [noteData, ...notes];
      }

      setNotes(updatedNotes);
      saveNotesToStorage(updatedNotes);
      setCurrentNote(noteData);
      setSaveStatus('saved');

      // Reset save status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving note:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const createNewNote = () => {
    setCurrentNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsEditing(true);
    setSaveStatus('idle');
  };

  const selectNote = (note: Note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditing(false);
    setSaveStatus('idle');
  };

  const deleteNote = (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    saveNotesToStorage(updatedNotes);

    if (currentNote?.id === noteId) {
      createNewNote();
    }
  };

  const exportToText = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;

    const exportContent = `# ${noteTitle || 'Untitled Note'}

Session: ${sessionTitle}
Created: ${new Date(currentNote?.created || Date.now()).toLocaleString()}

${noteContent}`;

    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(noteTitle || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleContentChange = (value: string) => {
    setNoteContent(value);
    setIsEditing(true);
  };

  const handleTitleChange = (value: string) => {
    setNoteTitle(value);
    setIsEditing(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 h-full ${className}`}>
      {/* Notes List */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Session Notes
              </span>
              <Button
                size="sm"
                onClick={createNewNote}
                className="bg-tomb45-green hover:bg-tomb45-green/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </CardTitle>
            <div className="text-sm text-gray-600">
              {sessionTitle}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                  <p className="text-xs">Click "New" to start</p>
                </div>
              ) : (
                notes.map(note => (
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
                        <h4 className="font-medium text-sm truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {note.content.substring(0, 100)}
                          {note.content.length > 100 && '...'}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                          {formatDate(note.updated)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
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
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <span className="font-medium">
                  {currentNote ? 'Edit Note' : 'New Note'}
                </span>
                {saveStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Saved
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Error saving
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={isSaving || (!noteTitle.trim() && !noteContent.trim())}
                  className="bg-tomb45-green hover:bg-tomb45-green/90"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={exportToText}
                  disabled={!noteTitle.trim() && !noteContent.trim()}
                  title="Export as text file"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col space-y-4">
            {/* Note Title */}
            <Input
              value={noteTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note title..."
              className="text-lg font-medium border-none shadow-none p-0 focus-visible:ring-0"
            />

            {/* Note Content */}
            <div className="flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={noteContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing your notes here...

Tips:
• Jot down key insights from this session
• Note important concepts and strategies
• Write action items or next steps
• Include questions for follow-up"
                className="flex-1 w-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-tomb45-green/20 focus:border-tomb45-green min-h-[300px]"
                style={{ fontFamily: 'inherit' }}
              />
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <div className="flex items-center gap-4">
                <span>
                  {noteContent.length} characters
                </span>
                <span>
                  {noteContent.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>Auto-saves every 2 seconds</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleNoteTaker;