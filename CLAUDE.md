# 6FB Workbook System - Claude Context

## Project Overview
Interactive learning platform for the Six Figure Barber methodology with comprehensive workshop modules, audio transcription, note-taking, and real-time collaboration features.

## Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: JWT tokens with HTTP-only cookies
- **Audio Processing**: OpenAI Whisper API
- **Real-time**: Socket.io for live sessions
- **File Storage**: AWS S3 for audio files
- **State Management**: Zustand + React Context

## Architecture Patterns

### API Routes Structure
```
src/app/api/workbook/
├── auth/           # Authentication endpoints
├── modules/        # Workshop module content
├── progress/       # User progress tracking
├── recordings/     # Audio file management
├── transcribe/     # Audio transcription
├── transcriptions/ # Transcription retrieval
├── notes/          # Note management
├── export/         # Data export
└── sessions/       # Live session management
```

### Database Schema Key Entities
- **workbook_users**: User accounts with subscription tiers
- **workshop_modules**: Content with JSONB structure and search vectors
- **user_progress**: Progress tracking with state transitions
- **audio_recordings**: File metadata with S3 URLs
- **transcription_records**: Whisper API results with search vectors
- **workbook_notes**: Rich text notes with full-text search
- **live_sessions**: Real-time workshop sessions
- **session_participants**: Live session participation tracking

### Component Structure
```
src/components/workbook/
├── WorkshopContent/     # Module content rendering
├── VoiceRecorder/       # Audio recording with chunking
├── NoteTaker/          # Rich text editor with Tiptap
├── ProgressTracker/    # Visual progress indicators
├── SearchInterface/    # Unified search across content
├── ExportTools/        # Data export functionality
└── LiveSession/        # Real-time session features
```

## Implementation Phases

### Phase 1: Foundation (Critical - P0)
1. **Workshop Content System**: Replace placeholder with full module structure
2. **Audio Transcription**: Complete OpenAI Whisper integration
3. **Note-Taking**: Implement Tiptap rich text editor with search

### Phase 2: Enhancement (High Priority - P1)
1. **Export System**: Multi-format data export (PDF, JSON, Markdown)
2. **Mobile Optimization**: PWA with mobile audio recording
3. **Live Sessions**: Socket.io real-time features

### Phase 3: Advanced (Medium Priority - P2)
1. **Real-time Collaboration**: Shared note editing
2. **Analytics**: User engagement and progress insights
3. **Community Features**: Social sharing and peer feedback

## Key Design Decisions

### Audio Processing
- **Choice**: OpenAI Whisper API v1 with chunked processing
- **Rationale**: Industry-leading accuracy, cost-effective, multi-format support
- **Implementation**: 25MB chunks, verbose JSON response with timestamps

### State Management
- **Choice**: Zustand for global state + React Context for auth
- **Rationale**: Minimal boilerplate, TypeScript-first, clear separation
- **Pattern**: Global workbook state, component-scoped UI state

### Search Implementation
- **Choice**: PostgreSQL tsvector with GIN indexes
- **Rationale**: Built-in full-text search, no external dependencies
- **Coverage**: Notes, transcriptions, module content

### Real-time Features
- **Choice**: Socket.io with custom Next.js server
- **Rationale**: Automatic fallbacks, room-based messaging, TypeScript support
- **Use Cases**: Live sessions, participant presence, collaborative editing

## Performance Requirements
- **Page Load**: < 2 seconds initial load
- **Audio Transcription**: < 30 seconds processing time
- **Search Response**: < 500ms for note/transcription search
- **Mobile Audio**: 95%+ success rate on modern browsers
- **Concurrent Users**: Support 50+ users in live sessions

## Security Considerations
- **Authentication**: JWT with HTTP-only cookies, role-based permissions
- **File Upload**: Validated audio formats, 100MB size limit
- **Data Privacy**: User isolation, private notes by default
- **API Security**: Rate limiting, input validation, CORS protection

## Testing Strategy
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: API contract testing with failing tests initially
- **E2E Tests**: Playwright for full user journeys
- **Performance Tests**: Artillery for load testing

## Common Patterns

### Progress Tracking
```typescript
interface ProgressUpdate {
  moduleId: string
  progressPercent: number // 0-100
  timeSpentMinutes: number
  lessonId?: string
}

// State transitions: not_started → in_progress → completed
```

### Audio Recording Flow
1. Start recording with MediaRecorder API
2. Collect 1-second chunks with voice activity detection
3. Upload to S3 with metadata
4. Queue for Whisper API transcription
5. Store results with search indexing

### Note Management
- **Editor**: Tiptap with custom workbook extensions
- **Auto-save**: Every 30 seconds with version conflict resolution
- **Search**: Full-text search across title and content
- **Linking**: References to modules, lessons, audio timestamps

### Export Process
1. Gather user data based on export options
2. Generate format-specific output (PDF/JSON/Markdown)
3. Create signed S3 URL for secure download
4. Return temporary download link with expiration

## Current Implementation Status
- ✅ **Authentication**: Working with JWT and role-based permissions
- ✅ **Database Schema**: Complete with all required tables
- ✅ **Progress API**: Functional with user bridging for UUID compatibility
- ⚠️ **Workshop Content**: Placeholder - needs full implementation
- ⚠️ **Audio Transcription**: Component exists but not integrated
- ⚠️ **Note System**: Database ready but missing frontend
- ❌ **Live Sessions**: Not implemented
- ❌ **Export System**: Not implemented

## Recent Changes (Feature 001)
- Created comprehensive feature specification with 7 major gaps identified
- Completed technical research for all major components
- Designed complete data model with relationships and validation
- Generated OpenAPI specification for all workbook APIs
- Created quickstart guide with testing procedures

## Next Steps
1. Execute /tasks command to generate implementation tasks
2. Prioritize Phase 1 critical features (workshop content, transcription, notes)
3. Implement TDD approach with contract tests first
4. Focus on mobile compatibility and performance optimization

---
*Last Updated: 2025-09-19 - Feature 001 planning complete*