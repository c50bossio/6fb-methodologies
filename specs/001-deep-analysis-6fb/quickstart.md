# 6FB Workbook Quick Start Guide

## Overview
This quickstart guide provides step-by-step instructions for setting up, testing, and validating the 6FB Workbook system implementation.

## Prerequisites

### System Requirements
- **Node.js**: v18.0+ with npm
- **PostgreSQL**: v14+ running locally or accessible remote instance
- **Git**: For version control
- **Browser**: Chrome/Firefox/Safari for testing
- **Audio Device**: Microphone for recording features

### Environment Setup
```bash
# Clone the repository
git clone https://github.com/6fb-methodologies/workbook.git
cd workbook

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables
Configure the following variables in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/workbook_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI (for transcription)
OPENAI_API_KEY="sk-your-openai-api-key"

# File Storage (AWS S3 or compatible)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="workbook-audio-files"

# Optional: Real-time features
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_SECRET="your-pusher-secret"
PUSHER_KEY="your-pusher-key"
PUSHER_CLUSTER="us2"
```

## Database Setup

### 1. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE workbook_db;
CREATE USER workbook_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE workbook_db TO workbook_user;
\q
```

### 2. Run Migrations
```bash
# Initialize database schema
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 3. Verify Database
```bash
# Connect to workbook database
psql -U workbook_user -d workbook_db

# Check tables were created
\dt

# Verify sample data
SELECT * FROM workshop_modules ORDER BY module_order;
SELECT * FROM workbook_users LIMIT 5;
\q
```

## Development Server

### 1. Start Development Environment
```bash
# Start Next.js development server
npm run dev

# In another terminal, start Socket.io server (if using real-time features)
npm run dev:socket
```

### 2. Verify Server
- **Frontend**: Open http://localhost:3000
- **API Health**: Visit http://localhost:3000/api/health
- **API Docs**: Visit http://localhost:3000/api/docs (Swagger UI)

### 3. Test Authentication
```bash
# Register test user
curl -X POST http://localhost:3000/api/workbook/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "subscriptionTier": "premium"
  }'

# Login test user
curl -X POST http://localhost:3000/api/workbook/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test-access-code"
  }'
```

## Feature Testing

### 1. Workshop Modules
**Test Scenario**: User accesses workshop content and tracks progress

```bash
# Get all modules
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/workbook/modules

# Get specific module with progress
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/workbook/modules/MODULE_ID

# Update progress
curl -X PUT http://localhost:3000/api/workbook/progress/MODULE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress_percent": 50,
    "time_spent_minutes": 30
  }'
```

**Frontend Test**:
1. Login to the workbook application
2. Navigate to workshop modules
3. Click on "Module 1: Introduction"
4. Verify content loads and progress tracks
5. Complete a lesson and verify progress updates

### 2. Audio Recording & Transcription
**Test Scenario**: User records audio and receives transcription

```bash
# Upload audio file
curl -X POST http://localhost:3000/api/workbook/recordings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio_file=@test-audio.wav" \
  -F "module_id=MODULE_ID"

# Start transcription
curl -X POST http://localhost:3000/api/workbook/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recording_id": "RECORDING_ID"
  }'

# Check transcription status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/workbook/transcriptions/TRANSCRIPTION_ID
```

**Frontend Test**:
1. Navigate to any workshop module
2. Click the microphone icon to start recording
3. Record 10-15 seconds of clear speech
4. Stop recording and wait for processing
5. Verify transcription appears with reasonable accuracy

### 3. Note-Taking System
**Test Scenario**: User creates, edits, and searches notes

```bash
# Create note
curl -X POST http://localhost:3000/api/workbook/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Module 1 Key Insights",
    "content": "<p>The 6FB methodology focuses on <strong>systematic revenue optimization</strong> through...</p>",
    "module_id": "MODULE_ID",
    "tags": ["revenue", "optimization", "methodology"]
  }'

# Search notes
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/workbook/notes?search=revenue&tags=methodology"

# Update note
curl -X PUT http://localhost:3000/api/workbook/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "<p>Updated content with additional insights...</p>"
  }'
```

