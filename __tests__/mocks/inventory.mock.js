// Inventory Management Mock for Testing
import { jest } from '@jest/globals'

// Mock in-memory inventory state for testing
let mockInventoryState = {
  'dallas-jan-2026': { ga: 35, vip: 15 },
  'atlanta-feb-2026': { ga: 35, vip: 15 },
  'la-mar-2026': { ga: 35, vip: 15 },
  'sf-jun-2026': { ga: 35, vip: 15 },
  'chicago-may-2026': { ga: 35, vip: 15 },
  'nyc-apr-2026': { ga: 35, vip: 15 },
}

// Mock hidden inventory (for overselling protection)
let mockHiddenInventory = {
  'dallas-jan-2026': { ga: 10, vip: 0 },
  'atlanta-feb-2026': { ga: 15, vip: 0 },
  'la-mar-2026': { ga: 15, vip: 0 },
  'sf-jun-2026': { ga: 10, vip: 0 },
  'chicago-may-2026': { ga: 15, vip: 0 },
  'nyc-apr-2026': { ga: 15, vip: 0 },
}

// Mock concurrent purchase tracking
let mockPendingReservations = new Map()

// Mock inventory service
export const mockInventoryService = {
  getPublicAvailableSpots: jest.fn(),
  getActualAvailableSpots: jest.fn(),
  validateInventoryForCheckout: jest.fn(),
  decrementInventory: jest.fn(),
  checkInventoryStatus: jest.fn(),
  reserveTickets: jest.fn(),
  releaseReservation: jest.fn(),
  expandInventory: jest.fn(),
}

// Mock implementations
mockInventoryService.getPublicAvailableSpots.mockImplementation(
  async (cityId, ticketType) => {
    const inventory = mockInventoryState[cityId]
    if (!inventory) return 0
    return Math.max(0, inventory[ticketType] || 0)
  }
)

mockInventoryService.getActualAvailableSpots.mockImplementation(
  async (cityId, ticketType) => {
    const publicSpots = await mockInventoryService.getPublicAvailableSpots(cityId, ticketType)
    const hiddenSpots = mockHiddenInventory[cityId]?.[ticketType] || 0
    return publicSpots + hiddenSpots
  }
)

mockInventoryService.validateInventoryForCheckout.mockImplementation(
  async (cityId, ticketType, quantity) => {
    const available = await mockInventoryService.getPublicAvailableSpots(cityId, ticketType)
    return {
      isAvailable: available >= quantity,
      availableSpots: available,
      requestedQuantity: quantity,
      canExpand: (mockHiddenInventory[cityId]?.[ticketType] || 0) > 0,
    }
  }
)

mockInventoryService.decrementInventory.mockImplementation(
  async (cityId, ticketType, quantity, transactionId) => {
    const currentInventory = mockInventoryState[cityId]
    if (!currentInventory) {
      throw new Error(`City ${cityId} not found`)
    }

    const available = currentInventory[ticketType] || 0
    if (available < quantity) {
      // Check if we can use hidden inventory
      const hiddenAvailable = mockHiddenInventory[cityId]?.[ticketType] || 0
      const totalAvailable = available + hiddenAvailable

      if (totalAvailable < quantity) {
        throw new Error(`Insufficient inventory: ${available} available, ${quantity} requested`)
      }

      // Use hidden inventory
      const fromPublic = available
      const fromHidden = quantity - fromPublic

      mockInventoryState[cityId][ticketType] = 0
      mockHiddenInventory[cityId][ticketType] -= fromHidden
    } else {
      // Sufficient public inventory
      mockInventoryState[cityId][ticketType] -= quantity
    }

    return {
      success: true,
      transactionId,
      cityId,
      ticketType,
      quantity,
      remainingInventory: mockInventoryState[cityId][ticketType],
      usedHiddenInventory: available < quantity,
    }
  }
)

