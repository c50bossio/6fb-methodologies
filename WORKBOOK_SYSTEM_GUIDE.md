# 6FB Workshop Workbook System - Complete Implementation Guide

## 🚀 Overview

The 6FB Workshop Workbook System is a comprehensive, production-ready platform for interactive learning with real-time collaboration, audio transcription, note-taking, and live sessions. This guide covers the complete implementation including all major features and optimizations.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Feature Implementation](#feature-implementation)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Real-time Features](#real-time-features)
7. [Performance Optimizations](#performance-optimizations)
8. [Security Implementation](#security-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)
11. [Monitoring & Analytics](#monitoring--analytics)
12. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
├─────────────────────────────────────────────────────────────┤
│ React Components │ Zustand Stores │ Socket.io Client        │
├─────────────────────────────────────────────────────────────┤
│                    Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│ Custom Server │ Socket.io Server │ Performance Monitor      │
├─────────────────────────────────────────────────────────────┤
│ API Routes │ Authentication │ File Upload │ Real-time       │
├─────────────────────────────────────────────────────────────┤
│ Service Layer │ Business Logic │ External APIs              │
├─────────────────────────────────────────────────────────────┤
│ Database Layer │ PostgreSQL │ Redis Cache │ File Storage    │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

- **Scalability**: Designed to handle 50+ concurrent live session participants
- **Performance**: < 2s page load times, < 500ms search response
- **Security**: JWT authentication, role-based permissions, input validation
- **Reliability**: 95%+ uptime, graceful error handling, offline capabilities
- **User Experience**: Real-time updates, mobile-responsive, accessibility compliant

## 🔧 Technology Stack

### Frontend
- **Framework**: Next.js 14.2.5 with App Router
- **Language**: TypeScript 5.5.3 with strict mode
- **Styling**: Tailwind CSS with component library
- **State Management**: Zustand with persistence and devtools
- **Real-time**: Socket.io client with auto-reconnection
- **Performance**: Service Worker, lazy loading, code splitting

### Backend
- **Runtime**: Node.js with custom Express server
- **API**: Next.js API routes with OpenAPI documentation
- **Authentication**: JWT with HTTP-only cookies
- **Real-time**: Socket.io server with namespace isolation
- **File Processing**: OpenAI Whisper API for audio transcription
- **Validation**: Zod schemas with runtime type checking

### Database & Storage
- **Primary Database**: PostgreSQL with UUID primary keys
- **Caching**: Redis for session storage and API caching
- **File Storage**: AWS S3 for audio files and exports
- **Search**: PostgreSQL full-text search with GIN indexes

### Infrastructure
- **Deployment**: Docker containers with multi-stage builds
- **Monitoring**: Performance monitoring with Core Web Vitals
- **Caching**: Service Worker with workbook-specific strategies
- **Security**: Rate limiting, CORS, input sanitization

## ✨ Feature Implementation

### 1. Workshop Content System

#### Module Structure
```typescript
interface WorkshopModule {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isLocked: boolean;
  content: {
    objectives: string[];
    materials: string[];
    exercises: Exercise[];
  };
}
```

#### Implementation Status
- ✅ **Module Management**: CRUD operations with validation
- ✅ **Progress Tracking**: User progress with state transitions
- ✅ **Content Delivery**: Optimized content loading with caching
- ✅ **Search Integration**: Full-text search across modules

### 2. Audio Recording & Transcription

#### Recording Features
- **Voice Recording**: Browser MediaRecorder API with 1-second chunks
- **File Upload**: Drag-and-drop with format validation (MP3, WAV, M4A)
- **Quality Control**: Automatic gain control, noise suppression
- **Size Limits**: 100MB per file with compression options

#### Transcription Pipeline
```
Audio File → S3 Upload → Whisper API → Processing → Storage → Search Index
```

#### Implementation Status
- ✅ **Audio Recording**: Real-time recording with voice activity detection
- ✅ **File Upload**: S3 integration with presigned URLs
- ✅ **Transcription**: OpenAI Whisper API with chunked processing
- ✅ **Search**: Full-text search across transcriptions with timestamps

### 3. Note-Taking System

#### Features
- **Rich Text Editor**: Tiptap editor with markdown support
- **Real-time Collaboration**: Operational transform for concurrent editing
- **Organization**: Tags, folders, and cross-references
- **Export**: PDF, Markdown, and JSON formats

#### Implementation Status
- ✅ **Note Creation**: Rich text editing with auto-save
- ✅ **Collaboration**: Real-time collaborative editing
- ✅ **Search**: Full-text search with tag filtering
- ✅ **Export**: Multi-format export system

### 4. Live Sessions

#### Capabilities
- **Video/Audio**: WebRTC with fallback to server relay
- **Screen Sharing**: Desktop and application sharing
- **Interactive Features**: Polls, Q&A, hand raising
- **Recording**: Server-side recording with playback

#### Implementation Status
- ✅ **Real-time Communication**: Socket.io with namespace isolation
- ✅ **Session Management**: Join/leave with participant tracking
- ✅ **Interactive Features**: Polls, chat, Q&A system
- ✅ **Media Controls**: Audio/video toggle, screen sharing

### 5. User Progress & Analytics

#### Tracking
- **Module Progress**: Completion percentage and time spent
- **Engagement Metrics**: Active participation, interaction counts
- **Learning Analytics**: Retention rates, completion patterns
- **Performance Insights**: Load times, error rates

#### Implementation Status
- ✅ **Progress Tracking**: Real-time progress updates
- ✅ **Analytics**: User engagement and system performance
- ✅ **Reporting**: Dashboard with key metrics
- ✅ **Export**: Data export for external analysis

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
```sql
-- Workbook users with subscription tiers
CREATE TABLE workbook_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- JWT refresh tokens
CREATE TABLE workbook_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Content & Progress
```sql
-- Workshop modules
CREATE TABLE workshop_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  content JSONB NOT NULL,
  search_vector tsvector,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES workshop_modules(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'not_started',
  progress_percent INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(user_id, module_id)
);
```

#### Audio & Transcriptions
```sql
-- Audio recordings
CREATE TABLE audio_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  s3_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration REAL,
  status VARCHAR(50) DEFAULT 'uploaded',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transcription records
CREATE TABLE transcription_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_recording_id UUID REFERENCES audio_recordings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  confidence REAL,
  segments JSONB,
  search_vector tsvector,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Notes & Collaboration
```sql
-- User notes
CREATE TABLE workbook_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  is_private BOOLEAN DEFAULT true,
  search_vector tsvector,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Note sharing
CREATE TABLE note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES workbook_notes(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  permission VARCHAR(50) DEFAULT 'read',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Live Sessions
```sql
-- Live sessions
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES workbook_users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'participant',
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  engagement_data JSONB DEFAULT '{}',
  UNIQUE(session_id, user_id)
);
```

### Indexes & Performance

```sql
-- Full-text search indexes
CREATE INDEX idx_modules_search ON workshop_modules USING GIN(search_vector);
CREATE INDEX idx_transcriptions_search ON transcription_records USING GIN(search_vector);
CREATE INDEX idx_notes_search ON workbook_notes USING GIN(search_vector);

-- Performance indexes
CREATE INDEX idx_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_progress_module_id ON user_progress(module_id);
CREATE INDEX idx_notes_user_id ON workbook_notes(user_id);
CREATE INDEX idx_recordings_user_id ON audio_recordings(user_id);
CREATE INDEX idx_sessions_host_id ON live_sessions(host_id);
CREATE INDEX idx_participants_session_id ON session_participants(session_id);

-- Partial indexes for active sessions
CREATE INDEX idx_active_sessions ON live_sessions(id) WHERE status IN ('live', 'waiting');
```

## 🔌 API Documentation

### Authentication Endpoints

#### POST /api/workbook/auth/login
```typescript
// Request
{
  email: string;
  password: string;
}

// Response
{
  success: boolean;
  user: WorkbookUser;
  token: string;
  refreshToken: string;
}
```

#### POST /api/workbook/auth/refresh
```typescript
// Request
{
  refreshToken: string;
}

// Response
{
  success: boolean;
  token: string;
  refreshToken: string;
}
```

### Content Endpoints

#### GET /api/workbook/modules
```typescript
// Query parameters
{
  search?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
  offset?: number;
}

// Response
{
  modules: WorkshopModule[];
  total: number;
  hasMore: boolean;
}
```

#### POST /api/workbook/progress/{moduleId}
```typescript
// Request
{
  progressPercent: number;
  timeSpentMinutes: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

// Response
{
  success: boolean;
  progress: UserProgress;
}
```

### Audio Endpoints

#### POST /api/workbook/audio
```typescript
// Form data
{
  audio: File;
  title: string;
  moduleId?: string;
}

// Response
{
  success: boolean;
  recording: AudioRecording;
}
```

#### POST /api/workbook/audio/transcribe
```typescript
// Request
{
  recordingId: string;
}

// Response
{
  success: boolean;
  transcriptionId: string;
  status: 'processing';
}
```

### Notes Endpoints

#### GET /api/workbook/notes
```typescript
// Query parameters
{
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// Response
{
  notes: WorkbookNote[];
  total: number;
  hasMore: boolean;
}
```

#### POST /api/workbook/notes
```typescript
// Request
{
  title: string;
  content: string;
  tags: string[];
  isPrivate: boolean;
  moduleId?: string;
}

// Response
{
  success: boolean;
  note: WorkbookNote;
}
```

### Live Session Endpoints

#### POST /api/workbook/sessions
```typescript
// Request
{
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  settings: SessionSettings;
}

// Response
{
  success: boolean;
  session: LiveSession;
  joinUrl: string;
}
```

#### POST /api/workbook/sessions/{sessionId}/join
```typescript
// Response
{
  success: boolean;
  session: LiveSession;
  participant: SessionParticipant;
  permissions: MediaPermissions;
}
```

## 🔄 Real-time Features

### Socket.io Implementation

#### Namespaces
- `/live-sessions` - Real-time session communication
- `/workbook` - Collaborative editing and notifications
- `/admin` - System monitoring for administrators

#### Event Structure
```typescript
// Session events
'session:join' | 'session:leave' | 'session:heartbeat'
'participant:joined' | 'participant:left' | 'participant:updated'

// Communication events
'chat:message' | 'chat:typing' | 'chat:reaction'
'media:state-change' | 'screen:start-sharing' | 'screen:stop-sharing'
'hand:raise' | 'hand:lower'

// Interactive events
'poll:create' | 'poll:vote' | 'poll:close'
'qa:question' | 'qa:answer' | 'qa:vote'

// Collaboration events
'note:join' | 'note:leave' | 'note:content-change' | 'note:cursor-position'
```

#### Connection Management
- **Authentication**: JWT token validation on connection
- **Reconnection**: Automatic reconnection with exponential backoff
- **Heartbeat**: Regular ping/pong to detect disconnections
- **Rate Limiting**: Per-connection rate limits to prevent abuse

### Real-time Collaboration

#### Operational Transform
```typescript
// Note collaboration system
const operation = {
  type: 'insert' | 'delete' | 'retain',
  position: number,
  content: string,
  userId: string,
  timestamp: number,
};

// Conflict resolution
function transformOperation(op1: Operation, op2: Operation): Operation {
  // Implement operational transform algorithm
  // Handle concurrent edits without conflicts
}
```

## ⚡ Performance Optimizations

### Frontend Optimizations

#### Code Splitting
```typescript
// Route-based splitting
const WorkbookPage = dynamic(() => import('@/app/workbook/page'));
const LiveSessionRoom = lazy(() => import('@/components/workbook/LiveSessionRoom'));

// Feature-based splitting
const VoiceRecorder = lazy(() => import('@/components/workbook/VoiceRecorder'));
const PerformanceMonitor = lazy(() => import('@/components/monitoring/PerformanceMonitor'));
```

#### Service Worker Caching
- **Critical Assets**: Immediate cache for anti-flash loading
- **Workbook Data**: 5-minute cache for modules and content
- **Audio Files**: Long-term cache for offline access
- **API Responses**: Stale-while-revalidate for dynamic content

#### Bundle Optimization
- **Tree Shaking**: Remove unused code from bundles
- **Compression**: Gzip/Brotli compression for all assets
- **Image Optimization**: Next.js Image component with WebP
- **Font Loading**: Preload critical fonts with font-display: swap

### Backend Optimizations

#### Database Performance
```sql
-- Query optimization
EXPLAIN ANALYZE SELECT * FROM workbook_notes
WHERE search_vector @@ plainto_tsquery('search term')
ORDER BY updated_at DESC LIMIT 20;

-- Connection pooling
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
```

#### Caching Strategy
- **Redis Cache**: Session data, API responses, computed results
- **CDN**: Static assets and media files
- **Edge Caching**: Geographically distributed content
- **Database Query Cache**: Frequently accessed queries

### Real-time Optimizations
- **Connection Pooling**: Reuse WebSocket connections
- **Message Batching**: Batch multiple events for efficiency
- **Delta Updates**: Send only changed data, not full state
- **Compression**: Enable WebSocket compression for large payloads

## 🔒 Security Implementation

### Authentication & Authorization

#### JWT Implementation
```typescript
// Token structure
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
  iat: number;
  exp: number;
}

// Token validation middleware
async function validateToken(token: string): Promise<JWTPayload> {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check token expiration
    if (Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

#### Role-Based Permissions
```typescript
// Permission system
const permissions = {
  'workbook.read': ['user', 'premium', 'admin'],
  'workbook.write': ['premium', 'admin'],
  'sessions.host': ['premium', 'admin'],
  'admin.access': ['admin'],
};

function hasPermission(userRole: string, permission: string): boolean {
  return permissions[permission]?.includes(userRole) || false;
}
```

### Input Validation & Sanitization

#### Zod Schemas
```typescript
// Note validation
const CreateNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().max(10000),
  tags: z.array(z.string().max(50)).max(10),
  isPrivate: z.boolean(),
  moduleId: z.string().uuid().optional(),
});

// Runtime validation
function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
}
```

### Rate Limiting

#### Implementation
```typescript
// API rate limiting
const rateLimits = {
  '/api/workbook/notes': { max: 100, windowMs: 15 * 60 * 1000 }, // 15 minutes
  '/api/workbook/audio': { max: 10, windowMs: 60 * 60 * 1000 },  // 1 hour
  '/api/workbook/auth': { max: 5, windowMs: 15 * 60 * 1000 },    // 15 minutes
};

// Socket.io rate limiting
const socketRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkSocketRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const userLimit = socketRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    socketRateLimit.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}
```

### Data Protection

#### Encryption
- **Passwords**: bcrypt with salt rounds = 12
- **Sensitive Data**: AES-256-GCM for PII
- **Tokens**: Secure random generation
- **File Uploads**: Virus scanning before processing

#### Privacy Controls
- **Data Anonymization**: Remove PII from analytics
- **Consent Management**: Explicit consent for data collection
- **Right to Deletion**: Complete data removal on request
- **Data Export**: User can export all their data

## 🧪 Testing Strategy

### Unit Testing

#### Component Testing
```typescript
// React component test
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceRecorder } from '@/components/workbook/VoiceRecorder';

describe('VoiceRecorder', () => {
  it('should start recording when start button is clicked', async () => {
    render(<VoiceRecorder onRecordingComplete={jest.fn()} />);

    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);

    expect(screen.getByText(/recording/i)).toBeInTheDocument();
  });
});
```

#### API Testing
```typescript
// API route test
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/workbook/notes';

describe('/api/workbook/notes', () => {
  it('should create a new note', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        isPrivate: true,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toMatchObject({
      success: true,
      note: expect.objectContaining({
        title: 'Test Note',
      }),
    });
  });
});
```

### Integration Testing

#### Database Testing
```typescript
// Database integration test
describe('UserProgress Service', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should update user progress correctly', async () => {
    const userId = await createTestUser();
    const moduleId = await createTestModule();

    const progress = await updateUserProgress(userId, moduleId, {
      progressPercent: 50,
      timeSpentMinutes: 30,
      status: 'in_progress',
    });

    expect(progress).toMatchObject({
      progressPercent: 50,
      timeSpentMinutes: 30,
      status: 'in_progress',
    });
  });
});
```

### End-to-End Testing

#### Playwright Tests
```typescript
// E2E test
import { test, expect } from '@playwright/test';

test('workbook user journey', async ({ page }) => {
  // Login
  await page.goto('/workbook');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');

  // Navigate to modules
  await expect(page.locator('[data-testid=modules-list]')).toBeVisible();

  // Start a module
  await page.click('[data-testid=module-card]:first-child');
  await expect(page.locator('[data-testid=module-content]')).toBeVisible();

  // Record audio
  await page.click('[data-testid=voice-recorder-start]');
  await page.waitForTimeout(3000);
  await page.click('[data-testid=voice-recorder-stop]');

  // Verify recording was created
  await expect(page.locator('[data-testid=recording-list] .recording-item')).toHaveCount(1);
});
```

### Performance Testing

#### Load Testing
```javascript
// Artillery.js configuration
module.exports = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 5 },   // Warm up
      { duration: 120, arrivalRate: 10 }, // Ramp up
      { duration: 300, arrivalRate: 15 }, // Sustained load
    ],
  },
  scenarios: [
    {
      name: 'Workbook API Load Test',
      weight: 100,
      flow: [
        { post: { url: '/api/workbook/auth/login', json: { email: 'test@example.com', password: 'password' } } },
        { get: { url: '/api/workbook/modules' } },
        { get: { url: '/api/workbook/notes' } },
        { post: { url: '/api/workbook/progress/{{ moduleId }}', json: { progressPercent: 25 } } },
      ],
    },
  ],
};
```

## 🚀 Deployment Guide

### Production Environment Setup

#### Docker Configuration
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/workbook
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: workbook
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### Environment Configuration

#### Production Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://workbook.6fbmethodologies.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/workbook_prod
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# External APIs
OPENAI_API_KEY=sk-your-openai-api-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=workbook-audio-files
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
ANALYTICS_ID=your-analytics-id

# Email
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@6fbmethodologies.com

# Security
CORS_ORIGIN=https://6fbmethodologies.com,https://workbook.6fbmethodologies.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### CI/CD Pipeline

#### GitHub Actions
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:coverage
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Build and push Docker image
        run: |
          docker build -t workbook:${{ github.sha }} .
          docker tag workbook:${{ github.sha }} your-registry/workbook:latest
          docker push your-registry/workbook:latest

      - name: Deploy to production
        run: |
          # Deploy using your preferred method
          # (Kubernetes, Docker Swarm, etc.)
```

### Database Migration

#### Migration Script
```bash
#!/bin/bash
# deploy-database.sh

set -e

echo "Starting database migration..."

# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
psql $DATABASE_URL -f database/migrations/001_initial_schema.sql
psql $DATABASE_URL -f database/migrations/002_add_search_vectors.sql
psql $DATABASE_URL -f database/migrations/003_live_sessions.sql

# Verify schema
psql $DATABASE_URL -f database/verify-schema.sql

echo "Database migration completed successfully!"
```

### Health Checks

#### Application Health Check
```typescript
// /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    s3: await checkS3(),
    openai: await checkOpenAI(),
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');

  return Response.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

## 📊 Monitoring & Analytics

### Performance Monitoring

#### Core Web Vitals Tracking
```typescript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send metrics to your analytics service
  analytics.track('Core Web Vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    url: window.location.href,
  });
}

// Track all Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

#### Application Metrics
```typescript
// Custom metrics tracking
class MetricsCollector {
  private metrics = new Map<string, number[]>();

  track(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getPercentile(name: string, percentile: number): number {
    const values = this.metrics.get(name)?.sort() || [];
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index] || 0;
  }
}

// Usage
const metrics = new MetricsCollector();
metrics.track('api_response_time', responseTime);
metrics.track('audio_transcription_time', transcriptionTime);
metrics.track('note_save_time', saveTime);
```

### Error Monitoring

#### Sentry Integration
```typescript
// Error tracking setup
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out noise
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null;
    }
    return event;
  },
});

// Custom error boundary
export class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: errorInfo,
        component: this.constructor.name,
      },
    });
  }
}
```

### User Analytics

#### Event Tracking
```typescript
// User behavior analytics
interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  userId?: string;
  timestamp: number;
}

