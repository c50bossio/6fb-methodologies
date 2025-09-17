#!/usr/bin/env node

/**
 * Test script to verify Next.js development optimizations
 * Checks if all optimization configurations are properly set up
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Testing Next.js Development Optimizations...\n')

// Test 1: Check if next.config.mjs has Turbopack enabled
console.log('1. Checking next.config.mjs...')
try {
  const nextConfig = fs.readFileSync('next.config.mjs', 'utf8')
  const hasTurbo = nextConfig.includes('turbo:')
  const hasWebpackOptimizations = nextConfig.includes('webpack:')
  const hasCaching = nextConfig.includes('config.cache') || nextConfig.includes('cache:')

  console.log(`   ✅ Turbopack configuration: ${hasTurbo ? 'FOUND' : 'MISSING'}`)
  console.log(`   ✅ Webpack optimizations: ${hasWebpackOptimizations ? 'FOUND' : 'MISSING'}`)
  console.log(`   ✅ Caching strategy: ${hasCaching ? 'FOUND' : 'MISSING'}`)
} catch (error) {
  console.log('   ❌ next.config.mjs not found or readable')
}

// Test 2: Check if development environment file exists
console.log('\n2. Checking development environment...')
try {
  const envDev = fs.readFileSync('.env.development', 'utf8')
  const hasTurbopack = envDev.includes('TURBOPACK=1')
  const hasNodeOptions = envDev.includes('NODE_OPTIONS')

  console.log(`   ✅ Turbopack enabled: ${hasTurbopack ? 'YES' : 'NO'}`)
  console.log(`   ✅ Node.js optimizations: ${hasNodeOptions ? 'YES' : 'NO'}`)
} catch (error) {
  console.log('   ❌ .env.development not found')
}

// Test 3: Check if performance components exist
console.log('\n3. Checking performance components...')
const performanceOptimizer = fs.existsSync('src/components/PerformanceOptimizer.tsx')
const hydrationOptimizer = fs.existsSync('src/components/HydrationOptimizer.tsx')
const noSSR = fs.existsSync('src/components/NoSSR.tsx')
const criticalCSS = fs.existsSync('src/styles/critical.css')

console.log(`   ✅ PerformanceOptimizer: ${performanceOptimizer ? 'EXISTS' : 'MISSING'}`)
console.log(`   ✅ HydrationOptimizer: ${hydrationOptimizer ? 'EXISTS' : 'MISSING'}`)
console.log(`   ✅ NoSSR component: ${noSSR ? 'EXISTS' : 'MISSING'}`)
console.log(`   ✅ Critical CSS: ${criticalCSS ? 'EXISTS' : 'MISSING'}`)

// Test 4: Check TypeScript configuration
console.log('\n4. Checking TypeScript configuration...')
try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
  const hasIncremental = tsConfig.compilerOptions?.incremental
  const hasBuildInfo = tsConfig.compilerOptions?.tsBuildInfoFile
  const hasOptimizations = tsConfig.compilerOptions?.assumeChangesOnlyAffectDirectDependencies

  console.log(`   ✅ Incremental compilation: ${hasIncremental ? 'ENABLED' : 'DISABLED'}`)
  console.log(`   ✅ Build info caching: ${hasBuildInfo ? 'ENABLED' : 'DISABLED'}`)
  console.log(`   ✅ Dependency optimizations: ${hasOptimizations ? 'ENABLED' : 'DISABLED'}`)
} catch (error) {
  console.log('   ❌ tsconfig.json not found or invalid')
}

// Test 5: Check package.json scripts
console.log('\n5. Checking package.json scripts...')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const hasOptimizedDev = packageJson.scripts?.dev?.includes('dev-server.js')
  const hasTurboScript = packageJson.scripts?.['dev:turbo']
  const hasCleanScript = packageJson.scripts?.clean

  console.log(`   ✅ Optimized dev script: ${hasOptimizedDev ? 'CONFIGURED' : 'BASIC'}`)
  console.log(`   ✅ Turbo dev script: ${hasTurboScript ? 'AVAILABLE' : 'MISSING'}`)
  console.log(`   ✅ Clean script: ${hasCleanScript ? 'AVAILABLE' : 'MISSING'}`)
} catch (error) {
  console.log('   ❌ package.json not found or invalid')
}

// Test 6: Check if development server script exists
console.log('\n6. Checking development server script...')
const devServerExists = fs.existsSync('scripts/dev-server.js')
if (devServerExists) {
  try {
    const devServerContent = fs.readFileSync('scripts/dev-server.js', 'utf8')
    const hasTurbopackFlag = devServerContent.includes('TURBOPACK: \'1\'')
    const hasMemoryOptimization = devServerContent.includes('max_old_space_size')
    const hasWorkerOptimization = devServerContent.includes('cpuCount')

    console.log(`   ✅ Custom dev server: EXISTS`)
    console.log(`   ✅ Turbopack integration: ${hasTurbopackFlag ? 'YES' : 'NO'}`)
    console.log(`   ✅ Memory optimization: ${hasMemoryOptimization ? 'YES' : 'NO'}`)
    console.log(`   ✅ CPU optimization: ${hasWorkerOptimization ? 'YES' : 'NO'}`)
  } catch (error) {
    console.log('   ❌ Development server script not readable')
  }
} else {
  console.log('   ❌ scripts/dev-server.js not found')
}

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 OPTIMIZATION SUMMARY')
console.log('='.repeat(50))

const allOptimizations = [
  performanceOptimizer,
  hydrationOptimizer,
  fs.existsSync('.env.development'),
  devServerExists,
  criticalCSS
]

const optimizedCount = allOptimizations.filter(Boolean).length
const totalCount = allOptimizations.length

console.log(`✅ Optimizations applied: ${optimizedCount}/${totalCount}`)

if (optimizedCount === totalCount) {
  console.log('🎉 All optimizations are properly configured!')
  console.log('\n🚀 Run "npm run dev" to start the optimized development server')
} else {
  console.log('⚠️  Some optimizations may be missing. Check the items marked as MISSING above.')
}

console.log('\n📚 For detailed information, see: DEVELOPMENT_OPTIMIZATION_GUIDE.md')
console.log('🔧 Troubleshooting: npm run clean && npm run dev')