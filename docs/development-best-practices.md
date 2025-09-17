# Development Best Practices for Next.js Workshop Site

## 🎯 Overview

This document outlines comprehensive best practices for maintaining a stable, performant development environment for the 6FB Methodologies Workshop site. These practices are designed to prevent React hydration errors, memory issues, and other common development problems.

## 🚀 Quick Start

### Daily Development Workflow

1. **Environment Validation** (First time/New setup)
   ```bash
   ./scripts/validate-env.sh
   ```

2. **Start Optimized Development**
   ```bash
   ./scripts/dev-optimized.sh
   ```

3. **Monitor Performance** (Optional, separate terminal)
   ```bash
   ./scripts/monitor-dev.sh
   ```

4. **Clean Environment** (When issues arise)
   ```bash
   ./scripts/cleanup-dev.sh --quick
   ```

## 🛠️ Development Environment Setup

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | v18.0.0 | v20.0.0+ |
| npm | v8.0.0 | v10.0.0+ |
| Memory | 4GB | 8GB+ |
| Disk Space | 5GB | 10GB+ |

### Environment Configuration

#### .env Files Strategy
```bash
# Development only (never commit)
.env.local              # Local overrides
.env.development.local  # Development-specific secrets

# Committed to repository
.env.example           # Template for required variables
.env.development       # Development defaults (no secrets)
.env.production        # Production defaults (no secrets)
```

#### Recommended .gitignore Additions
```gitignore
# Development Environment
.env.local
.env.development.local
.env.production.local

# Next.js
.next/
.next/trace.json
tsconfig.tsbuildinfo

# System Files
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# Logs
logs/
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock
```

## 📋 Development Scripts Usage

### 1. Optimized Development Server

**Script:** `./scripts/dev-optimized.sh`

**Features:**
- Memory management with configurable limits
- Automatic resource checking
- Port conflict resolution
- Pre-start cleanup and validation
- Graceful shutdown handling

**Configuration:**
```bash
# Environment variables
export MAX_MEMORY_MB=2048
export MIN_FREE_MEMORY_MB=1024
export NEXT_PORT=3000
```

### 2. Health Monitoring

**Script:** `./scripts/monitor-dev.sh`

**Use Cases:**
- Real-time development server monitoring
- Performance issue detection
- Resource usage tracking
- Alert system for problems

**Commands:**
```bash
./scripts/monitor-dev.sh            # Start continuous monitoring
./scripts/monitor-dev.sh check      # Single health check
./scripts/monitor-dev.sh log        # View recent logs
```

### 3. Environment Cleanup

**Script:** `./scripts/cleanup-dev.sh`

**When to Use:**
- Before starting development (fresh start)
- When experiencing build issues
- After switching branches
- Weekly maintenance

**Options:**
```bash
./scripts/cleanup-dev.sh            # Interactive mode
./scripts/cleanup-dev.sh --quick    # Fast cleanup
./scripts/cleanup-dev.sh --full     # Comprehensive cleanup
./scripts/cleanup-dev.sh --nextjs   # Next.js files only
```

### 4. Performance Monitoring

**Script:** `./scripts/performance-monitor.js`

**Purpose:**
- Track build times and bundle sizes
- Monitor HTTP response times
- Detect memory leaks
- Generate performance reports

**Usage:**
```bash
node ./scripts/performance-monitor.js          # Start monitoring
node ./scripts/performance-monitor.js report   # Generate report
```

### 5. Environment Validation

**Script:** `./scripts/validate-env.sh`

**Run When:**
- Setting up new development environment
- After system updates
- Troubleshooting environment issues
- Before deployment

**Options:**
```bash
./scripts/validate-env.sh           # Full validation
./scripts/validate-env.sh --quick   # Skip network tests
./scripts/validate-env.sh --system  # System requirements only
```

### 6. Deployment Preparation

**Script:** `./scripts/deploy-prepare.sh`

**Features:**
- Comprehensive pre-deployment validation
- Production build optimization
- Bundle analysis and size checking
- Security validation
- Deployment package creation

