# 📱 SMS Notification Setup Guide - 6FB Methodologies

## Overview
This guide sets up SMS notifications for ticket sales using Twilio. When someone purchases tickets, an SMS is automatically sent to +1-352-556-8981 with sale details.

## 🚀 Quick Setup

### Step 1: Twilio Account Setup

1. **Create Twilio Account**:
   - Go to https://www.twilio.com/
   - Sign up for a free account
   - Verify your phone number

2. **Get Your Credentials**:
   - Go to https://console.twilio.com/
   - Find your **Account SID** and **Auth Token**
   - Purchase a phone number or use your trial number

3. **Configure Phone Numbers**:
   - **From Number**: Your Twilio phone number (e.g., +1234567890)
   - **To Number**: +1-352-556-8981 (for notifications)

### Step 2: Environment Configuration

Add these variables to your `.env.local` file:

```bash
# SMS Notifications (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
SMS_NOTIFICATION_PHONE=+1-352-556-8981

# Workshop Configuration (for SMS messages)
WORKSHOP_DATE_1=March 15, 2024
WORKSHOP_LOCATION=Dallas Convention Center
```

### Step 3: Test SMS Service

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test SMS functionality**:
   ```bash
   # Test basic SMS service
   curl -X POST http://localhost:3000/api/sms/test \
     -H "Content-Type: application/json" \
     -d '{"action": "test"}'

   # Test ticket sale notification
   curl -X POST http://localhost:3000/api/sms/test \
     -H "Content-Type: application/json" \
     -d '{"action": "mock-sale"}'

   # Test system alert
   curl -X POST http://localhost:3000/api/sms/test \
     -H "Content-Type: application/json" \
     -d '{"action": "system-alert"}'
   ```

3. **Check SMS service status**:
   ```bash
   curl http://localhost:3000/api/sms/test
   ```

## 📱 SMS Message Format

### Ticket Sale Notification
```
🎫 6FB TICKET SALE
Dallas Workshop
2x GA tickets ($2,000.00)
Customer: john@example.com
Remaining: 33 GA, 15 VIP
```

### System Alerts
```
🚨 6FB SYSTEM ALERT
Critical error in SMS notification system: Connection timeout
Time: 3/15/2024, 2:30:15 PM
```

## 🔧 Features

### ✅ Implemented Features

- **Automatic SMS on Ticket Sale**: Triggered by Stripe webhooks
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: Graceful failure with fallback alerts
- **Test Endpoints**: Development and testing support
- **Multiple Message Types**: Sales, alerts, and test messages
- **Configuration Status**: Easy monitoring and debugging

### 🎯 Message Details Included

- City/Location
- Ticket type (GA/VIP)
- Quantity purchased
- Customer email
- Total amount
- Remaining ticket counts
- Timestamp information

## 🛠️ Integration Details

### Stripe Webhook Integration

The SMS service is integrated into the Stripe webhook at:
`/api/webhooks/stripe/route.ts`

**Trigger Points**:
- `checkout.session.completed` with `payment_status === 'paid'`
- Runs after payment confirmation
- Includes retry logic for failed deliveries

### Error Handling

1. **SMS Delivery Failures**:
   - Automatic retry (3 attempts)
   - Exponential backoff delays
   - System alert for high-value sales failures

2. **Configuration Issues**:
   - Graceful degradation (logs instead of sending)
   - Clear error messages
   - Status endpoint for troubleshooting

3. **Critical Errors**:
   - System alert SMS for major issues
   - Detailed error logging
   - Webhook processing continues despite SMS failures

## 📊 Monitoring & Troubleshooting

### Check Service Status
```bash
# Get current configuration and status
curl http://localhost:3000/api/sms/test

# Response includes:
{
  "smsService": {
    "configured": true,
    "fromNumber": "+12345...",
    "toNumber": "+13525...",
    "maxRetries": 3,
    "retryDelay": 1000
  }
}
```

### Common Issues

1. **SMS Not Sending**:
   - Check Twilio credentials in `.env.local`
   - Verify phone number format (+1234567890)
   - Check Twilio account balance
   - Review console logs for errors

2. **Wrong Message Format**:
   - Check session metadata from Stripe
   - Verify city extraction logic
   - Update ticket count calculation

3. **Delivery Delays**:
   - Normal for first-time setup
   - Twilio may require phone verification
   - Check Twilio console for delivery status

## 🔒 Security Considerations

- **Environment Variables**: All credentials stored securely
- **Phone Number Privacy**: Target number configurable
- **Rate Limiting**: Built into Twilio service
- **Error Isolation**: SMS failures don't break payment processing

## 💰 Cost Estimation

**Twilio Pricing** (as of 2024):
- SMS: ~$0.0075 per message in US
- Monthly estimate: ~$5-15 for typical workshop sales volume
- Free trial includes $15 credit

## 🚀 Production Deployment

### Environment Variables for Production

```bash
# Production Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your production Twilio number
SMS_NOTIFICATION_PHONE=+1-352-556-8981

# Workshop Configuration
WORKSHOP_DATE_1=March 15, 2024
WORKSHOP_LOCATION=Dallas Convention Center
```

### Verification Checklist

- [ ] Twilio account verified
- [ ] Production phone number purchased
- [ ] Environment variables set
- [ ] Test SMS sent successfully
- [ ] Webhook endpoint accessible
- [ ] Error handling tested
- [ ] Monitoring configured

## 📞 Support

If you encounter issues:

1. **Check the logs**: Review console output for errors
2. **Test the service**: Use `/api/sms/test` endpoints
3. **Verify Twilio**: Check Twilio console for delivery status
4. **Review configuration**: Ensure all environment variables are set

## 🔄 Next Steps

1. Set up production Twilio account
2. Configure environment variables
3. Test SMS functionality
4. Monitor first few sales
5. Adjust message format if needed
6. Consider adding more notification channels (Slack, etc.)

---

**SMS Notification System Ready! 📱✅**

The system will automatically send SMS notifications for every ticket sale, keeping you informed in real-time about workshop registrations.