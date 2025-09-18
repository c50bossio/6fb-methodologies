/**
 * 6FB Methodologies Workshop Inventory Management System
 *
 * Features:
 * - Public limit enforcement (35 GA + 15 VIP per city)
 * - Hidden expansion capability for high demand
 * - Real-time tracking and race condition prevention
 * - Atomic operations to prevent overselling
 * - Admin functions for inventory expansion
 * - Comprehensive monitoring and logging
 */

export interface InventoryStatus {
  cityId: string
  publicLimits: {
    ga: number
    vip: number
  }
  actualLimits: {
    ga: number
    vip: number
  }
  sold: {
    ga: number
    vip: number
  }
  publicAvailable: {
    ga: number
    vip: number
  }
  actualAvailable: {
    ga: number
    vip: number
  }
  isPublicSoldOut: boolean
  isActualSoldOut: boolean
  lastUpdated: Date
}

export interface InventoryTransaction {
  id: string
  cityId: string
  tier: 'ga' | 'vip'
  quantity: number
  operation: 'decrement' | 'expand' | 'reset'
  timestamp: Date
  metadata?: {
    paymentIntentId?: string
    sessionId?: string
    adminUserId?: string
    reason?: string
  }
}

export interface InventoryExpansion {
  cityId: string
  tier: 'ga' | 'vip'
  additionalSpots: number
  reason: string
  authorizedBy: string
  timestamp: Date
}

// Public limits as defined in requirements
const PUBLIC_LIMITS = {
  ga: 35,
  vip: 15
} as const

// In-memory inventory store (would be replaced with database in production)
class InventoryStore {
  private inventory = new Map<string, {
    actualLimits: { ga: number; vip: number }
    sold: { ga: number; vip: number }
    transactions: InventoryTransaction[]
    expansions: InventoryExpansion[]
  }>()

  private locks = new Map<string, Promise<void>>()

  constructor() {
    // Initialize with default cities from cities.ts
    this.initializeDefaultCities()
  }

  private initializeDefaultCities() {
    const defaultCities = [
      'dallas-jan-2026',
      'atlanta-feb-2026',
      'la-mar-2026',
      'sf-jun-2026',
      'chicago-may-2026',
      'nyc-apr-2026'
    ]

    defaultCities.forEach(cityId => {
      this.inventory.set(cityId, {
        actualLimits: { ga: PUBLIC_LIMITS.ga, vip: PUBLIC_LIMITS.vip },
        sold: { ga: 0, vip: 0 },
        transactions: [],
        expansions: []
      })
    })
  }

  // Atomic operation wrapper to prevent race conditions
  async withLock<T>(cityId: string, operation: () => T | Promise<T>): Promise<T> {
    const lockKey = `${cityId}_lock`

    // Wait for existing lock to complete
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey)
    }

    // Create new lock
    const lockPromise = (async () => {
      try {
        return await operation()
      } finally {
        this.locks.delete(lockKey)
      }
    })()

    this.locks.set(lockKey, lockPromise.then(() => {}))
    return lockPromise
  }

  async getCityInventory(cityId: string): Promise<{
    actualLimits: { ga: number; vip: number }
    sold: { ga: number; vip: number }
    transactions: InventoryTransaction[]
    expansions: InventoryExpansion[]
  } | null> {
    return this.inventory.get(cityId) || null
  }

  async setCityInventory(cityId: string, data: {
    actualLimits: { ga: number; vip: number }
    sold: { ga: number; vip: number }
    transactions: InventoryTransaction[]
    expansions: InventoryExpansion[]
  }): Promise<void> {
    this.inventory.set(cityId, data)
  }

  async addTransaction(cityId: string, transaction: InventoryTransaction): Promise<void> {
    const data = await this.getCityInventory(cityId)
    if (data) {
      data.transactions.push(transaction)
      await this.setCityInventory(cityId, data)
    }
  }

  async addExpansion(cityId: string, expansion: InventoryExpansion): Promise<void> {
    const data = await this.getCityInventory(cityId)
    if (data) {
      data.expansions.push(expansion)
      await this.setCityInventory(cityId, data)
    }
  }
}

// Global inventory store instance
const inventoryStore = new InventoryStore()

/**
 * Get public available spots (max 35 GA, 15 VIP)
 * This is what customers see on the public website
 */
export async function getPublicAvailableSpots(
  cityId: string,
  tier: 'ga' | 'vip'
): Promise<number> {
  try {
    const inventory = await inventoryStore.getCityInventory(cityId)
    if (!inventory) {
      console.warn(`City ${cityId} not found in inventory`)
      return 0
    }

    const publicLimit = PUBLIC_LIMITS[tier]
    const sold = inventory.sold[tier]
    const available = Math.max(0, publicLimit - sold)

    return available
  } catch (error) {
    console.error(`Error getting public spots for ${cityId}:${tier}:`, error)
    return 0
  }
}

