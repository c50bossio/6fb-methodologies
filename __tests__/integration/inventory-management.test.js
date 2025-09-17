/**
 * Inventory Management Integration Tests
 *
 * Tests for inventory validation, concurrency handling, and expansion functionality
 */

import {
  getPublicAvailableSpots,
  getActualAvailableSpots,
  decrementInventory,
  expandInventory,
  checkInventoryStatus,
  validateInventoryForCheckout,
  resetInventory,
  getAllInventoryStatuses,
  getInventoryTransactions,
  getInventoryExpansions,
  _inventoryStore
} from '../../src/lib/inventory';

import { CITY_WORKSHOPS } from '../../src/lib/cities';

describe('Inventory Management System', () => {
  const TEST_CITY = 'dallas-jan-2026';
  const ADMIN_USER = 'test-admin-user';

  beforeEach(async () => {
    // Reset inventory to clean state before each test
    await resetInventory(TEST_CITY, ADMIN_USER, 'Test setup reset');
  });

  describe('Public vs Actual Inventory Limits', () => {
    test('Public limits are enforced correctly', async () => {
      // Test public GA limit (35)
      const gaPublicSpots = await getPublicAvailableSpots(TEST_CITY, 'ga');
      expect(gaPublicSpots).toBe(35);

      // Test public VIP limit (15)
      const vipPublicSpots = await getPublicAvailableSpots(TEST_CITY, 'vip');
      expect(vipPublicSpots).toBe(15);
    });

    test('Actual limits match public limits initially', async () => {
      const gaActualSpots = await getActualAvailableSpots(TEST_CITY, 'ga');
      const vipActualSpots = await getActualAvailableSpots(TEST_CITY, 'vip');

      expect(gaActualSpots).toBe(35);
      expect(vipActualSpots).toBe(15);
    });

    test('Expanded inventory shows correctly in actual but not public limits', async () => {
      // Expand GA inventory by 20 spots
      const expansionResult = await expandInventory(
        TEST_CITY,
        'ga',
        20,
        ADMIN_USER,
        'High demand test expansion'
      );

      expect(expansionResult.success).toBe(true);
      expect(expansionResult.newLimit).toBe(55); // 35 + 20

      // Public limits should remain the same
      const gaPublicSpots = await getPublicAvailableSpots(TEST_CITY, 'ga');
      expect(gaPublicSpots).toBe(35);

      // Actual limits should reflect expansion
      const gaActualSpots = await getActualAvailableSpots(TEST_CITY, 'ga');
      expect(gaActualSpots).toBe(55);
    });
  });

  describe('Inventory Decrementation', () => {
    test('Successful inventory decrement', async () => {
      const initialSpots = await getActualAvailableSpots(TEST_CITY, 'ga');

      const result = await decrementInventory(TEST_CITY, 'ga', 5, {
        sessionId: 'test_session_123',
        paymentIntentId: 'pi_test_456'
      });

      expect(result.success).toBe(true);
      expect(result.availableAfter).toBe(initialSpots - 5);

      // Verify spots actually decreased
      const finalSpots = await getActualAvailableSpots(TEST_CITY, 'ga');
      expect(finalSpots).toBe(initialSpots - 5);
    });

    test('Prevents overselling', async () => {
      // Try to buy more than available
      const result = await decrementInventory(TEST_CITY, 'ga', 50, {
        sessionId: 'test_oversell'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient inventory');

      // Verify inventory unchanged
      const spotsAfter = await getActualAvailableSpots(TEST_CITY, 'ga');
      expect(spotsAfter).toBe(35); // Should remain at initial amount
    });

    test('Handles zero and negative quantities', async () => {
      const zeroResult = await decrementInventory(TEST_CITY, 'ga', 0, {
        sessionId: 'test_zero'
      });
      expect(zeroResult.success).toBe(false);

      // Note: The current implementation might not explicitly handle negative quantities
      // This test helps identify if we need to add that validation
    });

    test('Tracks transaction history', async () => {
      await decrementInventory(TEST_CITY, 'ga', 3, {
        sessionId: 'test_history_1',
        paymentIntentId: 'pi_history_1'
      });

      await decrementInventory(TEST_CITY, 'vip', 2, {
        sessionId: 'test_history_2',
        paymentIntentId: 'pi_history_2'
      });

      const transactions = await getInventoryTransactions(TEST_CITY);

      expect(transactions.length).toBeGreaterThanOrEqual(2);

      const gaTransaction = transactions.find(t => t.tier === 'ga' && t.quantity === 3);
      expect(gaTransaction).toBeDefined();
      expect(gaTransaction.operation).toBe('decrement');
      expect(gaTransaction.metadata.sessionId).toBe('test_history_1');

      const vipTransaction = transactions.find(t => t.tier === 'vip' && t.quantity === 2);
      expect(vipTransaction).toBeDefined();
    });
  });

  describe('Checkout Validation', () => {
    test('Validates available inventory for checkout', async () => {
      const validation = await validateInventoryForCheckout(TEST_CITY, 'ga', 10);

      expect(validation.valid).toBe(true);
      expect(validation.available).toBe(35);
      expect(validation.error).toBeUndefined();
    });

    test('Rejects checkout for insufficient inventory', async () => {
      const validation = await validateInventoryForCheckout(TEST_CITY, 'ga', 40);

      expect(validation.valid).toBe(false);
      expect(validation.available).toBe(35);
      expect(validation.error).toContain('Only 35 GA tickets available');
    });

    test('Validation considers sold tickets', async () => {
      // Sell some tickets first
      await decrementInventory(TEST_CITY, 'ga', 10, { sessionId: 'validation_test' });

      const validation = await validateInventoryForCheckout(TEST_CITY, 'ga', 30);

      expect(validation.valid).toBe(false); // 35 - 10 = 25 available, but requesting 30
      expect(validation.available).toBe(25);
    });
  });

  describe('Race Condition Prevention', () => {
    test('Concurrent decrements are handled atomically', async () => {
      // Create multiple concurrent decrement operations
      const promises = Array.from({ length: 10 }, (_, index) =>
        decrementInventory(TEST_CITY, 'ga', 2, {
          sessionId: `concurrent_test_${index}`
        })
      );

      const results = await Promise.all(promises);

      // Count successful operations
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // With 35 initial spots and 2 per request, max 17 should succeed (34 spots used)
      expect(successful.length).toBeLessThanOrEqual(17);
      expect(failed.length).toBeGreaterThan(0); // Some should fail due to insufficient inventory

      // Verify final inventory state
      const finalSpots = await getActualAvailableSpots(TEST_CITY, 'ga');
      const expectedSpots = 35 - (successful.length * 2);
      expect(finalSpots).toBe(expectedSpots);

      console.log(`Race condition test: ${successful.length} successful, ${failed.length} failed`);
    });

    test('Mixed operations (decrements and expansions) maintain consistency', async () => {
      const operations = [
        () => decrementInventory(TEST_CITY, 'ga', 5, { sessionId: 'mixed_1' }),
        () => expandInventory(TEST_CITY, 'ga', 10, ADMIN_USER, 'Mixed test expansion'),
        () => decrementInventory(TEST_CITY, 'ga', 3, { sessionId: 'mixed_2' }),
        () => decrementInventory(TEST_CITY, 'ga', 7, { sessionId: 'mixed_3' }),
      ];

      const results = await Promise.all(operations.map(op => op()));

      // All operations should succeed since we're adding capacity
      const allSuccessful = results.every(r => r.success);
      expect(allSuccessful).toBe(true);

      // Verify final state: 35 + 10 - 5 - 3 - 7 = 30
      const finalSpots = await getActualAvailableSpots(TEST_CITY, 'ga');
      expect(finalSpots).toBe(30);
    });
  });

  describe('Inventory Expansion', () => {
    test('Successful inventory expansion', async () => {
      const result = await expandInventory(
        TEST_CITY,
        'vip',
        25,
        ADMIN_USER,
        'High demand - need more VIP capacity'
      );

      expect(result.success).toBe(true);
      expect(result.newLimit).toBe(40); // 15 + 25

      // Verify expansion is recorded
      const expansions = await getInventoryExpansions(TEST_CITY);
      const vipExpansion = expansions.find(e => e.tier === 'vip' && e.additionalSpots === 25);

      expect(vipExpansion).toBeDefined();
      expect(vipExpansion.authorizedBy).toBe(ADMIN_USER);
      expect(vipExpansion.reason).toBe('High demand - need more VIP capacity');
    });

    test('Expansion validation', async () => {
      // Test invalid expansion amounts
      const zeroResult = await expandInventory(TEST_CITY, 'ga', 0, ADMIN_USER, 'Invalid test');
      expect(zeroResult.success).toBe(false);
      expect(zeroResult.error).toContain('positive');

      const negativeResult = await expandInventory(TEST_CITY, 'ga', -5, ADMIN_USER, 'Invalid test');
      expect(negativeResult.success).toBe(false);
      expect(negativeResult.error).toContain('positive');

      // Test missing authorization
      const noAuthResult = await expandInventory(TEST_CITY, 'ga', 10, '', 'No auth test');
      expect(noAuthResult.success).toBe(false);
      expect(noAuthResult.error).toContain('Authorization required');
    });

    test('Multiple expansions accumulate correctly', async () => {
      await expandInventory(TEST_CITY, 'ga', 10, ADMIN_USER, 'First expansion');
      await expandInventory(TEST_CITY, 'ga', 15, ADMIN_USER, 'Second expansion');

      const finalSpots = await getActualAvailableSpots(TEST_CITY, 'ga');
      expect(finalSpots).toBe(60); // 35 + 10 + 15

      const expansions = await getInventoryExpansions(TEST_CITY);
      const gaExpansions = expansions.filter(e => e.tier === 'ga');
      expect(gaExpansions).toHaveLength(2);
    });
  });

  describe('Comprehensive Status Reporting', () => {
    test('Inventory status provides complete information', async () => {
      // Set up test scenario
      await decrementInventory(TEST_CITY, 'ga', 8, { sessionId: 'status_test_ga' });
      await decrementInventory(TEST_CITY, 'vip', 3, { sessionId: 'status_test_vip' });
      await expandInventory(TEST_CITY, 'ga', 20, ADMIN_USER, 'Status test expansion');

      const status = await checkInventoryStatus(TEST_CITY);

      expect(status).toBeDefined();
      expect(status.cityId).toBe(TEST_CITY);

      // Public limits should remain constant
      expect(status.publicLimits.ga).toBe(35);
      expect(status.publicLimits.vip).toBe(15);

      // Actual limits should reflect expansion
      expect(status.actualLimits.ga).toBe(55); // 35 + 20
      expect(status.actualLimits.vip).toBe(15);

      // Sold counts
      expect(status.sold.ga).toBe(8);
      expect(status.sold.vip).toBe(3);

      // Available calculations
      expect(status.publicAvailable.ga).toBe(27); // 35 - 8
      expect(status.publicAvailable.vip).toBe(12); // 15 - 3
      expect(status.actualAvailable.ga).toBe(47); // 55 - 8
      expect(status.actualAvailable.vip).toBe(12); // 15 - 3

      // Sold out status
      expect(status.isPublicSoldOut).toBe(false);
      expect(status.isActualSoldOut).toBe(false);
    });

    test('All cities inventory status', async () => {
      const allStatuses = await getAllInventoryStatuses();

      expect(allStatuses).toHaveLength(6); // All test cities

      allStatuses.forEach(status => {
        expect(status.cityId).toBeDefined();
        expect(status.publicLimits.ga).toBe(35);
        expect(status.publicLimits.vip).toBe(15);
        expect(status.lastUpdated).toBeInstanceOf(Date);
      });
    });

    test('Sold out detection', async () => {
      // Sell out GA tickets
      await decrementInventory(TEST_CITY, 'ga', 35, { sessionId: 'sellout_ga' });
      // Sell out VIP tickets
      await decrementInventory(TEST_CITY, 'vip', 15, { sessionId: 'sellout_vip' });

      const status = await checkInventoryStatus(TEST_CITY);

      expect(status.publicAvailable.ga).toBe(0);
      expect(status.publicAvailable.vip).toBe(0);
      expect(status.isPublicSoldOut).toBe(true);
      expect(status.isActualSoldOut).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Invalid city handling', async () => {
      const spots = await getPublicAvailableSpots('invalid-city', 'ga');
      expect(spots).toBe(0);

      const validation = await validateInventoryForCheckout('invalid-city', 'ga', 1);
      expect(validation.valid).toBe(false);
      expect(validation.available).toBe(0);
    });

    test('Invalid tier handling', async () => {
      // Note: TypeScript should prevent this, but test runtime behavior
      const spots = await getPublicAvailableSpots(TEST_CITY, 'invalid' as any);
      expect(spots).toBe(0);
    });

    test('Large quantity edge cases', async () => {
      const largeQuantity = 1000000;
      const result = await decrementInventory(TEST_CITY, 'ga', largeQuantity, {
        sessionId: 'large_quantity_test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient inventory');
    });
  });

  describe('Integration with Real Cities Data', () => {
    test('All configured cities have valid inventory', async () => {
      for (const city of CITY_WORKSHOPS) {
        const gaSpots = await getPublicAvailableSpots(city.id, 'ga');
        const vipSpots = await getPublicAvailableSpots(city.id, 'vip');

        expect(gaSpots).toBe(35);
        expect(vipSpots).toBe(15);

        // Verify city data includes Stripe price IDs
        expect(city.stripe).toBeDefined();
        expect(city.stripe.gaPriceId).toBeDefined();
        expect(city.stripe.vipPriceId).toBeDefined();
      }
    });
  });

  describe('Performance Tests', () => {
    test('High frequency operations performance', async () => {
      const startTime = Date.now();

      // Perform many read operations
      const readPromises = Array.from({ length: 100 }, () =>
        getPublicAvailableSpots(TEST_CITY, 'ga')
      );

      await Promise.all(readPromises);

      const readTime = Date.now() - startTime;
      expect(readTime).toBeLessThan(1000); // Should complete within 1 second

      // Perform sequential write operations
      const writeStartTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await decrementInventory(TEST_CITY, 'ga', 1, {
          sessionId: `perf_test_${i}`
        });
      }

      const writeTime = Date.now() - writeStartTime;
      expect(writeTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Performance test - Reads: ${readTime}ms, Writes: ${writeTime}ms`);
    });
  });
});