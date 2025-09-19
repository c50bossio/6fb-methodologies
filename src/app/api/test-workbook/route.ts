import { NextRequest, NextResponse } from 'next/server'
import { storeWorkbookUser } from '@/lib/workbook-auth'
import { sendGridService } from '@/lib/sendgrid-service'

// Test endpoint for workbook functionality
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
      tests: {}
    }

    // Test 1: Password Generation
    if (testType === 'full' || testType === 'password') {
      const generateTestPassword = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        const generateSegment = (length: number): string => {
          let result = ''
          for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
          }
          return result
        }
        return `6FB-${generateSegment(4)}-${generateSegment(4)}`
      }

      const testPassword = generateTestPassword()
      results.tests.passwordGeneration = {
        success: true,
        password: testPassword,
        format: 'valid'
      }

      // Test 2: User Storage
      if (testType === 'full' || testType === 'storage') {
        try {
          const testUser = {
            email: email.toLowerCase().trim(),
            password: testPassword,
            firstName: 'Test',
            lastName: 'User',
            ticketType: 'GA',
            stripeSessionId: `test_${Date.now()}`,
            createdAt: new Date().toISOString()
          }

          storeWorkbookUser(testUser)

          results.tests.userStorage = {
            success: true,
            message: 'User stored successfully in memory'
          }
        } catch (error) {
          results.tests.userStorage = {
            success: false,
            error: error instanceof Error ? error.message : 'Storage failed'
          }
        }
      }

      // Test 3: Email Sending
      if (testType === 'full' || testType === 'email') {
        try {
          const emailResult = await sendGridService.sendWorkbookAccessEmail({
            email,
            firstName: 'Test',
            workbookPassword: testPassword,
            ticketType: 'GA',
            workshopDate: 'January 25-26, 2026'
          })

          results.tests.emailSending = {
            success: emailResult.success,
            messageId: emailResult.messageId,
            error: emailResult.error
          }
        } catch (error) {
          results.tests.emailSending = {
            success: false,
            error: error instanceof Error ? error.message : 'Email failed'
          }
        }
      }
    }

    // Test 4: Authentication Test
    if (testType === 'full' || testType === 'auth') {
      try {
        // Test authentication endpoint
        const testAuthResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/workbook/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password: results.tests.passwordGeneration?.password || '6FB-TEST-1234'
          })
        })

        const authData = await testAuthResponse.json()

        results.tests.authentication = {
          success: testAuthResponse.ok,
          status: testAuthResponse.status,
          response: authData
        }
      } catch (error) {
        results.tests.authentication = {
          success: false,
          error: error instanceof Error ? error.message : 'Auth test failed'
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
      overallStatus: successfulTests === totalTests ? 'PASS' : 'PARTIAL'
    }

    // If this is a full test and all passed, provide login instructions
    if (testType === 'full' && successfulTests === totalTests) {
      results.loginInstructions = {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/workbook`,
        email,
        password: results.tests.passwordGeneration?.password,
        note: 'You can now test the complete login flow with these credentials'
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for system status
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: '6FB Methodologies Workbook Test API',
    version: '1.0.0',
    features: {
      passwordGeneration: 'active',
      userStorage: 'active (in-memory)',
      emailSending: 'active',
      authentication: 'active',
      audioRecording: 'active',
      transcription: process.env.OPENAI_API_KEY?.startsWith('sk-proj-') ? 'configured' : 'needs-api-key'
    },
    endpoints: {
      fullTest: 'POST /api/test-workbook (body: {"email": "test@example.com"})',
      passwordTest: 'POST /api/test-workbook (body: {"email": "test@example.com", "testType": "password"})',
      emailTest: 'POST /api/test-workbook (body: {"email": "test@example.com", "testType": "email"})',
      authTest: 'POST /api/test-workbook (body: {"email": "test@example.com", "testType": "auth"})'
    },
    timestamp: new Date().toISOString()
  })
}