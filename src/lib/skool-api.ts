// Skool API Client for Member Management
// This service handles communication with Skool's API to fetch existing members

import { addVerifiedSkoolMember, type SkoolMember } from './skool-members'

export interface SkoolAPIConfig {
  apiKey: string
  groupUrl: string
  baseUrl?: string
}

export interface SkoolAPIMember {
  id: string
  email: string
  firstName: string
  lastName: string
  username?: string
  avatarUrl?: string
  joinedAt: string
  isActive: boolean
  subscriptionStatus: 'active' | 'cancelled' | 'expired'
  lastPaymentDate?: string
  membershipLevel?: string
}

export interface SkoolAPIResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export class SkoolAPIClient {
  private config: SkoolAPIConfig
  private baseHeaders: Record<string, string>

  constructor(config: SkoolAPIConfig) {
    this.config = {
      baseUrl: 'https://www.skool.com/api',
      ...config
    }

    this.baseHeaders = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': '6FB-Methodologies/1.0'
    }
  }

  /**
   * Fetch all active members from the Skool community
   */
  async fetchActiveMembers(page = 1, limit = 100): Promise<SkoolAPIResponse<SkoolAPIMember[]>> {
    try {
      console.log(`🔍 Fetching Skool members (page ${page}, limit ${limit})...`)

      // Try the documented API endpoint structure
      const endpoints = [
        `/groups/${this.config.groupUrl}/members`,
        `/api/v1/groups/${this.config.groupUrl}/members`,
        `/communities/${this.config.groupUrl}/members`
      ]

      let lastError: Error | null = null

      for (const endpoint of endpoints) {
        try {
          const url = `${this.config.baseUrl}${endpoint}?page=${page}&limit=${limit}&status=active`

          console.log(`🔗 Trying endpoint: ${url}`)

          const response = await fetch(url, {
            method: 'GET',
            headers: this.baseHeaders
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Successfully fetched from ${endpoint}`)

            return {
              success: true,
              data: this.normalizeMembers(data.members || data.data || data),
              pagination: data.pagination
            }
          } else {
            console.log(`❌ Endpoint ${endpoint} failed: ${response.status} ${response.statusText}`)
            const errorText = await response.text()
            console.log(`Error details: ${errorText}`)
          }

        } catch (error) {
          lastError = error as Error
          console.log(`❌ Error with endpoint ${endpoint}:`, error)
          continue
        }
      }

      // If all endpoints fail, return error
      return {
        success: false,
        error: `All API endpoints failed. Last error: ${lastError?.message}`
      }

    } catch (error) {
      console.error('❌ Skool API error:', error)
      return {
        success: false,
        error: `API request failed: ${(error as Error).message}`
      }
    }
  }

  /**
   * Fetch a specific member by email
   */
  async fetchMemberByEmail(email: string): Promise<SkoolAPIResponse<SkoolAPIMember>> {
    try {
      console.log(`🔍 Searching for member: ${email}`)

      const endpoints = [
        `/groups/${this.config.groupUrl}/members/search?email=${encodeURIComponent(email)}`,
        `/api/v1/groups/${this.config.groupUrl}/members/${encodeURIComponent(email)}`,
        `/communities/${this.config.groupUrl}/members/search?q=${encodeURIComponent(email)}`
      ]

      for (const endpoint of endpoints) {
        try {
          const url = `${this.config.baseUrl}${endpoint}`

          const response = await fetch(url, {
            method: 'GET',
            headers: this.baseHeaders
          })

          if (response.ok) {
            const data = await response.json()
            const member = data.member || data.data || data

            if (member) {
              return {
                success: true,
                data: this.normalizeMember(member)
              }
            }
          }

        } catch (error) {
          console.log(`❌ Error searching member in ${endpoint}:`, error)
          continue
        }
      }

      return {
        success: false,
        error: 'Member not found in Skool community'
      }

    } catch (error) {
      console.error('❌ Skool member search error:', error)
      return {
        success: false,
        error: `Member search failed: ${(error as Error).message}`
      }
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<SkoolAPIResponse<{ groupInfo: any }>> {
    try {
      console.log('🧪 Testing Skool API connection...')

      const endpoints = [
        `/groups/${this.config.groupUrl}`,
        `/api/v1/groups/${this.config.groupUrl}`,
        `/communities/${this.config.groupUrl}`
      ]

      for (const endpoint of endpoints) {
        try {
          const url = `${this.config.baseUrl}${endpoint}`

          const response = await fetch(url, {
            method: 'GET',
            headers: this.baseHeaders
          })

          if (response.ok) {
            const data = await response.json()
            console.log('✅ Skool API connection successful')

            return {
              success: true,
              data: { groupInfo: data }
            }
          } else {
            console.log(`❌ Endpoint ${endpoint} failed: ${response.status}`)
          }

        } catch (error) {
          console.log(`❌ Error testing ${endpoint}:`, error)
          continue
        }
      }

      return {
        success: false,
        error: 'Unable to connect to Skool API with provided credentials'
      }

    } catch (error) {
      console.error('❌ Skool API connection test failed:', error)
      return {
        success: false,
        error: `Connection test failed: ${(error as Error).message}`
      }
    }
  }

  /**
   * Sync all active members to local storage
   */
  async syncAllActiveMembers(): Promise<{
    success: boolean
    imported: number
    skipped: number
    errors: string[]
  }> {
    const result = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    try {
      console.log('🔄 Starting bulk sync of Skool members...')

      let page = 1
      let hasMore = true
      const limit = 50 // Reasonable page size

      while (hasMore) {
        const response = await this.fetchActiveMembers(page, limit)

        if (!response.success || !response.data) {
          result.errors.push(`Failed to fetch page ${page}: ${response.error}`)
          break
        }

        const members = response.data
        console.log(`📄 Processing page ${page}: ${members.length} members`)

        for (const apiMember of members) {
          try {
            if (apiMember.isActive && apiMember.subscriptionStatus === 'active') {
              const skoolMember: SkoolMember = {
                email: apiMember.email.toLowerCase().trim(),
                firstName: apiMember.firstName,
                lastName: apiMember.lastName,
                transactionId: `skool_sync_${apiMember.id}`,
                subscriptionDate: apiMember.joinedAt.split('T')[0],
                verifiedAt: new Date().toISOString(),
                isActive: true
              }

              addVerifiedSkoolMember(skoolMember)
              result.imported++
            } else {
              result.skipped++
            }

          } catch (error) {
            result.errors.push(`Failed to import ${apiMember.email}: ${(error as Error).message}`)
          }
        }

        // Check pagination
        hasMore = response.pagination?.hasMore ?? false
        page++

        // Safety break for large communities
        if (page > 100) {
          result.errors.push('Stopped sync at page 100 for safety')
          break
        }
      }

      result.success = result.errors.length === 0
      console.log(`✅ Bulk sync completed: ${result.imported} imported, ${result.skipped} skipped`)

      return result

    } catch (error) {
      result.errors.push(`Sync failed: ${(error as Error).message}`)
      console.error('❌ Bulk sync error:', error)
      return result
    }
  }

  /**
   * Normalize API member data to our internal format
   */
  private normalizeMembers(rawMembers: any[]): SkoolAPIMember[] {
    if (!Array.isArray(rawMembers)) {
      console.warn('⚠️ Expected array of members, got:', typeof rawMembers)
      return []
    }

    return rawMembers.map(member => this.normalizeMember(member))
  }

  /**
   * Normalize a single member object
   */
  private normalizeMember(rawMember: any): SkoolAPIMember {
    return {
      id: rawMember.id || rawMember.user_id || rawMember.member_id || 'unknown',
      email: rawMember.email || rawMember.email_address || '',
      firstName: rawMember.firstName || rawMember.first_name || rawMember.name?.split(' ')[0] || 'Unknown',
      lastName: rawMember.lastName || rawMember.last_name || rawMember.name?.split(' ').slice(1).join(' ') || 'Member',
      username: rawMember.username || rawMember.handle,
      avatarUrl: rawMember.avatarUrl || rawMember.avatar_url || rawMember.profile_image,
      joinedAt: rawMember.joinedAt || rawMember.joined_at || rawMember.created_at || new Date().toISOString(),
      isActive: (rawMember.isActive ?? rawMember.is_active ?? (rawMember.status === 'active')) || true,
      subscriptionStatus: rawMember.subscriptionStatus || rawMember.subscription_status || 'active',
      lastPaymentDate: rawMember.lastPaymentDate || rawMember.last_payment_date,
      membershipLevel: rawMember.membershipLevel || rawMember.membership_level || 'basic'
    }
  }
}

/**
 * Create a Skool API client instance with environment configuration
 */
export function createSkoolAPIClient(): SkoolAPIClient | null {
  const apiKey = process.env.SKOOL_API_KEY
  const groupUrl = process.env.SKOOL_GROUP_URL

  if (!apiKey || !groupUrl) {
    console.warn('⚠️ Skool API credentials not found in environment variables')
    return null
  }

  return new SkoolAPIClient({
    apiKey,
    groupUrl
  })
}

/**
 * Helper function to sync existing members
 */
export async function syncExistingSkoolMembers(): Promise<{
  success: boolean
  imported: number
  message: string
}> {
  const client = createSkoolAPIClient()

  if (!client) {
    return {
      success: false,
      imported: 0,
      message: 'Skool API not configured. Check SKOOL_API_KEY and SKOOL_GROUP_URL environment variables.'
    }
  }

  // Test connection first
  const connectionTest = await client.testConnection()
  if (!connectionTest.success) {
    return {
      success: false,
      imported: 0,
      message: `Failed to connect to Skool API: ${connectionTest.error}`
    }
  }

  // Sync members
  const syncResult = await client.syncAllActiveMembers()

  return {
    success: syncResult.success,
    imported: syncResult.imported,
    message: syncResult.success
      ? `Successfully synced ${syncResult.imported} active Skool members`
      : `Sync completed with errors: ${syncResult.errors.join(', ')}`
  }
}