class AnalyticsService {
  track(event: string, properties: Record<string, any> = {}) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
      },
      userId: this.getCurrentUserId(),
      timestamp: Date.now(),
    };

    // Send to analytics service
    this.sendEvent(analyticsEvent);
  }

  // Track specific workbook events
  trackModuleStart(moduleId: string) {
    this.track('Module Started', { moduleId });
  }

  trackAudioRecording(duration: number, fileSize: number) {
    this.track('Audio Recorded', { duration, fileSize });
  }

  trackNoteCreated(noteId: string, contentLength: number) {
    this.track('Note Created', { noteId, contentLength });
  }

  trackSessionJoin(sessionId: string) {
    this.track('Live Session Joined', { sessionId });
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Audio Recording Issues

**Problem**: Recording fails to start or produces no audio
**Causes**:
- Browser permissions not granted
- Microphone not available
- HTTPS required for getUserMedia

**Solutions**:
```typescript
// Check microphone availability
async function checkMicrophoneAccess() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    if (audioInputs.length === 0) {
      throw new Error('No microphone devices found');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error) {
    console.error('Microphone access check failed:', error);
    return false;
  }
}
```

#### 2. Socket.io Connection Issues

**Problem**: Real-time features not working
**Causes**:
- WebSocket blocked by firewall
- Authentication token expired
- Server overloaded

**Solutions**:
```typescript
// Enhanced connection handling
const socket = io({
  transports: ['websocket', 'polling'], // Fallback to polling
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);

  // Try token refresh
  if (error.message.includes('authentication')) {
    refreshToken().then(() => {
      socket.auth.token = getNewToken();
      socket.connect();
    });
  }
});
```

#### 3. Database Performance Issues

**Problem**: Slow query performance
**Causes**:
- Missing indexes
- Complex queries
- Table locks

**Solutions**:
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_notes_search_gin ON workbook_notes USING GIN(search_vector);
CREATE INDEX CONCURRENTLY idx_progress_composite ON user_progress(user_id, module_id, status);

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM workbook_notes
WHERE search_vector @@ plainto_tsquery('search term')
ORDER BY updated_at DESC
LIMIT 20;

-- Optimize with proper indexing strategy
```

#### 4. Memory Leaks

**Problem**: Application memory usage increases over time
**Causes**:
- Event listeners not cleaned up
- React components not unmounted properly
- WebSocket connections not closed

**Solutions**:
```typescript
// Proper cleanup in React components
useEffect(() => {
  const socket = io();

  socket.on('message', handleMessage);

  return () => {
    socket.off('message', handleMessage);
    socket.disconnect();
  };
}, []);

// Memory monitoring
function monitorMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    if (usagePercent > 80) {
      console.warn('High memory usage detected:', usagePercent.toFixed(2) + '%');
    }
  }
}
```

### Performance Debugging

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# Check for duplicate dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js

# Monitor runtime performance
npm run dev:debug
```

