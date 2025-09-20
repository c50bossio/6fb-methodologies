# 6FB Workbook Integration Tests

This directory contains comprehensive integration tests for the 6FB Methodologies Workbook platform, validating end-to-end user workflows and system integrations.

## Test Suites Overview

### T013: Complete User Journey E2E Test (`user-journey.spec.ts`)
**File**: `__tests__/e2e/user-journey.spec.ts`

Tests the complete user workflow from registration through module completion:
- ✅ User registration and authentication
- ✅ Module access and progress tracking
- ✅ Audio recording during lessons
- ✅ Note creation with rich text
- ✅ Data persistence across sessions
- ✅ Authentication state management
- ✅ Error handling and recovery

**Key Scenarios**:
- Full registration → login → module progress → audio recording → note creation workflow
- Authentication state persistence across browser refresh
- Session timeout handling
- Work-in-progress preservation during network issues
- Comprehensive error scenario testing

### T014: Audio Transcription Workflow Integration Test (`audio-transcription.test.ts`)
**File**: `__tests__/integration/audio-transcription.test.ts`

Tests the complete audio processing pipeline:
- ✅ Audio file upload and validation
- ✅ S3 storage integration (mocked)
- ✅ OpenAI Whisper API integration (mocked)
- ✅ Transcription processing and status tracking
- ✅ Search functionality across transcriptions
- ✅ Resource cleanup and error handling
- ✅ Performance and scalability testing

**Key Features Tested**:
- Multiple audio format support (MP3, WAV, M4A, WebM)
- File size validation and error handling
- OpenAI API retry logic and error recovery
- Concurrent transcription processing
- Rate limiting compliance
- S3 cleanup on deletion

### T015: Note-taking with Search Integration Test (`note-search.test.ts`)
**File**: `__tests__/integration/note-search.test.ts`

Tests the complete note lifecycle with advanced search:
- ✅ Rich text note creation and editing
- ✅ Hierarchical tagging system
- ✅ Full-text search with highlighting
- ✅ Advanced search operators (AND, OR, NOT, phrases)
- ✅ Export functionality (PDF, Markdown, JSON, ZIP)
- ✅ Note organization and cross-references
- ✅ Template system and quick creation

**Key Features Tested**:
- HTML content preservation and word count calculation
- Tag suggestions and filtering
- Search across notes and transcriptions
- Multi-format export with metadata
- Note linking to audio recordings and lessons
- Performance with large note sets

## Running the Tests

### Quick Start
```bash
# Run all integration tests with coverage
npm run test:workbook

# Run specific test suite
npm run test:integration:t013  # User Journey E2E
npm run test:integration:t014  # Audio Transcription
npm run test:integration:t015  # Note Search

# Watch mode for development
npm run test:workbook:watch
```

### Advanced Usage
```bash
# Run with custom test runner (recommended)
node __tests__/run-integration-tests.ts --verbose --coverage

# Run specific suite with verbose output
node __tests__/run-integration-tests.ts --suite T014 --verbose

# Run in watch mode
node __tests__/run-integration-tests.ts --watch --suite T015

# Parallel execution
node __tests__/run-integration-tests.ts --parallel --max-workers 4
```

### Individual Test Commands
```bash
# Jest-based integration tests
jest __tests__/integration/audio-transcription.test.ts --config __tests__/integration/jest.config.js
jest __tests__/integration/note-search.test.ts --config __tests__/integration/jest.config.js

# Playwright E2E tests
playwright test __tests__/e2e/user-journey.spec.ts
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Environment**: Node.js with TypeScript support
- **Mocking**: AWS S3, OpenAI, File System operations
- **Coverage**: API routes, lib functions, middleware
- **Timeout**: 30 seconds per test
- **Parallel**: 50% of available cores

### Playwright Configuration
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Base URL**: http://localhost:3000
- **Screenshots**: On failure
- **Video**: Retained on failure
- **Traces**: On first retry

## Mock Services

### AWS S3 Storage
```typescript
// Mocked S3 operations
mockS3Upload.mockResolvedValue({
  ETag: '"mock-etag"',
  Location: 'https://mock-bucket.s3.amazonaws.com/test-file.mp3'
});
```

### OpenAI Whisper API
```typescript
// Mocked transcription response
mockOpenAITranscribe.mockResolvedValue({
  text: 'Sample transcription text',
  language: 'en',
  duration: 30.5,
  segments: [...]
});
```

### File System Operations
```typescript
// Mocked file operations for exports
mockWriteFile.mockResolvedValue(undefined);
mockCreateReadStream.mockReturnValue(mockStream);
```

## Test Data Patterns

### Standard Test User
```typescript
const TEST_USER = {
  email: 'e2e-test-user@6fbmethodologies.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
  customerId: 'test-customer-12345'
};
```

### Sample Module Structure
```typescript
const TEST_MODULE = {
  id: 'module-1-foundations',
  title: 'Module 1: Foundation Principles',
  lessonId: 'lesson-1-intro'
};
```

### Rich Text Note Content
```html
<h2>Key Insights from 6FB Methodology</h2>
<p>The <strong>six figure barber methodology</strong> emphasizes:</p>
<ul>
  <li>Premium service positioning</li>
  <li>Customer retention strategies</li>
  <li>Revenue optimization through value-based pricing</li>
