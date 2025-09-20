#!/usr/bin/env node

/**
 * Performance Monitor for Next.js Development Server
 * Tracks build times, memory usage, and development metrics
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  PORT: process.env.NEXT_PORT || 3000,
  LOG_FILE: 'logs/performance.log',
  METRICS_FILE: 'logs/performance-metrics.json',
  CHECK_INTERVAL: 5000, // 5 seconds
  ALERT_THRESHOLDS: {
    RESPONSE_TIME: 3000, // 3 seconds
    MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
    BUILD_TIME: 30000, // 30 seconds
    ERROR_RATE: 0.1, // 10%
  },
  COLORS: {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    RESET: '\x1b[0m',
  },
};

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: [],
      buildTimes: [],
      memoryUsage: [],
      errors: [],
      alerts: [],
    };

    this.loadExistingMetrics();
    this.setupSignalHandlers();
  }

  // Load existing metrics from file
  loadExistingMetrics() {
    try {
      if (fs.existsSync(CONFIG.METRICS_FILE)) {
        const data = fs.readFileSync(CONFIG.METRICS_FILE, 'utf8');
        const existingMetrics = JSON.parse(data);

        // Keep only recent data (last 24 hours)
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        this.metrics.requests =
          existingMetrics.requests?.filter(r => r.timestamp > cutoff) || [];
        this.metrics.buildTimes =
          existingMetrics.buildTimes?.filter(b => b.timestamp > cutoff) || [];
        this.metrics.memoryUsage =
          existingMetrics.memoryUsage?.filter(m => m.timestamp > cutoff) || [];
        this.metrics.errors =
          existingMetrics.errors?.filter(e => e.timestamp > cutoff) || [];
      }
    } catch (error) {
      this.log('WARN', `Could not load existing metrics: ${error.message}`);
    }
  }

  // Save metrics to file
  saveMetrics() {
    try {
      fs.writeFileSync(
        CONFIG.METRICS_FILE,
        JSON.stringify(this.metrics, null, 2)
      );
    } catch (error) {
      this.log('ERROR', `Could not save metrics: ${error.message}`);
    }
  }

  // Log with timestamp and color
  log(level, message, color = null) {
    const timestamp = new Date().toISOString();
    const colorCode = color || CONFIG.COLORS[level] || CONFIG.COLORS.RESET;
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    console.log(`${colorCode}${logMessage}${CONFIG.COLORS.RESET}`);

    // Also write to log file
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
  }

  // Test HTTP endpoint performance
  async testEndpoint(path = '/') {
    return new Promise(resolve => {
      const startTime = performance.now();
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          responseTime: CONFIG.ALERT_THRESHOLDS.RESPONSE_TIME,
          error: 'Timeout',
        });
      }, CONFIG.ALERT_THRESHOLDS.RESPONSE_TIME);

      const req = http.get(`http://localhost:${CONFIG.PORT}${path}`, res => {
        clearTimeout(timeout);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          resolve({
            success: res.statusCode < 400,
            responseTime,
            statusCode: res.statusCode,
            contentLength: body.length,
          });
        });
      });

      req.on('error', error => {
        clearTimeout(timeout);
        const endTime = performance.now();
        resolve({
          success: false,
          responseTime: endTime - startTime,
          error: error.message,
        });
      });

      req.setTimeout(CONFIG.ALERT_THRESHOLDS.RESPONSE_TIME);
    });
  }

  // Get memory usage of Next.js processes
  getMemoryUsage() {
    try {
      const { execSync } = require('child_process');
      const psOutput = execSync('ps -o pid,rss,vsz,comm -C node', {
        encoding: 'utf8',
      });

      let totalMemory = 0;
      const lines = psOutput.split('\n').slice(1); // Skip header

      for (const line of lines) {
        if (line.includes('next') || line.includes('node')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            totalMemory += parseInt(parts[1]) * 1024; // Convert KB to bytes
          }
        }
      }

      return totalMemory;
    } catch (error) {
      // Fallback to process memory if ps command fails
      return process.memoryUsage().heapUsed;
    }
  }

  // Check for build artifacts and estimate build time
  checkBuildPerformance() {
    try {
      const nextDir = '.next';
      if (!fs.existsSync(nextDir)) {
        return null;
      }

      const buildInfoPath = path.join(nextDir, 'build-manifest.json');
      if (!fs.existsSync(buildInfoPath)) {
        return null;
      }

      const stats = fs.statSync(buildInfoPath);
      const buildTime = stats.mtime;

      // Estimate build duration based on file count in .next
      const files = this.countFiles(nextDir);
      const estimatedDuration = files * 10; // Rough estimate: 10ms per file

      return {
        timestamp: buildTime.getTime(),
        duration: estimatedDuration,
        fileCount: files,
      };
    } catch (error) {
      return null;
    }
  }

  // Count files in directory recursively
  countFiles(dir) {
    let count = 0;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          count += this.countFiles(fullPath);
        } else {
          count++;
        }
      }
    } catch (error) {
      // Ignore errors (permissions, etc.)
    }
    return count;
  }

  // Calculate statistics for array of values
  calculateStats(values) {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: values.length,
    };
  }

  // Check for alerts based on thresholds
  checkAlerts() {
    const now = Date.now();
    const recentRequests = this.metrics.requests.filter(
      r => now - r.timestamp < 60000
    ); // Last minute
    const recentMemory = this.metrics.memoryUsage.filter(
      m => now - m.timestamp < 300000
    ); // Last 5 minutes

    const alerts = [];

    // Response time alert
    if (recentRequests.length > 0) {
      const avgResponseTime =
        recentRequests.reduce((sum, r) => sum + r.responseTime, 0) /
        recentRequests.length;
      if (avgResponseTime > CONFIG.ALERT_THRESHOLDS.RESPONSE_TIME) {
        alerts.push({
          type: 'HIGH_RESPONSE_TIME',
          message: `Average response time: ${Math.round(avgResponseTime)}ms (threshold: ${CONFIG.ALERT_THRESHOLDS.RESPONSE_TIME}ms)`,
          severity: 'WARNING',
        });
      }
    }

    // Memory usage alert
    if (recentMemory.length > 0) {
      const avgMemory =
        recentMemory.reduce((sum, m) => sum + m.usage, 0) / recentMemory.length;
      if (avgMemory > CONFIG.ALERT_THRESHOLDS.MEMORY_USAGE) {
        alerts.push({
          type: 'HIGH_MEMORY_USAGE',
          message: `Average memory usage: ${Math.round(avgMemory / 1024 / 1024)}MB (threshold: ${Math.round(CONFIG.ALERT_THRESHOLDS.MEMORY_USAGE / 1024 / 1024)}MB)`,
          severity: 'WARNING',
        });
      }
    }

    // Error rate alert
    if (recentRequests.length >= 5) {
      const errorCount = recentRequests.filter(r => !r.success).length;
      const errorRate = errorCount / recentRequests.length;
      if (errorRate > CONFIG.ALERT_THRESHOLDS.ERROR_RATE) {
        alerts.push({
          type: 'HIGH_ERROR_RATE',
          message: `Error rate: ${Math.round(errorRate * 100)}% (threshold: ${Math.round(CONFIG.ALERT_THRESHOLDS.ERROR_RATE * 100)}%)`,
          severity: 'CRITICAL',
        });
      }
    }

    // Log new alerts
    for (const alert of alerts) {
      const existingAlert = this.metrics.alerts.find(
        a => a.type === alert.type && now - a.timestamp < 300000 // Don't repeat alerts within 5 minutes
      );

      if (!existingAlert) {
        alert.timestamp = now;
        this.metrics.alerts.push(alert);
        this.log(
          alert.severity,
          `🚨 ALERT: ${alert.message}`,
          CONFIG.COLORS.RED
        );
      }
    }

    return alerts;
  }

  // Display current performance dashboard
  displayDashboard() {
    console.clear();

    this.log(
      'INFO',
      '═══════════════════════════════════════════════════════════════',
      CONFIG.COLORS.BLUE
    );
    this.log(
      'INFO',
      '                    Performance Monitor Dashboard                  ',
      CONFIG.COLORS.BLUE
    );
    this.log(
      'INFO',
      '═══════════════════════════════════════════════════════════════',
      CONFIG.COLORS.BLUE
    );

    const now = Date.now();
    const uptime = Math.round((now - this.metrics.startTime) / 1000);

    this.log(
      'INFO',
      `📊 Uptime: ${uptime}s | Port: ${CONFIG.PORT} | PID: ${process.pid}`,
      CONFIG.COLORS.CYAN
    );
    console.log();

    // Recent requests statistics
    const recentRequests = this.metrics.requests.filter(
      r => now - r.timestamp < 300000
    ); // Last 5 minutes
    if (recentRequests.length > 0) {
      const requestStats = this.calculateStats(
        recentRequests.map(r => r.responseTime)
      );
      const successRate = Math.round(
        (recentRequests.filter(r => r.success).length / recentRequests.length) *
          100
      );

      this.log(
        'INFO',
        '🌐 HTTP Performance (Last 5 minutes):',
        CONFIG.COLORS.CYAN
      );
      this.log(
        'INFO',
        `   Requests: ${recentRequests.length} | Success Rate: ${successRate}%`
      );
      this.log(
        'INFO',
        `   Response Time - Avg: ${Math.round(requestStats.avg)}ms | P95: ${Math.round(requestStats.p95)}ms | Max: ${Math.round(requestStats.max)}ms`
      );
    } else {
      this.log('INFO', '🌐 No recent HTTP requests', CONFIG.COLORS.YELLOW);
    }

    console.log();

    // Memory usage
    const recentMemory = this.metrics.memoryUsage.filter(
      m => now - m.timestamp < 300000
    );
    if (recentMemory.length > 0) {
      const memoryStats = this.calculateStats(recentMemory.map(m => m.usage));

      this.log('INFO', '💾 Memory Usage (Last 5 minutes):', CONFIG.COLORS.CYAN);
      this.log(
        'INFO',
        `   Avg: ${Math.round(memoryStats.avg / 1024 / 1024)}MB | Peak: ${Math.round(memoryStats.max / 1024 / 1024)}MB`
      );
    }

    console.log();

    // Build performance
    const recentBuilds = this.metrics.buildTimes.filter(
      b => now - b.timestamp < 3600000
    ); // Last hour
    if (recentBuilds.length > 0) {
      const buildStats = this.calculateStats(recentBuilds.map(b => b.duration));

      this.log(
        'INFO',
        '🏗️  Build Performance (Last hour):',
        CONFIG.COLORS.CYAN
      );
      this.log(
        'INFO',
        `   Builds: ${recentBuilds.length} | Avg Time: ${Math.round(buildStats.avg)}ms`
      );
    }

    console.log();

    // Recent alerts
    const recentAlerts = this.metrics.alerts.filter(
      a => now - a.timestamp < 3600000
    ); // Last hour
    if (recentAlerts.length > 0) {
      this.log('INFO', '🚨 Recent Alerts:', CONFIG.COLORS.RED);
      recentAlerts.slice(-3).forEach(alert => {
        const timeAgo = Math.round((now - alert.timestamp) / 60000);
        this.log(
          'INFO',
          `   ${alert.type}: ${alert.message} (${timeAgo}m ago)`
        );
      });
    } else {
      this.log('INFO', '✅ No recent alerts', CONFIG.COLORS.GREEN);
    }

    console.log();
    this.log(
      'INFO',
      '⚙️  Controls: Ctrl+C to exit | Updates every 5s',
      CONFIG.COLORS.YELLOW
    );
  }

  // Run performance check cycle
  async runCheckCycle() {
    const timestamp = Date.now();

    // Test HTTP endpoint
    const httpResult = await this.testEndpoint('/');
    this.metrics.requests.push({
      timestamp,
      ...httpResult,
    });

    // Record memory usage
    const memoryUsage = this.getMemoryUsage();
    this.metrics.memoryUsage.push({
      timestamp,
      usage: memoryUsage,
    });

    // Check build performance
    const buildInfo = this.checkBuildPerformance();
    if (buildInfo) {
      // Only add if it's a new build
      const lastBuild =
        this.metrics.buildTimes[this.metrics.buildTimes.length - 1];
      if (!lastBuild || buildInfo.timestamp > lastBuild.timestamp) {
        this.metrics.buildTimes.push(buildInfo);
      }
    }

    // Check for alerts
    this.checkAlerts();

    // Clean old data (keep last 1000 entries)
    this.metrics.requests = this.metrics.requests.slice(-1000);
    this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-1000);
    this.metrics.buildTimes = this.metrics.buildTimes.slice(-100);
    this.metrics.alerts = this.metrics.alerts.slice(-100);

    // Save metrics periodically
    if (this.metrics.requests.length % 10 === 0) {
      this.saveMetrics();
    }
  }

  // Setup signal handlers for graceful shutdown
  setupSignalHandlers() {
    const shutdown = () => {
      this.log(
        'INFO',
        'Shutting down performance monitor...',
        CONFIG.COLORS.YELLOW
      );
      this.saveMetrics();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  // Start monitoring
  async start() {
    this.log(
      'INFO',
      '🔍 Starting performance monitoring...',
      CONFIG.COLORS.GREEN
    );
    this.log(
      'INFO',
      `Monitoring Next.js server on port ${CONFIG.PORT}`,
      CONFIG.COLORS.CYAN
    );

    while (true) {
      try {
        await this.runCheckCycle();
        this.displayDashboard();
        await new Promise(resolve =>
          setTimeout(resolve, CONFIG.CHECK_INTERVAL)
        );
      } catch (error) {
        this.log(
          'ERROR',
          `Monitoring error: ${error.message}`,
          CONFIG.COLORS.RED
        );
        await new Promise(resolve =>
          setTimeout(resolve, CONFIG.CHECK_INTERVAL)
        );
      }
    }
  }

  // Generate performance report
  generateReport() {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;

    const recentRequests = this.metrics.requests.filter(
      r => r.timestamp > hourAgo
    );
    const recentMemory = this.metrics.memoryUsage.filter(
      m => m.timestamp > hourAgo
    );
    const recentBuilds = this.metrics.buildTimes.filter(
      b => b.timestamp > hourAgo
    );

    const report = {
      generatedAt: new Date().toISOString(),
      timeRange: 'Last 1 hour',
      summary: {
        totalRequests: recentRequests.length,
        successRate:
          recentRequests.length > 0
            ? Math.round(
                (recentRequests.filter(r => r.success).length /
                  recentRequests.length) *
                  100
              )
            : 0,
        avgResponseTime:
          recentRequests.length > 0
            ? Math.round(
                recentRequests.reduce((sum, r) => sum + r.responseTime, 0) /
                  recentRequests.length
              )
            : 0,
        avgMemoryUsage:
          recentMemory.length > 0
            ? Math.round(
                recentMemory.reduce((sum, m) => sum + m.usage, 0) /
                  recentMemory.length /
                  1024 /
                  1024
              )
            : 0,
        buildCount: recentBuilds.length,
      },
      httpPerformance:
        recentRequests.length > 0
          ? this.calculateStats(recentRequests.map(r => r.responseTime))
          : null,
      memoryUsage:
        recentMemory.length > 0
          ? this.calculateStats(recentMemory.map(m => m.usage))
          : null,
      buildPerformance:
        recentBuilds.length > 0
          ? this.calculateStats(recentBuilds.map(b => b.duration))
          : null,
      alerts: this.metrics.alerts.filter(a => a.timestamp > hourAgo),
    };

    const reportFile = `logs/performance-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📊 Performance report generated: ${reportFile}`);
    return report;
  }
}

// CLI interface
const command = process.argv[2] || 'monitor';

switch (command) {
  case 'monitor':
    const monitor = new PerformanceMonitor();
    monitor.start();
    break;

  case 'report':
    const reportMonitor = new PerformanceMonitor();
    reportMonitor.generateReport();
    break;

  case 'help':
    console.log('Performance Monitor for Next.js Development');
    console.log('Usage: node performance-monitor.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  monitor    Start real-time monitoring (default)');
    console.log('  report     Generate performance report');
    console.log('  help       Show this help message');
    break;

  default:
    console.log(`Unknown command: ${command}`);
    console.log('Use "help" to see available commands');
    process.exit(1);
}
