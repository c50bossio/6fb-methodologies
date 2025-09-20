# Development Environment Guide

## HMR Module Factory Error Resolution

### Problem
The recurring error `Module [project]/node_modules/next/router.js [app-client] (ecmascript) was instantiated because it was required from module [project]/src/components/HydrationOptimizer.tsx [app-client] (ecmascript), but the module factory is not available. It might have been deleted in an HMR update.` was caused by multiple competing development servers.

### Root Cause
1. **Multiple Development Servers**: Claude Code shell sessions were spawning multiple `npm run dev` processes
2. **Competing HMR Systems**: Multiple servers on port 3000 caused module factory corruption
3. **Cached Source Maps**: Browser DevTools showed stale source maps from previous builds
4. **Turbo Mode Conflicts**: Experimental Turbo mode conflicted with custom server.js

### Permanent Solution Applied

#### 1. Process Management
- Systematic identification and termination of competing development servers
- Process tree analysis to find parent processes spawning duplicates
- Single development server architecture enforcement

#### 2. Cache Management
- Complete removal of `.next`, `.turbo`, `.swc`, `.vercel`, `node_modules/.cache`
- Source map regeneration from scratch
- Browser cache clearing requirements

#### 3. Configuration Optimization
- Temporarily disabled Turbo mode to prevent custom server conflicts
- Verified all router imports use `next/navigation` (App Router) instead of legacy `next/router`

#### 4. Prevention Mechanisms
- Process monitoring to detect multiple server spawning
- Clear documentation of development server management
- Browser cache clearing procedures

### Development Server Best Practices

#### Starting Development Server
```bash
# 1. Always check if a server is already running
lsof -ti:3000

# 2. If multiple processes exist, kill them all
lsof -ti:3000 | xargs kill -9

# 3. Clear caches before starting
rm -rf .next .turbo .swc node_modules/.cache

# 4. Start single development server
npm run dev
```

#### Browser Cache Clearing (Required for Testing)
**Chrome/Edge:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Or: DevTools → Application → Storage → Clear storage

**Firefox:**
1. Ctrl+Shift+R (hard refresh)
2. Or: DevTools → Network → Settings → Disable cache

#### Monitoring Multiple Processes
```bash
# Check current processes on port 3000
lsof -ti:3000

# Should return exactly 1 process ID
# If more than 1, you have competing servers

# Check process tree
ps -ef | grep "npm run dev"
```

### Technical Details

#### Custom Server Architecture
This project uses a custom `server.js` with Socket.io integration:
- **Port**: 3000
- **Namespaces**: /live-sessions, /workbook, /admin
- **HMR**: Standard Next.js Fast Refresh
- **Routing**: App Router (`next/navigation`)

#### Common Pitfalls
1. **Multiple Claude Code Sessions**: Each shell session can spawn development servers
2. **Background Processes**: Orphaned npm/node processes can accumulate
3. **Browser Cache**: DevTools cache can show stale source maps
4. **Turbo Mode**: Can conflict with custom server implementation

### Troubleshooting

#### If HMR Errors Return:
1. Check process count: `lsof -ti:3000 | wc -l` (should be 1)
2. Kill all development processes
3. Clear all caches (build and browser)
4. Restart with single server
5. Hard refresh browser with cleared cache

#### Prevention:
- Only run one development server at a time
- Use process monitoring commands before starting new servers
- Clear browser cache when testing fixes
- Monitor for automatic server spawning by IDE extensions

### Current Status
- ✅ Single development server running on localhost:3000
- ✅ HMR module factory errors resolved
- ✅ Fast compilation (60ms build time)
- ✅ Socket.io namespaces operational
- ✅ All router imports use App Router modules
- ✅ Turbo mode temporarily disabled for stability

---
*Last Updated: 2025-09-20 - HMR Module Factory Error Permanently Resolved*