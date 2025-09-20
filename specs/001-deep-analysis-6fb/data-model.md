# Data Model: 6FB Workbook System

## Overview
This document defines the complete data model for the 6FB Workbook system, including entities, relationships, validation rules, and state transitions.

## Core Entities

### 1. WorkbookUser
**Purpose**: Represents a user in the workbook system with authentication and subscription details.

```typescript
interface WorkbookUser {
  id: string                    // UUID primary key
  email: string                 // Unique, validated email
  firstName: string             // User's first name
  lastName: string              // User's last name
  subscriptionTier: SubscriptionTier
  workshopAccessGranted: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

enum SubscriptionTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip'
}
```

**Validation Rules**:
- Email must be unique and valid format
- Names must be 1-50 characters
- Subscription tier must be valid enum value

**Database Schema**:
```sql
CREATE TABLE workbook_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'basic',
  workshop_access_granted BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON workbook_users(email);
CREATE INDEX idx_users_subscription ON workbook_users(subscription_tier);
```

### 2. WorkshopModule
**Purpose**: Represents a workshop module containing lessons and content.

```typescript
interface WorkshopModule {
  id: string                    // UUID primary key
  title: string                 // Module title
  description: string           // Module description
  moduleOrder: number           // Display order (1-6)
  durationMinutes: number       // Estimated completion time
  content: ModuleContent        // JSONB content structure
  prerequisites: string[]       // Array of module IDs
  isPublished: boolean          // Visibility flag
  createdAt: Date
  updatedAt: Date
}

interface ModuleContent {
  overview: string              // Module overview
  learningObjectives: string[]  // Learning goals
  lessons: WorkshopLesson[]     // Embedded lessons
  resources: Resource[]         // Additional resources
  assessments?: Assessment[]    // Optional assessments
}

interface WorkshopLesson {
  id: string                    // Unique lesson ID
  title: string                 // Lesson title
  content: LessonContent        // Lesson content
  type: LessonType              // Content type
  estimatedMinutes: number      // Time estimate
  sortOrder: number             // Order within module
}

enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  INTERACTIVE = 'interactive',
  EXERCISE = 'exercise',
  DISCUSSION = 'discussion'
}

interface LessonContent {
  text?: string                 // Rich text content
  videoUrl?: string             // Video URL
  interactive?: InteractiveContent
  exercises?: Exercise[]
}
```

**Validation Rules**:
- Title must be 5-100 characters
- Module order must be unique (1-6)
- Duration must be positive integer
- Prerequisites must reference valid module IDs

**Database Schema**:
```sql
CREATE TABLE workshop_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  module_order INTEGER UNIQUE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  content JSONB NOT NULL,
  prerequisites JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || description)
  ) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_order ON workshop_modules(module_order);
CREATE INDEX idx_modules_published ON workshop_modules(is_published);
CREATE INDEX idx_modules_search ON workshop_modules USING GIN(search_vector);
```

### 3. UserProgress
**Purpose**: Tracks user progress through workshop modules and lessons.

```typescript
interface UserProgress {
  id: string                    // UUID primary key
  userId: string                // Foreign key to workbook_users
  moduleId: string              // Foreign key to workshop_modules
  lessonId?: string             // Specific lesson (optional)
  progressPercent: number       // 0-100 completion percentage
  status: ProgressStatus        // Current status
  timeSpentMinutes: number      // Total time spent
  lastAccessedAt: Date          // Last activity timestamp
  completedAt?: Date            // Completion timestamp
  createdAt: Date
  updatedAt: Date
}

enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  LOCKED = 'locked'
}
```

**State Transitions**:
```
NOT_STARTED → IN_PROGRESS (user starts module)
IN_PROGRESS → COMPLETED (progress reaches 100%)
COMPLETED → IN_PROGRESS (user revisits content)
LOCKED → NOT_STARTED (prerequisites met)
```

**Validation Rules**:
- Progress percent must be 0-100
- Time spent must be non-negative
- Completed date only set when status is COMPLETED

**Database Schema**:
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES workshop_modules(id) ON DELETE CASCADE,
  lesson_id VARCHAR(50),
  progress_percent INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'not_started',
  time_spent_minutes INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, module_id, lesson_id)
);

CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_progress_module ON user_progress(module_id);
CREATE INDEX idx_progress_status ON user_progress(status);
```

### 4. AudioRecording
**Purpose**: Stores audio recordings made by users during workshop sessions.

```typescript
interface AudioRecording {
  id: string                    // UUID primary key
  userId: string                // Foreign key to workbook_users
  moduleId?: string             // Optional module association
  lessonId?: string             // Optional lesson association
  fileName: string              // Original filename
  fileUrl: string               // Storage URL (S3/CDN)
  mimeType: string              // Audio format
  durationSeconds: number       // Audio duration
  fileSizeBytes: number         // File size
  metadata: AudioMetadata       // Additional metadata
  transcriptionId?: string      // Link to transcription
  isProcessed: boolean          // Processing status
  createdAt: Date
  updatedAt: Date
}

