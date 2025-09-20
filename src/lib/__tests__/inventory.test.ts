/**
 * Inventory Management System Tests
 *
 * This file demonstrates how to use the inventory management system
 * and provides examples of the key functions.
 */

import {
  getPublicAvailableSpots,
  getActualAvailableSpots,
  decrementInventory,
  expandInventory,
  checkInventoryStatus,
  validateInventoryForCheckout,
  resetInventory
} from '../inventory'

/**
 * Example usage of the inventory management system
 */
export async function demonstrateInventorySystem() {
  const cityId = 'dallas-jan-2026'
  const tier = 'ga'

  console.log('=== 6FB Methodologies Inventory Management Demo ===\n')

  // 1. Check initial public availability (what customers see)
  console.log('1. Initial Public Availability:')
  const initialGA = await getPublicAvailableSpots(cityId, 'ga')
  const initialVIP = await getPublicAvailableSpots(cityId, 'vip')
  console.log(`   GA: ${initialGA} spots (public limit: 35)`)
  console.log(`   VIP: ${initialVIP} spots (public limit: 15)\n`)

  // 2. Check actual availability (includes expansions)
  console.log('2. Actual Availability:')
  const actualGA = await getActualAvailableSpots(cityId, 'ga')
  const actualVIP = await getActualAvailableSpots(cityId, 'vip')
  console.log(`   GA: ${actualGA} spots (actual capacity)`)
  console.log(`   VIP: ${actualVIP} spots (actual capacity)\n`)

  // 3. Validate checkout for 3 GA tickets
  console.log('3. Checkout Validation (3 GA tickets):')
  const validation = await validateInventoryForCheckout(cityId, 'ga', 3)
  console.log(`   Valid: ${validation.valid}`)
  console.log(`   Available: ${validation.available}`)
  if (validation.error) {
    console.log(`   Error: ${validation.error}`)
  }
  console.log('')

  // 4. Simulate successful payment - decrement inventory
  console.log('4. Simulating Successful Payment (3 GA tickets):')
  const decrementResult = await decrementInventory(cityId, 'ga', 3, {
    paymentIntentId: 'pi_demo_123',
    sessionId: 'cs_demo_456'
  })
  console.log(`   Success: ${decrementResult.success}`)
  if (decrementResult.success) {
    console.log(`   Remaining after sale: ${decrementResult.availableAfter}`)
  } else {
    console.log(`   Error: ${decrementResult.error}`)
  }
  console.log('')

  // 5. Check updated availability
  console.log('5. Updated Availability After Sale:')
  const newGA = await getPublicAvailableSpots(cityId, 'ga')
  const newVIP = await getPublicAvailableSpots(cityId, 'vip')
  console.log(`   GA: ${newGA} spots remaining`)
  console.log(`   VIP: ${newVIP} spots remaining\n`)

  // 6. Admin function - expand inventory for high demand
  console.log('6. Admin Expansion (Adding 10 more GA spots):')
  const expansionResult = await expandInventory(
    cityId,
    'ga',
    10,
    'admin_demo',
    'High demand - need more capacity'
  )
  console.log(`   Success: ${expansionResult.success}`)
  if (expansionResult.success) {
    console.log(`   New total capacity: ${expansionResult.newLimit}`)
  }
  console.log('')

  // 7. Check availability after expansion
  console.log('7. Availability After Expansion:')
  const expandedPublic = await getPublicAvailableSpots(cityId, 'ga')
  const expandedActual = await getActualAvailableSpots(cityId, 'ga')
  console.log(`   Public: ${expandedPublic} spots (still shows public limit)`)
  console.log(`   Actual: ${expandedActual} spots (includes expansion)\n`)

  // 8. Get comprehensive inventory status
  console.log('8. Comprehensive Inventory Status:')
  const status = await checkInventoryStatus(cityId)
  if (status) {
    console.log(`   City: ${status.cityId}`)
    console.log(`   Public Limits: GA=${status.publicLimits.ga}, VIP=${status.publicLimits.vip}`)
    console.log(`   Actual Limits: GA=${status.actualLimits.ga}, VIP=${status.actualLimits.vip}`)
    console.log(`   Sold: GA=${status.sold.ga}, VIP=${status.sold.vip}`)
    console.log(`   Public Available: GA=${status.publicAvailable.ga}, VIP=${status.publicAvailable.vip}`)
    console.log(`   Actual Available: GA=${status.actualAvailable.ga}, VIP=${status.actualAvailable.vip}`)
    console.log(`   Public Sold Out: ${status.isPublicSoldOut}`)
    console.log(`   Actually Sold Out: ${status.isActualSoldOut}`)
  }
  console.log('')

  console.log('=== Demo Complete ===')
}

