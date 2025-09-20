/**
 * T021: WorkbookNote Model - Rich text content structure with comprehensive features
 *
 * This module provides comprehensive note-taking system types with:
 * - Rich text content structure with HTML/Markdown support
 * - Tagging and categorization system
 * - Linking to modules, lessons, and audio timestamps
 * - Search and export functionality
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const NoteFormat = {
  PLAIN_TEXT: 'plain_text',
  MARKDOWN: 'markdown',
  HTML: 'html',
  RICH_TEXT: 'rich_text', // JSON-based rich text format
} as const;

export type NoteFormatType = (typeof NoteFormat)[keyof typeof NoteFormat];

export const NoteStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export type NoteStatusType = (typeof NoteStatus)[keyof typeof NoteStatus];

export const NoteType = {
  GENERAL: 'general',
  LESSON_NOTES: 'lesson_notes',
  AUDIO_NOTES: 'audio_notes',
  MEETING_NOTES: 'meeting_notes',
  REFLECTION: 'reflection',
  TODO: 'todo',
  QUESTION: 'question',
  SUMMARY: 'summary',
  BOOKMARK: 'bookmark',
} as const;

export type NoteTypeType = (typeof NoteType)[keyof typeof NoteType];

export const VisibilityLevel = {
  PRIVATE: 'private',
  SHARED: 'shared',
  PUBLIC: 'public',
  TEAM: 'team',
} as const;

export type VisibilityLevelType =
  (typeof VisibilityLevel)[keyof typeof VisibilityLevel];

export const ExportFormat = {
  PDF: 'pdf',
  DOCX: 'docx',
  HTML: 'html',
  MARKDOWN: 'markdown',
  TEXT: 'text',
  JSON: 'json',
} as const;

export type ExportFormatType = (typeof ExportFormat)[keyof typeof ExportFormat];

// =============================================================================
// Rich Text Content Structure
// =============================================================================

export interface RichTextNode {
  type: string;
  attrs?: Record<string, any>;
  content?: RichTextNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
}

export interface RichTextDocument {
  type: 'doc';
  content: RichTextNode[];
  version?: number;
  schema?: string;
}

// Common rich text node types
export interface TextNode extends RichTextNode {
  type: 'text';
  text: string;
  marks?: Array<{
    type:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'strike'
      | 'code'
      | 'link'
      | 'highlight';
    attrs?: {
      href?: string; // for links
      color?: string; // for highlights
      [key: string]: any;
    };
  }>;
}

export interface ParagraphNode extends RichTextNode {
  type: 'paragraph';
  content: RichTextNode[];
  attrs?: {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    indent?: number;
  };
}

export interface HeadingNode extends RichTextNode {
  type: 'heading';
  content: RichTextNode[];
  attrs: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    id?: string; // for anchor links
  };
}

export interface ListNode extends RichTextNode {
  type: 'bulletList' | 'orderedList';
  content: ListItemNode[];
  attrs?: {
    tight?: boolean;
    start?: number; // for ordered lists
  };
}

export interface ListItemNode extends RichTextNode {
  type: 'listItem';
  content: RichTextNode[];
  attrs?: {
    checked?: boolean; // for task lists
  };
}

export interface CodeBlockNode extends RichTextNode {
  type: 'codeBlock';
  content: TextNode[];
  attrs?: {
    language?: string;
    lineNumbers?: boolean;
  };
}

export interface BlockquoteNode extends RichTextNode {
  type: 'blockquote';
  content: RichTextNode[];
  attrs?: {
    author?: string;
    source?: string;
  };
}

export interface TableNode extends RichTextNode {
  type: 'table';
  content: TableRowNode[];
  attrs?: {
    colwidths?: number[];
  };
}

export interface TableRowNode extends RichTextNode {
  type: 'tableRow';
  content: TableCellNode[];
}

export interface TableCellNode extends RichTextNode {
  type: 'tableCell' | 'tableHeader';
  content: RichTextNode[];
  attrs?: {
    colspan?: number;
    rowspan?: number;
    colwidth?: number;
    background?: string;
  };
}

export interface ImageNode extends RichTextNode {
  type: 'image';
  attrs: {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    caption?: string;
  };
}

export interface VideoNode extends RichTextNode {
  type: 'video';
  attrs: {
    src: string;
    title?: string;
    width?: number;
    height?: number;
    poster?: string;
    autoplay?: boolean;
    controls?: boolean;
  };
}

export interface AudioNode extends RichTextNode {
  type: 'audio';
  attrs: {
    src: string;
    title?: string;
    transcript?: string;
    timestamp?: number; // specific timestamp to link to
    duration?: number;
    autoplay?: boolean;
    controls?: boolean;
  };
}

export interface EmbedNode extends RichTextNode {
  type: 'embed';
  attrs: {
    type: 'youtube' | 'vimeo' | 'iframe' | 'tweet' | 'codepen';
    url: string;
    embedCode?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
  };
}

export interface LinkNode extends RichTextNode {
  type: 'link';
  attrs: {
    href: string;
    title?: string;
    target?: '_blank' | '_self';
    rel?: string;
  };
  content: RichTextNode[];
}

// Special note-specific nodes
export interface AudioTimestampNode extends RichTextNode {
  type: 'audioTimestamp';
  attrs: {
    audioRecordingId: UUID;
    timestamp: number; // seconds
    duration?: number; // seconds
    title?: string;
    description?: string;
    waveformData?: number[];
  };
}

export interface ModuleLinkNode extends RichTextNode {
  type: 'moduleLink';
  attrs: {
    moduleId: UUID;
    lessonId?: UUID;
    title?: string;
    description?: string;
    progress?: number; // 0-100
  };
}

export interface NoteReferenceNode extends RichTextNode {
  type: 'noteReference';
  attrs: {
    noteId: UUID;
    title?: string;
    preview?: string;
  };
}

export interface TagNode extends RichTextNode {
  type: 'tag';
  attrs: {
    tag: string;
    color?: string;
  };
}

export interface MentionNode extends RichTextNode {
  type: 'mention';
  attrs: {
    userId: UUID;
    displayName: string;
    notifyUser?: boolean;
  };
}

// =============================================================================
// Tagging and Categorization System
// =============================================================================

export interface NoteTag {
  id: UUID;
  name: string;
  color?: string;
  description?: string;
  userId: UUID;

  // Usage statistics
  usageCount: number;
  lastUsed?: Timestamp;

  // Hierarchy
  parentTagId?: UUID;
  children?: NoteTag[];

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NoteCategory {
  id: UUID;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: UUID;

  // Hierarchy
  parentCategoryId?: UUID;
  children?: NoteCategory[];
  path: string; // e.g., "Work/Projects/Web Development"

  // Settings
  settings: {
    defaultNoteType: NoteTypeType;
    autoTagging: boolean;
    templates: string[]; // template IDs
  };

  // Usage statistics
  noteCount: number;
  lastUsed?: Timestamp;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NoteTemplate {
  id: UUID;
  name: string;
  description?: string;
  categoryId?: UUID;
  userId: UUID;

  // Template content
  content: RichTextDocument;
  format: NoteFormatType;

  // Template metadata
  type: NoteTypeType;
  tags: string[];
  defaultTitle?: string;

  // Usage statistics
  usageCount: number;
  lastUsed?: Timestamp;

  // Sharing
  isPublic: boolean;
  shareableLink?: string;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// Linking and References
// =============================================================================

export interface NoteLink {
  id: UUID;
  sourceNoteId: UUID;
  targetType:
    | 'note'
    | 'module'
    | 'lesson'
    | 'audio'
    | 'transcription'
    | 'user'
    | 'external';
  targetId: UUID | string;

  // Link details
  linkType:
    | 'reference'
    | 'citation'
    | 'related'
    | 'parent'
    | 'child'
    | 'duplicate';
  context?: string; // where in the note this link appears
  description?: string;

  // Position in source note
  position?: {
    nodeId?: string;
    offset?: number;
    length?: number;
  };

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BacklinkSummary {
  noteId: UUID;
  incomingLinks: Array<{
    sourceNoteId: UUID;
    sourceTitle: string;
    linkType: string;
    context: string;
    createdAt: Timestamp;
  }>;
  outgoingLinks: Array<{
    targetType: string;
    targetId: string;
    targetTitle?: string;
    linkType: string;
    createdAt: Timestamp;
  }>;
  linkCount: {
    incoming: number;
    outgoing: number;
    total: number;
  };
}

// =============================================================================
// Search and Discovery
// =============================================================================

export interface NoteSearchQuery {
  // Basic search
  query?: string;
  searchIn: ('title' | 'content' | 'tags' | 'metadata')[];

  // Filters
  filters?: {
    userId?: UUID;
    categoryId?: UUID;
    tags?: string[];
    type?: NoteTypeType;
    status?: NoteStatusType;
    format?: NoteFormatType;
    visibility?: VisibilityLevelType;
    dateRange?: {
      field: 'createdAt' | 'updatedAt' | 'lastViewedAt';
      start: string; // YYYY-MM-DD
      end: string; // YYYY-MM-DD
    };
    hasLinks?: boolean;
    hasAudio?: boolean;
    hasImages?: boolean;
    minWordCount?: number;
    maxWordCount?: number;
  };

  // Sorting and pagination
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;

  // Advanced options
  options?: {
    fuzzy?: boolean;
    caseSensitive?: boolean;
    wholeWords?: boolean;
    includeArchived?: boolean;
    includeContent?: boolean;
    highlightMatches?: boolean;
  };
}

export interface NoteSearchResult {
  noteId: UUID;
  relevanceScore: number; // 0-1

  // Note summary
  title: string;
  type: NoteTypeType;
  status: NoteStatusType;
  excerpt: string;
  wordCount: number;

  // Match information
  matches: Array<{
    field: 'title' | 'content' | 'tags';
    text: string;
    highlightedText: string;
    position?: number;
  }>;

  // Context
  userId: UUID;
  categoryId?: UUID;
  tags: string[];

  // Links and references
  linkedItems: Array<{
    type: 'module' | 'lesson' | 'audio';
    id: UUID;
    title: string;
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastViewedAt?: Timestamp;
}

// =============================================================================
// Collaboration and Sharing
// =============================================================================

export interface NoteCollaborator {
  userId: UUID;
  displayName: string;
  email: string;
  permission: 'view' | 'comment' | 'edit' | 'admin';
  addedBy: UUID;
  addedAt: Timestamp;
  lastAccessAt?: Timestamp;
}

export interface NoteComment {
  id: UUID;
  noteId: UUID;
  userId: UUID;
  parentCommentId?: UUID; // for threaded comments

  // Comment content
  content: string;
  format: 'text' | 'markdown';

  // Position in note (for inline comments)
  position?: {
    nodeId?: string;
    selection?: {
      from: number;
      to: number;
    };
  };

  // Thread and resolution
  thread: NoteComment[];
  isResolved: boolean;
  resolvedBy?: UUID;
  resolvedAt?: Timestamp;

  // Reactions
  reactions: Array<{
    userId: UUID;
    type: 'like' | 'agree' | 'disagree' | 'laugh' | 'confused';
    createdAt: Timestamp;
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

export interface NoteSharingSettings {
  visibility: VisibilityLevelType;
  allowComments: boolean;
  allowCopying: boolean;
  allowDownload: boolean;
  requireAuth: boolean;
  expiresAt?: Timestamp;
  password?: string;
  allowedDomains?: string[];
}

export interface NoteShare {
  id: UUID;
  noteId: UUID;
  userId: UUID;
  shareType: 'link' | 'email' | 'embed';

  // Share settings
  settings: NoteSharingSettings;

  // Share details
  shareUrl: string;
  shareCode?: string;
  embedCode?: string;

  // Usage tracking
  viewCount: number;
  lastViewedAt?: Timestamp;
  viewerDetails?: Array<{
    viewerIp?: string;
    viewerAgent?: string;
    viewedAt: Timestamp;
    duration?: number; // seconds
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}

// =============================================================================
// Export and Backup
// =============================================================================

export interface NoteExportOptions {
  noteIds?: UUID[]; // specific notes, or all if not provided
  format: ExportFormatType;
  includeAttachments: boolean;
  includeComments: boolean;
  includeMetadata: boolean;
  includeBacklinks: boolean;

  // Formatting options
  formatting?: {
    pageSize?: 'A4' | 'letter' | 'legal';
    margins?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    fontSize?: number;
    fontFamily?: string;
    includeTableOfContents?: boolean;
    includeIndex?: boolean;
  };

  // Filters
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    categories?: UUID[];
    tags?: string[];
    status?: NoteStatusType[];
  };
}

export interface NoteExportResult {
  id: UUID;
  userId: UUID;
  options: NoteExportOptions;

  // Export details
  status: 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalNotes: number;
  processedNotes: number;

  // Results
  downloadUrl?: string;
  fileSize?: number;
  fileName?: string;
  expiresAt?: Timestamp;

  // Error handling
  errors?: Array<{
    noteId: UUID;
    error: string;
  }>;

  // Timestamps
  requestedAt: Timestamp;
  completedAt?: Timestamp;
}

// =============================================================================
// Main WorkbookNote Interface
// =============================================================================

export interface WorkbookNote {
  id: UUID;
  userId: UUID;

  // Context and organization
  categoryId?: UUID;
  moduleId?: UUID;
  lessonId?: UUID;
  sessionId?: UUID;
  audioRecordingId?: UUID;

  // Basic information
  title: string;
  type: NoteTypeType;
  status: NoteStatusType;
  format: NoteFormatType;
  visibility: VisibilityLevelType;

  // Content
  content: RichTextDocument | string; // RichTextDocument for rich_text, string for others
  plainTextContent: string; // searchable plain text version
  wordCount: number;
  characterCount: number;

  // Tagging and categorization
  tags: string[];
  customFields: Record<string, any>;

  // Linking and references
  links: NoteLink[];
  backlinks: NoteLink[];

  // Collaboration
  collaborators: NoteCollaborator[];
  comments: NoteComment[];
  sharing?: NoteShare;

  // Version control
  version: number;
  parentNoteId?: UUID;
  revisionHistory: Array<{
    version: number;
    changedBy: UUID;
    changes: string;
    timestamp: Timestamp;
    contentSnapshot?: string;
  }>;

  // Analytics and usage
  analytics: {
    viewCount: number;
    editCount: number;
    shareCount: number;
    commentCount: number;
    lastViewedAt?: Timestamp;
    lastEditedAt?: Timestamp;
    totalTimeSpent: number; // minutes
    averageReadingTime: number; // minutes
  };

  // AI-generated insights
  aiInsights?: {
    summary?: string;
    keyPoints?: string[];
    suggestedTags?: string[];
    relatedNotes?: UUID[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics?: Array<{
      topic: string;
      confidence: number;
    }>;
    language?: string;
    readabilityScore?: number;
  };

  // Attachments and media
  attachments: Array<{
    id: UUID;
    type: 'image' | 'video' | 'audio' | 'document' | 'link';
    url: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    metadata: Record<string, any>;
    uploadedAt: Timestamp;
  }>;

  // Reminders and tasks
  reminders: Array<{
    id: UUID;
    type: 'review' | 'follow_up' | 'deadline' | 'custom';
    reminderAt: Timestamp;
    message: string;
    isCompleted: boolean;
    completedAt?: Timestamp;
  }>;

  // Security and access
  encryption?: {
    isEncrypted: boolean;
    algorithm?: string;
    keyId?: string;
  };

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastViewedAt?: Timestamp;
  deletedAt?: Timestamp;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const NoteFormatSchema = z.enum([
  'plain_text',
  'markdown',
  'html',
  'rich_text',
]);
export const NoteStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
  'deleted',
]);
export const NoteTypeSchema = z.enum([
  'general',
  'lesson_notes',
  'audio_notes',
  'meeting_notes',
  'reflection',
  'todo',
  'question',
  'summary',
  'bookmark',
]);
export const VisibilityLevelSchema = z.enum([
  'private',
  'shared',
  'public',
  'team',
]);
export const ExportFormatSchema = z.enum([
  'pdf',
  'docx',
  'html',
  'markdown',
  'text',
  'json',
]);

// Rich text schemas
export const RichTextMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.any()).optional(),
});

export const RichTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.any()).optional(),
    content: z.array(RichTextNodeSchema).optional(),
    text: z.string().optional(),
    marks: z.array(RichTextMarkSchema).optional(),
  })
);

export const RichTextDocumentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(RichTextNodeSchema),
  version: z.number().optional(),
  schema: z.string().optional(),
});

// Tag and category schemas
export const NoteTagSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(50),
  color: z.string().optional(),
  description: z.string().max(200).optional(),
  userId: UUIDSchema,
  usageCount: z.number().min(0),
  lastUsed: TimestampSchema.optional(),
  parentTagId: UUIDSchema.optional(),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const NoteCategorySchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  userId: UUIDSchema,
  parentCategoryId: UUIDSchema.optional(),
  path: z.string(),
  settings: z.object({
    defaultNoteType: NoteTypeSchema,
    autoTagging: z.boolean(),
    templates: z.array(z.string()),
  }),
  noteCount: z.number().min(0),
  lastUsed: TimestampSchema.optional(),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Link schema
export const NoteLinkSchema = z.object({
  id: UUIDSchema,
  sourceNoteId: UUIDSchema,
  targetType: z.enum([
    'note',
    'module',
    'lesson',
    'audio',
    'transcription',
    'user',
    'external',
  ]),
  targetId: z.string(),
  linkType: z.enum([
    'reference',
    'citation',
    'related',
    'parent',
    'child',
    'duplicate',
  ]),
  context: z.string().optional(),
  description: z.string().optional(),
  position: z
    .object({
      nodeId: z.string().optional(),
      offset: z.number().optional(),
      length: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Collaboration schemas
export const NoteCollaboratorSchema = z.object({
  userId: UUIDSchema,
  displayName: z.string(),
  email: z.string().email(),
  permission: z.enum(['view', 'comment', 'edit', 'admin']),
  addedBy: UUIDSchema,
  addedAt: TimestampSchema,
  lastAccessAt: TimestampSchema.optional(),
});

export const NoteCommentSchema = z.object({
  id: UUIDSchema,
  noteId: UUIDSchema,
  userId: UUIDSchema,
  parentCommentId: UUIDSchema.optional(),
  content: z.string().min(1),
  format: z.enum(['text', 'markdown']),
  position: z
    .object({
      nodeId: z.string().optional(),
      selection: z
        .object({
          from: z.number(),
          to: z.number(),
        })
        .optional(),
    })
    .optional(),
  isResolved: z.boolean(),
  resolvedBy: UUIDSchema.optional(),
  resolvedAt: TimestampSchema.optional(),
  reactions: z.array(
    z.object({
      userId: UUIDSchema,
      type: z.enum(['like', 'agree', 'disagree', 'laugh', 'confused']),
      createdAt: TimestampSchema,
    })
  ),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  deletedAt: TimestampSchema.optional(),
});

// Search schema
export const NoteSearchQuerySchema = z.object({
  query: z.string().optional(),
  searchIn: z.array(z.enum(['title', 'content', 'tags', 'metadata'])),
  filters: z
    .object({
      userId: UUIDSchema.optional(),
      categoryId: UUIDSchema.optional(),
      tags: z.array(z.string()).optional(),
      type: NoteTypeSchema.optional(),
      status: NoteStatusSchema.optional(),
      format: NoteFormatSchema.optional(),
      visibility: VisibilityLevelSchema.optional(),
      dateRange: z
        .object({
          field: z.enum(['createdAt', 'updatedAt', 'lastViewedAt']),
          start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .optional(),
      hasLinks: z.boolean().optional(),
      hasAudio: z.boolean().optional(),
      hasImages: z.boolean().optional(),
      minWordCount: z.number().min(0).optional(),
      maxWordCount: z.number().min(0).optional(),
    })
    .optional(),
  sortBy: z
    .enum(['relevance', 'createdAt', 'updatedAt', 'title', 'wordCount'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  options: z
    .object({
      fuzzy: z.boolean().optional(),
      caseSensitive: z.boolean().optional(),
      wholeWords: z.boolean().optional(),
      includeArchived: z.boolean().optional(),
      includeContent: z.boolean().optional(),
      highlightMatches: z.boolean().optional(),
    })
    .optional(),
});

// Export schema
export const NoteExportOptionsSchema = z.object({
  noteIds: z.array(UUIDSchema).optional(),
  format: ExportFormatSchema,
  includeAttachments: z.boolean(),
  includeComments: z.boolean(),
  includeMetadata: z.boolean(),
  includeBacklinks: z.boolean(),
  formatting: z
    .object({
      pageSize: z.enum(['A4', 'letter', 'legal']).optional(),
      margins: z
        .object({
          top: z.number(),
          right: z.number(),
          bottom: z.number(),
          left: z.number(),
        })
        .optional(),
      fontSize: z.number().min(8).max(24).optional(),
      fontFamily: z.string().optional(),
      includeTableOfContents: z.boolean().optional(),
      includeIndex: z.boolean().optional(),
    })
    .optional(),
  filters: z
    .object({
      dateRange: z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .optional(),
      categories: z.array(UUIDSchema).optional(),
      tags: z.array(z.string()).optional(),
      status: z.array(NoteStatusSchema).optional(),
    })
    .optional(),
});

// Main workbook note schema
export const WorkbookNoteSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  categoryId: UUIDSchema.optional(),
  moduleId: UUIDSchema.optional(),
  lessonId: UUIDSchema.optional(),
  sessionId: UUIDSchema.optional(),
  audioRecordingId: UUIDSchema.optional(),
  title: z.string().min(1).max(200),
  type: NoteTypeSchema,
  status: NoteStatusSchema,
  format: NoteFormatSchema,
  visibility: VisibilityLevelSchema,
  content: z.union([RichTextDocumentSchema, z.string()]),
  plainTextContent: z.string(),
  wordCount: z.number().min(0),
  characterCount: z.number().min(0),
  tags: z.array(z.string()),
  customFields: z.record(z.any()),
  links: z.array(NoteLinkSchema),
  collaborators: z.array(NoteCollaboratorSchema),
  version: z.number().min(1),
  parentNoteId: UUIDSchema.optional(),
  revisionHistory: z.array(
    z.object({
      version: z.number(),
      changedBy: UUIDSchema,
      changes: z.string(),
      timestamp: TimestampSchema,
      contentSnapshot: z.string().optional(),
    })
  ),
  analytics: z.object({
    viewCount: z.number().min(0),
    editCount: z.number().min(0),
    shareCount: z.number().min(0),
    commentCount: z.number().min(0),
    lastViewedAt: TimestampSchema.optional(),
    lastEditedAt: TimestampSchema.optional(),
    totalTimeSpent: z.number().min(0),
    averageReadingTime: z.number().min(0),
  }),
  aiInsights: z
    .object({
      summary: z.string().optional(),
      keyPoints: z.array(z.string()).optional(),
      suggestedTags: z.array(z.string()).optional(),
      relatedNotes: z.array(UUIDSchema).optional(),
      sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
      topics: z
        .array(
          z.object({
            topic: z.string(),
            confidence: z.number().min(0).max(1),
          })
        )
        .optional(),
      language: z.string().optional(),
      readabilityScore: z.number().min(0).max(100).optional(),
    })
    .optional(),
  attachments: z.array(
    z.object({
      id: UUIDSchema,
      type: z.enum(['image', 'video', 'audio', 'document', 'link']),
      url: z.string().url(),
      filename: z.string(),
      fileSize: z.number().min(0),
      mimeType: z.string(),
      metadata: z.record(z.any()),
      uploadedAt: TimestampSchema,
    })
  ),
  reminders: z.array(
    z.object({
      id: UUIDSchema,
      type: z.enum(['review', 'follow_up', 'deadline', 'custom']),
      reminderAt: TimestampSchema,
      message: z.string(),
      isCompleted: z.boolean(),
      completedAt: TimestampSchema.optional(),
    })
  ),
  encryption: z
    .object({
      isEncrypted: z.boolean(),
      algorithm: z.string().optional(),
      keyId: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastViewedAt: TimestampSchema.optional(),
  deletedAt: TimestampSchema.optional(),
});

// Input schemas for API operations
export const CreateNoteInputSchema = WorkbookNoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  analytics: true,
  plainTextContent: true,
  wordCount: true,
  characterCount: true,
});

export const UpdateNoteInputSchema = CreateNoteInputSchema.partial();

export const CreateCategoryInputSchema = NoteCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  noteCount: true,
  lastUsed: true,
});

export const UpdateCategoryInputSchema = CreateCategoryInputSchema.partial();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract plain text from rich text document
 */
