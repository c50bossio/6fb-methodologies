/**
 * Performance and Concurrency Tests
 *
 * Tests for high-load scenarios, race conditions, and system limits
 */

import { decrementInventory, resetInventory } from '../../src/lib/inventory';
import { smsService } from '../../src/lib/sms-service';

// Mock external services for performance testing
jest.mock('../../src/lib/sms-service');
jest.mock('twilio');

describe('Performance and Concurrency Tests', () => {
  const TEST_CITY = 'dallas-jan-2026';
  const ADMIN_USER = 'test-admin';

  beforeEach(async () => {
    // Reset inventory and mocks
    jest.clearAllMocks();
    await resetInventory(TEST_CITY, ADMIN_USER, 'Performance test reset');

    // Mock SMS service to avoid real API calls
    smsService.sendTicketSaleNotification = jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock_sms_123'
    });
  });

  describe('Concurrent Purchase Scenarios', () => {
    test('Heavy concurrent load - 50 simultaneous purchase attempts', async () => {
      const startTime = Date.now();

      // Create 50 concurrent purchase attempts
      const purchasePromises = Array.from({ length: 50 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `concurrent_test_${index}`,
          paymentIntentId: `pi_concurrent_${index}`
        });
      });

      const results = await Promise.all(purchasePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Analyze results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`Concurrent load test completed in ${duration}ms`);
      console.log(`Results: ${successful.length} successful, ${failed.length} failed`);

      // Assertions
      expect(successful.length).toBeLessThanOrEqual(35); // Can't sell more than available
      expect(failed.length).toBeGreaterThan(0); // Some should fail due to inventory limits
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(successful.length + failed.length).toBe(50); // All attempts should return

      // Verify final inventory state is consistent
      const finalSuccessful = successful[successful.length - 1];
      if (finalSuccessful) {
        expect(finalSuccessful.availableAfter).toBe(35 - successful.length);
      }
    });

    test('Mixed ticket type concurrent purchases', async () => {
      const startTime = Date.now();

      // Create mixed GA and VIP purchase attempts
      const gaPromises = Array.from({ length: 20 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 2, {
          sessionId: `ga_test_${index}`
        });
      });

      const vipPromises = Array.from({ length: 10 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'vip', 1, {
          sessionId: `vip_test_${index}`
        });
      });

      const allResults = await Promise.all([...gaPromises, ...vipPromises]);
      const endTime = Date.now();

      // Separate results by ticket type
      const gaResults = allResults.slice(0, 20);
      const vipResults = allResults.slice(20);

      const gaSuccessful = gaResults.filter(r => r.success);
      const vipSuccessful = vipResults.filter(r => r.success);

      console.log(`Mixed concurrent test: ${gaSuccessful.length}/20 GA, ${vipSuccessful.length}/10 VIP successful`);

      // GA tickets: 35 available, requesting 40 (20 * 2)
      expect(gaSuccessful.length).toBeLessThanOrEqual(17); // Max 17 purchases of 2 tickets each

      // VIP tickets: 15 available, requesting 10
      expect(vipSuccessful.length).toBeLessThanOrEqual(10);

      expect(endTime - startTime).toBeLessThan(3000); // Should complete quickly
    });

    test('Rapid sequential purchases (race condition stress test)', async () => {
      const purchaseCount = 100;
      const batchSize = 10;
      const results = [];

      // Process in batches to simulate real-world load patterns
      for (let i = 0; i < purchaseCount; i += batchSize) {
        const batch = Array.from({ length: batchSize }, (_, batchIndex) => {
          const index = i + batchIndex;
          return decrementInventory(TEST_CITY, 'ga', 1, {
            sessionId: `rapid_test_${index}`
          });
        });

        const batchResults = await Promise.all(batch);
        results.push(...batchResults);

        // Small delay between batches to simulate real timing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`Rapid sequential test: ${successful.length} successful out of ${purchaseCount}`);

      // Should never sell more than available inventory
      expect(successful.length).toBeLessThanOrEqual(35);

      // Should have consistent final state
      if (successful.length > 0) {
        const finalResult = successful[successful.length - 1];
        expect(finalResult.availableAfter).toBe(35 - successful.length);
      }
    });

    test('High-frequency inventory checks during purchases', async () => {
      // Start concurrent purchases
      const purchasePromises = Array.from({ length: 20 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `check_test_${index}`
        });
      });

      // Simultaneously perform many inventory status checks
      const { checkInventoryStatus } = require('../../src/lib/inventory');
      const checkPromises = Array.from({ length: 100 }, () => {
        return checkInventoryStatus(TEST_CITY);
      });

      const [purchaseResults, checkResults] = await Promise.all([
        Promise.all(purchasePromises),
        Promise.all(checkPromises)
      ]);

      // All checks should succeed
      expect(checkResults.every(result => result !== null)).toBe(true);

      // Purchases should work normally despite concurrent reads
      const successful = purchaseResults.filter(r => r.success);
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(20);

      console.log(`Concurrent read/write test: ${successful.length} purchases, ${checkResults.length} status checks`);
    });
  });

  describe('Performance Benchmarks', () => {
    test('Single purchase latency benchmark', async () => {
      const iterations = 10;
      const latencies = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `latency_test_${i}`
        });

        const endTime = Date.now();
        latencies.push(endTime - startTime);
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      console.log(`Purchase latency - Avg: ${avgLatency}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`);

      // Performance requirements
      expect(avgLatency).toBeLessThan(100); // Average under 100ms
      expect(maxLatency).toBeLessThan(500); // Max under 500ms
    });

    test('Inventory status check performance', async () => {
      const { checkInventoryStatus } = require('../../src/lib/inventory');
      const iterations = 100;
      const startTime = Date.now();

      const promises = Array.from({ length: iterations }, () => {
        return checkInventoryStatus(TEST_CITY);
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerCheck = totalTime / iterations;

      console.log(`Inventory check performance: ${iterations} checks in ${totalTime}ms (${avgTimePerCheck}ms avg)`);

      // Should handle high read load efficiently
      expect(avgTimePerCheck).toBeLessThan(50); // Under 50ms per check
      expect(totalTime).toBeLessThan(2000); // Total under 2 seconds
    });

    test('Memory usage stability under load', async () => {
      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      // Perform many operations
      const operations = Array.from({ length: 1000 }, async (_, index) => {
        // Mix of different operations
        if (index % 3 === 0) {
          return decrementInventory(TEST_CITY, 'ga', 1, { sessionId: `mem_test_${index}` });
        } else if (index % 3 === 1) {
          const { checkInventoryStatus } = require('../../src/lib/inventory');
          return checkInventoryStatus(TEST_CITY);
        } else {
          const { getPublicAvailableSpots } = require('../../src/lib/inventory');
          return getPublicAvailableSpots(TEST_CITY, 'ga');
        }
      });

      await Promise.all(operations);

      // Check memory usage after operations
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory usage should be reasonable
      expect(memoryIncreaseMB).toBeLessThan(50); // Less than 50MB increase
    });
  });

  describe('Error Handling Under Load', () => {
    test('Graceful degradation when inventory is exhausted', async () => {
      // First, exhaust the inventory
      const exhaustPromises = Array.from({ length: 35 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `exhaust_${index}`
        });
      });

      await Promise.all(exhaustPromises);

      // Now try additional purchases
      const additionalPromises = Array.from({ length: 20 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `after_exhaust_${index}`
        });
      });

      const additionalResults = await Promise.all(additionalPromises);

      // All additional purchases should fail gracefully
      expect(additionalResults.every(r => !r.success)).toBe(true);
      expect(additionalResults.every(r => r.error?.includes('Insufficient inventory'))).toBe(true);

      console.log('Graceful degradation test: All post-exhaustion purchases properly rejected');
    });

    test('Recovery after temporary system stress', async () => {
      // Simulate high load
      const highLoadPromises = Array.from({ length: 100 }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `stress_${index}`
        });
      });

      await Promise.all(highLoadPromises);

      // Wait a moment for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // System should still be responsive
      const { checkInventoryStatus } = require('../../src/lib/inventory');
      const statusCheck = await checkInventoryStatus(TEST_CITY);

      expect(statusCheck).not.toBeNull();
      expect(statusCheck.cityId).toBe(TEST_CITY);

      // Should be able to continue normal operations
      const normalPurchase = await decrementInventory(TEST_CITY, 'vip', 1, {
        sessionId: 'post_stress_test'
      });

      expect(normalPurchase.success).toBe(true);

      console.log('System recovery test: Normal operations resumed after stress');
    });

    test('Handling of malformed concurrent requests', async () => {
      // Mix of valid and invalid requests
      const requests = [
        // Valid requests
        ...Array.from({ length: 10 }, (_, i) =>
          decrementInventory(TEST_CITY, 'ga', 1, { sessionId: `valid_${i}` })
        ),
        // Invalid requests
        decrementInventory('invalid-city', 'ga', 1, { sessionId: 'invalid_city' }),
        decrementInventory(TEST_CITY, 'invalid-tier', 1, { sessionId: 'invalid_tier' }),
        decrementInventory(TEST_CITY, 'ga', 0, { sessionId: 'zero_quantity' }),
        decrementInventory(TEST_CITY, 'ga', -1, { sessionId: 'negative_quantity' }),
        decrementInventory(TEST_CITY, 'ga', 1000, { sessionId: 'excessive_quantity' })
      ];

      const results = await Promise.allSettled(requests);

      // Valid requests should succeed (first 10)
      const validResults = results.slice(0, 10);
      const successfulValid = validResults.filter(r =>
        r.status === 'fulfilled' && r.value.success
      );

      expect(successfulValid.length).toBeGreaterThan(0);

      // Invalid requests should fail gracefully (not crash the system)
      const invalidResults = results.slice(10);
      invalidResults.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(false);
        }
        // Even if rejected, should not crash the system
      });

      console.log(`Malformed request handling: ${successfulValid.length} valid succeeded, ${invalidResults.length} invalid handled`);
    });
  });

  describe('Real-World Load Simulation', () => {
    test('Black Friday scenario - rapid ticket sales burst', async () => {
      // Simulate a burst of purchases within a short time window
      const burstDuration = 2000; // 2 seconds
      const purchasesPerSecond = 25;
      const totalPurchases = Math.floor((burstDuration / 1000) * purchasesPerSecond);

      const startTime = Date.now();
      const results = [];

      // Stagger purchases over the burst duration
      for (let i = 0; i < totalPurchases; i++) {
        const purchasePromise = decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `burst_${i}`,
          paymentIntentId: `pi_burst_${i}`
        });

        results.push(purchasePromise);

        // Stagger timing to simulate real burst
        if (i < totalPurchases - 1) {
          await new Promise(resolve => setTimeout(resolve, burstDuration / totalPurchases));
        }
      }

      const allResults = await Promise.all(results);
      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      const successful = allResults.filter(r => r.success);
      const failed = allResults.filter(r => !r.success);

      console.log(`Black Friday simulation: ${successful.length}/${totalPurchases} successful in ${actualDuration}ms`);

      // Should handle burst load reasonably
      expect(successful.length).toBeLessThanOrEqual(35); // Inventory limit
      expect(actualDuration).toBeLessThan(burstDuration + 1000); // Within reasonable time
      expect(successful.length).toBeGreaterThan(0); // Some should succeed
    });

    test('Gradual ramp-up load pattern', async () => {
      // Simulate gradual increase in load
      const phases = [
        { concurrency: 5, duration: 500 },
        { concurrency: 10, duration: 500 },
        { concurrency: 20, duration: 500 },
        { concurrency: 30, duration: 500 }
      ];

      const allResults = [];

      for (const phase of phases) {
        console.log(`Starting phase: ${phase.concurrency} concurrent purchases`);

        const phasePromises = Array.from({ length: phase.concurrency }, (_, index) => {
          return decrementInventory(TEST_CITY, 'ga', 1, {
            sessionId: `ramp_${phase.concurrency}_${index}`
          });
        });

        const phaseResults = await Promise.all(phasePromises);
        allResults.push(...phaseResults);

        // Brief pause between phases
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successful = allResults.filter(r => r.success);
      const failed = allResults.filter(r => !r.success);

      console.log(`Ramp-up test complete: ${successful.length} successful out of ${allResults.length} total`);

      // System should handle gradual load increase
      expect(successful.length).toBeLessThanOrEqual(35);
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('System Limits and Boundaries', () => {
    test('Maximum concurrent connections limit', async () => {
      // Test with very high concurrency to find system limits
      const maxConcurrency = 200;
      const startTime = Date.now();

      const promises = Array.from({ length: maxConcurrency }, (_, index) => {
        return decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `max_concurrent_${index}`
        }).catch(error => ({ success: false, error: error.message }));
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`Max concurrency test: ${successful.length} successful, ${failed.length} failed in ${duration}ms`);

      // System should handle high concurrency without crashing
      expect(results.length).toBe(maxConcurrency);
      expect(successful.length).toBeLessThanOrEqual(35); // Inventory limit
      expect(duration).toBeLessThan(10000); // Should complete within reasonable time
    });

    test('Memory and resource cleanup after large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform a large number of operations
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = Array.from({ length: 100 }, (_, index) => {
          return decrementInventory(TEST_CITY, 'vip', 1, {
            sessionId: `cleanup_${batch}_${index}`
          });
        });

        await Promise.all(batchPromises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

      console.log(`Resource cleanup test: Memory increase ${memoryIncrease.toFixed(2)}MB`);

      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase
    });
  });
});