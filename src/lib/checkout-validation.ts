/**
 * Checkout Validation with Inventory Management
 *
 * This module provides checkout validation that integrates with the inventory system
 * to prevent overselling and ensure accurate availability checks.
 */

import { validateInventoryForCheckout, getPublicAvailableSpots } from './inventory'
import type { CitySelection, TicketType } from '@/types'

export interface CheckoutValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  inventory: {
    requested: number
    available: number
    tier: 'ga' | 'vip'
    cityId: string
  }
  suggestions?: {
    alternativeTiers?: { tier: 'ga' | 'vip'; available: number }[]
    alternativeCities?: { cityId: string; available: number }[]
  }
}

export interface CheckoutValidationOptions {
  includeSuggestions?: boolean
  strictValidation?: boolean
}

/**
 * Comprehensive checkout validation with inventory checks
 */
export async function validateCheckout(
  citySelection: CitySelection,
  options: CheckoutValidationOptions = {}
): Promise<CheckoutValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const { includeSuggestions = false, strictValidation = true } = options

  try {
    const { cityId, ticketType, quantity } = citySelection
    const tier = ticketType.toLowerCase() as 'ga' | 'vip'

    // Basic validation
    if (!cityId) {
      errors.push('City selection is required')
    }

    if (!ticketType || !['GA', 'VIP'].includes(ticketType)) {
      errors.push('Valid ticket type is required (GA or VIP)')
    }

    if (!quantity || quantity < 1 || quantity > 10) {
      errors.push('Quantity must be between 1 and 10')
    }

    // Return early if basic validation fails
    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
        inventory: {
          requested: quantity,
          available: 0,
          tier,
          cityId
        }
      }
    }

    // Inventory validation
    const inventoryValidation = await validateInventoryForCheckout(cityId, tier, quantity)

    const result: CheckoutValidationResult = {
      valid: inventoryValidation.valid,
      errors,
      warnings,
      inventory: {
        requested: quantity,
        available: inventoryValidation.available,
        tier,
        cityId
      }
    }

    if (!inventoryValidation.valid) {
      errors.push(inventoryValidation.error || 'Insufficient inventory available')

      // Add suggestions if requested
      if (includeSuggestions) {
        result.suggestions = await generateSuggestions(cityId, tier, quantity)
      }
    }

    // Warnings for low inventory
    if (inventoryValidation.valid && inventoryValidation.available <= 5) {
      warnings.push(`Only ${inventoryValidation.available} ${tier.toUpperCase()} tickets remaining!`)
    }

    // Strict validation checks
    if (strictValidation) {
      await performStrictValidation(citySelection, errors, warnings)
    }

    result.errors = errors
    result.warnings = warnings
    result.valid = errors.length === 0

    return result

  } catch (error) {
    console.error('Error validating checkout:', error)
    return {
      valid: false,
      errors: ['Validation service temporarily unavailable'],
      warnings,
      inventory: {
        requested: citySelection.quantity,
        available: 0,
        tier: citySelection.ticketType.toLowerCase() as 'ga' | 'vip',
        cityId: citySelection.cityId
      }
    }
  }
}

/**
 * Validate multiple checkout items (for bulk purchases)
 */
export async function validateBulkCheckout(
  selections: CitySelection[],
  options: CheckoutValidationOptions = {}
): Promise<{
  valid: boolean
  results: CheckoutValidationResult[]
  summary: {
    totalValid: number
    totalInvalid: number
    totalErrors: number
    totalWarnings: number
  }
}> {
  const results: CheckoutValidationResult[] = []

  for (const selection of selections) {
    const result = await validateCheckout(selection, options)
    results.push(result)
  }

  const summary = {
    totalValid: results.filter(r => r.valid).length,
    totalInvalid: results.filter(r => !r.valid).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
  }

  return {
    valid: summary.totalInvalid === 0,
    results,
    summary
  }
}

/**
 * Quick availability check without full validation
 */
