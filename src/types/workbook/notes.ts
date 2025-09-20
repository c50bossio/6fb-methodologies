/**
 * Note-taking system type definitions
 * Complete types for rich text notes, organization, and collaboration
 */

import type { UUID, Timestamp, JSONObject } from './core';

// Core Note Types
export interface WorkbookNote {
  id: UUID;
  userId: UUID;
  moduleId?: UUID;
  lessonId?: UUID;
  audioId?: UUID; // if note is linked to audio recording
  title: string;
  content: string; // rich text content (HTML or markdown)
  format: NoteFormat;
  tags: string[];
  category?: string;
  isPrivate: boolean;
  isPinned: boolean;
  color?: string; // hex color for visual organization
  position?: NotePosition; // for canvas-style note positioning
  metadata: NoteMetadata;
  sharing: NoteSharingSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NoteFormat = 'markdown' | 'html' | 'plain_text' | 'rich_text';

export interface NotePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface NoteMetadata {
  wordCount: number;
  characterCount: number;
  readingTime: number; // estimated in minutes
  lastEditedBy: UUID;
  version: number;
  hasImages: boolean;
  hasLinks: boolean;
  hasAttachments: boolean;
  linkCount: number;
  attachments: NoteAttachment[];
}

export interface NoteAttachment {
  id: UUID;
  filename: string;
  url: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Timestamp;
}

export interface NoteSharingSettings {
  isShared: boolean;
  shareType: 'view' | 'edit' | 'comment';
  shareUrl?: string;
  expiresAt?: Timestamp;
  password?: string;
  allowDownload: boolean;
  allowCopy: boolean;
  collaborators: NoteCollaborator[];
}

export interface NoteCollaborator {
  userId: UUID;
  permission: 'view' | 'edit' | 'comment' | 'owner';
  addedAt: Timestamp;
  lastAccess?: Timestamp;
}

// Note Organization Types
export interface NoteCategory {
  id: UUID;
  name: string;
  color: string;
  description?: string;
  icon?: string;
  parentId?: UUID; // for hierarchical categories
  noteCount: number;
  createdAt: Timestamp;
}

export interface NoteTag {
  id: UUID;
  name: string;
  color?: string;
  description?: string;
  useCount: number;
  createdAt: Timestamp;
}

export interface NoteFolder {
  id: UUID;
  name: string;
  description?: string;
  parentId?: UUID;
  children: NoteFolder[];
  notes: WorkbookNote[];
  shareSettings?: NoteSharingSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Note Search and Filtering Types
export interface NoteSearchQuery {
  query?: string;
  tags?: string[];
  categories?: string[];
  moduleId?: UUID;
  lessonId?: UUID;
  dateRange?: {
    start: string;
    end: string;
  };
  format?: NoteFormat;
  isPrivate?: boolean;
  isPinned?: boolean;
  hasAttachments?: boolean;
  sortBy?: 'created' | 'updated' | 'title' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface NoteSearchResult {
  note: WorkbookNote;
  matches: SearchMatch[];
  relevanceScore: number;
}

export interface SearchMatch {
  type: 'title' | 'content' | 'tag' | 'category';
  text: string;
  startIndex: number;
  endIndex: number;
  context: string;
}

// Rich Text Editor Types
export interface EditorState {
  content: string;
  format: NoteFormat;
  selection?: TextSelection;
  isModified: boolean;
  lastSaved?: Timestamp;
  autoSaveEnabled: boolean;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export interface EditorFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export interface EditorAction {
  type: 'insert' | 'delete' | 'format' | 'undo' | 'redo';
  data: any;
  timestamp: Timestamp;
  userId?: UUID;
}

// Note Templates
export interface NoteTemplate {
  id: UUID;
  name: string;
  description?: string;
  content: string;
  format: NoteFormat;
  category: string;
  tags: string[];
  isPublic: boolean;
  useCount: number;
  rating: number; // 1-5 stars
  author: {
    id: UUID;
    name: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TemplateCategory {
  id: UUID;
  name: string;
  description?: string;
  templates: NoteTemplate[];
  order: number;
}

// Note Linking and References
export interface NoteLink {
  id: UUID;
  sourceNoteId: UUID;
  targetNoteId: UUID;
  linkType: 'reference' | 'followup' | 'related' | 'dependency';
  description?: string;
  createdAt: Timestamp;
}

export interface NoteMention {
  id: UUID;
  noteId: UUID;
  mentionedEntityId: UUID;
  entityType: 'user' | 'note' | 'module' | 'lesson';
  context: string;
  position: number;
  createdAt: Timestamp;
}

export interface NoteBookmark {
  id: UUID;
  noteId: UUID;
  userId: UUID;
  position: number; // character position in content
  label?: string;
  createdAt: Timestamp;
}

// Note History and Versioning
export interface NoteVersion {
  id: UUID;
  noteId: UUID;
  version: number;
  content: string;
  title: string;
  changeDescription?: string;
  createdBy: UUID;
  createdAt: Timestamp;
  contentDiff?: string; // JSON representation of changes
}

export interface NoteActivity {
  id: UUID;
  noteId: UUID;
  userId: UUID;
  action:
    | 'created'
    | 'updated'
    | 'shared'
    | 'commented'
    | 'tagged'
    | 'moved'
    | 'deleted';
  details: JSONObject;
  timestamp: Timestamp;
}

// Collaboration Types
export interface NoteComment {
  id: UUID;
  noteId: UUID;
  userId: UUID;
  content: string;
  position?: number; // character position for inline comments
  isResolved: boolean;
  parentId?: UUID; // for threaded comments
  mentions: UUID[]; // mentioned user IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CollaborationSession {
  id: UUID;
  noteId: UUID;
  participants: SessionParticipant[];
  startedAt: Timestamp;
  endedAt?: Timestamp;
  isActive: boolean;
  lastActivity: Timestamp;
}

export interface SessionParticipant {
  userId: UUID;
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  isOnline: boolean;
  permission: 'view' | 'edit' | 'comment';
  cursor?: {
    position: number;
    selection?: TextSelection;
  };
}

// Export Types
export interface NoteExportOptions {
  format: 'pdf' | 'html' | 'markdown' | 'docx' | 'txt';
  includeMetadata: boolean;
  includeComments: boolean;
  includeAttachments: boolean;
  includeImages: boolean;
  notes: UUID[];
  template?: string;
}

export interface NoteExportResult {
  id: UUID;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  url?: string;
  fileSize?: number;
  error?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

// Note Analytics
export interface NoteAnalytics {
  noteId: UUID;
  views: number;
  edits: number;
  comments: number;
  shares: number;
  collaborators: number;
  avgReadingTime: number; // in seconds
  popularSections: string[];
  engagement: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  lastAnalyzed: Timestamp;
}

// Component Props Types
export interface NoteEditorProps {
  note?: WorkbookNote;
  onSave: (note: Partial<WorkbookNote>) => Promise<void>;
  onCancel: () => void;
  autoSave?: boolean;
  autoSaveDelay?: number; // in milliseconds
  placeholder?: string;
  showWordCount?: boolean;
  showFormatting?: boolean;
  enableCollaboration?: boolean;
  className?: string;
}

export interface NoteListProps {
  notes: WorkbookNote[];
  onSelect: (note: WorkbookNote) => void;
  onDelete: (noteId: UUID) => void;
  onTag: (noteId: UUID, tags: string[]) => void;
  selectedNoteId?: UUID;
  groupBy?: 'none' | 'category' | 'date' | 'module';
  sortBy?: 'created' | 'updated' | 'title';
  showPreview?: boolean;
  className?: string;
}

export interface NoteSidebarProps {
  categories: NoteCategory[];
  tags: NoteTag[];
  selectedFilters: NoteSearchQuery;
  onFilterChange: (filters: NoteSearchQuery) => void;
  onCreateCategory: (
    category: Omit<NoteCategory, 'id' | 'createdAt' | 'noteCount'>
  ) => void;
  onCreateTag: (tag: Omit<NoteTag, 'id' | 'createdAt' | 'useCount'>) => void;
  className?: string;
}

// API Types
export type CreateNoteInput = Omit<
  WorkbookNote,
  'id' | 'createdAt' | 'updatedAt' | 'metadata'
>;
export type UpdateNoteInput = Partial<
  Omit<WorkbookNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

export type CreateCategoryInput = Omit<
  NoteCategory,
  'id' | 'createdAt' | 'noteCount'
>;
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type CreateCommentInput = Omit<
  NoteComment,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateCommentInput = Partial<
  Pick<NoteComment, 'content' | 'isResolved'>
>;

// Note Utilities
export interface NoteUtilities {
  extractText: (content: string, format: NoteFormat) => string;
  countWords: (content: string) => number;
  estimateReadingTime: (content: string) => number;
  generatePreview: (content: string, maxLength: number) => string;
  searchInContent: (content: string, query: string) => SearchMatch[];
  formatContent: (
    content: string,
    fromFormat: NoteFormat,
    toFormat: NoteFormat
  ) => string;
  generateTableOfContents: (content: string) => TableOfContentsItem[];
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  position: number;
  children: TableOfContentsItem[];
}
