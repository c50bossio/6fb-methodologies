# 6FB Workbook Database System

This directory contains the complete database infrastructure for the 6FB Workbook system, providing production-ready database utilities, comprehensive seeding, and management tools.

## 🏗️ Architecture Overview

The database system is built with PostgreSQL and provides:

- **Production-ready connection pooling** with retry logic and health monitoring
- **Advanced query builders** for complex operations with type safety
- **Performance monitoring** with real-time metrics and slow query detection
- **Automated migration management** with rollback support
- **Backup and restore capabilities** with compression and retention policies
- **Comprehensive workshop content** based on Six Figure Barber methodology

## 📁 Directory Structure

```
database/
├── init/                    # Schema initialization files
│   ├── 01-schema.sql       # Core database schema
│   └── 02-workbook-schema.sql # Workbook-specific tables
├── migrations/             # Database migration files
│   └── [timestamp]-description.sql
├── seeds/                  # Data seeding files
│   └── workshop-content.sql # Complete workshop content and sample data
├── scripts/                # Database management scripts
│   └── seed-database.ts    # TypeScript seeding script
├── backups/               # Automated database backups
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

1. PostgreSQL 12+ running locally or remotely
2. Environment variables configured:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sixfb_workbook
DB_USER=app_user
DB_PASSWORD=your_secure_password
```

### Basic Setup

```bash
# Initialize database schema
npm run db:setup

# Seed with workshop content and sample data
npm run db:seed

# Verify health and performance
npm run db:health
npm run db:performance
```

## 📊 Database Schema

### Core Tables

#### Users and Authentication
- `workbook_users` - User profiles with subscription tiers and preferences
- `rate_limits` - API rate limiting per user

#### Workshop Content
- `workshop_modules` - 6 comprehensive business modules
- `workshop_lessons` - Individual lessons with various content types
- `live_sessions` - Scheduled and completed live workshops
- `live_session_participants` - Attendance and feedback tracking

#### Learning Progress
- `user_progress` - Module-level completion tracking
- `lesson_progress` - Detailed lesson progress with positions and scores
- `user_achievements` - Milestone and accomplishment tracking

#### Audio and Transcription
- `workbook_sessions` - User recording sessions
- `audio_recordings` - Audio files with metadata and storage info
- `transcriptions` - AI-generated transcripts with insights
- `transcription_jobs` - Queue management for transcription processing

#### Notes and Content
- `session_notes` - Rich user notes with tags and searchability
- `cost_tracking` - Service usage and billing tracking
- `system_metrics` - Performance and usage monitoring

## 🔧 Database Utilities

### Connection Management

The enhanced database connection class provides:

```typescript
import db from '../src/lib/database.js';

// Basic operations
const users = await db.query('SELECT * FROM workbook_users');
const user = await db.queryOne('SELECT * FROM workbook_users WHERE id = ?', [userId]);

// Transactions with automatic rollback
await db.transaction(async (client) => {
  await client.query('INSERT INTO workbook_users ...');
  await client.query('INSERT INTO user_progress ...');
});

// Health monitoring
const isHealthy = await db.healthCheck();
const status = db.getStatus();
```

### Query Builder

For complex queries with type safety:

```typescript
import { QueryBuilder } from '../src/lib/database.js';

const query = db.queryBuilder()
  .select(['u.email', 'p.progress_percentage', 'm.title'])
  .from('workbook_users u')
  .leftJoin('user_progress p', 'p.user_id = u.id')
  .leftJoin('workshop_modules m', 'm.id = p.module_id')
  .where('u.subscription_tier = ?', 'premium')
  .where('p.completed = ?', false)
  .orderBy('p.last_accessed', 'DESC')
  .limit(10);

const results = await db.query(query.build().text, query.build().values);
```

### Performance Monitoring

```typescript
import { getHealthCheckData, getPerformanceData } from '../src/lib/database.js';

// Health check with detailed status
const health = await getHealthCheckData();
console.log('Database Health:', health);

// Performance metrics for last 24 hours
const performance = getPerformanceData();
console.log('Query Performance:', performance);
```

## 🌱 Seeding System

### Workshop Content Structure

The seeding system creates a complete Six Figure Barber methodology curriculum:

#### Module 1: Introduction to Six Figure Barber
- Foundation principles and mindset shifts
- Business fundamentals for barbers
- Goal setting and vision creation

#### Module 2: Revenue Optimization & Pricing
- Psychology of premium pricing
- Service package creation
- Upselling and cross-selling techniques

#### Module 3: Client Acquisition & Marketing
- Social media marketing strategies
- Referral system development
- Community engagement and partnerships

#### Module 4: Service Delivery Excellence
- Premium customer experience design
- Quality control systems
- Team training and development

#### Module 5: Business Scaling & Operations
- Systems development for growth
- Team management and leadership
- Multiple revenue stream creation

#### Module 6: Advanced Implementation & Mastery
- Market domination strategies
- Wealth building beyond operations
- Legacy planning and succession

### Sample Users and Progress

The system seeds realistic user data:

