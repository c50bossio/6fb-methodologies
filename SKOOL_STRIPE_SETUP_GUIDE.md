# 🎓 Skool Stripe Express Account Setup Guide

## 🎯 **Overview**

This guide will help you connect your 6FB Skool community's Stripe Express account to enable **automatic 20% discount verification** for active Skool subscribers.

## 📋 **What You Need**

To set up member verification, you need to get the **Stripe Express account credentials** from your Skool community settings.

## 🔧 **Step 1: Access Skool Admin Dashboard**

1. **Log into Skool**: Go to [skool.com](https://skool.com) and sign in
2. **Navigate to your 6FB community**
3. **Go to Admin Settings**: Look for "Settings" or "Admin" section
4. **Find Payment/Stripe Settings**: Look for "Payments", "Billing", or "Stripe" configuration

## 🔑 **Step 2: Get Stripe Express Account Information**

Look for these specific items in your Skool settings:

### **Required Information:**
```
✅ Stripe Express Account ID (starts with 'acct_')
✅ Stripe Secret Key (starts with 'sk_test_' or 'sk_live_')
✅ Webhook Secret (starts with 'whsec_')
```

### **Where to Find Them:**

**Option A: Skool Admin Panel**
- Settings → Payments → Stripe Integration
- Look for "Account ID", "API Keys", or "Developer Settings"

**Option B: Stripe Express Dashboard**
- If you have direct access to the Stripe Express account
- Dashboard → Developers → API Keys
- Dashboard → Developers → Webhooks

**Option C: Skool Support**
- Contact Skool support if you can't find the API credentials
- Request access to your community's Stripe Express account details

## 📝 **Step 3: Update Environment Configuration**

Once you have the credentials, update your `.env.local` file:

```bash
# Replace these with your actual Skool Express account credentials:

SKOOL_STRIPE_SECRET_KEY=sk_test_YOUR_SKOOL_EXPRESS_SECRET_KEY
SKOOL_STRIPE_ACCOUNT_ID=acct_YOUR_SKOOL_EXPRESS_ACCOUNT_ID
SKOOL_STRIPE_WEBHOOK_SECRET=whsec_YOUR_SKOOL_WEBHOOK_SECRET
```

## 🧪 **Step 4: Test the Integration**

After updating the credentials, test the system:

### **4.1: Restart Development Server**
```bash
npm run dev
```

### **4.2: Test with CLI**
```bash
npm run members:verify info@fwbarbersupply.com
```

### **4.3: Test with API**
```bash
curl -X POST "http://localhost:3000/api/verify-member" \
  -H "Content-Type: application/json" \
  -d '{"email": "info@fwbarbersupply.com"}'
```

### **4.4: Check Logs**
Look for these messages in the console:
```
✅ Skool Stripe Express account configured
🔍 Checking Skool Express account for: info@fwbarbersupply.com
✅ Skool membership verified for: info@fwbarbersupply.com
```

## 🎯 **Expected Results**

Once configured correctly:

1. **Skool Subscribers**: Will get 20% discount automatically
2. **Workshop Attendees**: Will get verified through main Stripe account
3. **Non-Members**: Will see "not verified" message
4. **Real-Time Sync**: New Skool subscribers automatically added

## 🔍 **Verification Priority Order**

The system checks for membership in this order:

1. **🥇 Skool Express Account** (active subscriptions to 6FB community)
2. **🥈 Main Stripe Account** (workshop purchases, one-time payments)
3. **🥉 Fallback List** (test accounts only)

## 🛠️ **Troubleshooting**

### **Issue: "Skool Stripe Express account not configured"**
- **Cause**: Missing or invalid `SKOOL_STRIPE_SECRET_KEY`
- **Solution**: Double-check the API key format and permissions

### **Issue: "Permission denied" errors**
- **Cause**: API key doesn't have sufficient permissions
- **Solution**: Ensure the key has read access to customers and subscriptions

### **Issue: "No Skool customers found"**
- **Cause**: Email might be in main account instead of Express account
- **Solution**: This is normal - system will fall back to main account

### **Issue: Customer found but not verified**
- **Cause**: Customer exists but has no active subscriptions
- **Solution**: Check if their Skool subscription is active

## 📞 **Getting Help**

If you need assistance:

1. **Check Skool Documentation**: Look for Stripe integration guides
2. **Contact Skool Support**: Ask for Stripe Express account access
3. **Check Stripe Express Dashboard**: If you have direct access
4. **Use CLI Diagnostic**: Run `npm run members:stats` to check account status

## 🎉 **Success Indicators**

You'll know it's working when:

- ✅ CLI shows "Skool Stripe Express account configured"
- ✅ Active Skool subscribers get verified automatically
- ✅ Member verification logs show "Skool membership verified"
- ✅ 20% discount applies correctly on the pricing page

---

## 📧 **Test Email**

Once configured, test with: `info@fwbarbersupply.com`

If this email has an active Skool subscription, it should:
1. ✅ Be found in the Skool Express account
2. ✅ Return verified with "Skool-Premium" membership type
3. ✅ Qualify for 20% discount on GA tickets

---

**Need the credentials? Check your Skool admin dashboard or contact Skool support! 🚀**