export function extractPlainText(content: RichTextDocument | string): string {
  if (typeof content === 'string') {
    return content;
  }

  function extractFromNode(node: RichTextNode): string {
    if (node.text) {
      return node.text;
    }

    if (node.content) {
      return node.content.map(extractFromNode).join('');
    }

    return '';
  }

  return content.content.map(extractFromNode).join('\n').trim();
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}

/**
 * Count characters in text
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Generate note excerpt
 */
export function generateExcerpt(
  content: string,
  maxLength: number = 200
): string {
  const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
  if (plainText.length <= maxLength) {
    return plainText;
  }

  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (
    (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
  );
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
  const hashtags = text.match(hashtagRegex) || [];
  return [...new Set(hashtags.map(tag => tag.slice(1).toLowerCase()))];
}

/**
 * Extract mentions from rich text
 */
export function extractMentions(
  content: RichTextDocument
): Array<{ userId: UUID; displayName: string }> {
  const mentions: Array<{ userId: UUID; displayName: string }> = [];

  function extractFromNode(node: RichTextNode): void {
    if (node.type === 'mention' && node.attrs) {
      mentions.push({
        userId: node.attrs.userId,
        displayName: node.attrs.displayName,
      });
    }

    if (node.content) {
      node.content.forEach(extractFromNode);
    }
  }

  content.content.forEach(extractFromNode);
  return mentions;
}

/**
 * Convert markdown to rich text document
 */
export function markdownToRichText(markdown: string): RichTextDocument {
  // This is a simplified implementation
  // In production, use a proper markdown parser like markdown-it
  const lines = markdown.split('\n');
  const content: RichTextNode[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.slice(2) }],
      });
    } else if (line.startsWith('## ')) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.slice(3) }],
      });
    } else if (line.trim() === '') {
      // Empty line - skip or add as paragraph break
    } else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      });
    }
  }

  return {
    type: 'doc',
    content,
  };
}