**Frontend Test**:
1. Navigate to any workshop module
2. Click "Add Note" button
3. Create a formatted note with bold text and lists
4. Add tags and save the note
5. Use the search feature to find the note
6. Edit the note and verify auto-save works

### 4. Export Functionality
**Test Scenario**: User exports their workbook data

```bash
# Export as PDF
curl -X POST http://localhost:3000/api/workbook/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "include_notes": true,
    "include_transcriptions": true,
    "include_progress": true
  }'

# Export as JSON backup
curl -X POST http://localhost:3000/api/workbook/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "include_audio": false,
    "include_transcriptions": true,
    "include_notes": true,
    "include_progress": true
  }'
```

**Frontend Test**:
1. Navigate to user settings or export page
2. Select PDF export format
3. Choose to include notes and transcriptions
4. Start export and verify download link appears
5. Download and verify PDF contains formatted content

### 5. Live Sessions (if implemented)
**Test Scenario**: User joins a live workshop session

```bash
# Get available sessions
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/workbook/sessions

# Join session
curl -X POST http://localhost:3000/api/workbook/sessions/SESSION_ID/join \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Frontend Test**:
1. Navigate to live sessions page
2. Find an active or scheduled session
3. Click "Join Session"
4. Verify real-time features work (participant list, chat)
5. Test interactive features if available

## Performance Testing

### 1. Load Testing
```bash
# Install Artillery (load testing tool)
npm install -g artillery

# Create load test configuration
cat > loadtest.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer YOUR_JWT_TOKEN'

scenarios:
  - name: "Workshop Module Access"
    flow:
      - get:
          url: "/api/workbook/modules"
      - get:
          url: "/api/workbook/progress"
      - think: 2
      - get:
          url: "/api/workbook/notes?limit=20"
EOF

# Run load test
artillery run loadtest.yml
```

### 2. Audio Processing Performance
```bash
# Time transcription processing
time curl -X POST http://localhost:3000/api/workbook/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recording_id": "RECORDING_ID"}'

# Monitor transcription completion
while true; do
  status=$(curl -s -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    http://localhost:3000/api/workbook/transcriptions/TRANSCRIPTION_ID | \
    jq -r '.status')
  echo "Status: $status"
  [ "$status" = "completed" ] && break
  sleep 2
done
```

### 3. Search Performance
```bash
# Test search response times
for query in "revenue" "methodology" "optimization" "barber" "6FB"; do
  echo "Testing search for: $query"
  time curl -s -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    "http://localhost:3000/api/workbook/notes?search=$query" > /dev/null
done
```

## Integration Testing

### 1. End-to-End User Journey
**Test Scenario**: Complete user workflow from registration to completion

```bash
#!/bin/bash
# E2E test script

# 1. Register user
USER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/workbook/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@example.com",
    "firstName": "E2E",
    "lastName": "Test"
  }')

# 2. Login user
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/workbook/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@example.com",
    "password": "test-code"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

# 3. Get modules
MODULES=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/workbook/modules)

MODULE_ID=$(echo $MODULES | jq -r '.modules[0].id')

# 4. Update progress
curl -s -X PUT http://localhost:3000/api/workbook/progress/$MODULE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"progress_percent": 100}'

# 5. Create note
NOTE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/workbook/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "E2E Test Note",
    "content": "This is a test note from the E2E test",
    "module_id": "'$MODULE_ID'"
  }')

# 6. Export data
EXPORT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/workbook/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "include_notes": true,
    "include_progress": true
  }')

echo "E2E test completed successfully!"
echo "Export URL: $(echo $EXPORT_RESPONSE | jq -r '.download_url')"
```

### 2. Browser Testing
```bash
# Install Playwright for browser testing
npm install -D @playwright/test

