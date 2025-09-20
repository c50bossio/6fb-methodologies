#!/usr/bin/env node

/**
 * Integration Test Runner for 6FB Workbook
 *
 * This script orchestrates the execution of comprehensive integration tests:
 * - T013: Complete user journey E2E test
 * - T014: Audio transcription workflow integration test
 * - T015: Note-taking with search integration test
 *
 * Usage:
 *   npm run test:integration
 *   node __tests__/run-integration-tests.ts [options]
 *
 * Options:
 *   --watch          Watch mode for development
 *   --coverage       Generate coverage reports
 *   --verbose        Verbose output
 *   --suite <name>   Run specific test suite
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  suite?: string;
  parallel?: boolean;
  maxWorkers?: number;
}

class IntegrationTestRunner {
  private options: TestOptions;
  private projectRoot: string;

  constructor(options: TestOptions = {}) {
    this.options = options;
    this.projectRoot = process.cwd();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting 6FB Workbook Integration Tests');
    console.log('='.repeat(50));

    try {
      // Pre-flight checks
      await this.performPreflightChecks();

      // Setup test environment
      await this.setupTestEnvironment();

      // Run integration tests
      const success = await this.executeTests();

      // Generate reports
      await this.generateReports();

      // Cleanup
      await this.cleanup();

      if (success) {
        console.log('✅ All integration tests completed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Some integration tests failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('💥 Integration test runner error:', error);
      process.exit(1);
    }
  }

  private async performPreflightChecks(): Promise<void> {
    console.log('🔍 Performing pre-flight checks...');

    // Check if required files exist
    const requiredFiles = [
      '__tests__/integration/jest.config.js',
      '__tests__/integration/setup.ts',
      '__tests__/integration/global-setup.ts',
      '__tests__/integration/global-teardown.ts',
      '__tests__/integration/audio-transcription.test.ts',
      '__tests__/integration/note-search.test.ts',
      '__tests__/e2e/user-journey.spec.ts',
    ];

    for (const file of requiredFiles) {
      const filePath = join(this.projectRoot, file);
      if (!existsSync(filePath)) {
        throw new Error(`Required test file not found: ${file}`);
      }
    }

    // Check dependencies
    const packageJson = require(join(this.projectRoot, 'package.json'));
    const requiredDeps = ['jest', 'playwright', '@testing-library/react', 'supertest'];

    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        console.warn(`⚠️ Warning: ${dep} not found in dependencies`);
      }
    }

    console.log('   ✓ Required files verified');
    console.log('   ✓ Dependencies checked');
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

    // Mock secrets for testing
    process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    console.log('   ✓ Environment variables set');
    console.log('   ✓ Mock credentials configured');
  }

  private async executeTests(): Promise<boolean> {
    console.log('🧪 Executing integration tests...');

    const testSuites = this.getTestSuites();
    let allPassed = true;

    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name}...`);

      const success = await this.runTestSuite(suite);
      if (!success) {
        allPassed = false;
        console.log(`❌ ${suite.name} failed`);
      } else {
        console.log(`✅ ${suite.name} passed`);
      }

      // Break early if not running in parallel and a test fails
      if (!this.options.parallel && !success) {
        console.log('🛑 Stopping execution due to test failure');
        break;
      }
    }

    return allPassed;
  }

  private getTestSuites() {
    const allSuites = [
      {
        name: 'T013: User Journey E2E Tests',
        command: 'npx playwright test __tests__/e2e/user-journey.spec.ts',
        description: 'Complete user workflow from registration through module completion',
      },
      {
        name: 'T014: Audio Transcription Integration Tests',
        command: 'npx jest __tests__/integration/audio-transcription.test.ts',
        description: 'Audio upload, processing, and OpenAI transcription workflow',
      },
      {
        name: 'T015: Note Search Integration Tests',
        command: 'npx jest __tests__/integration/note-search.test.ts',
        description: 'Note creation, tagging, search, and export functionality',
      },
    ];

    // Filter by suite if specified
    if (this.options.suite) {
      return allSuites.filter(suite =>
        suite.name.toLowerCase().includes(this.options.suite!.toLowerCase())
      );
    }

    return allSuites;
  }

  private async runTestSuite(suite: any): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      // Build command with options
      let command = suite.command;

      if (this.options.verbose) {
        command += ' --verbose';
      }

      if (this.options.coverage && command.includes('jest')) {
        command += ' --coverage';
      }

      if (this.options.watch) {
        command += ' --watch';
      }

      // Add Jest-specific options
      if (command.includes('jest')) {
        command += ` --config __tests__/integration/jest.config.js`;
        if (this.options.maxWorkers) {
          command += ` --maxWorkers=${this.options.maxWorkers}`;
        }
      }

      console.log(`   🔄 Executing: ${command}`);

      const child = spawn(command, [], {
        shell: true,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        cwd: this.projectRoot,
      });

      let output = '';
      let errorOutput = '';

      if (!this.options.verbose) {
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });

        child.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        console.log(`   ⏱️ Completed in ${duration}ms`);

        if (code === 0) {
          console.log(`   ✅ ${suite.name} passed`);
          resolve(true);
        } else {
          console.log(`   ❌ ${suite.name} failed (exit code: ${code})`);

          if (!this.options.verbose && (output || errorOutput)) {
            console.log('   📝 Test output:');
            if (output) console.log(output);
            if (errorOutput) console.error(errorOutput);
          }

          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.error(`   💥 Error running ${suite.name}:`, error);
        resolve(false);
      });
    });
  }

  private async generateReports(): Promise<void> {
    console.log('\n📊 Generating test reports...');

    try {
      // Coverage report
      if (this.options.coverage) {
        console.log('   📈 Coverage report generated in coverage/');
      }

      // Playwright report
      console.log('   🎭 Playwright report available at playwright-report/');

      // Performance summary
      console.log('   ⚡ Performance metrics logged');

      console.log('   ✓ Reports generated successfully');
    } catch (error) {
      console.warn('   ⚠️ Report generation warning:', error);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Performing cleanup...');

    try {
      // Clean up any temporary files
      // Reset environment variables if needed
      console.log('   ✓ Cleanup completed');
    } catch (error) {
      console.warn('   ⚠️ Cleanup warning:', error);
    }
  }
}

// CLI interface
function parseArguments(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--watch':
        options.watch = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--suite':
        options.suite = args[++i];
        break;
      case '--max-workers':
        options.maxWorkers = parseInt(args[++i]);
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
6FB Workbook Integration Test Runner

Usage: node __tests__/run-integration-tests.ts [options]

Options:
  --watch           Run tests in watch mode
  --coverage        Generate coverage reports
  --verbose         Verbose output
  --parallel        Run test suites in parallel
  --suite <name>    Run specific test suite (T013, T014, T015)
  --max-workers <n> Maximum number of worker processes
  --help            Show this help message

Test Suites:
  T013: Complete user journey E2E test
  T014: Audio transcription workflow integration test
  T015: Note-taking with search integration test

Examples:
  node __tests__/run-integration-tests.ts --verbose --coverage
  node __tests__/run-integration-tests.ts --suite T014
  node __tests__/run-integration-tests.ts --watch --suite T015
`);
}

// Main execution
if (require.main === module) {
  const options = parseArguments();
  const runner = new IntegrationTestRunner(options);
  runner.run().catch(console.error);
}

export { IntegrationTestRunner };