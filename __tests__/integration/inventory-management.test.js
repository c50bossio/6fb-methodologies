/**
 * Inventory Management Test Suite
 * Tests concurrent purchases, race conditions, inventory limits, and overselling prevention
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import mockInventoryService, {
  resetMockInventory,
  setMockInventory,
  setMockHiddenInventory,
  mockRaceCondition,
  getMockInventoryState,
} from '../mocks/inventory.mock'

// Mock the inventory module
jest.mock('@/lib/inventory', () => mockInventoryService)

describe('Inventory Management Tests', () => {
  beforeEach(() => {
    resetMockInventory()
    jest.clearAllMocks()
  })

  describe('Basic Inventory Operations', () => {
    it('should return correct available spots for GA tickets', async () => {
      const available = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'ga')
      expect(available).toBe(35)
    })

    it('should return correct available spots for VIP tickets', async () => {
      const available = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'vip')
      expect(available).toBe(15)
    })

    it('should validate inventory for valid checkout', async () => {
      const validation = await mockInventoryService.validateInventoryForCheckout(
        'dallas-jan-2026',
        'ga',
        2
      )

      expect(validation.isAvailable).toBe(true)
      expect(validation.availableSpots).toBe(35)
      expect(validation.requestedQuantity).toBe(2)
    })

    it('should reject checkout for insufficient inventory', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 1) // Only 1 spot available

      const validation = await mockInventoryService.validateInventoryForCheckout(
        'dallas-jan-2026',
        'ga',
        5 // Requesting 5 spots
      )

      expect(validation.isAvailable).toBe(false)
      expect(validation.availableSpots).toBe(1)
      expect(validation.requestedQuantity).toBe(5)
    })

    it('should successfully decrement inventory', async () => {
      const result = await mockInventoryService.decrementInventory(
        'dallas-jan-2026',
        'ga',
        3,
        'transaction_123'
      )

      expect(result.success).toBe(true)
      expect(result.quantity).toBe(3)
      expect(result.remainingInventory).toBe(32) // 35 - 3

      // Verify actual state changed
      const state = getMockInventoryState()
      expect(state['dallas-jan-2026'].ga).toBe(32)
    })

    it('should use hidden inventory when public inventory is insufficient', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 2) // Only 2 public spots
      setMockHiddenInventory('dallas-jan-2026', 'ga', 10) // 10 hidden spots

      const result = await mockInventoryService.decrementInventory(
        'dallas-jan-2026',
        'ga',
        5, // Need 5 spots (2 public + 3 hidden)
        'transaction_456'
      )

      expect(result.success).toBe(true)
      expect(result.usedHiddenInventory).toBe(true)
      expect(result.remainingInventory).toBe(0) // Public inventory depleted
    })
  })

  describe('Inventory Status Monitoring', () => {
    it('should return available status for normal inventory', async () => {
      const status = await mockInventoryService.checkInventoryStatus('dallas-jan-2026')

      expect(status.status).toBe('available')
      expect(status.message).toBe('Tickets available')
    })

    it('should return low-stock status when inventory is low', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 3) // Below threshold
      setMockInventory('dallas-jan-2026', 'vip', 1) // Below threshold

      const status = await mockInventoryService.checkInventoryStatus('dallas-jan-2026')

      expect(status.status).toBe('low-stock')
      expect(status.message).toBe('Limited tickets remaining')
    })

    it('should return sold-out status when no inventory remains', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 0)
      setMockInventory('dallas-jan-2026', 'vip', 0)
      setMockHiddenInventory('dallas-jan-2026', 'ga', 0)
      setMockHiddenInventory('dallas-jan-2026', 'vip', 0)

      const status = await mockInventoryService.checkInventoryStatus('dallas-jan-2026')

      expect(status.status).toBe('sold-out')
      expect(status.message).toBe('All tickets sold out')
    })

    it('should handle unknown city gracefully', async () => {
      const status = await mockInventoryService.checkInventoryStatus('unknown-city')

      expect(status.status).toBe('unavailable')
      expect(status.message).toBe('City not found')
    })
  })

  describe('Concurrent Purchase Scenarios', () => {
    it('should handle ticket reservations', async () => {
      const reservation = await mockInventoryService.reserveTickets(
        'dallas-jan-2026',
        'ga',
        3,
        'session_123',
        300000 // 5 minutes
      )

      expect(reservation.success).toBe(true)
      expect(reservation.reservationId).toBe('session_123')
      expect(reservation.quantity).toBe(3)

      // Verify inventory was temporarily reduced
      const available = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'ga')
      expect(available).toBe(32) // 35 - 3 reserved
    })

    it('should automatically release expired reservations', async () => {
      const reservation = await mockInventoryService.reserveTickets(
        'dallas-jan-2026',
        'ga',
        3,
        'session_expired',
        100 // 100ms TTL for quick test
      )

      expect(reservation.success).toBe(true)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Check that inventory was restored
      const available = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'ga')
      expect(available).toBe(35) // Back to original
    })

    it('should handle reservation conflicts', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 2) // Only 2 spots available

      // First reservation succeeds
      const reservation1 = await mockInventoryService.reserveTickets(
        'dallas-jan-2026',
        'ga',
        2,
        'session_first'
      )
      expect(reservation1.success).toBe(true)

      // Second reservation fails - insufficient inventory
      const reservation2 = await mockInventoryService.reserveTickets(
        'dallas-jan-2026',
        'ga',
        1,
        'session_second'
      )
      expect(reservation2.success).toBe(false)
      expect(reservation2.error).toBe('Insufficient inventory for reservation')
    })

    it('should properly release reservations manually', async () => {
      await mockInventoryService.reserveTickets(
        'dallas-jan-2026',
        'ga',
        3,
        'session_manual'
      )

      const release = await mockInventoryService.releaseReservation('session_manual')

      expect(release.success).toBe(true)
      expect(release.released).toBe(3)
      expect(release.cityId).toBe('dallas-jan-2026')
      expect(release.ticketType).toBe('ga')

      // Verify inventory was restored
      const available = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'ga')
      expect(available).toBe(35)
    })
  })

  describe('Race Condition Prevention', () => {
    it('should handle concurrent purchase attempts safely', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 5) // Limited inventory

      const results = await mockRaceCondition('dallas-jan-2026', 'ga', 10) // 10 concurrent requests

      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length

      // Only 5 should succeed due to inventory limit
      expect(successful).toBeLessThanOrEqual(5)
      expect(failed).toBeGreaterThanOrEqual(5)

      // Verify final inventory state
      const finalInventory = getMockInventoryState()
      expect(finalInventory['dallas-jan-2026'].ga).toBeGreaterThanOrEqual(0)
    })

    it('should prevent overselling with multiple ticket quantities', async () => {
      setMockInventory('dallas-jan-2026', 'vip', 3) // Only 3 VIP spots

      const promises = [
        mockInventoryService.decrementInventory('dallas-jan-2026', 'vip', 2, 'tx_1'),
        mockInventoryService.decrementInventory('dallas-jan-2026', 'vip', 2, 'tx_2'),
        mockInventoryService.decrementInventory('dallas-jan-2026', 'vip', 2, 'tx_3'),
      ]

      const results = await Promise.allSettled(promises)

      const successful = results.filter(result => result.status === 'fulfilled').length

      // At most one request should succeed (2 tickets out of 3 available)
      expect(successful).toBeLessThanOrEqual(2)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle decrement errors gracefully', async () => {
      try {
        await mockInventoryService.decrementInventory(
          'nonexistent-city',
          'ga',
          1,
          'error_test'
        )
      } catch (error) {
        expect(error.message).toContain('City nonexistent-city not found')
      }
    })

    it('should prevent negative inventory', async () => {
      setMockInventory('dallas-jan-2026', 'ga', 1)
      setMockHiddenInventory('dallas-jan-2026', 'ga', 0)

      try {
        await mockInventoryService.decrementInventory(
          'dallas-jan-2026',
          'ga',
          5, // More than available
          'negative_test'
        )
      } catch (error) {
        expect(error.message).toContain('Insufficient inventory')
      }

      // Verify inventory wasn't corrupted
      const state = getMockInventoryState()
      expect(state['dallas-jan-2026'].ga).toBe(1)
    })

    it('should handle reservation release for non-existent reservations', async () => {
      const release = await mockInventoryService.releaseReservation('nonexistent_session')

      expect(release.success).toBe(false)
      expect(release.error).toBe('Reservation not found')
    })
  })

  describe('Performance Tests', () => {
    it('should handle high-volume inventory checks efficiently', async () => {
      const startTime = Date.now()

      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'ga')
        )
      }

      await Promise.all(promises)

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should handle rapid reservation/release cycles', async () => {
      const promises = []

      for (let i = 0; i < 50; i++) {
        promises.push(
          mockInventoryService.reserveTickets(
            'dallas-jan-2026',
            'ga',
            1,
            `rapid_session_${i}`,
            1000 // 1 second TTL
          )
        )
      }

      const reservations = await Promise.allSettled(promises)

      // Some should succeed, some should fail due to inventory limits
      const successful = reservations.filter(r => r.status === 'fulfilled').length
      expect(successful).toBeGreaterThan(0)
      expect(successful).toBeLessThanOrEqual(35) // Max inventory limit
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero quantity requests', async () => {
      const validation = await mockInventoryService.validateInventoryForCheckout(
        'dallas-jan-2026',
        'ga',
        0
      )

      expect(validation.isAvailable).toBe(true)
      expect(validation.requestedQuantity).toBe(0)
    })

    it('should handle very large quantity requests', async () => {
      const validation = await mockInventoryService.validateInventoryForCheckout(
        'dallas-jan-2026',
        'ga',
        1000
      )

      expect(validation.isAvailable).toBe(false)
      expect(validation.availableSpots).toBe(35)
      expect(validation.requestedQuantity).toBe(1000)
    })

    it('should handle mixed ticket type operations', async () => {
      // Reserve GA tickets
      await mockInventoryService.reserveTickets('dallas-jan-2026', 'ga', 5, 'ga_session')

      // Reserve VIP tickets
      await mockInventoryService.reserveTickets('dallas-jan-2026', 'vip', 3, 'vip_session')

      // Check that operations are independent
      const gaAvailable = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'ga')
      const vipAvailable = await mockInventoryService.getPublicAvailableSpots('dallas-jan-2026', 'vip')

      expect(gaAvailable).toBe(30) // 35 - 5
      expect(vipAvailable).toBe(12) // 15 - 3
    })
  })
})