/**
 * Convert rich text to markdown
 */
export function richTextToMarkdown(content: RichTextDocument): string {
  function nodeToMarkdown(node: RichTextNode): string {
    switch (node.type) {
      case 'text':
        let text = node.text || '';
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case 'bold':
                text = `**${text}**`;
                break;
              case 'italic':
                text = `*${text}*`;
                break;
              case 'code':
                text = `\`${text}\``;
                break;
              case 'link':
                text = `[${text}](${mark.attrs?.href || ''})`;
                break;
            }
          }
        }
        return text;

      case 'heading':
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        const headingText = node.content?.map(nodeToMarkdown).join('') || '';
        return `${prefix} ${headingText}\n\n`;

      case 'paragraph':
        const paragraphText = node.content?.map(nodeToMarkdown).join('') || '';
        return `${paragraphText}\n\n`;

      case 'bulletList':
        return (
          node.content
            ?.map(
              item => `- ${item.content?.map(nodeToMarkdown).join('') || ''}\n`
            )
            .join('') + '\n'
        );

      case 'orderedList':
        return (
          node.content
            ?.map(
              (item, index) =>
                `${index + 1}. ${item.content?.map(nodeToMarkdown).join('') || ''}\n`
            )
            .join('') + '\n'
        );

      case 'codeBlock':
        const code = node.content?.map(nodeToMarkdown).join('') || '';
        const language = node.attrs?.language || '';
        return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

      case 'blockquote':
        const quoteText = node.content?.map(nodeToMarkdown).join('') || '';
        return `> ${quoteText}\n\n`;

      default:
        return node.content?.map(nodeToMarkdown).join('') || '';
    }
  }

  return content.content.map(nodeToMarkdown).join('').trim();
}

