# API Contract Tests

This directory contains comprehensive API contract tests for the 6FB Workbook system, validating all endpoints against the OpenAPI specification located at:

`/Users/bossio/6fb-methodologies/specs/001-deep-analysis-6fb/contracts/workbook-api.yaml`

## Overview

These tests implement a **Test-Driven Development (TDD)** approach where:

1. ✅ **All tests are written first** (based on the OpenAPI spec)
2. ❌ **All tests FAIL initially** (APIs not implemented yet)
3. 🎯 **Tests drive API implementation** (implement to make tests pass)
4. 🔄 **Red-Green-Refactor cycle** (fail → implement → pass → refactor)

## Test Coverage

### T006-T012: Complete API Contract Coverage

| Test File | Endpoints Covered | Status |
|-----------|-------------------|---------|
| `modules.test.ts` | Workshop modules API | ✅ Complete |
| `progress.test.ts` | Progress tracking API | ✅ Complete |
| `recordings.test.ts` | Audio recordings API | ✅ Complete |
| `transcriptions.test.ts` | Transcription API | ✅ Complete |
| `notes.test.ts` | Notes management API | ✅ Complete |
| `export.test.ts` | Data export API | ✅ Complete |
| `sessions.test.ts` | Live sessions API | ✅ Complete |

### API Endpoints Tested

#### Workshop Modules (`modules.test.ts`)
- `GET /workbook/modules` - List modules with progress
- `GET /workbook/modules/{moduleId}` - Get module details
- `GET /workbook/modules/{moduleId}/lessons/{lessonId}` - Get lesson content

#### Progress Tracking (`progress.test.ts`)
- `GET /workbook/progress` - User progress overview
- `GET /workbook/progress/{moduleId}` - Module-specific progress
- `PUT /workbook/progress/{moduleId}` - Update progress

#### Audio Recordings (`recordings.test.ts`)
- `GET /workbook/recordings` - List recordings with pagination
- `POST /workbook/recordings` - Upload audio file
- `GET /workbook/recordings/{recordingId}` - Get recording details
- `DELETE /workbook/recordings/{recordingId}` - Delete recording

#### Transcriptions (`transcriptions.test.ts`)
- `POST /workbook/transcribe` - Start transcription
- `GET /workbook/transcriptions` - List transcriptions
- `GET /workbook/transcriptions/search` - Search transcriptions

#### Notes (`notes.test.ts`)
- `GET /workbook/notes` - List notes with filtering
- `POST /workbook/notes` - Create note
- `GET /workbook/notes/{noteId}` - Get note details
- `PUT /workbook/notes/{noteId}` - Update note
- `DELETE /workbook/notes/{noteId}` - Delete note

#### Export (`export.test.ts`)
- `POST /workbook/export` - Export data (PDF, JSON, Markdown, CSV)

#### Live Sessions (`sessions.test.ts`)
- `GET /workbook/sessions` - List live sessions
- `POST /workbook/sessions/{sessionId}/join` - Join session

## Test Categories

Each test file covers:

### 🔐 Authentication Tests
- Valid JWT token required
- 401 responses for missing/invalid tokens
- Proper authorization header handling

### ✅ Successful Request Tests
- Valid request/response schemas
- Correct HTTP status codes
- Proper data types and formats
- Business logic validation

### ❌ Error Scenario Tests
- Invalid input validation
- Resource not found (404)
- Bad request format (400)
- Server errors (500)

### 📊 Data Validation Tests
- UUID format validation
- ISO 8601 timestamp validation
- URL format validation
- Enum value validation
- Required field validation
- Data type validation

### 🔄 Business Logic Tests
- Progress calculation
- Status transitions
- Access control
- Rate limiting
- Pagination
- Sorting and filtering

## Running Tests

### All Contract Tests
```bash
npm run test:contract
```

### Individual Test Files
```bash
# Workshop modules API
npm run test:contract -- modules.test.ts

# Progress tracking API
npm run test:contract -- progress.test.ts

# Audio recordings API
npm run test:contract -- recordings.test.ts

# Transcription API
npm run test:contract -- transcriptions.test.ts

# Notes API
npm run test:contract -- notes.test.ts

# Export API
npm run test:contract -- export.test.ts

# Live sessions API
npm run test:contract -- sessions.test.ts
```

### Watch Mode
```bash
npm run test:contract:watch
```

### Coverage Report
```bash
npm run test:contract:coverage
```

## Expected Test Results

### ❌ Initial State (APIs Not Implemented)
All tests should **FAIL** with connection errors or 404 responses because the API endpoints don't exist yet.

### 🎯 Development Goal
Implement APIs to make tests **PASS** one by one, following TDD principles.

### ✅ Final State (APIs Implemented)
All tests should **PASS** when APIs are fully implemented according to the OpenAPI specification.

## Test Structure

### Common Setup (`setup.ts`)
- Mock authentication tokens
- Common validation helpers
- Response schema validators
- Test data generators
- Utility functions

### Mock Data
All tests use consistent mock UUIDs and data:
- `MOCK_USER_ID`: `550e8400-e29b-41d4-a716-446655440000`
- `MOCK_MODULE_ID`: `550e8400-e29b-41d4-a716-446655440001`
- `MOCK_RECORDING_ID`: `550e8400-e29b-41d4-a716-446655440002`
- etc.

### Validation Helpers
- `ContractValidator`: UUID, datetime, email validation
- `ResponseValidators`: Error, pagination, common schema validation
- `TestUtils`: Authenticated/unauthenticated request helpers

## Implementation Guidelines

When implementing APIs to satisfy these tests:

### 1. Start with Authentication
- Implement JWT token validation
- Return proper 401 responses
- Support Bearer token format

### 2. Implement Basic CRUD
- GET endpoints first (easier to test)
- POST endpoints with validation
- PUT/DELETE with proper responses

### 3. Add Business Logic
- Progress calculation
- Status transitions
- Access control rules

### 4. Optimize and Refactor
- Add caching where appropriate
- Optimize database queries
- Add rate limiting

## File Upload Testing

The audio recordings tests include multipart form data upload testing:

```typescript
.attach('audio_file', TestUtils.mockAudioFile(), 'test-recording.mp3')
.field('module_id', MOCK_MODULE_ID)
```

## WebSocket Testing

Live sessions tests validate WebSocket URLs for real-time features:

```typescript
expect(response.body.websocket_url).toMatch(/^wss?:\/\//);
```

## Contributing

When adding new endpoints to the OpenAPI specification:

1. Add corresponding contract tests
2. Follow the existing test patterns
3. Include authentication, validation, and error tests
4. Update this README with new endpoint coverage

## Troubleshooting

### Common Issues

1. **Tests fail with connection errors**
   - Expected for unimplemented APIs
   - Start implementing endpoints to fix

2. **Invalid mock data**
   - Check UUID formats in setup.ts
   - Ensure timestamps are valid ISO 8601

3. **Authentication failures**
   - Verify MOCK_AUTH_TOKEN format
   - Check JWT secret configuration

### Debug Mode

Run tests with debug output:
```bash
DEBUG=1 npm run test:contract
```

## Next Steps

1. **Implement APIs**: Use these tests to drive TDD implementation
2. **Integration Tests**: Add integration tests after contract tests pass
3. **Performance Tests**: Add load testing for critical endpoints
4. **Security Tests**: Add security-focused test scenarios

---

**Remember**: These tests are designed to FAIL initially. They serve as a specification for what needs to be built. Success is measured by making all tests pass through proper API implementation! 🎯