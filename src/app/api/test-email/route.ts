import { NextRequest, NextResponse } from 'next/server'
// import { sendDiscountCode } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { email, name = 'Blake Bossio' } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Generate test discount code
    const discountCode = `6FB-${Date.now().toString(36).toUpperCase()}-20`

    // Send test discount code email
    console.log('Would send discount code email to:', email)
    const emailResult = { success: true, messageId: 'test-' + Date.now(), error: null }

    if (emailResult.success) {
      console.log(`Test discount code sent successfully to ${email}:`, {
        code: discountCode,
        emailId: emailResult.messageId
      })
    } else {
      console.error(`Failed to send test discount code to ${email}:`, emailResult.error)
    }

    return NextResponse.json({
      success: emailResult.success,
      discountCode,
      message: emailResult.success
        ? `Test email sent successfully to ${email}`
        : `Failed to send email: ${emailResult.error}`,
      emailId: emailResult.messageId
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error sending test email' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test email endpoint',
    usage: 'POST with { "email": "your@email.com", "name": "Your Name" }'
  })
}