#### Database Debugging
```sql
-- Check slow queries
SELECT query, calls, total_time, rows, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('workbook_notes', 'user_progress', 'audio_recordings');
```

### Support Checklist

When reporting issues, please provide:

1. **Environment Information**
   - Browser version and operating system
   - Node.js version (for server issues)
   - Database version and configuration

2. **Error Details**
   - Complete error messages and stack traces
   - Steps to reproduce the issue
   - Expected vs actual behavior

3. **System Metrics**
   - Performance monitor output
   - Bundle analysis results
   - Database query performance

4. **Network Information**
   - Connection type and speed
   - Firewall or proxy configuration
   - SSL certificate status

---

## 📞 Support & Maintenance

### Maintenance Schedule

#### Daily
- Monitor error rates and performance metrics
- Check database performance and connection counts
- Review security logs for unusual activity

#### Weekly
- Update dependencies and security patches
- Review and optimize slow database queries
- Analyze user feedback and bug reports

#### Monthly
- Full security audit and penetration testing
- Performance optimization review
- Database maintenance and cleanup
- Backup verification and disaster recovery testing

### Contact Information

- **Technical Support**: support@6fbmethodologies.com
- **Security Issues**: security@6fbmethodologies.com
- **Documentation**: https://docs.6fbmethodologies.com
- **Status Page**: https://status.6fbmethodologies.com

---

*This guide is maintained by the 6FB Engineering Team. Last updated: September 2024*