interface AudioMetadata {
  sampleRate?: number           // Audio sample rate
  channels?: number             // Audio channels
  bitrate?: number              // Audio bitrate
  recordingDevice?: string      // Device info
  recordingQuality?: 'low' | 'medium' | 'high'
  tags?: string[]               // User tags
}
```

**Validation Rules**:
- File URL must be valid and accessible
- Duration must be positive
- File size must be within limits (max 100MB)
- MIME type must be supported audio format

**Database Schema**:
```sql
CREATE TABLE audio_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES workshop_modules(id),
  lesson_id VARCHAR(50),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}',
  transcription_id UUID REFERENCES transcription_records(id),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recordings_user ON audio_recordings(user_id);
CREATE INDEX idx_recordings_module ON audio_recordings(module_id);
CREATE INDEX idx_recordings_processed ON audio_recordings(is_processed);
```

### 5. TranscriptionRecord
**Purpose**: Stores transcribed text from audio recordings with search capabilities.

```typescript
interface TranscriptionRecord {
  id: string                    // UUID primary key
  audioRecordingId: string      // Foreign key to audio_recordings
  userId: string                // Foreign key to workbook_users
  text: string                  // Transcribed text
  confidence: number            // Transcription confidence (0-1)
  language: string              // Detected language
  wordCount: number             // Number of words
  processingTime: number        // Seconds to process
  metadata: TranscriptionMetadata
  status: TranscriptionStatus   // Processing status
  createdAt: Date
  updatedAt: Date
}

interface TranscriptionMetadata {
  model: string                 // AI model used (whisper-1)
  segments?: TranscriptionSegment[]  // Timestamped segments
  words?: TranscriptionWord[]   // Word-level timestamps
}

interface TranscriptionSegment {
  start: number                 // Start time in seconds
  end: number                   // End time in seconds
  text: string                  // Segment text
}

interface TranscriptionWord {
  word: string                  // Individual word
  start: number                 // Start timestamp
  end: number                   // End timestamp
  confidence: number            // Word confidence
}

enum TranscriptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

**Validation Rules**:
- Text must not be empty when status is COMPLETED
- Confidence must be 0-1
- Word count must match actual text
- Language must be valid ISO code

**Database Schema**:
```sql
CREATE TABLE transcription_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_recording_id UUID NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
  text TEXT,
  confidence DECIMAL(3,2),
  language VARCHAR(10),
  word_count INTEGER,
  processing_time INTEGER,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(text, ''))
  ) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transcriptions_recording ON transcription_records(audio_recording_id);
CREATE INDEX idx_transcriptions_user ON transcription_records(user_id);
CREATE INDEX idx_transcriptions_status ON transcription_records(status);
CREATE INDEX idx_transcriptions_search ON transcription_records USING GIN(search_vector);
```

### 6. WorkbookNote
**Purpose**: User-created notes linked to workshop content with rich formatting.

```typescript
interface WorkbookNote {
  id: string                    // UUID primary key
  userId: string                // Foreign key to workbook_users
  title: string                 // Note title
  content: string               // Rich text content (HTML)
  moduleId?: string             // Optional module link
  lessonId?: string             // Optional lesson link
  audioRecordingId?: string     // Optional audio link
  timestamp?: number            // Timestamp in audio/video
  tags: string[]                // User-defined tags
  isPrivate: boolean            // Visibility setting
  isPinned: boolean             // Pinned to top
  metadata: NoteMetadata        // Additional metadata
  createdAt: Date
  updatedAt: Date
}

interface NoteMetadata {
  wordCount: number             // Content word count
  lastEditDevice?: string       // Last editing device
  version: number               // Version for conflict resolution
  linkedNotes?: string[]        // Related note IDs
  categories?: string[]         // Note categories
}
```

**Validation Rules**:
- Title must be 1-200 characters
- Content must not be empty
- Tags must be unique per note
- Timestamp only valid with audio/video reference

**Database Schema**:
```sql
CREATE TABLE workbook_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  module_id UUID REFERENCES workshop_modules(id),
  lesson_id VARCHAR(50),
  audio_recording_id UUID REFERENCES audio_recordings(id),
  timestamp INTEGER,
  tags JSONB DEFAULT '[]',
  is_private BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || content)
  ) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_user ON workbook_notes(user_id);
CREATE INDEX idx_notes_module ON workbook_notes(module_id);
CREATE INDEX idx_notes_tags ON workbook_notes USING GIN(tags);
CREATE INDEX idx_notes_search ON workbook_notes USING GIN(search_vector);
CREATE INDEX idx_notes_pinned ON workbook_notes(user_id, is_pinned) WHERE is_pinned = true;
```

