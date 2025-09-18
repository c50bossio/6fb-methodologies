// Member discount usage tracking utilities
// Ensures 6FB members can only use their 20% discount once

// For now, using in-memory storage like the inventory system
// TODO: Replace with actual database queries when database is configured

export interface MemberDiscountUsage {
  id: string
  email: string
  customerId?: string
  sessionId: string
  paymentIntentId?: string
  cityId: string
  ticketType: 'ga' | 'vip'
  quantity: number
  discountAmountCents: number
  originalAmountCents: number
  finalAmountCents: number
  usedAt: string
  metadata?: Record<string, any>
}

export interface DiscountUsageCheck {
  hasUsedDiscount: boolean
  usageRecord?: MemberDiscountUsage
}

// In-memory storage for discount usage tracking
// TODO: Replace with actual database when configured
class DiscountUsageStore {
  private usage = new Map<string, MemberDiscountUsage>()

  hasUsed(email: string): boolean {
    return this.usage.has(email.toLowerCase().trim())
  }

  getUsage(email: string): MemberDiscountUsage | undefined {
    return this.usage.get(email.toLowerCase().trim())
  }

  recordUsage(record: MemberDiscountUsage): void {
    this.usage.set(record.email.toLowerCase().trim(), record)
  }

  removeUsage(email: string): boolean {
    return this.usage.delete(email.toLowerCase().trim())
  }

  getAllUsage(): MemberDiscountUsage[] {
    return Array.from(this.usage.values())
  }

  getStats(): { totalCount: number; totalDiscountGiven: number } {
    const records = this.getAllUsage()
    return {
      totalCount: records.length,
      totalDiscountGiven: records.reduce((sum, record) => sum + record.discountAmountCents, 0)
    }
  }
}

const discountUsageStore = new DiscountUsageStore()

/**
 * Check if a member has already used their one-time discount
 */
export async function checkMemberDiscountUsage(email: string): Promise<DiscountUsageCheck> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const hasUsed = discountUsageStore.hasUsed(normalizedEmail)

    if (hasUsed) {
      return {
        hasUsedDiscount: true,
        usageRecord: discountUsageStore.getUsage(normalizedEmail)
      }
    }

    return { hasUsedDiscount: false }

  } catch (error) {
    console.error('Error checking member discount usage:', error)
    // On error, default to assuming discount has been used for safety
    return { hasUsedDiscount: true }
  }
}

/**
 * Record that a member has used their one-time discount
 */
export async function recordMemberDiscountUsage(data: {
  email: string
  customerId?: string
  sessionId: string
  paymentIntentId?: string
  cityId: string
  ticketType: 'ga' | 'vip'
  quantity: number
  discountAmountCents: number
  originalAmountCents: number
  finalAmountCents: number
  metadata?: Record<string, any>
}): Promise<{ success: boolean; error?: string; usageId?: string }> {
  try {
    const normalizedEmail = data.email.toLowerCase().trim()

    // Check if discount has already been used (prevent duplicate records)
    const existingUsage = await checkMemberDiscountUsage(normalizedEmail)
    if (existingUsage.hasUsedDiscount) {
      return {
        success: false,
        error: 'Member has already used their one-time discount'
      }
    }

    // Create new usage record
    const usageRecord: MemberDiscountUsage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: normalizedEmail,
      customerId: data.customerId,
      sessionId: data.sessionId,
      paymentIntentId: data.paymentIntentId,
      cityId: data.cityId,
      ticketType: data.ticketType,
      quantity: data.quantity,
      discountAmountCents: data.discountAmountCents,
      originalAmountCents: data.originalAmountCents,
      finalAmountCents: data.finalAmountCents,
      usedAt: new Date().toISOString(),
      metadata: data.metadata
    }

    discountUsageStore.recordUsage(usageRecord)

    console.log('Member discount usage recorded:', {
      email: normalizedEmail,
      sessionId: data.sessionId,
      discountAmount: data.discountAmountCents / 100,
      cityId: data.cityId
    })

    return {
      success: true,
      usageId: usageRecord.id
    }

  } catch (error) {
    console.error('Error recording member discount usage:', error)
    return {
      success: false,
      error: 'Error recording discount usage'
    }
  }
}

/**
 * Get all discount usage records for reporting/admin purposes
 */
export async function getMemberDiscountUsageStats(options: {
  startDate?: string
  endDate?: string
  cityId?: string
  limit?: number
  offset?: number
} = {}): Promise<{
  records: MemberDiscountUsage[]
  totalCount: number
  totalDiscountGiven: number
}> {
  try {
    const { startDate, endDate, cityId, limit = 100, offset = 0 } = options

    let records = discountUsageStore.getAllUsage()

    // Apply filters
    if (startDate) {
      records = records.filter(record => record.usedAt >= startDate)
    }

    if (endDate) {
      records = records.filter(record => record.usedAt <= endDate)
    }

    if (cityId) {
      records = records.filter(record => record.cityId === cityId)
    }

    // Sort by date (newest first)
    records.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())

    // Apply pagination
    const totalCount = records.length
    const paginatedRecords = records.slice(offset, offset + limit)
    const totalDiscountGiven = records.reduce((sum, record) => sum + record.discountAmountCents, 0)

    return {
      records: paginatedRecords,
      totalCount,
      totalDiscountGiven
    }

  } catch (error) {
    console.error('Error getting member discount usage stats:', error)
    return {
      records: [],
      totalCount: 0,
      totalDiscountGiven: 0
    }
  }
}

/**
 * Admin function to reset a member's discount usage (for special cases)
 */
export async function resetMemberDiscountUsage(
  email: string,
  adminReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const existingRecord = discountUsageStore.getUsage(normalizedEmail)

    if (existingRecord) {
      const removed = discountUsageStore.removeUsage(normalizedEmail)

      if (removed) {
        console.log(`Admin reset discount usage for ${normalizedEmail}:`, {
          reason: adminReason,
          deletedRecordId: existingRecord.id,
          timestamp: new Date().toISOString()
        })

        return { success: true }
      }
    }

    return {
      success: false,
      error: 'No discount usage record found for this email'
    }

  } catch (error) {
    console.error('Error resetting member discount usage:', error)
    return {
      success: false,
      error: 'Error resetting discount usage'
    }
  }
}

/**
 * Validate that discount can be applied to this member
 */
export async function validateMemberDiscountEligibility(
  email: string,
  ticketType: 'GA' | 'VIP'
): Promise<{
  eligible: boolean
  reason?: string
  usageRecord?: MemberDiscountUsage
}> {
  try {
    // Check if discount has already been used
    const usageCheck = await checkMemberDiscountUsage(email)

    if (usageCheck.hasUsedDiscount) {
      return {
        eligible: false,
        reason: 'Member has already used their one-time 20% discount',
        usageRecord: usageCheck.usageRecord
      }
    }

    // Member discount applies to both GA (20%) and VIP (10%) tickets

    return { eligible: true }

  } catch (error) {
    console.error('Error validating member discount eligibility:', error)
    return {
      eligible: false,
      reason: 'Error validating discount eligibility'
    }
  }
}