</ul>
```

## Performance Expectations

### Response Time Targets
- **API Responses**: < 2 seconds
- **File Uploads**: < 5 seconds
- **Search Queries**: < 1 second
- **Export Generation**: < 10 seconds

### Scalability Testing
- **Concurrent Users**: 10+ simultaneous operations
- **Large Files**: Up to 25MB audio files
- **Bulk Operations**: 20+ notes created/searched
- **Rate Limiting**: Proper throttling under load

## Error Handling Coverage

### Network Errors
- ✅ Connection timeouts
- ✅ Intermittent failures
- ✅ Rate limiting responses
- ✅ Service unavailability

### Data Validation
- ✅ Invalid file types/sizes
- ✅ Malformed requests
- ✅ Missing authentication
- ✅ Permission errors

### Recovery Scenarios
- ✅ Auto-retry mechanisms
- ✅ Graceful degradation
- ✅ Data preservation
- ✅ User feedback

## Coverage Reports

Integration tests generate comprehensive coverage reports:

```bash
# Generate coverage report
npm run test:integration:coverage

# View reports
open coverage/integration/lcov-report/index.html
```

**Target Coverage**:
- **API Routes**: > 90%
- **Business Logic**: > 85%
- **Error Paths**: > 80%

## Troubleshooting

### Common Issues

**Tests timing out**:
```bash
# Increase timeout
jest --testTimeout=60000
```

**Mock cleanup issues**:
```bash
# Reset between tests
jest.clearAllMocks();
```

**Database state problems**:
```bash
# Reset test database
npm run test:setup
```

### Debug Mode
```bash
# Playwright debug mode
npm run test:e2e:debug

# Jest debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Logging
```bash
# Enable verbose output
DEBUG=* npm run test:workbook
```

## Contributing

### Adding New Tests
1. Follow existing test patterns
2. Use proper mocking for external services
3. Include error scenarios
4. Add performance expectations
5. Update this README

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Happy Path', () => {
    it('should handle successful scenario', async () => {
      // Test implementation
    });
  });

  describe('Error Scenarios', () => {
    it('should handle specific error case', async () => {
      // Error test implementation
    });
  });
});
```

### Custom Matchers
The test setup includes custom Jest matchers:
- `toBeValidUUID()` - Validates UUID format
- `toBeValidEmail()` - Validates email format
- `toMatchAudioFileStructure()` - Validates audio response
- `toMatchNoteStructure()` - Validates note response
- `toHaveValidSearchHighlight()` - Validates search highlighting

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Integration Tests
  run: npm run test:workbook

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/integration/lcov.info
```

### Test Results
Integration tests generate:
- ✅ JUnit XML reports for CI
- ✅ JSON results for processing
- ✅ HTML coverage reports
- ✅ Performance metrics

---

## Summary

These integration tests provide comprehensive coverage of the 6FB Workbook platform's core functionality, ensuring:

- **User Experience**: Complete workflows work seamlessly
- **Data Integrity**: Information persists correctly across operations
- **Performance**: System meets response time expectations
- **Reliability**: Errors are handled gracefully with proper recovery
- **Scalability**: Platform can handle concurrent operations

The tests serve as both validation and documentation of the system's expected behavior, supporting confident deployment and maintenance of the 6FB Methodologies Workbook platform.