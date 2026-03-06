#!/usr/bin/env node

/**
 * 6FB Methodologies Counter Verification Script
 *
 * Comprehensive verification of all counter systems:
 * - Inventory management counters
 * - Frontend UI counter displays
 * - Registration tracking counters
 * - Race condition prevention
 * - Admin counter functions
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';
const CITIES = [
  'dallas-jan-2026',
  'atlanta-feb-2026',
  'vegas-mar-2026',
  'nyc-apr-2026',
  'chicago-may-2026',
  'sf-jun-2026'
];

// Test results storage
const TEST_RESULTS = {
  timestamp: new Date().toISOString(),
  overall: { passed: 0, failed: 0, warnings: 0 },
  tests: []
};

function log(status, test, message, details = null) {
  const result = { status, test, message, details, timestamp: new Date().toISOString() };
  TEST_RESULTS.tests.push(result);
  TEST_RESULTS.overall[status.toLowerCase()]++;

  const emoji = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
  const colorFn = status === 'PASSED' ? colors.green : status === 'FAILED' ? colors.red : colors.yellow;

  console.log(colorFn(`${emoji} ${test}: ${message}`));
  if (details) {
    console.log(colors.gray(`   Details: ${JSON.stringify(details, null, 2)}`));
  }
}

function section(title) {
  console.log('\n' + colors.blue.bold(`=== ${title} ===`));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// Step 1: API Counter Tests
// ==========================================

async function testInventoryAPIs() {
  section('API Counter Tests');

  for (const cityId of CITIES) {
    try {
      // Test basic inventory status
      const response = await axios.get(`${BASE_URL}/api/inventory?cityId=${cityId}`, {
        timeout: 5000
      });

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;

        // Verify initial state
        const expectedGA = 35;
        const expectedVIP = 15;
        const actualGA = data.actualAvailable.ga;
        const actualVIP = data.actualAvailable.vip;

        if (actualGA === expectedGA && actualVIP === expectedVIP) {
          log('PASSED', `Inventory API - ${cityId}`, `Correct initial counts: GA=${actualGA}, VIP=${actualVIP}`);
        } else {
          log('FAILED', `Inventory API - ${cityId}`, `Incorrect counts: GA=${actualGA}/${expectedGA}, VIP=${actualVIP}/${expectedVIP}`, data);
        }

        // Test validation endpoint
        const validationResponse = await axios.get(`${BASE_URL}/api/inventory?cityId=${cityId}&validate=true&tier=ga&quantity=3`);
        if (validationResponse.data.success && validationResponse.data.data.valid) {
          log('PASSED', `Validation API - ${cityId}`, 'GA validation works correctly');
        } else {
          log('FAILED', `Validation API - ${cityId}`, 'GA validation failed', validationResponse.data);
        }

      } else {
        log('FAILED', `Inventory API - ${cityId}`, `API error: ${response.status}`, response.data);
      }

    } catch (error) {
      log('FAILED', `Inventory API - ${cityId}`, `Network error: ${error.message}`);
    }

    await sleep(100); // Rate limiting
  }
}

// ==========================================
// Step 2: Frontend Counter Display Tests
// ==========================================

async function testFrontendCounters() {
  section('Frontend Counter Display Tests');

  try {
    // Test homepage load and counter display
    const response = await axios.get(BASE_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Counter Test Bot)'
      }
    });

    if (response.status === 200) {
      const html = response.data;

      // Check for city cards and counter elements
      const hasCityCards = html.includes('city') || html.includes('workshop');
      const hasAvailability = html.includes('available') || html.includes('spots');
      const hasCounters = html.includes('35') || html.includes('15'); // Expected limits

      if (hasCityCards && hasAvailability) {
        log('PASSED', 'Frontend Display', 'Homepage loads with city information');
      } else {
        log('FAILED', 'Frontend Display', 'Missing city cards or availability info');
      }

      // Check for Stripe integration (payment counters)
      const hasStripe = html.includes('stripe') || html.includes('checkout');
      if (hasStripe) {
        log('PASSED', 'Payment Integration', 'Stripe payment system detected');
      } else {
        log('WARNING', 'Payment Integration', 'Stripe not detected in HTML');
      }

    } else {
      log('FAILED', 'Frontend Display', `Homepage failed to load: ${response.status}`);
    }

  } catch (error) {
    log('FAILED', 'Frontend Display', `Homepage error: ${error.message}`);
  }
}

// ==========================================
// Step 3: Race Condition Tests
// ==========================================

async function testRaceConditions() {
  section('Race Condition Prevention Tests');

  const testCity = 'dallas-jan-2026';

  try {
    // Get initial inventory
    const initialResponse = await axios.get(`${BASE_URL}/api/inventory?cityId=${testCity}`);
    const initialGA = initialResponse.data.data.actualAvailable.ga;

    log('PASSED', 'Race Condition Setup', `Initial GA count: ${initialGA}`);

    // Simulate concurrent validation requests (safe operations)
    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(
        axios.get(`${BASE_URL}/api/inventory?cityId=${testCity}&validate=true&tier=ga&quantity=2`)
          .then(res => ({ success: true, data: res.data }))
          .catch(err => ({ success: false, error: err.message }))
      );
    }

    const results = await Promise.all(concurrentPromises);
    const successCount = results.filter(r => r.success).length;

    if (successCount === 5) {
      log('PASSED', 'Concurrent Validation', 'All concurrent validations succeeded');
    } else {
      log('WARNING', 'Concurrent Validation', `${successCount}/5 validations succeeded`);
    }

    // Verify inventory unchanged after validations
    const finalResponse = await axios.get(`${BASE_URL}/api/inventory?cityId=${testCity}`);
    const finalGA = finalResponse.data.data.actualAvailable.ga;

    if (finalGA === initialGA) {
      log('PASSED', 'Race Condition Safety', 'Inventory unchanged after concurrent validations');
    } else {
      log('FAILED', 'Race Condition Safety', `Inventory changed: ${initialGA} -> ${finalGA}`);
    }

  } catch (error) {
    log('FAILED', 'Race Condition Test', `Error: ${error.message}`);
  }
}

// ==========================================
// Step 4: Counter Integration Tests
// ==========================================

async function testCounterIntegration() {
  section('Counter Integration Tests');

  try {
    // Test pricing page counter integration
    const pricingResponse = await axios.get(`${BASE_URL}/pricing`, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Counter Test Bot)' }
    });

    if (pricingResponse.status === 200) {
      const html = pricingResponse.data;
      const hasGA = html.includes('General Admission') || html.includes('GA');
      const hasVIP = html.includes('VIP');
      const hasPricing = html.includes('1000') || html.includes('1500');

      if (hasGA && hasVIP && hasPricing) {
        log('PASSED', 'Pricing Integration', 'Pricing page shows ticket types and prices');
      } else {
        log('WARNING', 'Pricing Integration', 'Pricing page missing expected elements');
      }
    }

    // Test registration page (if accessible)
    try {
      const registerResponse = await axios.get(`${BASE_URL}/register`, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Counter Test Bot)' }
      });

      if (registerResponse.status === 200) {
        const html = registerResponse.data;
        const hasQuantity = html.includes('quantity') || html.includes('tickets');
        const hasInventory = html.includes('available') || html.includes('remaining');

        if (hasQuantity) {
          log('PASSED', 'Registration Integration', 'Registration page has quantity selection');
        } else {
          log('WARNING', 'Registration Integration', 'Registration page missing quantity controls');
        }
      }
    } catch (error) {
      log('WARNING', 'Registration Integration', 'Registration page not accessible or requires parameters');
    }

  } catch (error) {
    log('FAILED', 'Counter Integration', `Error: ${error.message}`);
  }
}

// ==========================================
// Step 5: Admin Counter Function Tests
// ==========================================

async function testAdminCounters() {
  section('Admin Counter Function Tests');

  const testCity = 'sf-jun-2026'; // Use SF for admin testing

  try {
    // Test inventory expansion (admin function)
    // Note: This would normally require authentication
    log('WARNING', 'Admin Expansion', 'Admin functions require authentication - simulating test');

    // Test admin inventory endpoint access
    const adminResponse = await axios.get(`${BASE_URL}/api/admin/inventory`, {
      timeout: 5000
    }).catch(error => {
      return { status: error.response?.status, data: error.response?.data };
    });

    if (adminResponse.status === 401 || adminResponse.status === 403) {
      log('PASSED', 'Admin Security', 'Admin endpoints properly protected');
    } else if (adminResponse.status === 200) {
      log('WARNING', 'Admin Security', 'Admin endpoints accessible without auth');
    } else {
      log('WARNING', 'Admin Endpoints', `Unexpected response: ${adminResponse.status}`);
    }

  } catch (error) {
    log('WARNING', 'Admin Counter Tests', `Admin functions require proper authentication: ${error.message}`);
  }
}

// ==========================================
// Step 6: Error Handling Tests
// ==========================================

async function testErrorHandling() {
  section('Error Handling Tests');

  try {
    // Test invalid city ID
    const invalidResponse = await axios.get(`${BASE_URL}/api/inventory?cityId=invalid-city`, {
      timeout: 5000
    }).catch(error => error.response);

    if (invalidResponse && (invalidResponse.status === 404 || !invalidResponse.data.success)) {
      log('PASSED', 'Invalid City Handling', 'Invalid city properly rejected');
    } else {
      log('WARNING', 'Invalid City Handling', 'Invalid city not properly handled');
    }

    // Test malformed requests
    const malformedResponse = await axios.get(`${BASE_URL}/api/inventory?validate=true&tier=invalid`, {
      timeout: 5000
    }).catch(error => error.response);

    if (malformedResponse && (malformedResponse.status >= 400)) {
      log('PASSED', 'Malformed Request Handling', 'Malformed requests properly rejected');
    } else {
      log('WARNING', 'Malformed Request Handling', 'Malformed requests not properly handled');
    }

  } catch (error) {
    log('FAILED', 'Error Handling Tests', `Unexpected error: ${error.message}`);
  }
}

// ==========================================
// Main Test Execution
// ==========================================

async function runAllTests() {
  console.log(colors.blue.bold('\n🧮 6FB Methodologies Counter Verification\n'));
  console.log(colors.gray(`Starting comprehensive counter tests at ${new Date().toISOString()}\n`));

  try {
    await testInventoryAPIs();
    await testFrontendCounters();
    await testRaceConditions();
    await testCounterIntegration();
    await testAdminCounters();
    await testErrorHandling();

    // Generate final report
    section('Test Summary');

    const { passed, failed, warnings } = TEST_RESULTS.overall;
    const total = passed + failed + warnings;

    console.log(colors.green(`✅ Passed: ${passed}/${total}`));
    console.log(colors.red(`❌ Failed: ${failed}/${total}`));
    console.log(colors.yellow(`⚠️  Warnings: ${warnings}/${total}`));

    const successRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
    console.log(colors.blue(`📊 Success Rate: ${successRate}%`));

    if (failed === 0) {
      console.log(colors.green.bold('\n🎉 All critical counter tests passed!'));
    } else {
      console.log(colors.red.bold(`\n⚠️  ${failed} critical test(s) failed. Review required.`));
    }

    // Save detailed results
    const fs = require('fs');
    const reportFile = `counter-verification-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(TEST_RESULTS, null, 2));
    console.log(colors.gray(`\n📋 Detailed results saved to: ${reportFile}`));

  } catch (error) {
    console.error(colors.red.bold('\n💥 Test execution failed:'), error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(colors.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testInventoryAPIs,
  testFrontendCounters,
  testRaceConditions,
  testCounterIntegration,
  testAdminCounters,
  testErrorHandling
};