export async function quickAvailabilityCheck(
  cityId: string,
  tier: 'ga' | 'vip',
  quantity: number = 1
): Promise<{
  available: boolean
  spots: number
  message: string
}> {
  try {
    const available = await getPublicAvailableSpots(cityId, tier)

    return {
      available: available >= quantity,
      spots: available,
      message: available >= quantity
        ? `${available} ${tier.toUpperCase()} tickets available`
        : `Only ${available} ${tier.toUpperCase()} tickets available (${quantity} requested)`
    }
  } catch (error) {
    console.error('Error in quick availability check:', error)
    return {
      available: false,
      spots: 0,
      message: 'Unable to check availability'
    }
  }
}

/**
 * Generate alternative suggestions when inventory is insufficient
 */
async function generateSuggestions(
  cityId: string,
  tier: 'ga' | 'vip',
  quantity: number
): Promise<{
  alternativeTiers?: { tier: 'ga' | 'vip'; available: number }[]
  alternativeCities?: { cityId: string; available: number }[]
}> {
  const suggestions: any = {}

  try {
    // Check alternative tier in same city
    const alternateTier = tier === 'ga' ? 'vip' : 'ga'
    const alternateAvailable = await getPublicAvailableSpots(cityId, alternateTier)

    if (alternateAvailable >= quantity) {
      suggestions.alternativeTiers = [{
        tier: alternateTier,
        available: alternateAvailable
      }]
    }

    // Check same tier in other cities (simplified - would need city list)
    const alternativeCities = [
      'dallas-jan-2026',
      'atlanta-feb-2026',
      'la-mar-2026',
      'sf-apr-2026',
      'chicago-may-2026',
      'nyc-jun-2026'
    ].filter(id => id !== cityId)

    const cityAlternatives = []
    for (const altCityId of alternativeCities.slice(0, 3)) { // Check top 3 alternatives
      try {
        const available = await getPublicAvailableSpots(altCityId, tier)
        if (available >= quantity) {
          cityAlternatives.push({
            cityId: altCityId,
            available
          })
        }
      } catch (error) {
        // Skip this city if error
        continue
      }
    }

    if (cityAlternatives.length > 0) {
      suggestions.alternativeCities = cityAlternatives
    }

  } catch (error) {
    console.error('Error generating suggestions:', error)
  }

  return suggestions
}

/**
 * Perform strict validation checks
 */
async function performStrictValidation(
  citySelection: CitySelection,
  errors: string[],
  warnings: string[]
): Promise<void> {
  // Check for suspicious patterns
  if (citySelection.quantity > 5) {
    warnings.push('Large quantity order detected - may require additional verification')
  }

  // Rate limiting could be checked here
  // Business rule validation
  // Fraud detection
  // etc.
}

/**
 * Pre-checkout inventory reservation (for holding inventory during checkout)
 */
export async function reserveInventory(
  cityId: string,
  tier: 'ga' | 'vip',
  quantity: number,
  reservationId: string,
  timeoutMinutes: number = 10
): Promise<{
  success: boolean
  reservationId: string
  expiresAt: Date
  error?: string
}> {
  // This would implement temporary inventory holds during checkout process
  // to prevent race conditions between validation and payment completion

  try {
    // Validate availability first
    const validation = await validateInventoryForCheckout(cityId, tier, quantity)
    if (!validation.valid) {
      return {
        success: false,
        reservationId,
        expiresAt: new Date(),
        error: validation.error
      }
    }

    // In a real implementation, this would:
    // 1. Create a temporary reservation record
    // 2. Reduce available inventory by reserved amount
    // 3. Set expiration timer
    // 4. Clean up expired reservations

    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000)

    console.log('inventory_reserved', {
      cityId,
      tier,
      quantity,
      reservationId,
      expiresAt: expiresAt.toISOString()
    }, 'inventory', 'low')

    return {
      success: true,
      reservationId,
      expiresAt
    }

  } catch (error) {
    console.error('Error reserving inventory:', error)
    return {
      success: false,
      reservationId,
      expiresAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Release inventory reservation
 */
export async function releaseInventoryReservation(
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, this would:
    // 1. Find the reservation record
    // 2. Add the reserved quantity back to available inventory
    // 3. Delete the reservation record

    console.log('inventory_reservation_released', {
      reservationId,
      timestamp: new Date().toISOString()
    }, 'inventory', 'low')

    return { success: true }

  } catch (error) {
    console.error('Error releasing inventory reservation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}