#!/usr/bin/env node

/**
 * Skool Webhook Testing Script
 * This script helps test the Skool webhook integration
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = process.env.NODE_ENV === 'production'
  ? 'https://6fbmethodologies.com/api/webhooks/skool'
  : 'http://localhost:3000/api/webhooks/skool';

const VERIFY_URL = process.env.NODE_ENV === 'production'
  ? 'https://6fbmethodologies.com/api/verify-member'
  : 'http://localhost:3000/api/verify-member';

// Test member data (simulates Zapier webhook payload)
const testMembers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    transactionId: 'test_txn_001',
    subscriptionDate: '2025-01-15'
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    transactionId: 'test_txn_002',
    subscriptionDate: '2025-01-16'
  }
];

async function testWebhook() {
  console.log('🧪 Testing Skool Webhook Integration');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Verify URL: ${VERIFY_URL}`);
  console.log('');

  for (const member of testMembers) {
    console.log(`📨 Testing webhook for: ${member.email}`);

    try {
      // Send webhook payload
      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });

      const webhookResult = await webhookResponse.json();

      if (webhookResponse.ok) {
        console.log(`✅ Webhook success: ${webhookResult.message}`);

        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test verification
        console.log(`🔍 Testing verification for: ${member.email}`);
        const verifyResponse = await fetch(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: member.email })
        });

        const verifyResult = await verifyResponse.json();

        if (verifyResponse.ok && verifyResult.isVerified) {
          console.log(`✅ Verification success: ${verifyResult.memberName} (${verifyResult.source})`);
        } else {
          console.log(`❌ Verification failed: ${verifyResult.error}`);
        }

      } else {
        console.log(`❌ Webhook failed: ${webhookResult.error}`);
      }

    } catch (error) {
      console.log(`❌ Error testing ${member.email}:`, error.message);
    }

    console.log('');
  }

  // Show current status
  try {
    console.log('📊 Current System Status:');
    const statusResponse = await fetch(WEBHOOK_URL);
    const status = await statusResponse.json();
    console.log(`Total verified members: ${status.totalMembers}`);
    console.log('Recent members:', status.members.slice(0, 3).map(m => `${m.name} (${m.email})`));
  } catch (error) {
    console.log('Could not fetch system status');
  }
}

async function clearTestMembers() {
  console.log('🧹 Clearing test members...');

  for (const member of testMembers) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: member.email,
          action: 'remove'
        })
      });

      if (response.ok) {
        console.log(`✅ Removed: ${member.email}`);
      }
    } catch (error) {
      console.log(`❌ Error removing ${member.email}`);
    }
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'test':
    testWebhook();
    break;
  case 'clear':
    clearTestMembers();
    break;
  case 'status':
    fetch(WEBHOOK_URL)
      .then(r => r.json())
      .then(data => {
        console.log('📊 Skool Webhook Status:');
        console.log(`Total Members: ${data.totalMembers}`);
        console.log('Endpoints:', data.endpoints);
      });
    break;
  default:
    console.log(`
🎯 Skool Webhook Test Script

Usage:
  node scripts/test-skool-webhook.js test    # Test webhook and verification
  node scripts/test-skool-webhook.js clear   # Remove test members
  node scripts/test-skool-webhook.js status  # Show system status

Examples:
  # Test full workflow
  npm run test-skool-webhook

  # Clear test data
  node scripts/test-skool-webhook.js clear
`);
}