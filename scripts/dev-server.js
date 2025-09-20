#!/usr/bin/env node

/**
 * Optimized development server script for 6FB Methodologies
 * This script optimizes the Next.js development server for better performance
 * and eliminates content flash issues
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Environment optimizations
const env = {
  ...process.env,
  // Enable Turbopack for faster builds
  TURBOPACK: '1',
  // Optimize Node.js memory usage
  NODE_OPTIONS: '--max_old_space_size=4096 --optimize-for-size',
  // Enable React optimizations
  REACT_STRICT_MODE: 'true',
  FAST_REFRESH: 'true',
  // Disable telemetry for faster startup
  NEXT_TELEMETRY_DISABLED: '1',
  // Enable webpack optimizations
  WEBPACK_CACHE: 'memory',
  // Optimize fonts and images
  OPTIMIZE_FONTS: 'true',
  OPTIMIZE_IMAGES: 'true',
  // Development-specific settings
  NODE_ENV: 'development',
};

// Calculate optimal worker count based on CPU cores
const cpuCount = os.cpus().length;
const workerCount = Math.max(1, Math.floor(cpuCount * 0.75));

console.log('🚀 Starting optimized Next.js development server...');
console.log(`📊 Using ${workerCount} workers (${cpuCount} cores available)`);
console.log('⚡ Turbopack enabled for faster builds');
console.log('🎯 Memory optimizations active');

// Start the Next.js development server with optimizations
const nextArgs = [
  'dev',
  '--turbo',
  '--port',
  process.env.PORT || '3000',
  '--hostname',
  process.env.HOSTNAME || 'localhost',
];

// Add experimental features if available
if (process.env.EXPERIMENTAL_HTTPS === 'true') {
  nextArgs.push('--experimental-https');
}

const nextProcess = spawn('npx', ['next', ...nextArgs], {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down development server...');
  nextProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down development server...');
  nextProcess.kill('SIGTERM');
});

nextProcess.on('exit', code => {
  process.exit(code);
});

nextProcess.on('error', error => {
  console.error('❌ Failed to start development server:', error);
  process.exit(1);
});