### 7. LiveSession
**Purpose**: Manages live workshop sessions with real-time features.

```typescript
interface LiveSession {
  id: string                    // UUID primary key
  title: string                 // Session title
  description?: string          // Session description
  instructorId: string          // Session instructor
  moduleId?: string             // Optional module association
  scheduledStart: Date          // Scheduled start time
  scheduledEnd: Date            // Scheduled end time
  actualStart?: Date            // Actual start time
  actualEnd?: Date              // Actual end time
  maxParticipants: number       // Participant limit
  status: SessionStatus         // Current status
  features: SessionFeature[]    // Enabled features
  metadata: SessionMetadata     // Additional data
  createdAt: Date
  updatedAt: Date
}

enum SessionStatus {
  SCHEDULED = 'scheduled',
  STARTING = 'starting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

interface SessionFeature {
  type: FeatureType             // Feature type
  isEnabled: boolean            // Feature status
  config: Record<string, any>   // Feature configuration
}

enum FeatureType {
  POLL = 'poll',
  QA = 'qa',
  BREAKOUT = 'breakout',
  WHITEBOARD = 'whiteboard',
  RECORDING = 'recording',
  CHAT = 'chat'
}

interface SessionMetadata {
  recordingUrl?: string         // Session recording
  summary?: string              // Auto-generated summary
  participantCount: number      // Total participants
  engagementScore?: number      // Calculated engagement
}
```

**State Transitions**:
```
SCHEDULED → STARTING (instructor begins)
STARTING → ACTIVE (session fully started)
ACTIVE → PAUSED (temporary pause)
PAUSED → ACTIVE (resume session)
ACTIVE → ENDED (natural completion)
SCHEDULED/STARTING/ACTIVE → CANCELLED (manual cancellation)
```

**Database Schema**:
```sql
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES workbook_users(id),
  module_id UUID REFERENCES workshop_modules(id),
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  max_participants INTEGER DEFAULT 50,
  status VARCHAR(20) DEFAULT 'scheduled',
  features JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_instructor ON live_sessions(instructor_id);
CREATE INDEX idx_sessions_status ON live_sessions(status);
CREATE INDEX idx_sessions_schedule ON live_sessions(scheduled_start, scheduled_end);
```

### 8. SessionParticipant
**Purpose**: Tracks user participation in live sessions.

```typescript
interface SessionParticipant {
  id: string                    // UUID primary key
  sessionId: string             // Foreign key to live_sessions
  userId: string                // Foreign key to workbook_users
  joinedAt: Date                // When user joined
  leftAt?: Date                 // When user left
  role: ParticipantRole         // User role in session
  permissions: Permission[]     // Session permissions
  participationScore: number    // Engagement score
  metadata: ParticipantMetadata // Additional data
  createdAt: Date
  updatedAt: Date
}

enum ParticipantRole {
  INSTRUCTOR = 'instructor',
  ASSISTANT = 'assistant',
  PARTICIPANT = 'participant',
  OBSERVER = 'observer'
}

enum Permission {
  CAN_SPEAK = 'can_speak',
  CAN_SHARE_SCREEN = 'can_share_screen',
  CAN_USE_WHITEBOARD = 'can_use_whiteboard',
  CAN_CREATE_POLLS = 'can_create_polls',
  CAN_MODERATE = 'can_moderate'
}

interface ParticipantMetadata {
  totalTimeMinutes: number      // Time in session
  interactionCount: number      // Number of interactions
  questionsAsked: number        // Questions submitted
  pollsAnswered: number         // Polls participated in
  connectionQuality?: 'good' | 'fair' | 'poor'
}
```

**Database Schema**:
```sql
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES workbook_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  role VARCHAR(20) DEFAULT 'participant',
  permissions JSONB DEFAULT '["can_speak"]',
  participation_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_participants_session ON session_participants(session_id);
CREATE INDEX idx_participants_user ON session_participants(user_id);
CREATE INDEX idx_participants_role ON session_participants(role);
```

## Relationships

### Primary Relationships
```typescript
// User → Progress (One-to-Many)
WorkbookUser.id → UserProgress.userId

// Module → Progress (One-to-Many)
WorkshopModule.id → UserProgress.moduleId

// User → Recordings (One-to-Many)
WorkbookUser.id → AudioRecording.userId

// Recording → Transcription (One-to-One)
AudioRecording.id → TranscriptionRecord.audioRecordingId

// User → Notes (One-to-Many)
WorkbookUser.id → WorkbookNote.userId

// Session → Participants (One-to-Many)
LiveSession.id → SessionParticipant.sessionId
```