/**
 * Search notes with full-text search
 */
export function searchNotes(
  notes: WorkbookNote[],
  query: NoteSearchQuery
): NoteSearchResult[] {
  const results: NoteSearchResult[] = [];
  const searchTerms = query.query?.toLowerCase().split(/\s+/) || [];

  for (const note of notes) {
    // Apply filters
    if (query.filters) {
      if (query.filters.userId && note.userId !== query.filters.userId)
        continue;
      if (
        query.filters.categoryId &&
        note.categoryId !== query.filters.categoryId
      )
        continue;
      if (query.filters.type && note.type !== query.filters.type) continue;
      if (query.filters.status && note.status !== query.filters.status)
        continue;
      if (
        query.filters.visibility &&
        note.visibility !== query.filters.visibility
      )
        continue;
      if (
        query.filters.tags &&
        !query.filters.tags.some(tag => note.tags.includes(tag))
      )
        continue;
    }

    // Calculate relevance score
    let relevanceScore = 0;
    const matches: NoteSearchResult['matches'] = [];

    if (query.query) {
      // Search in title
      if (query.searchIn.includes('title')) {
        const titleMatches = searchTerms.filter(term =>
          note.title.toLowerCase().includes(term)
        ).length;
        relevanceScore += (titleMatches / searchTerms.length) * 0.4;

        if (titleMatches > 0) {
          matches.push({
            field: 'title',
            text: note.title,
            highlightedText: highlightText(note.title, searchTerms),
          });
        }
      }

      // Search in content
      if (query.searchIn.includes('content')) {
        const contentMatches = searchTerms.filter(term =>
          note.plainTextContent.toLowerCase().includes(term)
        ).length;
        relevanceScore += (contentMatches / searchTerms.length) * 0.5;

        if (contentMatches > 0) {
          matches.push({
            field: 'content',
            text: generateExcerpt(note.plainTextContent),
            highlightedText: highlightText(
              generateExcerpt(note.plainTextContent),
              searchTerms
            ),
          });
        }
      }

      // Search in tags
      if (query.searchIn.includes('tags')) {
        const tagMatches = searchTerms.filter(term =>
          note.tags.some(tag => tag.toLowerCase().includes(term))
        ).length;
        relevanceScore += (tagMatches / searchTerms.length) * 0.1;

        if (tagMatches > 0) {
          matches.push({
            field: 'tags',
            text: note.tags.join(', '),
            highlightedText: highlightText(note.tags.join(', '), searchTerms),
          });
        }
      }
    } else {
      // No search query - include all filtered notes
      relevanceScore = 1;
    }

    if (relevanceScore > 0) {
      results.push({
        noteId: note.id,
        relevanceScore,
        title: note.title,
        type: note.type,
        status: note.status,
        excerpt: generateExcerpt(note.plainTextContent),
        wordCount: note.wordCount,
        matches,
        userId: note.userId,
        categoryId: note.categoryId,
        tags: note.tags,
        linkedItems: note.links
          .filter(link =>
            ['module', 'lesson', 'audio'].includes(link.targetType)
          )
          .map(link => ({
            type: link.targetType as 'module' | 'lesson' | 'audio',
            id: link.targetId,
            title: link.description || 'Linked Item',
          })),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        lastViewedAt: note.lastViewedAt,
      });
    }
  }

  // Sort results
  const sortBy = query.sortBy || 'relevance';
  const sortOrder = query.sortOrder || 'desc';

  results.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'relevance':
        comparison = a.relevanceScore - b.relevanceScore;
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'wordCount':
        comparison = a.wordCount - b.wordCount;
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Apply pagination
  const page = query.page || 1;
  const limit = query.limit || 20;
  const start = (page - 1) * limit;
  const end = start + limit;

  return results.slice(start, end);
}

