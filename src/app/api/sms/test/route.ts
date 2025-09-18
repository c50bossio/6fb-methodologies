import { NextRequest, NextResponse } from 'next/server'
import { smsService } from '@/lib/sms-service'

// POST endpoint to send test SMS
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'test':
        const testResult = await smsService.sendTestMessage()
        return NextResponse.json({
          success: testResult.success,
          messageId: testResult.messageId,
          error: testResult.error,
          status: smsService.getStatus()
        })

      case 'mock-sale':
        // Send a mock ticket sale notification for testing
        const mockSaleResult = await smsService.sendTicketSaleNotification({
          city: 'Atlanta',
          ticketType: 'VIP',
          quantity: 1,
          customerEmail: 'test@example.com',
          totalAmount: 150000, // $1,500.00
          customerName: 'Test Customer',
          sessionId: 'test_session_' + Date.now(),
          gaTicketsRemaining: 28,
          vipTicketsRemaining: 12
        })

        return NextResponse.json({
          success: mockSaleResult.success,
          messageId: mockSaleResult.messageId,
          error: mockSaleResult.error,
          status: smsService.getStatus()
        })

      case 'system-alert':
        const alertResult = await smsService.sendSystemAlert(
          'Test system alert from 6FB SMS service',
          'low'
        )

        return NextResponse.json({
          success: alertResult.success,
          messageId: alertResult.messageId,
          error: alertResult.error,
          status: smsService.getStatus()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: test, mock-sale, or system-alert' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('SMS test endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: smsService.getStatus()
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check SMS service status
export async function GET() {
  try {
    const status = smsService.getStatus()

    return NextResponse.json({
      smsService: status,
      endpoint: '/api/sms/test',
      supportedActions: [
        'test - Send basic test message',
        'mock-sale - Send mock ticket sale notification',
        'system-alert - Send test system alert'
      ],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('SMS status endpoint error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}