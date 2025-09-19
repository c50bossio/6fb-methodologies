import { NextRequest, NextResponse } from 'next/server'
import {
  checkDatabaseHealth,
  storeWorkbookUser,
  verifyWorkbookPassword,
  getWorkbookUser,
  getUserStats
} from '@/lib/database-auth'

// Test endpoint for database functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, testType = 'full' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      email,
      database: 'production',
      tests: {}
    }

    // Test 1: Database Health Check
    if (testType === 'full' || testType === 'health') {
      const healthCheck = await checkDatabaseHealth()
      results.tests.databaseHealth = healthCheck
    }

    // Test 2: User Storage
    if (testType === 'full' || testType === 'storage') {
      try {
        const testPassword = `6FB-TEST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

        const testUser = {
          email: email.toLowerCase().trim(),
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
          ticketType: 'GA',
          stripeSessionId: `test_db_${Date.now()}`,
          createdAt: new Date().toISOString(),
          businessType: 'Test Business',
          yearsExperience: '1-2 years'
        }

        await storeWorkbookUser(testUser)

        results.tests.userStorage = {
          success: true,
          message: 'User stored successfully in database',
          testPassword
        }
      } catch (error) {
        results.tests.userStorage = {
          success: false,
          error: error instanceof Error ? error.message : 'Database storage failed'
        }
      }
    }

    // Test 3: Password Verification
    if (testType === 'full' || testType === 'auth') {
      try {
        const testPassword = results.tests.userStorage?.testPassword || '6FB-TEST-1234'
        const passwordValid = await verifyWorkbookPassword(email, testPassword)

        results.tests.passwordVerification = {
          success: passwordValid,
          message: passwordValid ? 'Password verification successful' : 'Password verification failed',
          testPassword
        }
      } catch (error) {
        results.tests.passwordVerification = {
          success: false,
          error: error instanceof Error ? error.message : 'Password verification failed'
        }
      }
    }

    // Test 4: User Retrieval
    if (testType === 'full' || testType === 'retrieval') {
      try {
        const user = await getWorkbookUser(email)

        results.tests.userRetrieval = {
          success: !!user,
          message: user ? 'User retrieved successfully' : 'User not found',
          userData: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            ticketType: user.ticketType,
            loginCount: user.loginCount,
            lastLogin: user.lastLogin
          } : null
        }
      } catch (error) {
        results.tests.userRetrieval = {
          success: false,
          error: error instanceof Error ? error.message : 'User retrieval failed'
        }
      }
    }

    // Test 5: User Statistics
    if (testType === 'full' || testType === 'stats') {
      try {
        const stats = await getUserStats(email)

        results.tests.userStats = {
          success: !!stats,
          message: stats ? 'Statistics retrieved successfully' : 'No statistics found',
          stats
        }
      } catch (error) {
        results.tests.userStats = {
          success: false,
          error: error instanceof Error ? error.message : 'Statistics retrieval failed'
        }
      }
    }

    // Summary
    const successfulTests = Object.values(results.tests).filter((test: any) => test.success).length
    const totalTests = Object.keys(results.tests).length

    results.summary = {
      successfulTests,
      totalTests,
      successRate: totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(1) + '%' : '0%',
      overallStatus: successfulTests === totalTests ? 'PASS' : 'PARTIAL',
      databaseStatus: results.tests.databaseHealth?.healthy ? 'CONNECTED' : 'DISCONNECTED'
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Database test endpoint error:', error)

    // Check if this is a database connection error
    const isDatabaseError = error instanceof Error && (
      error.message.includes('database') ||
      error.message.includes('connection') ||
      error.message.includes('relation') ||
      error.message.includes('schema')
    )

    return NextResponse.json(
      {
        error: 'Database test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        isDatabaseError,
        suggestion: isDatabaseError
          ? 'Please ensure your database is set up and DATABASE_URL is configured'
          : 'Check server logs for details',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for database status
export async function GET() {
  try {
    const healthCheck = await checkDatabaseHealth()

    return NextResponse.json({
      status: 'active',
      service: '6FB Methodologies Database Test API',
      version: '1.0.0',
      database: {
        type: 'PostgreSQL',
        healthy: healthCheck.healthy,
        error: healthCheck.error
      },
      endpoints: {
        fullTest: 'POST /api/test-database (body: {"email": "test@example.com"})',
        healthCheck: 'POST /api/test-database (body: {"email": "test@example.com", "testType": "health"})',
        storageTest: 'POST /api/test-database (body: {"email": "test@example.com", "testType": "storage"})',
        authTest: 'POST /api/test-database (body: {"email": "test@example.com", "testType": "auth"})'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      service: '6FB Methodologies Database Test API',
      error: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}