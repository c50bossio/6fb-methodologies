#!/usr/bin/env node

/**
 * Complete Integration Test Script for 6FB Workshop Ticket System
 *
 * This script tests the entire ticket purchasing flow end-to-end:
 * 1. Stripe checkout session creation
 * 2. Inventory validation and decrementation
 * 3. SMS notifications to both phone numbers
 * 4. Webhook processing simulation
 * 5. Error scenarios and edge cases
 *
 * Usage: node test-full-flow-integration.js [--verbose] [--city=dallas-jan-2026]
 */

const { performance } = require('perf_hooks');

// Import our modules
const { createCheckoutSession, validateStripeWebhook } = require('./src/lib/stripe');
const {
  getPublicAvailableSpots,
  decrementInventory,
  checkInventoryStatus,
  resetInventory
} = require('./src/lib/inventory');
const { smsService } = require('./src/lib/sms-service');
const { CITY_WORKSHOPS } = require('./src/lib/cities');

// Test configuration
const TEST_CONFIG = {
  verbose: process.argv.includes('--verbose'),
  cityId: process.argv.find(arg => arg.startsWith('--city='))?.split('=')[1] || 'dallas-jan-2026',
  adminUser: 'integration-test-runner',
  testEmail: 'integration-test@6fbmethodologies.com',
  testPhones: ['+1-352-556-8981', '+1-813-520-3348']
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[type] || '📋';

  console.log(`[${timestamp}] ${prefix} ${message}`);

  if (type === 'error' || type === 'warning' || TEST_CONFIG.verbose) {
    testResults.details.push({ timestamp, type, message });
  }
}

function assert(condition, message, isWarning = false) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
  } else {
    if (isWarning) {
      testResults.warnings++;
      log(`WARN: ${message}`, 'warning');
    } else {
      testResults.failed++;
      log(`FAIL: ${message}`, 'error');
    }
  }
  return condition;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function testEnvironmentSetup() {
  log('Testing environment setup and configuration...', 'info');

  // Check required environment variables
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];

  let envConfigured = true;
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      log(`Missing environment variable: ${envVar}`, 'warning');
      envConfigured = false;
    }
  });

  assert(envConfigured, 'All required environment variables are configured', true);

  // Check SMS service status
  const smsStatus = smsService.getStatus();
  assert(smsStatus.configured, 'SMS service is properly configured');
  assert(smsStatus.targetCount === 2, 'SMS service has both target phone numbers configured');

  // Check city configuration
  const testCity = CITY_WORKSHOPS.find(city => city.id === TEST_CONFIG.cityId);
  assert(testCity !== undefined, `Test city ${TEST_CONFIG.cityId} exists in configuration`);

  if (testCity) {
    assert(testCity.stripe?.gaPriceId, 'Test city has GA Stripe price ID configured');
    assert(testCity.stripe?.vipPriceId, 'Test city has VIP Stripe price ID configured');
  }

  log('Environment setup check completed', 'info');
}

async function testInventorySystem() {
  log('Testing inventory management system...', 'info');

  // Reset inventory to known state
  await resetInventory(TEST_CONFIG.cityId, TEST_CONFIG.adminUser, 'Integration test reset');

  // Test initial inventory state
  const initialGA = await getPublicAvailableSpots(TEST_CONFIG.cityId, 'ga');
  const initialVIP = await getPublicAvailableSpots(TEST_CONFIG.cityId, 'vip');

  assert(initialGA === 35, 'Initial GA inventory is 35 spots');
  assert(initialVIP === 15, 'Initial VIP inventory is 15 spots');

  // Test inventory decrementation
  const decrementResult = await decrementInventory(TEST_CONFIG.cityId, 'ga', 3, {
    sessionId: 'integration_test_session',
    paymentIntentId: 'pi_integration_test'
  });

  assert(decrementResult.success, 'Inventory decrement operation succeeds');
  assert(decrementResult.availableAfter === 32, 'Inventory correctly decremented by 3');

  // Test inventory status reporting
  const status = await checkInventoryStatus(TEST_CONFIG.cityId);
  assert(status !== null, 'Inventory status check returns valid data');
  assert(status.sold.ga === 3, 'Inventory status shows correct sold count');
  assert(status.publicAvailable.ga === 32, 'Inventory status shows correct available count');

  // Test overselling prevention
  const oversellResult = await decrementInventory(TEST_CONFIG.cityId, 'ga', 50, {
    sessionId: 'oversell_test'
  });

  assert(!oversellResult.success, 'Overselling attempt is properly rejected');
  assert(oversellResult.error?.includes('Insufficient inventory'), 'Overselling rejection includes helpful error message');

  log('Inventory system tests completed', 'info');
}