/**
 * Get actual available spots (including expansions)
 * This is used internally to check true capacity
 */
export async function getActualAvailableSpots(
  cityId: string,
  tier: 'ga' | 'vip'
): Promise<number> {
  try {
    const inventory = await inventoryStore.getCityInventory(cityId)
    if (!inventory) {
      console.warn(`City ${cityId} not found in inventory`)
      return 0
    }

    const actualLimit = inventory.actualLimits[tier]
    const sold = inventory.sold[tier]
    const available = Math.max(0, actualLimit - sold)

    return available
  } catch (error) {
    console.error(`Error getting actual spots for ${cityId}:${tier}:`, error)
    return 0
  }
}

/**
 * Decrement inventory on successful payment
 * Uses atomic operations to prevent race conditions
 */
export async function decrementInventory(
  cityId: string,
  tier: 'ga' | 'vip',
  quantity: number,
  metadata?: {
    paymentIntentId?: string
    sessionId?: string
  }
): Promise<{ success: boolean; error?: string; availableAfter?: number }> {
  return inventoryStore.withLock(cityId, async () => {
    try {
      const inventory = await inventoryStore.getCityInventory(cityId)
      if (!inventory) {
        return { success: false, error: `City ${cityId} not found` }
      }

      const currentSold = inventory.sold[tier]
      const actualLimit = inventory.actualLimits[tier]
      const availableBefore = actualLimit - currentSold

      // Check if we have enough inventory
      if (availableBefore < quantity) {
        return {
          success: false,
          error: `Insufficient inventory. Available: ${availableBefore}, Requested: ${quantity}`
        }
      }

      // Update sold count
      inventory.sold[tier] = currentSold + quantity

      // Create transaction record
      const transaction: InventoryTransaction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cityId,
        tier,
        quantity,
        operation: 'decrement',
        timestamp: new Date(),
        metadata
      }

      await inventoryStore.addTransaction(cityId, transaction)
      await inventoryStore.setCityInventory(cityId, inventory)

      const availableAfter = actualLimit - inventory.sold[tier]

      console.log(`Inventory decremented: ${cityId}:${tier} -${quantity} = ${availableAfter} remaining`)

      return {
        success: true,
        availableAfter
      }

    } catch (error) {
      console.error(`Error decrementing inventory for ${cityId}:${tier}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}

/**
 * Expand inventory for high demand cities (admin function)
 * Only increases actual limits, public limits stay at 35/15
 */
export async function expandInventory(
  cityId: string,
  tier: 'ga' | 'vip',
  additionalSpots: number,
  authorizedBy: string,
  reason: string = 'High demand expansion'
): Promise<{ success: boolean; error?: string; newLimit?: number }> {
  return inventoryStore.withLock(cityId, async () => {
    try {
      // Validation
      if (additionalSpots <= 0) {
        return { success: false, error: 'Additional spots must be positive' }
      }

      if (!authorizedBy) {
        return { success: false, error: 'Authorization required for inventory expansion' }
      }

      const inventory = await inventoryStore.getCityInventory(cityId)
      if (!inventory) {
        return { success: false, error: `City ${cityId} not found` }
      }

      // Update actual limits (public limits remain unchanged)
      const oldLimit = inventory.actualLimits[tier]
      inventory.actualLimits[tier] = oldLimit + additionalSpots

      // Create expansion record
      const expansion: InventoryExpansion = {
        cityId,
        tier,
        additionalSpots,
        reason,
        authorizedBy,
        timestamp: new Date()
      }

      // Create transaction record
      const transaction: InventoryTransaction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cityId,
        tier,
        quantity: additionalSpots,
        operation: 'expand',
        timestamp: new Date(),
        metadata: {
          adminUserId: authorizedBy,
          reason
        }
      }

      await inventoryStore.addExpansion(cityId, expansion)
      await inventoryStore.addTransaction(cityId, transaction)
      await inventoryStore.setCityInventory(cityId, inventory)

      console.log(`Inventory expanded: ${cityId}:${tier} +${additionalSpots} = ${inventory.actualLimits[tier]} total`)

      return {
        success: true,
        newLimit: inventory.actualLimits[tier]
      }

    } catch (error) {
      console.error(`Error expanding inventory for ${cityId}:${tier}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}

/**
 * Get comprehensive inventory status for monitoring
 */
export async function checkInventoryStatus(cityId: string): Promise<InventoryStatus | null> {
  try {
    const inventory = await inventoryStore.getCityInventory(cityId)
    if (!inventory) {
      return null
    }

    const status: InventoryStatus = {
      cityId,
      publicLimits: { ...PUBLIC_LIMITS },
      actualLimits: { ...inventory.actualLimits },
      sold: { ...inventory.sold },
      publicAvailable: {
        ga: Math.max(0, PUBLIC_LIMITS.ga - inventory.sold.ga),
        vip: Math.max(0, PUBLIC_LIMITS.vip - inventory.sold.vip)
      },
      actualAvailable: {
        ga: Math.max(0, inventory.actualLimits.ga - inventory.sold.ga),
        vip: Math.max(0, inventory.actualLimits.vip - inventory.sold.vip)
      },
      isPublicSoldOut: (
        (PUBLIC_LIMITS.ga - inventory.sold.ga <= 0) &&
        (PUBLIC_LIMITS.vip - inventory.sold.vip <= 0)
      ),
      isActualSoldOut: (
        (inventory.actualLimits.ga - inventory.sold.ga <= 0) &&
        (inventory.actualLimits.vip - inventory.sold.vip <= 0)
      ),
      lastUpdated: new Date()
    }

    return status
  } catch (error) {
    console.error(`Error checking inventory status for ${cityId}:`, error)
    return null
  }
}

/**
 * Get all inventory statuses for admin dashboard
 */
export async function getAllInventoryStatuses(): Promise<InventoryStatus[]> {
  const defaultCities = [
    'dallas-jan-2026',
    'atlanta-feb-2026',
    'la-mar-2026',
    'sf-jun-2026',
    'chicago-may-2026',
    'nyc-apr-2026'
  ]

  const statuses: InventoryStatus[] = []

  for (const cityId of defaultCities) {
    const status = await checkInventoryStatus(cityId)
    if (status) {
      statuses.push(status)
    }
  }

  return statuses
}

/**
 * Validate inventory before checkout
 * Returns true if inventory is available, false otherwise
 */
export async function validateInventoryForCheckout(
  cityId: string,
  tier: 'ga' | 'vip',
  quantity: number
): Promise<{ valid: boolean; available: number; error?: string }> {
  try {
    const actualAvailable = await getActualAvailableSpots(cityId, tier)

    if (actualAvailable >= quantity) {
      return { valid: true, available: actualAvailable }
    } else {
      return {
        valid: false,
        available: actualAvailable,
        error: `Only ${actualAvailable} ${tier.toUpperCase()} tickets available, but ${quantity} requested`
      }
    }
  } catch (error) {
    console.error(`Error validating inventory for ${cityId}:${tier}:`, error)
    return {
      valid: false,
      available: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get inventory transaction history (admin function)
 */
export async function getInventoryTransactions(
  cityId: string,
  limit: number = 50
): Promise<InventoryTransaction[]> {
  try {
    const inventory = await inventoryStore.getCityInventory(cityId)
    if (!inventory) {
      return []
    }

    return inventory.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  } catch (error) {
    console.error(`Error getting transactions for ${cityId}:`, error)
    return []
  }
}

/**
 * Get inventory expansion history (admin function)
 */
export async function getInventoryExpansions(cityId: string): Promise<InventoryExpansion[]> {
  try {
    const inventory = await inventoryStore.getCityInventory(cityId)
    if (!inventory) {
      return []
    }

    return inventory.expansions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  } catch (error) {
    console.error(`Error getting expansions for ${cityId}:`, error)
    return []
  }
}

/**
 * Reset inventory to default state (emergency admin function)
 */
export async function resetInventory(
  cityId: string,
  authorizedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  return inventoryStore.withLock(cityId, async () => {
    try {
      if (!authorizedBy) {
        return { success: false, error: 'Authorization required for inventory reset' }
      }

      const inventory = await inventoryStore.getCityInventory(cityId)
      if (!inventory) {
        return { success: false, error: `City ${cityId} not found` }
      }

      // Reset to default values
      inventory.actualLimits = { ga: PUBLIC_LIMITS.ga, vip: PUBLIC_LIMITS.vip }
      inventory.sold = { ga: 0, vip: 0 }

      // Create reset transaction
      const transaction: InventoryTransaction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cityId,
        tier: 'ga', // Reset affects both tiers
        quantity: 0,
        operation: 'reset',
        timestamp: new Date(),
        metadata: {
          adminUserId: authorizedBy,
          reason
        }
      }

      await inventoryStore.addTransaction(cityId, transaction)
      await inventoryStore.setCityInventory(cityId, inventory)

      console.log(`Inventory reset: ${cityId} by ${authorizedBy} - ${reason}`)

      return { success: true }

    } catch (error) {
      console.error(`Error resetting inventory for ${cityId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}

// Export store for testing purposes
export const _inventoryStore = inventoryStore