mockInventoryService.checkInventoryStatus.mockImplementation(
  async (cityId) => {
    const inventory = mockInventoryState[cityId]
    const hidden = mockHiddenInventory[cityId]

    if (!inventory) {
      return { status: 'unavailable', message: 'City not found' }
    }

    const totalGA = (inventory.ga || 0) + (hidden?.ga || 0)
    const totalVIP = (inventory.vip || 0) + (hidden?.vip || 0)

    if (totalGA === 0 && totalVIP === 0) {
      return { status: 'sold-out', message: 'All tickets sold out' }
    }

    if (inventory.ga <= 5 || inventory.vip <= 2) {
      return { status: 'low-stock', message: 'Limited tickets remaining' }
    }

    return { status: 'available', message: 'Tickets available' }
  }
)

// Mock concurrent reservation system
mockInventoryService.reserveTickets.mockImplementation(
  async (cityId, ticketType, quantity, sessionId, ttl = 900000) => {
    const available = await mockInventoryService.getPublicAvailableSpots(cityId, ticketType)

    if (available < quantity) {
      return {
        success: false,
        error: 'Insufficient inventory for reservation',
        available,
        requested: quantity,
      }
    }

    // Create reservation
    const reservation = {
      cityId,
      ticketType,
      quantity,
      sessionId,
      expiresAt: Date.now() + ttl,
    }

    mockPendingReservations.set(sessionId, reservation)

    // Temporarily reduce available inventory
    mockInventoryState[cityId][ticketType] -= quantity

    // Set cleanup timer
    setTimeout(() => {
      if (mockPendingReservations.has(sessionId)) {
        mockPendingReservations.delete(sessionId)
        mockInventoryState[cityId][ticketType] += quantity
      }
    }, ttl)

    return {
      success: true,
      reservationId: sessionId,
      expiresAt: reservation.expiresAt,
      quantity,
    }
  }
)

mockInventoryService.releaseReservation.mockImplementation(
  async (sessionId) => {
    const reservation = mockPendingReservations.get(sessionId)

    if (!reservation) {
      return { success: false, error: 'Reservation not found' }
    }

    // Release the reserved inventory
    mockInventoryState[reservation.cityId][reservation.ticketType] += reservation.quantity
    mockPendingReservations.delete(sessionId)

    return {
      success: true,
      released: reservation.quantity,
      cityId: reservation.cityId,
      ticketType: reservation.ticketType,
    }
  }
)

// Helper functions for testing different scenarios
export const setMockInventory = (cityId, ticketType, quantity) => {
  if (!mockInventoryState[cityId]) {
    mockInventoryState[cityId] = { ga: 0, vip: 0 }
  }
  mockInventoryState[cityId][ticketType] = quantity
}

export const setMockHiddenInventory = (cityId, ticketType, quantity) => {
  if (!mockHiddenInventory[cityId]) {
    mockHiddenInventory[cityId] = { ga: 0, vip: 0 }
  }
  mockHiddenInventory[cityId][ticketType] = quantity
}

export const resetMockInventory = () => {
  mockInventoryState = {
    'dallas-jan-2026': { ga: 35, vip: 15 },
    'atlanta-feb-2026': { ga: 35, vip: 15 },
    'la-mar-2026': { ga: 35, vip: 15 },
    'sf-jun-2026': { ga: 35, vip: 15 },
    'chicago-may-2026': { ga: 35, vip: 15 },
    'nyc-apr-2026': { ga: 35, vip: 15 },
  }

  mockHiddenInventory = {
    'dallas-jan-2026': { ga: 10, vip: 0 },
    'atlanta-feb-2026': { ga: 15, vip: 0 },
    'la-mar-2026': { ga: 15, vip: 0 },
    'sf-jun-2026': { ga: 10, vip: 0 },
    'chicago-may-2026': { ga: 15, vip: 0 },
    'nyc-apr-2026': { ga: 15, vip: 0 },
  }

  mockPendingReservations.clear()
}

export const getMockInventoryState = () => ({ ...mockInventoryState })
export const getMockHiddenInventory = () => ({ ...mockHiddenInventory })
export const getMockReservations = () => new Map(mockPendingReservations)

// Simulate race condition scenarios
export const mockRaceCondition = async (cityId, ticketType, concurrentRequests = 5) => {
  const promises = []

  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      mockInventoryService.decrementInventory(cityId, ticketType, 1, `tx_${i}`)
    )
  }

  try {
    return await Promise.allSettled(promises)
  } catch (error) {
    return error
  }
}

export default mockInventoryService