/**
 * Highlight search terms in text
 */
function highlightText(text: string, searchTerms: string[]): string {
  let highlightedText = text;

  for (const term of searchTerms) {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  }

  return highlightedText;
}

/**
 * Validate note data
 */
export function validateNote(data: unknown): {
  valid: boolean;
  errors?: string[];
  data?: WorkbookNote;
} {
  try {
    const validData = WorkbookNoteSchema.parse(data);
    return { valid: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        ),
      };
    }
    return { valid: false, errors: ['Invalid data format'] };
  }
}

/**
 * Generate note backlinks
 */
export function generateBacklinks(
  note: WorkbookNote,
  allNotes: WorkbookNote[]
): BacklinkSummary {
  const incomingLinks: BacklinkSummary['incomingLinks'] = [];
  const outgoingLinks: BacklinkSummary['outgoingLinks'] = [];

  // Find incoming links (other notes that link to this note)
  for (const otherNote of allNotes) {
    if (otherNote.id === note.id) continue;

    for (const link of otherNote.links) {
      if (link.targetType === 'note' && link.targetId === note.id) {
        incomingLinks.push({
          sourceNoteId: otherNote.id,
          sourceTitle: otherNote.title,
          linkType: link.linkType,
          context: link.context || '',
          createdAt: link.createdAt,
        });
      }
    }
  }

  // Get outgoing links from this note
  for (const link of note.links) {
    outgoingLinks.push({
      targetType: link.targetType,
      targetId: link.targetId,
      targetTitle: link.description,
      linkType: link.linkType,
      createdAt: link.createdAt,
    });
  }

  return {
    noteId: note.id,
    incomingLinks,
    outgoingLinks,
    linkCount: {
      incoming: incomingLinks.length,
      outgoing: outgoingLinks.length,
      total: incomingLinks.length + outgoingLinks.length,
    },
  };
}

