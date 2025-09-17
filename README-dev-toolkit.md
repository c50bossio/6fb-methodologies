# 6FB Methodologies Workshop - Development Toolkit

## 🚀 Quick Start

### New Developer Setup
```bash
# 1. Validate your environment
npm run validate

# 2. Install dependencies (if needed)
npm install

# 3. Start optimized development
npm run dev:optimized
```

### Daily Development Workflow
```bash
# Option 1: Use optimized development server (recommended)
npm run dev:optimized

# Option 2: Standard Next.js development + monitoring
npm run dev        # Terminal 1: Development server
npm run monitor    # Terminal 2: Health monitoring (optional)
```

## 🛠️ Available Scripts

### Development Scripts

| Command | Purpose | Use Case |
|---------|---------|----------|
| `npm run dev` | Standard Next.js dev server | Basic development |
| `npm run dev:optimized` | Optimized dev server with resource management | **Recommended for daily use** |
| `npm run monitor` | Real-time health monitoring | Track performance issues |
| `npm run monitor:check` | Single health check | Quick status verification |

### Maintenance Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run cleanup` | Interactive cleanup (caches, temp files) | Weekly maintenance |
| `npm run cleanup:quick` | Fast cleanup (caches only) | Before starting development |
| `npm run cleanup:full` | Complete cleanup (includes node_modules) | Major issues, after updates |

### Validation Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run validate` | Complete environment validation | New setup, troubleshooting |
| `npm run validate:quick` | Quick validation (skip network tests) | Daily validation |

### Performance Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run performance` | Real-time performance monitoring | Optimize development workflow |
| `npm run performance:report` | Generate performance report | Weekly performance reviews |

### Deployment Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run deploy:prepare` | Complete deployment preparation | Before production deployment |
| `npm run deploy:validate` | Validation only (no build) | Pre-deployment checks |

## 🎯 Common Workflows

### Starting Development (Recommended)
```bash
# Clean start with validation
npm run cleanup:quick
npm run validate:quick
npm run dev:optimized
```

### Troubleshooting Issues
```bash
# 1. Check environment
npm run validate

# 2. Clean caches
npm run cleanup:quick

# 3. If issues persist, full cleanup
npm run cleanup:full
npm install
npm run dev:optimized
```

### Performance Monitoring
```bash
# Terminal 1: Development server
npm run dev:optimized

# Terminal 2: Performance monitoring
npm run performance

# Terminal 3: Health monitoring
npm run monitor
```

### Weekly Maintenance
```bash
# 1. Clean environment
npm run cleanup

# 2. Generate performance report
npm run performance:report

# 3. Validate setup
npm run validate

# 4. Start development
npm run dev:optimized
```

### Deployment Preparation
```bash
# Complete preparation with build and packaging
npm run deploy:prepare

# Or just validation and build
npm run deploy:validate
```

## 🚨 Troubleshooting

### React Hydration Errors
```bash
npm run cleanup:quick
rm -rf .next/
npm run dev:optimized
```

### Memory Issues
```bash
# Check current usage
npm run monitor:check

# Clean and restart
npm run cleanup:full
npm install
npm run dev:optimized
```

### Port Conflicts
The `dev:optimized` script automatically handles port conflicts. For manual resolution:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev:optimized
```

### Build Issues
```bash
# Clean TypeScript and Next.js caches
npm run cleanup:quick

# Full rebuild
npm run cleanup
npm install
npm run build
```

## 📊 Monitoring and Logs

### Log Locations
```
logs/
├── dev-monitor.log           # Health monitoring logs
├── performance.log           # Performance monitoring logs
├── performance-metrics.json  # Performance data
├── cleanup.log              # Cleanup operation logs
└── environment-validation.log # Environment validation logs
```

### Real-time Monitoring
```bash
# Watch logs in real-time
tail -f logs/dev-monitor.log      # Health monitoring
tail -f logs/performance.log      # Performance data
```

### Performance Reports
```bash
# Generate and view performance report
npm run performance:report
cat logs/performance-report-$(date +%Y-%m-%d).json
```

## ⚙️ Configuration

### Environment Variables
```bash
# Memory limits (in MB)
MAX_MEMORY_MB=2048
MIN_FREE_MEMORY_MB=1024

# Development server port
NEXT_PORT=3000

# Node.js options
NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
```

### Customizing Scripts
Edit the scripts in the `/scripts` directory:
- `dev-optimized.sh` - Development server optimization
- `monitor-dev.sh` - Health monitoring configuration
- `cleanup-dev.sh` - Cleanup behavior
- `performance-monitor.js` - Performance thresholds
- `validate-env.sh` - Validation criteria
- `deploy-prepare.sh` - Deployment preparation

## 📚 Documentation

- [Development Best Practices](./docs/development-best-practices.md) - Comprehensive guide
- [Script Documentation](./scripts/) - Individual script documentation
- [Next.js Documentation](https://nextjs.org/docs) - Framework documentation

## 🆘 Emergency Procedures

### Complete Environment Reset
```bash
# Stop all processes
pkill -f "next\|node"

# Complete cleanup
npm run cleanup:full
rm -rf node_modules package-lock.json
npm cache clean --force

# Reinstall
npm install
npm run validate
npm run dev:optimized
```

### System Resource Issues
```bash
# Check system resources
top -o CPU

# Kill resource-heavy processes
pkill -f "node.*next"

# Clear system caches (macOS)
sudo purge
```

## 🔧 Development Tips

### Performance Optimization
1. Use `npm run dev:optimized` instead of `npm run dev`
2. Monitor performance with `npm run performance`
3. Regular cleanup with `npm run cleanup:quick`
4. Weekly maintenance with `npm run cleanup`

### Memory Management
1. Set appropriate memory limits in environment variables
2. Monitor memory usage with health monitoring
3. Clean caches regularly
4. Use incremental TypeScript compilation

### Build Optimization
1. Use dynamic imports for heavy components
2. Optimize bundle size with tree shaking
3. Monitor bundle size with deployment preparation
4. Use Next.js built-in optimizations

## 📞 Support

### Getting Help
1. **Check logs first**: `npm run monitor:check`
2. **Run diagnostics**: `npm run validate`
3. **Generate reports**: `npm run performance:report`

### Reporting Issues
Include the following information:
- OS and version
- Node.js and npm versions
- Error messages from logs
- Steps to reproduce
- Output from `npm run validate`

---

## 🎉 Success Indicators

Your development environment is optimized when:
- ✅ Development server starts in < 10 seconds
- ✅ Hot reload works in < 2 seconds
- ✅ Memory usage stays below 2GB
- ✅ No hydration errors in console
- ✅ Build completes in < 30 seconds
- ✅ All validation checks pass

---

*This toolkit is designed to prevent the React hydration errors and performance issues that previously affected the development environment. Use the scripts regularly for optimal development experience.*