async function testStripeIntegration() {
  log('Testing Stripe integration...', 'info');

  try {
    // Test checkout session creation for GA tickets
    const gaSession = await createCheckoutSession({
      ticketType: 'GA',
      quantity: 2,
      isSixFBMember: false,
      customerEmail: TEST_CONFIG.testEmail,
      metadata: {
        cityId: TEST_CONFIG.cityId,
        testRun: 'integration-test'
      }
    });

    assert(gaSession.sessionId, 'GA checkout session created successfully');
    assert(gaSession.url, 'GA checkout session has valid URL');
    assert(gaSession.pricing.originalAmount === 200000, 'GA pricing calculation is correct (2 * $1000)');

    // Test checkout session creation for VIP tickets with member discount
    const vipSession = await createCheckoutSession({
      ticketType: 'VIP',
      quantity: 1,
      isSixFBMember: true,
      customerEmail: TEST_CONFIG.testEmail,
      metadata: {
        cityId: TEST_CONFIG.cityId,
        testRun: 'integration-test'
      }
    });

    assert(vipSession.sessionId, 'VIP checkout session created successfully');
    assert(vipSession.pricing.discountAmount === 30000, 'VIP member discount applied correctly (20% off $1500)');
    assert(vipSession.pricing.finalAmount === 120000, 'VIP final amount correct after discount');

    log('Stripe integration tests completed', 'info');
  } catch (error) {
    log(`Stripe integration test failed: ${error.message}`, 'error');
    assert(false, 'Stripe integration test completed without errors');
  }
}

async function testSMSNotifications() {
  log('Testing SMS notification system...', 'info');

  // Test ticket sale notification
  const saleData = {
    city: 'Dallas',
    ticketType: 'GA',
    quantity: 2,
    customerEmail: TEST_CONFIG.testEmail,
    totalAmount: 200000,
    customerName: 'Integration Test Customer',
    sessionId: 'cs_integration_test',
    gaTicketsRemaining: 33,
    vipTicketsRemaining: 15
  };

  try {
    const smsResult = await smsService.sendTicketSaleNotification(saleData);

    assert(smsResult.success, 'SMS ticket sale notification sent successfully');

    if (smsResult.messageId === 'all-sent') {
      assert(true, 'SMS notification delivered to both phone numbers');
    } else if (smsResult.messageId?.includes('of-2-sent')) {
      assert(true, 'SMS notification delivered to at least one phone number', true);
    } else {
      assert(false, 'SMS notification delivery status unclear');
    }

    // Test system alert SMS
    const alertResult = await smsService.sendSystemAlert(
      'Integration test system alert',
      'low'
    );

    assert(alertResult.success, 'SMS system alert sent successfully');

    log('SMS notification tests completed', 'info');
  } catch (error) {
    log(`SMS notification test failed: ${error.message}`, 'error');
    assert(false, 'SMS notification test completed without errors');
  }
}

async function testWebhookProcessing() {
  log('Testing webhook processing simulation...', 'info');

  // Simulate a successful checkout session webhook
  const mockWebhookEvent = {
    id: 'evt_integration_test',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_integration_test_webhook',
        payment_status: 'paid',
        amount_total: 200000,
        currency: 'usd',
        customer_details: {
          email: TEST_CONFIG.testEmail,
          name: 'Integration Test Customer'
        },
        metadata: {
          ticketType: 'GA',
          quantity: '2',
          isSixFBMember: 'false',
          cityId: TEST_CONFIG.cityId,
          originalAmount: '200000',
          discountAmount: '0'
        }
      }
    }
  };

  try {
    // In a real webhook, this would be called automatically
    // Here we simulate the inventory update that would happen
    const inventoryUpdate = await decrementInventory(
      TEST_CONFIG.cityId,
      'ga',
      2,
      {
        sessionId: mockWebhookEvent.data.object.id,
        paymentIntentId: 'pi_webhook_test'
      }
    );

    assert(inventoryUpdate.success, 'Webhook inventory update processed successfully');

    // Simulate SMS notification triggered by webhook
    const webhookSmsData = {
      city: 'Dallas',
      ticketType: 'GA',
      quantity: 2,
      customerEmail: TEST_CONFIG.testEmail,
      totalAmount: 200000,
      sessionId: mockWebhookEvent.data.object.id,
      gaTicketsRemaining: inventoryUpdate.availableAfter,
      vipTicketsRemaining: 15
    };

    const webhookSmsResult = await smsService.sendTicketSaleNotification(webhookSmsData);
    assert(webhookSmsResult.success, 'Webhook SMS notification sent successfully');

    log('Webhook processing simulation completed', 'info');
  } catch (error) {
    log(`Webhook processing test failed: ${error.message}`, 'error');
    assert(false, 'Webhook processing test completed without errors');
  }
}

