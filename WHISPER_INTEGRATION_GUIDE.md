# OpenAI Whisper API Integration - Complete Implementation Guide

## Overview

This document provides a comprehensive guide to the complete OpenAI Whisper API integration implemented for the 6FB Workbook System. The integration includes chunked audio processing, queue management, cost tracking, search indexing, and real-time transcription with the VoiceRecorder component.

## Features Implemented

### 1. Enhanced Transcription API (`/api/workbook/audio/transcribe`)

**Key Features:**
- ✅ **Chunked Processing**: Automatically splits large audio files (>25MB) into smaller chunks
- ✅ **Multiple Audio Formats**: Support for mp3, wav, m4a, webm, ogg, aac
- ✅ **Queue Management**: Background processing for large files with priority queuing
- ✅ **Cost Tracking**: Detailed cost tracking per user/session with usage limits
- ✅ **Retry Logic**: Exponential backoff retry mechanism for failed transcriptions
- ✅ **Rate Limiting**: User-role based rate limiting with subscription tiers
- ✅ **Search Vector Indexing**: Automatic full-text search indexing for transcribed content

**Usage Examples:**

```typescript
// Upload and transcribe audio file
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('language', 'en');
formData.append('model', 'whisper-1');
formData.append('enableChunking', 'true');
formData.append('priority', 'normal');

const response = await fetch('/api/workbook/audio/transcribe', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});

const result = await response.json();
// Returns: { success: true, transcription: {...}, usage: {...} }
```

```typescript
// JSON-based transcription request
const response = await fetch('/api/workbook/audio/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recordingId: 'existing-recording-id',
    language: 'en',
    model: 'whisper-1',
    enableChunking: true,
    priority: 'high' // For premium users
  }),
  credentials: 'include'
});
```

**Response Format:**
```json
{
  "success": true,
  "transcription": {
    "id": "uuid",
    "text": "Full transcribed text...",
    "status": "completed|pending|processing|failed",
    "duration": 123.45,
    "language": "en",
    "segments": [...], // Word-level timestamps
    "words": [...],   // Segment-level timestamps
    "cost_cents": 60,
    "word_count": 150,
    "summary": "AI-generated summary...",
    "key_topics": ["topic1", "topic2"],
    "provider": "openai-whisper",
    "model": "whisper-1"
  },
  "usage": {
    "duration_minutes": 2,
    "cost_cents": 60,
    "daily_remaining_minutes": 118
  }
}
```

### 2. Queue Management API (`/api/workbook/audio/queue`)

**Features:**
- ✅ **Queue Status**: Monitor transcription jobs and queue position
- ✅ **Job Management**: Cancel, retry, and prioritize transcription jobs
- ✅ **Usage Analytics**: Track daily/monthly limits and costs
- ✅ **Admin Analytics**: Comprehensive queue statistics for administrators

**Usage Examples:**

```typescript
// Get user's queue status
const response = await fetch('/api/workbook/audio/queue', {
  credentials: 'include'
});
const { user_transcriptions, usage } = await response.json();

// Cancel a transcription job
await fetch('/api/workbook/audio/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'cancel',
    transcriptionId: 'transcription-uuid'
  }),
  credentials: 'include'
});

// Retry a failed transcription
await fetch('/api/workbook/audio/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'retry',
    transcriptionId: 'failed-transcription-uuid'
  }),
  credentials: 'include'
});

// Update job priority (premium feature)
await fetch('/api/workbook/audio/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update_priority',
    transcriptionId: 'transcription-uuid',
    priority: 'high'
  }),
  credentials: 'include'
});
```

### 3. Advanced Search API (`/api/workbook/search/transcriptions`)

**Features:**
- ✅ **Full-Text Search**: PostgreSQL tsvector-based search with ranking
- ✅ **Advanced Filtering**: Filter by language, confidence, date range, topics
- ✅ **Search Aggregations**: Analytics on search results
- ✅ **Semantic Search**: Placeholder for future vector embedding search

**Usage Examples:**

```typescript
// Simple search
const response = await fetch(
  '/api/workbook/search/transcriptions?q=business strategy&limit=10&page=1',
  { credentials: 'include' }
);
const { results, pagination } = await response.json();

// Advanced search with filters
const searchRequest = {
  query: "revenue growth",
  filters: {
    language: "en",
    min_confidence: 0.8,
    date_range: {
      start: "2024-01-01",
      end: "2024-12-31"
    },
    key_topics: ["business", "strategy"]
  },
  aggregations: ["language_counts", "monthly_usage", "top_topics"],
  sort_by: "relevance",
  sort_order: "desc",
  page: 1,
  limit: 20
};

const response = await fetch('/api/workbook/search/transcriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(searchRequest),
  credentials: 'include'
});

const { results, aggregations, pagination } = await response.json();
```