// =============================================================================
// Type Guards
// =============================================================================

export function isWorkbookNote(obj: any): obj is WorkbookNote {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.type === 'string'
  );
}

export function isRichTextDocument(obj: any): obj is RichTextDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.type === 'doc' &&
    Array.isArray(obj.content)
  );
}

export function isNoteSearchResult(obj: any): obj is NoteSearchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.noteId === 'string' &&
    typeof obj.relevanceScore === 'number'
  );
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;
export type NoteSearchQueryInput = z.infer<typeof NoteSearchQuerySchema>;
export type NoteExportOptionsInput = z.infer<typeof NoteExportOptionsSchema>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  WorkbookNote: WorkbookNoteSchema,
  NoteTag: NoteTagSchema,
  NoteCategory: NoteCategorySchema,
  NoteLink: NoteLinkSchema,
  NoteComment: NoteCommentSchema,
  RichTextDocument: RichTextDocumentSchema,
  NoteSearchQuery: NoteSearchQuerySchema,
  NoteExportOptions: NoteExportOptionsSchema,
  CreateNoteInput: CreateNoteInputSchema,
  UpdateNoteInput: UpdateNoteInputSchema,
  CreateCategoryInput: CreateCategoryInputSchema,
  UpdateCategoryInput: UpdateCategoryInputSchema,
} as const;