async function testConcurrentPurchases() {
  log('Testing concurrent purchase scenarios...', 'info');

  const startTime = performance.now();

  // Simulate 10 concurrent purchase attempts
  const concurrentPromises = Array.from({ length: 10 }, (_, index) => {
    return decrementInventory(TEST_CONFIG.cityId, 'ga', 1, {
      sessionId: `concurrent_${index}`,
      paymentIntentId: `pi_concurrent_${index}`
    });
  });

  const results = await Promise.all(concurrentPromises);
  const endTime = performance.now();
  const duration = endTime - startTime;

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  assert(successful.length > 0, 'At least some concurrent purchases succeeded');
  assert(failed.length > 0, 'Some concurrent purchases failed due to inventory limits');
  assert(successful.length + failed.length === 10, 'All concurrent purchase attempts returned results');
  assert(duration < 2000, 'Concurrent purchases completed within 2 seconds');

  log(`Concurrent purchase test: ${successful.length} successful, ${failed.length} failed in ${duration.toFixed(2)}ms`, 'info');
}

async function testErrorScenarios() {
  log('Testing error scenarios and edge cases...', 'info');

  // Test invalid city ID
  const invalidCityResult = await decrementInventory('invalid-city', 'ga', 1, {
    sessionId: 'invalid_city_test'
  });
  assert(!invalidCityResult.success, 'Invalid city ID properly rejected');

  // Test zero quantity
  const zeroQuantityResult = await decrementInventory(TEST_CONFIG.cityId, 'ga', 0, {
    sessionId: 'zero_quantity_test'
  });
  assert(!zeroQuantityResult.success, 'Zero quantity properly rejected');

  // Test negative quantity
  const negativeQuantityResult = await decrementInventory(TEST_CONFIG.cityId, 'ga', -1, {
    sessionId: 'negative_quantity_test'
  });
  assert(!negativeQuantityResult.success, 'Negative quantity properly rejected');

  // Test excessive quantity
  const excessiveQuantityResult = await decrementInventory(TEST_CONFIG.cityId, 'ga', 1000, {
    sessionId: 'excessive_quantity_test'
  });
  assert(!excessiveQuantityResult.success, 'Excessive quantity properly rejected');

  log('Error scenario tests completed', 'info');
}

async function testFullPurchaseFlow() {
  log('Testing complete purchase flow integration...', 'info');

  const flowStartTime = performance.now();

  try {
    // Step 1: Create Stripe checkout session
    log('Step 1: Creating Stripe checkout session...', 'debug');
    const checkoutSession = await createCheckoutSession({
      ticketType: 'VIP',
      quantity: 1,
      isSixFBMember: true,
      customerEmail: TEST_CONFIG.testEmail,
      metadata: {
        cityId: TEST_CONFIG.cityId,
        testRun: 'full-flow-integration'
      }
    });

    assert(checkoutSession.sessionId, 'Checkout session created');

    // Step 2: Check inventory before purchase
    log('Step 2: Checking inventory availability...', 'debug');
    const prePurchaseInventory = await checkInventoryStatus(TEST_CONFIG.cityId);
    const vipAvailableBefore = prePurchaseInventory.publicAvailable.vip;

    // Step 3: Simulate successful payment and inventory update
    log('Step 3: Processing payment and updating inventory...', 'debug');
    const inventoryResult = await decrementInventory(TEST_CONFIG.cityId, 'vip', 1, {
      sessionId: checkoutSession.sessionId,
      paymentIntentId: 'pi_full_flow_test'
    });

    assert(inventoryResult.success, 'Inventory updated after payment');
    assert(inventoryResult.availableAfter === vipAvailableBefore - 1, 'Inventory count correctly decremented');

    // Step 4: Send SMS notifications
    log('Step 4: Sending SMS notifications...', 'debug');
    const smsData = {
      city: 'Dallas',
      ticketType: 'VIP',
      quantity: 1,
      customerEmail: TEST_CONFIG.testEmail,
      totalAmount: checkoutSession.pricing.finalAmount,
      customerName: 'Full Flow Test Customer',
      sessionId: checkoutSession.sessionId,
      gaTicketsRemaining: prePurchaseInventory.publicAvailable.ga,
      vipTicketsRemaining: inventoryResult.availableAfter
    };

    const smsResult = await smsService.sendTicketSaleNotification(smsData);
    assert(smsResult.success, 'SMS notifications sent successfully');

    // Step 5: Verify final state
    log('Step 5: Verifying final system state...', 'debug');
    const postPurchaseInventory = await checkInventoryStatus(TEST_CONFIG.cityId);
    assert(
      postPurchaseInventory.publicAvailable.vip === vipAvailableBefore - 1,
      'Final inventory state is correct'
    );

    const flowEndTime = performance.now();
    const totalFlowTime = flowEndTime - flowStartTime;

    log(`Complete purchase flow test passed in ${totalFlowTime.toFixed(2)}ms`, 'success');
    assert(totalFlowTime < 5000, 'Complete flow completed within 5 seconds');

  } catch (error) {
    log(`Full purchase flow test failed: ${error.message}`, 'error');
    assert(false, 'Complete purchase flow test completed without errors');
  }
}

