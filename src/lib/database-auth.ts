// Database-powered authentication for production
import { sql } from '@vercel/postgres'

export interface WorkbookUser {
  email: string
  password: string
  firstName: string
  lastName: string
  ticketType: string
  stripeSessionId: string
  createdAt: string
  businessType?: string
  yearsExperience?: string
}

export interface StoredWorkbookUser extends WorkbookUser {
  id: number
  updatedAt: string
  lastLogin: string | null
  loginCount: number
  isActive: boolean
}

/**
 * Store workbook user credentials in database
 */
export async function storeWorkbookUser(user: WorkbookUser): Promise<void> {
  try {
    const normalizedEmail = user.email.toLowerCase().trim()

    await sql`
      INSERT INTO workbook_users (
        email, password, first_name, last_name, ticket_type,
        stripe_session_id, business_type, years_experience
      )
      VALUES (
        ${normalizedEmail}, ${user.password}, ${user.firstName}, ${user.lastName},
        ${user.ticketType}, ${user.stripeSessionId}, ${user.businessType || null},
        ${user.yearsExperience || null}
      )
      ON CONFLICT (email)
      DO UPDATE SET
        password = EXCLUDED.password,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        ticket_type = EXCLUDED.ticket_type,
        stripe_session_id = EXCLUDED.stripe_session_id,
        business_type = EXCLUDED.business_type,
        years_experience = EXCLUDED.years_experience,
        updated_at = CURRENT_TIMESTAMP
    `

    console.log(`📝 Stored workbook user in database: ${normalizedEmail}`)
  } catch (error) {
    console.error('Failed to store workbook user:', error)
    throw new Error('Database storage failed')
  }
}

/**
 * Verify workbook password against database
 */
export async function verifyWorkbookPassword(email: string, password: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    const result = await sql`
      SELECT password, is_active
      FROM workbook_users
      WHERE email = ${normalizedEmail}
    `

    if (result.rows.length === 0) {
      console.warn(`🔍 Workbook user not found in database: ${normalizedEmail}`)
      return false
    }

    const user = result.rows[0]

    if (!user.is_active) {
      console.warn(`🚫 Workbook user is deactivated: ${normalizedEmail}`)
      return false
    }

    const isValid = user.password === password.trim()
    console.log(`🔐 Database password verification for ${normalizedEmail}: ${isValid ? 'SUCCESS' : 'FAILED'}`)

    // Update login tracking if successful
    if (isValid) {
      await updateLoginTracking(normalizedEmail)
    }

    return isValid
  } catch (error) {
    console.error('Failed to verify password:', error)
    return false
  }
}

/**
 * Get workbook user by email from database
 */
export async function getWorkbookUser(email: string): Promise<StoredWorkbookUser | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    const result = await sql`
      SELECT * FROM workbook_users
      WHERE email = ${normalizedEmail} AND is_active = true
    `

    if (result.rows.length === 0) {
      return null
    }

    const user = result.rows[0]
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      ticketType: user.ticket_type,
      stripeSessionId: user.stripe_session_id,
      businessType: user.business_type,
      yearsExperience: user.years_experience,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login,
      loginCount: user.login_count,
      isActive: user.is_active
    }
  } catch (error) {
    console.error('Failed to get workbook user:', error)
    return null
  }
}

/**
 * Update login tracking when user successfully logs in
 */
async function updateLoginTracking(email: string): Promise<void> {
  try {
    await sql`
      UPDATE workbook_users
      SET
        last_login = CURRENT_TIMESTAMP,
        login_count = login_count + 1
      WHERE email = ${email}
    `
  } catch (error) {
    console.error('Failed to update login tracking:', error)
    // Don't throw error - login should still succeed
  }
}

/**
 * Audit log for security tracking
 */
export async function logUserAction(
  email: string | null,
  action: string,
  ipAddress: string,
  userAgent: string,
  success: boolean = true,
  errorMessage?: string,
  metadata?: any
): Promise<void> {
  try {
    // Get user ID if email provided
    let userId = null
    if (email) {
      const user = await getWorkbookUser(email)
      userId = user?.id || null
    }

    await sql`
      INSERT INTO audit_log (
        user_id, action, ip_address, user_agent, success, error_message, metadata
      )
      VALUES (
        ${userId}, ${action}, ${ipAddress}, ${userAgent}, ${success},
        ${errorMessage || null}, ${JSON.stringify(metadata || {})}
      )
    `
  } catch (error) {
    console.error('Failed to log user action:', error)
    // Don't throw error - main operation should still succeed
  }
}

/**
 * Get user statistics for dashboard
 */
export async function getUserStats(email: string): Promise<any> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    const result = await sql`
      SELECT
        u.first_name,
        u.last_name,
        u.ticket_type,
        u.created_at,
        u.last_login,
        u.login_count,
        COUNT(DISTINCT a.id) as total_audio_sessions,
        COUNT(DISTINCT n.id) as total_notes,
        SUM(a.audio_duration) as total_audio_duration,
        SUM(api.cost_usd) as total_api_cost
      FROM workbook_users u
      LEFT JOIN audio_sessions a ON u.id = a.user_id
      LEFT JOIN session_notes n ON u.id = n.user_id
      LEFT JOIN api_usage api ON u.id = api.user_id
      WHERE u.email = ${normalizedEmail} AND u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name, u.ticket_type, u.created_at, u.last_login, u.login_count
    `

    return result.rows[0] || null
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return null
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    await sql`SELECT 1 as health_check`
    return { healthy: true }
  } catch (error) {
    console.error('Database health check failed:', error)
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

/**
 * Initialize database tables (for first-time setup)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if tables exist
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'workbook_users'
    `

    if (result.rows.length === 0) {
      console.log('🔧 Database tables not found. Please run the database schema script.')
      console.log('Run: psql your_database < scripts/upgrade-to-database.sql')
      throw new Error('Database tables not initialized')
    }

    console.log('✅ Database tables verified')
  } catch (error) {
    console.error('Database initialization check failed:', error)
    throw error
  }
}