/**
 * Test race condition prevention
 */
export async function testRaceConditionPrevention() {
  const cityId = 'atlanta-feb-2026'

  console.log('=== Testing Race Condition Prevention ===\n')

  // Simulate multiple concurrent checkout attempts
  const promises = []
  for (let i = 0; i < 5; i++) {
    promises.push(
      decrementInventory(cityId, 'ga', 2, {
        sessionId: `test_session_${i}`
      })
    )
  }

  const results = await Promise.all(promises)

  console.log('Concurrent checkout results:')
  results.forEach((result, index) => {
    console.log(`   Session ${index}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'OK'}`)
  })

  const successCount = results.filter(r => r.success).length
  console.log(`\nTotal successful: ${successCount} out of 5 attempts`)
  console.log('This demonstrates atomic operations preventing overselling.\n')
}

/**
 * Test inventory milestone alerts
 */
export async function testInventoryAlerts() {
  console.log('=== Testing Inventory Alert Thresholds ===\n')

  const cityId = 'vegas-mar-2026'

  // Simulate selling down to alert thresholds
  const alertThresholds = [25, 15, 10, 5, 2, 0]

  for (const threshold of alertThresholds) {
    const currentAvailable = await getPublicAvailableSpots(cityId, 'ga')

    if (currentAvailable > threshold) {
      const toSell = currentAvailable - threshold
      console.log(`Selling ${toSell} tickets to reach threshold: ${threshold}`)

      const result = await decrementInventory(cityId, 'ga', toSell, {
        sessionId: `alert_test_${threshold}`
      })

      if (result.success) {
        console.log(`   Success: ${result.availableAfter} spots remaining`)

        // This would trigger alerts in the webhook system
        if (threshold <= 5) {
          console.log(`   📢 ALERT: Would trigger ${threshold <= 2 ? 'CRITICAL' : 'WARNING'} alert!`)
        }
      }
    }
  }

  console.log('')
}

// Example of how to use the system in a checkout flow
export async function exampleCheckoutFlow(
  cityId: string,
  ticketType: 'GA' | 'VIP',
  quantity: number,
  customerEmail: string
) {
  console.log(`=== Checkout Flow Example ===`)
  console.log(`Customer: ${customerEmail}`)
  console.log(`Requesting: ${quantity} ${ticketType} tickets for ${cityId}\n`)

  const tier = ticketType.toLowerCase() as 'ga' | 'vip'

  // Step 1: Validate inventory
  console.log('Step 1: Validating inventory...')
  const validation = await validateInventoryForCheckout(cityId, tier, quantity)

  if (!validation.valid) {
    console.log(`❌ Checkout blocked: ${validation.error}`)
    return { success: false, error: validation.error }
  }

  console.log(`✅ Inventory available: ${validation.available} spots`)

  // Step 2: Create Stripe session (simulated)
  console.log('Step 2: Creating payment session...')
  const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`✅ Payment session created: ${sessionId}`)

  // Step 3: Customer completes payment (simulated)
  console.log('Step 3: Processing payment...')

  // Step 4: Webhook processes successful payment and decrements inventory
  console.log('Step 4: Payment successful - updating inventory...')
  const decrementResult = await decrementInventory(cityId, tier, quantity, {
    sessionId,
    paymentIntentId: `pi_${Date.now()}`
  })

  if (decrementResult.success) {
    console.log(`✅ Inventory updated: ${decrementResult.availableAfter} spots remaining`)
    console.log(`✅ Checkout complete!`)
    return {
      success: true,
      sessionId,
      remainingSpots: decrementResult.availableAfter
    }
  } else {
    console.log(`❌ Failed to update inventory: ${decrementResult.error}`)
    return { success: false, error: decrementResult.error }
  }
}

// Run demonstrations if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await demonstrateInventorySystem()
      await testRaceConditionPrevention()
      await testInventoryAlerts()

      // Example checkout
      await exampleCheckoutFlow(
        'nyc-apr-2026',
        'VIP',
        2,
        'customer@example.com'
      )
    } catch (error) {
      console.error('Demo error:', error)
    }
  })()
}