### Optional Relationships
```typescript
// Module → Recordings (Optional)
WorkshopModule.id → AudioRecording.moduleId

// Module → Notes (Optional)
WorkshopModule.id → WorkbookNote.moduleId

// Recording → Notes (Optional)
AudioRecording.id → WorkbookNote.audioRecordingId

// Module → Sessions (Optional)
WorkshopModule.id → LiveSession.moduleId
```

## Data Access Patterns

### Common Queries

1. **Get User Dashboard Data**:
```sql
SELECT
  u.*,
  COALESCE(AVG(p.progress_percent), 0) as overall_progress,
  COUNT(DISTINCT p.module_id) as modules_started,
  COUNT(DISTINCT ar.id) as recordings_count,
  COUNT(DISTINCT n.id) as notes_count
FROM workbook_users u
LEFT JOIN user_progress p ON u.id = p.user_id
LEFT JOIN audio_recordings ar ON u.id = ar.user_id
LEFT JOIN workbook_notes n ON u.id = n.user_id
WHERE u.id = $1
GROUP BY u.id;
```

2. **Search Across Notes and Transcriptions**:
```sql
(SELECT 'note' as type, id, title as title, content as text, created_at
 FROM workbook_notes
 WHERE user_id = $1 AND search_vector @@ plainto_tsquery($2))
UNION ALL
(SELECT 'transcription' as type, id, 'Audio Transcription' as title, text, created_at
 FROM transcription_records
 WHERE user_id = $1 AND search_vector @@ plainto_tsquery($2))
ORDER BY created_at DESC;
```

3. **Get Module Progress with Prerequisites**:
```sql
SELECT
  m.*,
  COALESCE(p.progress_percent, 0) as user_progress,
  p.status as progress_status,
  CASE
    WHEN COALESCE(jsonb_array_length(m.prerequisites), 0) = 0 THEN true
    ELSE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(m.prerequisites) prereq
      WHERE NOT EXISTS (
        SELECT 1 FROM user_progress p2
        WHERE p2.user_id = $1 AND p2.module_id = prereq::uuid
        AND p2.status = 'completed'
      )
    )
  END as is_accessible
FROM workshop_modules m
LEFT JOIN user_progress p ON m.id = p.module_id AND p.user_id = $1
ORDER BY m.module_order;
```

## Performance Considerations

### Indexing Strategy
- Primary keys and foreign keys automatically indexed
- Search vectors for full-text search on notes and transcriptions
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., pinned notes)

### Caching Patterns
- User dashboard data (5-minute TTL)
- Module content (1-hour TTL, invalidate on publish)
- Search results (30-second TTL)
- Live session participant lists (real-time updates)

### Scaling Considerations
- Partition audio_recordings by date for large volumes
- Archive completed transcriptions older than 2 years
- Implement soft deletes for user data compliance
- Use read replicas for search and reporting queries

## Data Validation and Constraints

### Application-Level Validation
```typescript
// User progress validation
function validateProgress(progress: Partial<UserProgress>): ValidationResult {
  const errors: string[] = []

  if (progress.progressPercent !== undefined) {
    if (progress.progressPercent < 0 || progress.progressPercent > 100) {
      errors.push('Progress percent must be between 0 and 100')
    }
  }

  if (progress.status === ProgressStatus.COMPLETED && progress.progressPercent !== 100) {
    errors.push('Completed status requires 100% progress')
  }

  return { isValid: errors.length === 0, errors }
}

// Audio file validation
function validateAudioFile(file: File): ValidationResult {
  const errors: string[] = []
  const maxSize = 100 * 1024 * 1024 // 100MB
  const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a']

  if (file.size > maxSize) {
    errors.push('File size must be less than 100MB')
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be a supported audio format')
  }

  return { isValid: errors.length === 0, errors }
}
```

### Database Constraints
```sql
-- Progress constraints
ALTER TABLE user_progress
ADD CONSTRAINT check_progress_percent
CHECK (progress_percent >= 0 AND progress_percent <= 100);

ALTER TABLE user_progress
ADD CONSTRAINT check_time_spent
CHECK (time_spent_minutes >= 0);

-- Audio file constraints
ALTER TABLE audio_recordings
ADD CONSTRAINT check_duration
CHECK (duration_seconds > 0);

ALTER TABLE audio_recordings
ADD CONSTRAINT check_file_size
CHECK (file_size_bytes > 0 AND file_size_bytes <= 104857600); -- 100MB

-- Session scheduling constraints
ALTER TABLE live_sessions
ADD CONSTRAINT check_session_times
CHECK (scheduled_end > scheduled_start);
```

This comprehensive data model provides a solid foundation for implementing all features identified in the 6FB Workbook specification while maintaining data integrity, performance, and scalability.