**Usage:**
```bash
./scripts/deploy-prepare.sh         # Full preparation
./scripts/deploy-prepare.sh --quick # Skip packaging
```

## 🐛 Troubleshooting Common Issues

### React Hydration Errors

**Symptoms:**
- "Text content does not match server-rendered HTML"
- "Hydration failed because the initial UI does not match"

**Solutions:**
1. **Immediate Fix:**
   ```bash
   ./scripts/cleanup-dev.sh --nextjs
   rm -rf .next/
   npm run dev
   ```

2. **Code-level Fixes:**
   ```tsx
   // Use useEffect for client-only code
   useEffect(() => {
     // Client-only code here
   }, []);

   // Use dynamic imports for problematic components
   const DynamicComponent = dynamic(() => import('./Component'), {
     ssr: false
   });
   ```

### Memory Issues

**Symptoms:**
- Slow development server
- Build failures
- System freezing

**Solutions:**
1. **Increase Memory Limits:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Monitor Memory Usage:**
   ```bash
   ./scripts/monitor-dev.sh
   ```

3. **Clean Environment:**
   ```bash
   ./scripts/cleanup-dev.sh --full
   ```

### Port Conflicts

**Symptoms:**
- "Port 3000 is already in use"
- Development server won't start

**Solutions:**
1. **Automatic Resolution (dev-optimized.sh handles this)**
2. **Manual Resolution:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   # or use different port
   npm run dev -- --port 3001
   ```

### Build Performance Issues

**Symptoms:**
- Slow build times
- Large bundle sizes
- High memory usage during builds

**Solutions:**
1. **Analyze Bundle:**
   ```bash
   ./scripts/deploy-prepare.sh --build
   ```

2. **Optimize Dependencies:**
   ```json
   // next.config.mjs
   experimental: {
     optimizePackageImports: ['lodash', 'date-fns']
   }
   ```

3. **Enable SWC Optimizations:**
   ```json
   // next.config.mjs
   swcMinify: true,
   compiler: {
     removeConsole: process.env.NODE_ENV === 'production'
   }
   ```

### TypeScript Issues

**Symptoms:**
- Type checking errors
- Slow IntelliSense
- Build failures

**Solutions:**
1. **Incremental Compilation:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true,
       "tsBuildInfoFile": ".next/cache/tsconfig.tsbuildinfo"
     }
   }
   ```

2. **Clean TypeScript Cache:**
   ```bash
   rm tsconfig.tsbuildinfo
   ./scripts/cleanup-dev.sh --typescript
   ```

## 📊 Performance Optimization

### Development Server Optimization

1. **Memory Management:**
   ```bash
   # .env.local
   NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
   UV_THREADPOOL_SIZE=4
   ```

2. **Next.js Configuration:**
   ```javascript
   // next.config.mjs
   const nextConfig = {
     // Development optimizations
     experimental: {
       optimizePackageImports: ['lucide-react', 'framer-motion'],
       webVitalsAttribution: ['CLS', 'LCP']
     },

     // Webpack optimizations
     webpack: (config, { dev }) => {
       if (dev) {
         config.watchOptions = {
           poll: 1000,
           aggregateTimeout: 300,
         }
       }
       return config
     }
   }
   ```

### Bundle Size Optimization

1. **Dynamic Imports:**
   ```tsx
   // Heavy components
   const HeavyChart = dynamic(() => import('./HeavyChart'), {
     loading: () => <div>Loading...</div>
   });

   // Feature flags
   const AdminPanel = dynamic(() => import('./AdminPanel'), {
     ssr: false
   });
   ```

2. **Tree Shaking:**
   ```tsx
   // Good: Named imports
   import { useState, useEffect } from 'react';
   import { format } from 'date-fns';

   // Bad: Default imports of large libraries
   import * as React from 'react';
   import dateFns from 'date-fns';
   ```

### Memory Leak Prevention

1. **Cleanup Patterns:**
   ```tsx
   useEffect(() => {
     const subscription = api.subscribe();

     return () => {
       subscription.unsubscribe(); // Always cleanup
     };
   }, []);
   ```

