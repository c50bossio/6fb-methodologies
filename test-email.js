const { sendDiscountCode } = require('./src/lib/notifications.ts')

async function testEmail() {
  try {
    console.log('Sending test email to bossio@tomb45.com...')

    const result = await sendDiscountCode({
      customerEmail: 'bossio@tomb45.com',
      customerName: 'Blake Bossio',
      membershipType: 'Founder',
      discountCode: `6FB-TEST-${Date.now().toString(36).toUpperCase()}-20`,
      discountAmount: 20,
      workshopName: '6FB Methodologies Workshop',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })

    if (result.success) {
      console.log('✅ Email sent successfully!')
      console.log('Message ID:', result.messageId)
    } else {
      console.log('❌ Email failed to send')
      console.log('Error:', result.error)
    }
  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

testEmail()