### 4. Enhanced VoiceRecorder Component

**Features:**
- ✅ **Automatic Transcription**: Seamless integration with transcription API
- ✅ **Real-time Status**: Live transcription status and progress tracking
- ✅ **File Upload**: Support for uploading existing audio files
- ✅ **Metadata Tagging**: Automatic tagging with session and module information
- ✅ **Error Handling**: Comprehensive error handling and retry logic

**Usage Examples:**

```tsx
import { VoiceRecorder } from '@/components/workbook/VoiceRecorder';

function WorkshopPage() {
  const handleTranscriptionComplete = (transcription) => {
    console.log('Transcription completed:', transcription);
    // Process the completed transcription
  };

  const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    // Handle transcription errors
  };

  return (
    <VoiceRecorder
      userId="user-uuid"
      sessionInfo={{
        day: 1,
        session: "Business Foundations",
        speaker: "John Doe",
        sessionId: "session-uuid"
      }}
      moduleId="business-foundations"
      autoSave={true}
      autoTranscribe={true}
      showVisualizer={true}
      onTranscriptionComplete={handleTranscriptionComplete}
      onError={handleError}
    />
  );
}
```

### 5. Admin Analytics API (`/api/workbook/admin/transcription-analytics`)

**Features:**
- ✅ **Comprehensive Analytics**: Detailed analytics for system monitoring
- ✅ **Performance Metrics**: Processing times, success rates, error analysis
- ✅ **Cost Analysis**: Detailed cost breakdown by user, provider, time period
- ✅ **Export Capabilities**: CSV export for reports

**Usage Examples:**

```typescript
// Get analytics dashboard data
const response = await fetch(
  '/api/workbook/admin/transcription-analytics?range=30d&breakdown=daily',
  { credentials: 'include' }
);
const { analytics } = await response.json();

// Generate detailed report
const reportRequest = {
  report_type: "user_usage",
  time_range: "30d",
  export_format: "csv"
};

const response = await fetch('/api/workbook/admin/transcription-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reportRequest),
  credentials: 'include'
});

// Response will be CSV for download
```

## Database Schema

### Core Tables

The integration uses several database tables for comprehensive functionality:

1. **`transcriptions`** - Main transcription records
2. **`transcription_segments`** - Detailed segment data with timestamps
3. **`transcription_words`** - Word-level timestamps and confidence
4. **`transcription_queue`** - Job queue management
5. **`cost_tracking`** - Detailed cost tracking and billing

### Key Fields

```sql
-- Enhanced transcriptions table
ALTER TABLE transcriptions ADD COLUMN error_message TEXT;
ALTER TABLE transcriptions ADD COLUMN formatted_text TEXT;
ALTER TABLE transcriptions ADD COLUMN sentiment_score DECIMAL(3,2);
ALTER TABLE transcriptions ADD COLUMN action_items TEXT[];

-- Search indexes for performance
CREATE INDEX idx_transcriptions_gin_combined ON transcriptions USING gin(
    to_tsvector('english',
        COALESCE(text, '') || ' ' ||
        COALESCE(summary, '') || ' ' ||
        COALESCE(array_to_string(key_topics, ' '), '')
    )
);
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/workbook_db

# Optional: Redis for production queue management
REDIS_URL=redis://localhost:6379
```

### User Limits Configuration

Users have configurable limits based on subscription tiers:

```typescript
// Default limits per subscription tier
const SUBSCRIPTION_LIMITS = {
  basic: {
    daily_transcription_minutes: 30,
    monthly_cost_limit_cents: 2000, // $20
    max_file_size_mb: 25,
    priority_levels: ['normal']
  },
  premium: {
    daily_transcription_minutes: 120,
    monthly_cost_limit_cents: 5000, // $50
    max_file_size_mb: 100,
    priority_levels: ['normal', 'high']
  },
  enterprise: {
    daily_transcription_minutes: 500,
    monthly_cost_limit_cents: 20000, // $200
    max_file_size_mb: 100,
    priority_levels: ['low', 'normal', 'high']
  }
};
```

## Cost Management

### Pricing Structure

- **OpenAI Whisper API**: $0.006 per minute (60 cents per minute in the system)
- **Storage**: Minimal cost for PostgreSQL storage
- **Processing**: Compute costs for chunking and indexing

### Cost Tracking

The system tracks costs at multiple levels:

