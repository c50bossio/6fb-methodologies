#!/usr/bin/env ts-node
/**
 * Database Seeding Script for 6FB Workbook System
 *
 * This script provides a complete database seeding solution for the 6FB Workbook
 * system, including schema creation, data seeding, and validation.
 *
 * Usage:
 *   npm run seed              # Seed with default data
 *   npm run seed:reset        # Reset and seed
 *   npm run seed:validate     # Validate seeded data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { getHealthCheckData, getPerformanceData } from '../../src/lib/database.js';

// Configuration
interface SeedConfig {
  resetDatabase: boolean;
  validateAfterSeed: boolean;
  createSampleUsers: boolean;
  createWorkshopContent: boolean;
  createProgressData: boolean;
  createAudioSamples: boolean;
  createLiveSessions: boolean;
  createCostTracking: boolean;
  verbose: boolean;
}

const DEFAULT_CONFIG: SeedConfig = {
  resetDatabase: false,
  validateAfterSeed: true,
  createSampleUsers: true,
  createWorkshopContent: true,
  createProgressData: true,
  createAudioSamples: true,
  createLiveSessions: true,
  createCostTracking: true,
  verbose: true
};

class DatabaseSeeder {
  private config: SeedConfig;
  private startTime: Date;

  constructor(config: Partial<SeedConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
  }

  async seed(): Promise<void> {
    try {
      this.log('🌱 Starting 6FB Workbook Database Seeding...');
      this.log(`📅 Started at: ${this.startTime.toISOString()}`);

      // Health check
      await this.healthCheck();

      // Reset if requested
      if (this.config.resetDatabase) {
        await this.resetDatabase();
      }

      // Run schema creation
      await this.createSchema();

      // Seed data in proper order
      await this.seedData();

      // Validate if requested
      if (this.config.validateAfterSeed) {
        await this.validateData();
      }

      // Performance summary
      await this.performanceSummary();

      this.log('✅ Database seeding completed successfully!');

    } catch (error) {
      this.error('❌ Database seeding failed:', error);
      throw error;
    } finally {
      await db.close();
    }
  }

  private async healthCheck(): Promise<void> {
    this.log('🔍 Performing health check...');

    const healthData = await getHealthCheckData();

    if (!healthData.healthy) {
      throw new Error('Database health check failed - cannot proceed with seeding');
    }

    this.log(`✅ Database connected: ${healthData.database.connected}`);
    this.log(`📊 Pool status: ${JSON.stringify(healthData.database.pool)}`);
  }

  private async resetDatabase(): Promise<void> {
    this.log('🔄 Resetting database...');

    // Drop all workbook-related tables
    const dropTables = [
      'user_achievements',
      'cost_tracking',
      'system_metrics',
      'live_session_participants',
      'live_sessions',
      'session_notes',
      'transcriptions',
      'audio_recordings',
      'workbook_sessions',
      'lesson_progress',
      'user_progress',
      'workshop_lessons',
      'workshop_modules',
      'workbook_users',
      'transcription_jobs',
      'rate_limits'
    ];

    for (const table of dropTables) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        this.log(`   Dropped table: ${table}`);
      } catch (error) {
        this.log(`   Warning: Could not drop ${table}: ${error}`);
      }
    }
  }

  private async createSchema(): Promise<void> {
    this.log('🏗️  Creating database schema...');

    const schemaFiles = [
      '../../database/init/01-schema.sql',
      '../../database/init/02-workbook-schema.sql'
    ];

    for (const schemaFile of schemaFiles) {
      const filePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), schemaFile);
      const schema = await fs.readFile(filePath, 'utf-8');

      await db.query(schema);
      this.log(`   ✅ Applied schema: ${path.basename(schemaFile)}`);
    }
  }

  private async seedData(): Promise<void> {
    this.log('📝 Seeding workshop content and sample data...');

    const seedFile = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../database/seeds/workshop-content.sql'
    );

    const seedData = await fs.readFile(seedFile, 'utf-8');

    await db.transaction(async (client) => {
      // Split the file into individual statements and execute
      const statements = seedData
        .split(';\n')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement && !statement.startsWith('DO $$')) {
          try {
            await client.query(statement);
            if (this.config.verbose && i % 10 === 0) {
              this.log(`   📊 Processed ${i + 1}/${statements.length} statements`);
            }
          } catch (error) {
            this.error(`Error in statement ${i + 1}: ${statement.substring(0, 100)}...`, error);
            throw error;
          }
        }
      }
    });

    this.log('   ✅ Workshop content seeding completed');
  }

  private async validateData(): Promise<void> {
    this.log('🔍 Validating seeded data...');

    const validations = [
      {
        name: 'Users',
        query: 'SELECT COUNT(*) as count FROM workbook_users',
        expected: 5
      },
      {
        name: 'Workshop Modules',
        query: 'SELECT COUNT(*) as count FROM workshop_modules',
        expected: 6
      },
      {
        name: 'Workshop Lessons',
        query: 'SELECT COUNT(*) as count FROM workshop_lessons',
        expected: 5 // We seeded 5 sample lessons
      },
      {
        name: 'User Progress',
        query: 'SELECT COUNT(*) as count FROM user_progress',
        expected: 8 // Multiple progress records
      },
      {
        name: 'Workbook Sessions',
        query: 'SELECT COUNT(*) as count FROM workbook_sessions',
        expected: 3
      },
      {
        name: 'Audio Recordings',
        query: 'SELECT COUNT(*) as count FROM audio_recordings',
        expected: 3
      },
      {
        name: 'Transcriptions',
        query: 'SELECT COUNT(*) as count FROM transcriptions',
        expected: 2
      },
      {
        name: 'Session Notes',
        query: 'SELECT COUNT(*) as count FROM session_notes',
        expected: 4
      },
      {
        name: 'Live Sessions',
        query: 'SELECT COUNT(*) as count FROM live_sessions',
        expected: 2
      },
      {
        name: 'User Achievements',
        query: 'SELECT COUNT(*) as count FROM user_achievements',
        expected: 5
      }
    ];

    for (const validation of validations) {
      const result = await db.queryOne<{count: number}>(validation.query);
      const count = parseInt(result?.count?.toString() || '0');

      if (count >= validation.expected) {
        this.log(`   ✅ ${validation.name}: ${count} records`);
      } else {
        this.log(`   ⚠️  ${validation.name}: ${count} records (expected ${validation.expected})`);
      }
    }
  }

  private async performanceSummary(): Promise<void> {
    this.log('📊 Performance Summary:');

    const endTime = new Date();
    const duration = (endTime.getTime() - this.startTime.getTime()) / 1000;

    this.log(`   ⏱️  Total time: ${duration.toFixed(2)} seconds`);

    try {
      const perfData = getPerformanceData();
      if (perfData && perfData.totalQueries) {
        this.log(`   🔍 Queries executed: ${perfData.totalQueries}`);
        this.log(`   ⚡ Average query time: ${perfData.performance?.avgDuration || 'N/A'}ms`);
        this.log(`   📈 Success rate: ${perfData.successRate || 'N/A'}%`);
      }
    } catch (error) {
      this.log('   📊 Performance data not available');
    }

    // Database status
    const status = db.getStatus();
    this.log(`   🔗 Connection pool: ${status.poolStatus.totalCount} total, ${status.poolStatus.idleCount} idle`);
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
  }

  private error(message: string, error?: any): void {
    console.error(message);
    if (error) {
      console.error(error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const config: Partial<SeedConfig> = {
    resetDatabase: args.includes('--reset'),
    validateAfterSeed: !args.includes('--no-validate'),
    verbose: !args.includes('--quiet')
  };

  if (args.includes('--help')) {
    console.log(`
6FB Workbook Database Seeder

Usage: ts-node seed-database.ts [options]

Options:
  --reset          Drop existing tables before seeding
  --no-validate    Skip data validation after seeding
  --quiet          Suppress verbose output
  --help           Show this help message

Examples:
  ts-node seed-database.ts                    # Normal seeding
  ts-node seed-database.ts --reset            # Reset and seed
  ts-node seed-database.ts --quiet            # Quiet mode
`);
    process.exit(0);
  }

  const seeder = new DatabaseSeeder(config);

  try {
    await seeder.seed();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Export for use as a module
export { DatabaseSeeder };
export type { SeedConfig };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}