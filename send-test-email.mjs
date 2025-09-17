import dotenv from 'dotenv'
import sgMail from '@sendgrid/mail'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'support@em3014.6fbmentorship.com'
const FROM_NAME = process.env.SENDGRID_FROM_NAME || '6FB Methodologies Workshop'

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found in environment')
  process.exit(1)
}

sgMail.setApiKey(SENDGRID_API_KEY)

const discountCode = `6FB-TEST-${Date.now().toString(36).toUpperCase()}-20`
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

const emailData = {
  to: 'bossio@tomb45.com',
  from: {
    email: FROM_EMAIL,
    name: FROM_NAME
  },
  subject: '🎯 Your Exclusive 6FB Workshop Discount Code',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your 6FB Workshop Discount</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- Header with gradient background matching funnel -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
            🎯 Your Exclusive Discount
          </h1>
          <p style="color: #e0e7ff; font-size: 16px; margin: 10px 0 0 0; opacity: 0.9;">
            6FB Methodologies Workshop
          </p>
        </div>

        <!-- Main content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
            Hey Blake! 👋
          </h2>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Great news! As a verified <strong>Founder</strong> member of 6FB, you're eligible for an exclusive <strong>20% discount</strong> on our upcoming workshop.
          </p>

          <!-- Discount code box with funnel styling -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
            <p style="color: #e0e7ff; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
              Your Discount Code
            </p>
            <div style="background: #ffffff; border-radius: 8px; padding: 15px; margin: 10px 0;">
              <code style="color: #667eea; font-size: 24px; font-weight: 700; letter-spacing: 2px; font-family: 'Monaco', 'Consolas', monospace;">
                ${discountCode}
              </code>
            </div>
            <p style="color: #e0e7ff; font-size: 12px; margin: 10px 0 0 0;">
              Copy this code and use it at checkout
            </p>
          </div>

          <!-- CTA Button matching funnel style -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="http://localhost:3003/#pricing" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
              Claim Your Spot Now →
            </a>
          </div>

          <!-- Workshop details -->
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 15px 0;">
              📚 Workshop Details
            </h3>
            <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Comprehensive methodology training</li>
              <li>Live Q&A with industry experts</li>
              <li>Exclusive member resources</li>
              <li>Certificate of completion</li>
            </ul>
          </div>

          <!-- Urgency/expiration -->
          <div style="border-left: 4px solid #667eea; padding-left: 20px; margin: 25px 0;">
            <p style="color: #667eea; font-size: 14px; font-weight: 600; margin: 0;">
              ⏰ This discount expires on ${expiresAt.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
            Ready to take your business to the next level? Use code <strong>${discountCode}</strong> at checkout to save 20%.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1a1a1a; padding: 30px; text-align: center;">
          <p style="color: #888888; font-size: 14px; margin: 0 0 10px 0;">
            6FB Methodologies Workshop
          </p>
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Questions? Reply to this email or contact support@em3014.6fbmentorship.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
    🎯 Your Exclusive 6FB Workshop Discount

    Hey Blake!

    Great news! As a verified Founder member of 6FB, you're eligible for an exclusive 20% discount on our upcoming workshop.

    Your Discount Code: ${discountCode}

    Workshop Details:
    • Comprehensive methodology training
    • Live Q&A with industry experts
    • Exclusive member resources
    • Certificate of completion

    This discount expires on ${expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}

    Ready to take your business to the next level? Use code ${discountCode} at checkout to save 20%.

    Register now: http://localhost:3003/#pricing

    Questions? Reply to this email or contact support@em3014.6fbmentorship.com

    6FB Methodologies Workshop
  `
}

async function sendTestEmail() {
  try {
    console.log('🚀 Sending test email to bossio@tomb45.com...')
    console.log('📧 From:', FROM_EMAIL)
    console.log('🎟️ Discount Code:', discountCode)
    console.log('⏰ Expires:', expiresAt.toLocaleDateString())

    const result = await sgMail.send(emailData)

    console.log('✅ Email sent successfully!')
    console.log('📬 Message ID:', result[0]?.headers?.['x-message-id'] || 'N/A')
    console.log('📊 Status Code:', result[0]?.statusCode)

  } catch (error) {
    console.error('❌ Failed to send email:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Body:', error.response.body)
    } else {
      console.error('Error:', error.message)
    }
  }
}

sendTestEmail()