1. **Per User**: Daily and monthly spending limits
2. **Per Session**: Session-based cost allocation
3. **Per Transcription**: Individual job costing
4. **System-wide**: Total platform costs and margins

## Performance Optimizations

### 1. Chunked Processing

Large audio files are automatically split into 20MB chunks for processing:

```typescript
// Automatic chunking for files > 25MB
if (audioFile.size > 25 * 1024 * 1024) {
  const chunks = await splitAudioIntoChunks(audioFile, 20 * 1024 * 1024);
  // Process each chunk independently
}
```

### 2. Queue Management

Background processing prevents API timeouts:

```typescript
// Queue for large files, immediate processing for small files
const shouldQueue = enableChunking || audioFile.size > 10 * 1024 * 1024;

if (shouldQueue) {
  addToQueue(transcriptionJob);
  return { status: 'pending', queuePosition: queue.length };
} else {
  const result = await processImmediately(transcriptionJob);
  return { status: 'completed', transcription: result };
}
```

### 3. Search Indexing

Automatic search vector generation for fast full-text search:

```sql
-- Automatic search vector updates
CREATE TRIGGER update_transcriptions_search
    BEFORE INSERT OR UPDATE ON transcriptions
    FOR EACH ROW EXECUTE PROCEDURE update_transcription_search_vector_enhanced();
```

## Error Handling

### Retry Logic

The system implements exponential backoff retry for failed transcriptions:

```typescript
// Retry with exponential backoff
async function transcribeWithRetry(params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openai.audio.transcriptions.create(params);
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### Error Types

Common error scenarios and handling:

1. **Rate Limiting**: Automatic retry with backoff
2. **File Size Limits**: Clear error messages with guidance
3. **Unsupported Formats**: Format validation before processing
4. **Network Issues**: Retry logic with exponential backoff
5. **Usage Limits**: Clear messaging about daily/monthly limits

## Production Deployment

### Scaling Considerations

1. **Queue Management**: Use Redis for production queue management
2. **File Storage**: Use AWS S3 for audio file storage
3. **Database**: PostgreSQL with read replicas for search queries
4. **Monitoring**: Comprehensive logging and metrics collection

### Security

1. **Authentication**: JWT token-based authentication
2. **Authorization**: Role-based permissions (basic, premium, admin)
3. **Data Privacy**: User data isolation and encryption
4. **API Security**: Rate limiting and input validation

## Testing

### Unit Tests

```bash
# Run transcription API tests
npm test src/app/api/workbook/audio/transcribe

# Run VoiceRecorder component tests
npm test src/components/workbook/VoiceRecorder
```

### Integration Tests

```bash
# Test full transcription pipeline
npm run test:integration
```

### Load Testing

```bash
# Test system under load
npm run test:load
```

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Transcription Success Rate**: Target >95%
2. **Average Processing Time**: Target <30 seconds per minute of audio
3. **Queue Length**: Target <10 jobs during peak hours
4. **Cost Per Minute**: Monitor against OpenAI pricing
5. **User Satisfaction**: Error rates and completion rates

### Maintenance Tasks

1. **Daily**: Monitor queue health and error rates
2. **Weekly**: Review cost trends and user usage patterns
3. **Monthly**: Clean up old failed transcriptions and optimize indexes
4. **Quarterly**: Review and update subscription limits and pricing

## Support and Troubleshooting

### Common Issues

1. **"Transcription failed: Rate limit exceeded"**
   - Solution: Wait for rate limit reset or upgrade subscription

2. **"Audio file too large"**
   - Solution: Enable chunking or compress audio file

3. **"Daily transcription limit exceeded"**
   - Solution: Wait for daily reset or upgrade subscription

4. **"Unsupported audio format"**
   - Solution: Convert to supported format (mp3, wav, m4a, webm, ogg)

### Debug Mode

Enable debug logging for troubleshooting:

```bash
DEBUG=transcription:* npm start
```

## Future Enhancements

### Planned Features

1. **Semantic Search**: Vector embeddings for semantic search
2. **Speaker Identification**: Multi-speaker transcription support
3. **Real-time Transcription**: Live transcription during recording
4. **Custom Models**: Fine-tuned models for specific domains
5. **Batch Processing**: Bulk transcription processing

### Roadmap

- **Q1 2025**: Semantic search implementation
- **Q2 2025**: Speaker identification and diarization
- **Q3 2025**: Real-time transcription capabilities
- **Q4 2025**: Custom model fine-tuning

---

For technical support or questions about this integration, please refer to the development team or create an issue in the project repository.