async function generateTestReport() {
  log('Generating test report...', 'info');

  const totalTests = testResults.passed + testResults.failed + testResults.warnings;
  const passRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;

  console.log('\n' + '='.repeat(80));
  console.log('🎯 6FB WORKSHOP TICKET SYSTEM - INTEGRATION TEST REPORT');
  console.log('='.repeat(80));
  console.log(`📊 Test Summary:`);
  console.log(`   ✅ Passed:   ${testResults.passed}`);
  console.log(`   ❌ Failed:   ${testResults.failed}`);
  console.log(`   ⚠️  Warnings: ${testResults.warnings}`);
  console.log(`   📈 Pass Rate: ${passRate}%`);
  console.log(`   🏙️  Test City: ${TEST_CONFIG.cityId}`);
  console.log(`   📧 Test Email: ${TEST_CONFIG.testEmail}`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(detail => detail.type === 'error')
      .forEach(detail => {
        console.log(`   • ${detail.message}`);
      });
  }

  if (testResults.warnings > 0) {
    console.log('\n⚠️  WARNINGS:');
    testResults.details
      .filter(detail => detail.type === 'warning')
      .forEach(detail => {
        console.log(`   • ${detail.message}`);
      });
  }

  console.log('\n🔧 SYSTEM COMPONENTS TESTED:');
  console.log('   • Stripe checkout session creation');
  console.log('   • Inventory management and race condition prevention');
  console.log('   • SMS notifications to dual phone numbers');
  console.log('   • Webhook processing simulation');
  console.log('   • Concurrent purchase handling');
  console.log('   • Error scenarios and edge cases');
  console.log('   • Complete end-to-end purchase flow');

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The ticket system is ready for production.');
  } else {
    console.log('\n🚨 SOME TESTS FAILED! Please review and fix issues before production deployment.');
  }

  console.log('='.repeat(80));

  // Return exit code based on test results
  return testResults.failed === 0 ? 0 : 1;
}

// Main test execution
async function runIntegrationTests() {
  console.log('🚀 Starting 6FB Workshop Ticket System Integration Tests...\n');

  try {
    await testEnvironmentSetup();
    await testInventorySystem();
    await testStripeIntegration();
    await testSMSNotifications();
    await testWebhookProcessing();
    await testConcurrentPurchases();
    await testErrorScenarios();
    await testFullPurchaseFlow();

    const exitCode = await generateTestReport();
    process.exit(exitCode);

  } catch (error) {
    log(`Critical test execution error: ${error.message}`, 'error');
    console.log('\n💥 CRITICAL ERROR: Integration tests could not complete');
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('Integration tests interrupted by user', 'warning');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled promise rejection: ${reason}`, 'error');
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runIntegrationTests();
}

module.exports = {
  runIntegrationTests,
  testEnvironmentSetup,
  testInventorySystem,
  testStripeIntegration,
  testSMSNotifications,
  testWebhookProcessing,
  testConcurrentPurchases,
  testErrorScenarios,
  testFullPurchaseFlow
};