# Run browser tests
npx playwright test

# Run specific test
npx playwright test tests/e2e/workbook-flow.spec.ts

# Run tests with UI
npx playwright test --ui
```

## Monitoring & Debugging

### 1. Application Logs
```bash
# View Next.js logs
npm run dev 2>&1 | tee app.log

# Monitor database queries (if logging enabled)
tail -f postgresql.log | grep workbook_db

# Check error rates
grep "ERROR" app.log | wc -l
```

### 2. Health Checks
```bash
# API health check
curl http://localhost:3000/api/health

# Database connectivity
curl http://localhost:3000/api/health/db

# External services
curl http://localhost:3000/api/health/external
```

### 3. Performance Monitoring
```bash
# API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/workbook/modules

# Memory usage
ps aux | grep node

# Database connections
psql -U workbook_user -d workbook_db -c "SELECT count(*) FROM pg_stat_activity WHERE datname='workbook_db';"
```

## Validation Checklist

### ✅ Core Features
- [ ] User authentication and authorization working
- [ ] Workshop modules load with correct content
- [ ] Progress tracking updates correctly
- [ ] Audio recording captures and stores files
- [ ] Transcription processes audio and returns text
- [ ] Note creation, editing, and search functional
- [ ] Export generates downloadable files
- [ ] Real-time features work (if implemented)

### ✅ Performance Requirements
- [ ] Page loads complete in < 2 seconds
- [ ] Audio transcription completes in < 30 seconds
- [ ] Search results return in < 500ms
- [ ] System handles 10+ concurrent users
- [ ] Mobile audio recording works on iOS/Android

### ✅ Data Integrity
- [ ] User progress persists across sessions
- [ ] Audio files upload and store correctly
- [ ] Notes save automatically and preserve formatting
- [ ] Export includes all selected data
- [ ] No data loss during normal operations

### ✅ Security
- [ ] Authentication tokens expire appropriately
- [ ] API endpoints require valid authorization
- [ ] File uploads are validated and secure
- [ ] User data is isolated and private
- [ ] HTTPS enforced in production

### ✅ User Experience
- [ ] Interface is responsive on mobile devices
- [ ] Audio recording has clear visual feedback
- [ ] Loading states provide user feedback
- [ ] Error messages are helpful and clear
- [ ] Navigation is intuitive and consistent

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify database exists
psql -U postgres -l | grep workbook_db

# Test connection with credentials
psql -U workbook_user -d workbook_db -c "SELECT 1;"
```

**2. Audio Recording Not Working**
- Check browser permissions for microphone access
- Verify HTTPS in production (required for getUserMedia)
- Test with different audio formats
- Check network connectivity for uploads

**3. Transcription Failures**
```bash
# Check OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Verify audio file format
file uploaded-audio.wav

# Check file size (must be < 25MB for OpenAI)
du -h uploaded-audio.wav
```

**4. Performance Issues**
```bash
# Check memory usage
free -h

# Monitor database performance
psql -U workbook_user -d workbook_db -c "SELECT * FROM pg_stat_activity;"

# Check for slow queries
tail -f postgresql.log | grep "slow query"
```

**5. Real-time Features Not Working**
- Check WebSocket connection in browser dev tools
- Verify Socket.io server is running
- Test with multiple browser tabs
- Check firewall/proxy settings

## Production Deployment

### Pre-deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] SSL certificates installed and valid
- [ ] File storage (S3) configured and accessible
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit passed

### Deployment Commands
```bash
# Build production assets
npm run build

# Run production server
npm start

# Or deploy to Vercel
vercel --prod

# Or use Docker
docker build -t workbook .
docker run -p 3000:3000 workbook
```

This quickstart guide provides comprehensive testing and validation procedures to ensure the 6FB Workbook system is working correctly and meets all specified requirements.