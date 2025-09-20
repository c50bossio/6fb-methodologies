/**
 * Load Testing Script for 6FB Methodologies Ticket System
 * Tests system performance under high concurrent load
 */

import { jest } from '@jest/globals'

// Configuration for load testing
const LOAD_TEST_CONFIG = {
  CONCURRENT_USERS: parseInt(process.env.LOAD_TEST_USERS) || 50,
  TEST_DURATION: parseInt(process.env.LOAD_TEST_DURATION) || 60000, // 60 seconds
  RAMP_UP_TIME: parseInt(process.env.LOAD_TEST_RAMP_UP) || 10000, // 10 seconds
  API_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
}

// Test data generators
const generateTestUser = (index) => ({
  firstName: `LoadTest${index}`,
  lastName: `User${index}`,
  email: `loadtest${index}@example.com`,
  phone: `+1${String(index).padStart(10, '0')}`,
  businessType: ['individual', 'shop_owner', 'enterprise'][index % 3],
  yearsExperience: ['1-2', '2-5', '5-10', '10+'][index % 4],
  ticketType: index % 3 === 0 ? 'VIP' : 'GA',
  quantity: (index % 3) + 1, // 1-3 tickets
  isSixFBMember: index % 5 === 0, // 20% are members
  cityId: ['dallas-jan-2026', 'atlanta-feb-2026', 'vegas-mar-2026'][index % 3],
})

// Performance metrics collector
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      concurrentUsers: 0,
      checkoutAttempts: 0,
      successfulCheckouts: 0,
      inventoryConflicts: 0,
      rateLimitHits: 0,
    }
  }

  recordRequest(responseTime, success, error = null) {
    this.metrics.totalRequests++
    this.metrics.responseTimes.push(responseTime)

    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
      if (error) {
        this.metrics.errors.push({
          timestamp: new Date(),
          error: error.message || error,
        })

        // Categorize specific errors
        if (error.message?.includes('inventory')) {
          this.metrics.inventoryConflicts++
        }
        if (error.message?.includes('rate limit') || error.status === 429) {
          this.metrics.rateLimitHits++
        }
      }
    }
  }

  recordCheckout(success) {
    this.metrics.checkoutAttempts++
    if (success) {
      this.metrics.successfulCheckouts++
    }
  }

  getStats() {
    const responseTimes = this.metrics.responseTimes
    responseTimes.sort((a, b) => a - b)

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
        failureRate: (this.metrics.failedRequests / this.metrics.totalRequests) * 100,
        checkoutSuccessRate: (this.metrics.successfulCheckouts / this.metrics.checkoutAttempts) * 100,
      },
      responseTimes: {
        min: responseTimes[0] || 0,
        max: responseTimes[responseTimes.length - 1] || 0,
        average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
        p50: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      },
      errors: {
        total: this.metrics.failedRequests,
        inventoryConflicts: this.metrics.inventoryConflicts,
        rateLimitHits: this.metrics.rateLimitHits,
        breakdown: this.getErrorBreakdown(),
      },
      concurrency: {
        maxConcurrentUsers: this.metrics.concurrentUsers,
        checkoutAttempts: this.metrics.checkoutAttempts,
        successfulCheckouts: this.metrics.successfulCheckouts,
      }
    }
  }

  getErrorBreakdown() {
    const breakdown = {}
    this.metrics.errors.forEach(error => {
      const errorType = this.categorizeError(error.error)
      breakdown[errorType] = (breakdown[errorType] || 0) + 1
    })
    return breakdown
  }

  categorizeError(error) {
    const errorString = String(error).toLowerCase()
    if (errorString.includes('inventory')) return 'inventory_exhausted'
    if (errorString.includes('rate limit')) return 'rate_limited'
    if (errorString.includes('validation')) return 'validation_error'
    if (errorString.includes('network')) return 'network_error'
    if (errorString.includes('timeout')) return 'timeout'
    return 'other'
  }
}

// Load test scenarios
class LoadTestScenarios {
  constructor(baseUrl, metrics) {
    this.baseUrl = baseUrl
    this.metrics = metrics
  }