- **John Thompson** (Basic) - New starter working through Module 1
- **Maria Rodriguez** (Premium) - Advanced learner with 40% revenue increase
- **Carlos Johnson** (VIP) - High achiever scaling to multiple locations
- **Sarah Wilson** (Basic) - Beginning her barbering journey
- **David Anderson** (Enterprise) - Instructor and mentor

### Audio and Transcription Samples

Includes realistic audio recording metadata and AI-generated transcriptions with:
- Goal-setting sessions with action items
- Pricing strategy implementation results
- Team management reflection and planning
- Rich insights and sentiment analysis

## 🔨 Management Commands

### Database Seeding

```bash
# Seed with default configuration
npm run db:seed

# Reset database and seed fresh
npm run db:seed:reset

# Seed without validation (faster)
npm run db:seed:validate

# Custom seeding with TypeScript
npm run ts-node database/scripts/seed-database.ts --help
```

### Health and Performance

```bash
# Check database health
npm run db:health

# Get performance metrics
npm run db:performance

# Create manual backup
npm run db:backup
```

### Migration Management

```typescript
import db from '../src/lib/database.js';

// Run pending migrations
await db.runMigrations();

// Run migrations from specific directory
await db.runMigrations('/path/to/migrations');
```

## 📈 Performance Features

### Connection Pooling

Optimized connection pool configuration:
- **Max connections**: 20 (configurable via `DB_POOL_MAX`)
- **Min connections**: 2 (configurable via `DB_POOL_MIN`)
- **Connection timeout**: 5 seconds
- **Idle timeout**: 30 seconds
- **Automatic retry** with exponential backoff

### Query Performance

- **Slow query detection** (>1000ms warning, >5000ms critical)
- **Query sanitization** for secure logging
- **Performance metrics collection** with 1000-query rolling window
- **Real-time monitoring** of success rates and error patterns

### Error Handling

- **Automatic reconnection** on connection loss
- **Transaction rollback** on any error within transaction
- **Detailed error logging** with query context
- **Connection pool health monitoring**

## 🔒 Security Features

### Data Protection

- **Parameter sanitization** prevents SQL injection
- **Sensitive data redaction** in logs (passwords, tokens)
- **SSL connections** enforced in production
- **Connection encryption** with configurable SSL settings

### Access Control

- **Rate limiting** per user and endpoint
- **Connection limits** prevent resource exhaustion
- **Query timeout protection** (30-second default)
- **Backup encryption** with key management

## 🚀 Production Deployment

### Environment Configuration

Required environment variables for production:

```bash
# Database Connection
DB_HOST=your-production-host
DB_PORT=5432
DB_NAME=sixfb_workbook_prod
DB_USER=app_user
DB_PASSWORD=your_secure_production_password

# Pool Configuration
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Backup Configuration
BACKUP_PATH=/var/backups/database
NODE_ENV=production
```

### Monitoring Setup

Production monitoring includes:
- **Health checks** every 30 seconds
- **Performance metrics** aggregated daily
- **Error rate monitoring** with alerting
- **Backup verification** and retention management

### Scaling Considerations

- **Read replicas** for heavy read workloads
- **Connection pooling** across multiple app instances
- **Query optimization** with EXPLAIN ANALYZE
- **Index monitoring** and maintenance

## 🛠️ Development Tools

### Query Builder Examples

```typescript
// Complex search with pagination
const searchResults = await db.queryBuilder()
  .select(['n.title', 'n.content', 'n.created_at', 'u.first_name'])
  .from('session_notes n')
  .leftJoin('workbook_users u', 'u.id = n.user_id')
  .where('n.tags && ?', ['pricing', 'strategy'])
  .where('n.is_public = ?', true)
  .orderBy('n.likes_count', 'DESC')
  .limit(20)
  .offset(0);

// Revenue analysis query
const revenueAnalysis = await db.queryBuilder()
  .select([
    'u.subscription_tier',
    'COUNT(*) as user_count',
    'AVG(up.progress_percentage) as avg_progress'
  ])
  .from('workbook_users u')
  .leftJoin('user_progress up', 'up.user_id = u.id')
  .where('u.workshop_access_granted = ?', true)
  .groupBy(['u.subscription_tier'])
  .having('COUNT(*) > ?', 1);
```

### Custom Utilities

```typescript
import { dbUtils } from '../src/lib/database.js';

// Pagination helper
const { limit, offset } = dbUtils.paginate(page, 20);

// Full-text search
const searchQuery = dbUtils.buildSearchQuery('six figure', ['title', 'content']);

// Date range filtering
const dateFilter = dbUtils.dateRange(startDate, endDate);

// Batch operations
const batchInsert = dbUtils.buildBatchInsert('session_notes', noteRecords);
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Driver](https://node-postgres.com/)
- [Six Figure Barber Methodology](https://6fbmethodologies.com/)

---

## 🤝 Contributing

When adding new database features:

1. **Add migrations** for schema changes in `migrations/`
2. **Update type definitions** in `src/lib/database.ts`
3. **Add seed data** if needed in `seeds/`
4. **Test thoroughly** with different data scenarios
5. **Update documentation** for new features

---

**Built with ❤️ for the Six Figure Barber community**