# 🎓 Skool Zapier Integration Setup Guide

## 🎯 **Overview**

This guide will help you set up **automatic 6FB member verification** using Skool's Zapier integration. When someone becomes a paid member of your 6FB Skool community, they'll automatically qualify for the **20% discount** on your workshops.

## ✅ **Current Status**

- ✅ **Skool API Key**: `8181e571...` (configured)
- ✅ **Webhook Endpoint**: `/api/webhooks/skool` (ready)
- ✅ **Member Verification**: Working with priority system
- ✅ **Test Successful**: `info@fwbarbersupply.com` verified ✅

## 🔧 **Step 1: Access Skool Admin Settings**

1. **Login to Skool**: Go to [skool.com](https://skool.com) and sign in
2. **Navigate to your 6FB community**
3. **Go to Settings**: Click on your community settings
4. **Find Zapier Integration**: Look for "Apps" or "Integrations" section

## 🔑 **Step 2: Configure Zapier in Skool**

### **Required Settings:**
- **Plan**: Pro plan required ($99/month)
- **API Key**: `8181e5712de34188ac5335d8a53d74cecbfa9e4187d2479e83ffe128bcff7c5e` ✅
- **Group URL**: `6fb` (your community URL)

### **Setup Process:**
1. **Enable Zapier**: Turn on Zapier integration in your Skool settings
2. **Copy API Key**: Use the key provided above
3. **Test Connection**: Verify Zapier can connect to your Skool community

## ⚡ **Step 3: Create Zapier Workflow**

### **3.1: Create New Zap**
1. Go to [zapier.com](https://zapier.com) and create new Zap
2. **Trigger**: Choose "Skool" → "New Paid Member"
3. **Account**: Connect using your API key and `6fb` as group URL

### **3.2: Configure Trigger**
- **Event**: "New Paid Member"
- **Group**: Select your 6FB community
- **Test**: Make sure it finds recent members

### **3.3: Set Up Action**
- **App**: Choose "Webhooks by Zapier"
- **Event**: "POST"
- **URL**: `https://6fbmethodologies.com/api/webhooks/skool`
- **Method**: POST
- **Data Format**: JSON

### **3.4: Configure Webhook Data**
```json
{
  "firstName": "{{first_name}}",
  "lastName": "{{last_name}}",
  "email": "{{email}}",
  "transactionId": "{{transaction_id}}",
  "subscriptionDate": "{{subscription_date}}"
}
```

## 🧪 **Step 4: Test the Integration**

### **4.1: Test with Zapier**
1. Use Zapier's test feature with a recent member
2. Check that webhook receives data correctly
3. Verify member appears in system

### **4.2: Manual Test**
```bash
# Test webhook endpoint
curl -X POST "https://6fbmethodologies.com/api/webhooks/skool" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Member",
    "email": "test@example.com",
    "transactionId": "test_txn_001",
    "subscriptionDate": "2025-09-18"
  }'

# Test member verification
curl -X POST "https://6fbmethodologies.com/api/verify-member" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### **4.3: Check System Status**
```bash
# View all verified Skool members
curl "https://6fbmethodologies.com/api/webhooks/skool"

# Check specific member
curl "https://6fbmethodologies.com/api/webhooks/skool?email=info@fwbarbersupply.com"
```

## 🎯 **Step 5: Verify on Pricing Page**

1. **Go to**: `https://6fbmethodologies.com/pricing`
2. **Enter email**: `info@fwbarbersupply.com` (or any verified member)
3. **Expected result**: ✅ "6FB Members Save 20%" should show verified
4. **Discount applied**: 20% off GA tickets automatically

## 📊 **Verification Priority System**

The system checks for membership in this order:

1. **🥇 Skool Members** (via webhook) - Active community subscribers
2. **🥈 Stripe Customers** - Workshop attendees, one-time purchases
3. **🥉 Fallback List** - Test accounts only

## 🔍 **Monitoring & Debugging**

### **Check System Status**
```bash
# System overview
curl "https://6fbmethodologies.com/api/verify-member"

# Debug specific email
curl "https://6fbmethodologies.com/api/verify-member?email=member@example.com"
```

### **Webhook Logs**
- Check server logs for `✅ Skool member verified and added`
- Monitor total member count increases
- Watch for webhook processing errors

### **Common Issues**

**Issue: "Member not found after webhook"**
- **Cause**: Zapier data format mismatch
- **Solution**: Check webhook payload matches expected format

**Issue: "Discount not applying"**
- **Cause**: Frontend not recognizing verification
- **Solution**: Verify API returns `"source": "skool"`

**Issue: "Zapier not triggering"**
- **Cause**: No recent paid members to test
- **Solution**: Add a test member or use webhook test tool

## 🎉 **Success Indicators**

You'll know it's working when:

- ✅ **Zapier**: Shows successful triggers for new members
- ✅ **Webhook**: Receives and processes member data
- ✅ **Verification**: Returns `"isVerified": true` for Skool members
- ✅ **Pricing Page**: Shows "6FB Members Save 20%" as verified
- ✅ **Logs**: Display "✅ Skool member verified and added"

## 🔧 **Production Webhook URL**

**Development**: `http://localhost:3000/api/webhooks/skool`
**Production**: `https://6fbmethodologies.com/api/webhooks/skool`

Make sure to update Zapier with the production URL when deploying!

## 📈 **Expected Member Flow**

1. **User joins 6FB Skool** → Pays subscription
2. **Skool triggers Zapier** → "New Paid Member" event
3. **Zapier sends webhook** → Member data to your system
4. **System verifies member** → Adds to verified database
5. **User visits pricing** → Enters email for discount
6. **20% discount applied** → Automatic verification ✅

---

## 🎯 **Current Test Results**

- ✅ **Webhook Endpoint**: Active and processing
- ✅ **Member Added**: `info@fwbarbersupply.com` verified
- ✅ **Verification Working**: Returns Skool member status
- ✅ **System Ready**: For production deployment

**The integration is working perfectly! 🚀**

---

**Need help? Check the server logs or contact support with your Zapier webhook URL.**