  async simulateCheckoutFlow(user) {
    const startTime = Date.now()

    try {
      // Step 1: Create checkout session
      const checkoutResponse = await this.createCheckoutSession(user)

      if (!checkoutResponse.success) {
        throw new Error(`Checkout creation failed: ${checkoutResponse.error}`)
      }

      // Step 2: Simulate payment processing time
      await this.delay(Math.random() * 2000 + 1000) // 1-3 seconds

      // Step 3: Simulate webhook processing
      await this.simulateWebhookProcessing(checkoutResponse.sessionId, user)

      const responseTime = Date.now() - startTime
      this.metrics.recordRequest(responseTime, true)
      this.metrics.recordCheckout(true)

      return { success: true, responseTime }

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.metrics.recordRequest(responseTime, false, error)
      this.metrics.recordCheckout(false)

      return { success: false, error, responseTime }
    }
  }

  async createCheckoutSession(user) {
    const response = await fetch(`${this.baseUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketType: user.ticketType,
        quantity: user.quantity,
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
        isSixFBMember: user.isSixFBMember,
        registrationData: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          businessType: user.businessType,
          yearsExperience: user.yearsExperience,
          ticketType: user.ticketType,
          quantity: user.quantity,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  async simulateWebhookProcessing(sessionId, user) {
    // Simulate Stripe webhook for successful payment
    const webhookData = {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          payment_status: 'paid',
          amount_total: user.ticketType === 'VIP' ? 150000 : 100000,
          currency: 'usd',
          customer_details: {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
          },
          metadata: {
            ticketType: user.ticketType,
            quantity: String(user.quantity),
            customerName: `${user.firstName} ${user.lastName}`,
            cityId: user.cityId,
            isSixFBMember: String(user.isSixFBMember),
          },
        },
      },
    }

    // Note: In a real load test, you'd want to actually hit the webhook endpoint
    // For this test, we're simulating the processing
    await this.delay(500) // Simulate webhook processing time
  }

  async checkInventoryStatus(cityId) {
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}/api/inventory-status?cityId=${cityId}`)

      if (!response.ok) {
        throw new Error(`Inventory check failed: ${response.status}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime
      this.metrics.recordRequest(responseTime, true)

      return data

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.metrics.recordRequest(responseTime, false, error)
      throw error
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Main load test orchestrator
class LoadTestOrchestrator {
  constructor(config) {
    this.config = config
    this.metrics = new PerformanceMetrics()
    this.scenarios = new LoadTestScenarios(config.API_BASE_URL, this.metrics)
    this.activeUsers = new Set()
  }

  async runLoadTest() {
    console.log('🚀 Starting load test with configuration:')
    console.log(`  Concurrent Users: ${this.config.CONCURRENT_USERS}`)
    console.log(`  Test Duration: ${this.config.TEST_DURATION}ms`)
    console.log(`  Ramp-up Time: ${this.config.RAMP_UP_TIME}ms`)
    console.log(`  Target URL: ${this.config.API_BASE_URL}`)

    const startTime = Date.now()
    const userPromises = []

    // Ramp up users gradually
    const usersPerInterval = Math.ceil(this.config.CONCURRENT_USERS / 10)
    const intervalTime = this.config.RAMP_UP_TIME / 10

    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        for (let j = 0; j < usersPerInterval && this.activeUsers.size < this.config.CONCURRENT_USERS; j++) {
          const userId = this.activeUsers.size
          const userPromise = this.simulateUser(userId, startTime)
          userPromises.push(userPromise)
          this.activeUsers.add(userId)
        }
        this.metrics.concurrentUsers = Math.max(this.metrics.concurrentUsers, this.activeUsers.size)
      }, i * intervalTime)
    }

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.TEST_DURATION))

    console.log('⏱️  Test duration completed, waiting for active users to finish...')

    // Wait for all users to complete
    await Promise.allSettled(userPromises)

    const totalTime = Date.now() - startTime

    return this.generateReport(totalTime)
  }

  async simulateUser(userId, testStartTime) {
    const user = generateTestUser(userId)
    const userStartTime = Date.now()

    try {
      // Each user performs multiple actions during the test
      while (Date.now() - testStartTime < this.config.TEST_DURATION) {
        // Check inventory (lightweight operation)
        await this.scenarios.checkInventoryStatus(user.cityId)

        // Occasionally attempt checkout (heavier operation)
        if (Math.random() < 0.3) { // 30% chance
          await this.scenarios.simulateCheckoutFlow(user)
        }

        // Wait between actions
        await this.scenarios.delay(Math.random() * 5000 + 1000) // 1-6 seconds
      }

    } catch (error) {
      console.error(`User ${userId} encountered error:`, error.message)
    } finally {
      this.activeUsers.delete(userId)
    }
  }

  generateReport(totalTime) {
    const stats = this.metrics.getStats()

    const report = {
      testConfiguration: this.config,
      testDuration: totalTime,
      performanceMetrics: stats,
      recommendations: this.generateRecommendations(stats),
      timestamp: new Date().toISOString(),
    }

    this.printReport(report)
    return report
  }

  generateRecommendations(stats) {
    const recommendations = []

    // Performance recommendations
    if (stats.responseTimes.p95 > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'P95 response time exceeds 5 seconds - consider scaling infrastructure',
      })
    }

    if (stats.responseTimes.average > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Average response time exceeds 2 seconds - optimize API endpoints',
      })
    }

    // Success rate recommendations
    if (stats.summary.successRate < 95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Success rate below 95% - investigate error causes',
      })
    }

    if (stats.summary.checkoutSuccessRate < 90) {
      recommendations.push({
        type: 'business',
        priority: 'critical',
        message: 'Checkout success rate below 90% - potential revenue loss',
      })
    }

    // Error-specific recommendations
    if (stats.errors.inventoryConflicts > 10) {
      recommendations.push({
        type: 'inventory',
        priority: 'high',
        message: 'High inventory conflicts - implement better concurrency control',
      })
    }

    if (stats.errors.rateLimitHits > 5) {
      recommendations.push({
        type: 'rate-limiting',
        priority: 'medium',
        message: 'Rate limiting triggered - review limits or implement queuing',
      })
    }

    return recommendations
  }

  printReport(report) {
    console.log('\n📊 LOAD TEST REPORT')
    console.log('='.repeat(60))

    console.log('\n📈 Performance Summary:')
    console.log(`  Total Requests: ${report.performanceMetrics.summary.totalRequests}`)
    console.log(`  Success Rate: ${report.performanceMetrics.summary.successRate.toFixed(2)}%`)
    console.log(`  Checkout Success Rate: ${report.performanceMetrics.summary.checkoutSuccessRate.toFixed(2)}%`)

    console.log('\n⏱️  Response Times:')
    console.log(`  Average: ${report.performanceMetrics.responseTimes.average.toFixed(0)}ms`)
    console.log(`  P50: ${report.performanceMetrics.responseTimes.p50}ms`)
    console.log(`  P95: ${report.performanceMetrics.responseTimes.p95}ms`)
    console.log(`  P99: ${report.performanceMetrics.responseTimes.p99}ms`)

    console.log('\n❌ Error Analysis:')
    console.log(`  Total Errors: ${report.performanceMetrics.errors.total}`)
    console.log(`  Inventory Conflicts: ${report.performanceMetrics.errors.inventoryConflicts}`)
    console.log(`  Rate Limit Hits: ${report.performanceMetrics.errors.rateLimitHits}`)

    if (Object.keys(report.performanceMetrics.errors.breakdown).length > 0) {
      console.log('  Error Breakdown:')
      Object.entries(report.performanceMetrics.errors.breakdown).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`)
      })
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.forEach((rec, index) => {
        const priority = rec.priority.toUpperCase()
        const icon = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : '💭'
        console.log(`  ${icon} [${priority}] ${rec.message}`)
      })
    }

    console.log('\n' + '='.repeat(60))
  }
}

// Export for use in tests
export { LoadTestOrchestrator, PerformanceMetrics, LOAD_TEST_CONFIG }

// Run load test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new LoadTestOrchestrator(LOAD_TEST_CONFIG)

  orchestrator.runLoadTest()
    .then(report => {
      console.log('\n✅ Load test completed successfully')

      // Exit with error code if critical issues found
      const criticalIssues = report.recommendations.filter(r => r.priority === 'critical')
      if (criticalIssues.length > 0 || report.performanceMetrics.summary.successRate < 90) {
        process.exit(1)
      }

      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Load test failed:', error.message)
      process.exit(1)
    })
}