2. **AbortController Usage:**
   ```tsx
   useEffect(() => {
     const controller = new AbortController();

     fetch('/api/data', { signal: controller.signal })
       .then(handleData)
       .catch(handleError);

     return () => controller.abort();
   }, []);
   ```

## 🔄 Maintenance Routines

### Daily
- [ ] Check development server health
- [ ] Monitor memory usage
- [ ] Review console errors/warnings

### Weekly
- [ ] Run full environment cleanup
- [ ] Update dependencies (patch versions)
- [ ] Clear accumulated logs
- [ ] Check disk space usage

### Monthly
- [ ] Update Node.js/npm versions
- [ ] Security audit (`npm audit`)
- [ ] Performance analysis
- [ ] Review and optimize bundle size

### Before Major Changes
- [ ] Validate environment
- [ ] Create backup branch
- [ ] Run full test suite
- [ ] Document changes

## 🚨 Emergency Procedures

### Complete Environment Reset

**When everything is broken:**

1. **Stop all processes:**
   ```bash
   pkill -f "next\|node"
   ```

2. **Complete cleanup:**
   ```bash
   ./scripts/cleanup-dev.sh --full
   rm -rf node_modules package-lock.json
   npm cache clean --force
   ```

3. **Reinstall and validate:**
   ```bash
   npm install
   ./scripts/validate-env.sh
   ./scripts/dev-optimized.sh
   ```

### System Resource Issues

**When system is unresponsive:**

1. **Check system resources:**
   ```bash
   top -o CPU
   # or
   htop
   ```

2. **Kill resource-heavy processes:**
   ```bash
   pkill -f "node.*next"
   ```

3. **Clear system caches (macOS):**
   ```bash
   sudo purge
   ```

### Data Recovery

**When important work is lost:**

1. **Check git status:**
   ```bash
   git status
   git stash list
   git reflog
   ```

2. **Recover from backups:**
   ```bash
   # Check if cleanup script created backups
   ls -la backups/
   ```

## 📈 Monitoring and Alerting

### Key Metrics to Watch

1. **Performance Metrics:**
   - Build time < 30 seconds
   - Hot reload time < 2 seconds
   - Memory usage < 2GB
   - Bundle size < 10MB

2. **Health Indicators:**
   - Response time < 3 seconds
   - Error rate < 5%
   - CPU usage < 80%
   - Available disk space > 5GB

### Automated Monitoring Setup

1. **Performance Dashboard:**
   ```bash
   # Terminal 1: Development server
   ./scripts/dev-optimized.sh

   # Terminal 2: Performance monitoring
   ./scripts/performance-monitor.js

   # Terminal 3: Health monitoring
   ./scripts/monitor-dev.sh
   ```

2. **Log Monitoring:**
   ```bash
   # Watch logs in real-time
   tail -f logs/dev-monitor.log
   tail -f logs/performance.log
   ```

## 🎓 Learning Resources

### Next.js Best Practices
- [Next.js Performance Documentation](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React DevTools Profiler](https://react.dev/reference/react/Profiler)

### Performance Tools
- [webpack-bundle-analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)
- [next-bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

### Monitoring Tools
- Browser DevTools Performance tab
- React DevTools Profiler
- Node.js Performance Monitoring

## 📞 Support and Troubleshooting

### Getting Help

1. **Check logs first:**
   ```bash
   ./scripts/monitor-dev.sh log
   cat logs/environment-validation.log
   ```

2. **Run diagnostics:**
   ```bash
   ./scripts/validate-env.sh
   ```

3. **Generate reports:**
   ```bash
   node ./scripts/performance-monitor.js report
   ```

### Common Support Commands

```bash
# System information
uname -a
node --version
npm --version
df -h

# Project information
git status
npm list --depth=0
du -sh node_modules .next

# Process information
ps aux | grep node
lsof -i :3000
```

---

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial development environment optimization
- Comprehensive script suite
- Performance monitoring system
- Best practices documentation

---

*This document is part of the 6FB Methodologies Workshop development toolkit. Keep it updated as new practices emerge and tools evolve.*