#!/usr/bin/env node

/**
 * SMS Notification Test Script
 * Tests the 6FB SMS notification system
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testSMSService() {
  console.log('🧪 Testing 6FB SMS Notification Service\n');

  try {
    // Test 1: Check service status
    console.log('1. Checking SMS service status...');
    const statusResponse = await fetch(`${BASE_URL}/api/sms/test`);
    const statusData = await statusResponse.json();

    console.log('✅ Service Status:', {
      configured: statusData.smsService?.configured,
      fromNumber: statusData.smsService?.fromNumber,
      toNumber: statusData.smsService?.toNumber
    });

    if (!statusData.smsService?.configured) {
      console.log('⚠️  SMS service not configured. Check your environment variables.');
      return;
    }

    // Test 2: Send test message
    console.log('\n2. Sending test SMS...');
    const testResponse = await fetch(`${BASE_URL}/api/sms/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' })
    });
    const testData = await testResponse.json();

    if (testData.success) {
      console.log('✅ Test SMS sent successfully');
      console.log('   Message ID:', testData.messageId);
    } else {
      console.log('❌ Test SMS failed:', testData.error);
    }

    // Test 3: Send mock ticket sale notification
    console.log('\n3. Sending mock ticket sale notification...');
    const saleResponse = await fetch(`${BASE_URL}/api/sms/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mock-sale' })
    });
    const saleData = await saleResponse.json();

    if (saleData.success) {
      console.log('✅ Mock sale SMS sent successfully');
      console.log('   Message ID:', saleData.messageId);
      console.log('   This simulates a real ticket purchase notification');
    } else {
      console.log('❌ Mock sale SMS failed:', saleData.error);
    }

    // Test 4: Send system alert
    console.log('\n4. Sending system alert...');
    const alertResponse = await fetch(`${BASE_URL}/api/sms/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'system-alert' })
    });
    const alertData = await alertResponse.json();

    if (alertData.success) {
      console.log('✅ System alert SMS sent successfully');
      console.log('   Message ID:', alertData.messageId);
    } else {
      console.log('❌ System alert SMS failed:', alertData.error);
    }

    console.log('\n🎉 SMS testing complete!');
    console.log('\nNext steps:');
    console.log('1. Check your phone (+1-352-556-8981) for test messages');
    console.log('2. Process a real payment to test live integration');
    console.log('3. Monitor webhook logs for SMS delivery status');

  } catch (error) {
    console.error('❌ Error testing SMS service:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your development server is running (npm run dev)');
    console.log('2. Check your Twilio credentials in .env.local');
    console.log('3. Verify your phone number format (+1234567890)');
  }
}

// Run the test
testSMSService();