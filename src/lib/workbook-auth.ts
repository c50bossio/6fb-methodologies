import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { verify6FBMembership, MemberVerificationResult } from './stripe'

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '24h'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

// User roles for workbook access
export enum WorkbookRole {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip'
}

// Session data interface
export interface WorkbookSession {
  userId: string
  email: string
  name: string
  role: WorkbookRole
  stripeCustomerId?: string
  workshopTickets?: string[]
  permissions: string[]
  iat: number
  exp: number
}

// Type alias for compatibility with audio recording system
export type UserSession = WorkbookSession

// Authentication result interface
export interface AuthResult {
  success: boolean
  session?: WorkbookSession
  token?: string
  refreshToken?: string
  error?: string
  message?: string
}

// Workshop access permissions
export const WORKBOOK_PERMISSIONS = {
  VIEW_CONTENT: 'view_content',
  RECORD_AUDIO: 'record_audio',
  TRANSCRIBE_AUDIO: 'transcribe_audio',
  SAVE_PROGRESS: 'save_progress',
  EXPORT_NOTES: 'export_notes',
  ACCESS_VIP_CONTENT: 'access_vip_content'
} as const

// Map user roles to permissions
function getRolePermissions(role: WorkbookRole): string[] {
  const basePermissions = [
    WORKBOOK_PERMISSIONS.VIEW_CONTENT,
    WORKBOOK_PERMISSIONS.SAVE_PROGRESS
  ]

  switch (role) {
    case WorkbookRole.VIP:
      return [
        ...basePermissions,
        WORKBOOK_PERMISSIONS.RECORD_AUDIO,
        WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO,
        WORKBOOK_PERMISSIONS.EXPORT_NOTES,
        WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT
      ]
    case WorkbookRole.PREMIUM:
      return [
        ...basePermissions,
        WORKBOOK_PERMISSIONS.RECORD_AUDIO,
        WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO,
        WORKBOOK_PERMISSIONS.EXPORT_NOTES
      ]
    case WorkbookRole.BASIC:
    default:
      return basePermissions
  }
}

// Determine user role based on Stripe membership
function determineUserRole(memberInfo: MemberVerificationResult): WorkbookRole {
  if (!memberInfo.isVerified || !memberInfo.member) {
    return WorkbookRole.BASIC
  }

  const membershipType = memberInfo.member.membershipType.toLowerCase()

  if (membershipType === 'vip') {
    return WorkbookRole.VIP
  } else if (membershipType === 'premium' || membershipType === 'pro') {
    return WorkbookRole.PREMIUM
  }

  return WorkbookRole.BASIC
}

// Generate JWT token
export function generateToken(payload: Omit<WorkbookSession, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: '6fb-methodologies',
    audience: 'workbook-users'
  })
}

// Generate refresh token
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: '6fb-methodologies'
  })
}

// Verify JWT token
export function verifyToken(token: string): WorkbookSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: '6fb-methodologies',
      audience: 'workbook-users'
    }) as WorkbookSession

    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: '6fb-methodologies'
    }) as any

    if (decoded.type !== 'refresh') {
      return null
    }

    return { userId: decoded.userId }
  } catch (error) {
    console.error('Refresh token verification failed:', error)
    return null
  }
}

// Extract token from request headers
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Also check cookies as fallback
  const tokenCookie = request.cookies.get('workbook-token')
  return tokenCookie?.value || null
}

// Authenticate user with email/password or session verification
export async function authenticateUser(
  email: string,
  options: {
    verifyMembership?: boolean
    customerId?: string
    password?: string
  } = {}
): Promise<AuthResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    // If password is provided, verify it against stored workbook users
    if (options.password) {
      const passwordValid = await verifyWorkbookPassword(normalizedEmail, options.password)
      if (!passwordValid) {
        return {
          success: false,
          error: 'invalid_credentials',
          message: 'Invalid email or access code'
        }
      }
    }

    // Verify 6FB membership via Stripe
    let memberInfo: MemberVerificationResult = { isVerified: false }

    if (options.verifyMembership !== false) {
      memberInfo = await verify6FBMembership(normalizedEmail)
    }

    // Determine user role
    const role = determineUserRole(memberInfo)
    const permissions = getRolePermissions(role)

    // Create session payload
    const sessionPayload = {
      userId: options.customerId || memberInfo.member?.customerId || `user_${Date.now()}`,
      email: normalizedEmail,
      name: memberInfo.member?.name || 'Workshop Participant',
      role,
      stripeCustomerId: memberInfo.member?.customerId,
      permissions
    }

    // Generate tokens
    const token = generateToken(sessionPayload)
    const refreshToken = generateRefreshToken(sessionPayload.userId)

    return {
      success: true,
      session: {
        ...sessionPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      token,
      refreshToken,
      message: `Authenticated as ${role} user`
    }

  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      message: 'Unable to verify credentials'
    }
  }
}

// Refresh authentication token
export async function refreshAuthToken(refreshToken: string): Promise<AuthResult> {
  try {
    const decoded = verifyRefreshToken(refreshToken)

    if (!decoded) {
      return {
        success: false,
        error: 'Invalid refresh token'
      }
    }

    // Re-authenticate user (simplified - in production you'd fetch from database)
    // For now, we'll create a basic session
    const sessionPayload = {
      userId: decoded.userId,
      email: 'refreshed_user@example.com', // In production, fetch from database
      name: 'Workshop Participant',
      role: WorkbookRole.BASIC,
      permissions: getRolePermissions(WorkbookRole.BASIC)
    }

    const newToken = generateToken(sessionPayload)
    const newRefreshToken = generateRefreshToken(decoded.userId)

    return {
      success: true,
      session: {
        ...sessionPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      },
      token: newToken,
      refreshToken: newRefreshToken
    }

  } catch (error) {
    console.error('Token refresh error:', error)
    return {
      success: false,
      error: 'Token refresh failed'
    }
  }
}

// Validate user has specific permission
export function hasPermission(session: WorkbookSession, permission: string): boolean {
  return session.permissions.includes(permission)
}

// Check if user can access VIP content
export function canAccessVIPContent(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT)
}

// Check if user can record audio
export function canRecordAudio(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.RECORD_AUDIO)
}

// Check if user can transcribe audio
export function canTranscribeAudio(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO)
}

// Rate limiting configuration per user role
export const RATE_LIMITS = {
  [WorkbookRole.BASIC]: {
    audioRecordings: { limit: 5, window: 3600 }, // 5 per hour
    transcriptions: { limit: 10, window: 3600 }, // 10 per hour
    apiCalls: { limit: 100, window: 3600 } // 100 per hour
  },
  [WorkbookRole.PREMIUM]: {
    audioRecordings: { limit: 20, window: 3600 }, // 20 per hour
    transcriptions: { limit: 50, window: 3600 }, // 50 per hour
    apiCalls: { limit: 500, window: 3600 } // 500 per hour
  },
  [WorkbookRole.VIP]: {
    audioRecordings: { limit: 100, window: 3600 }, // 100 per hour
    transcriptions: { limit: 200, window: 3600 }, // 200 per hour
    apiCalls: { limit: 1000, window: 3600 } // 1000 per hour
  }
} as const

// Get rate limits for user role
export function getRateLimits(role: WorkbookRole) {
  return RATE_LIMITS[role]
}

// Session validation middleware function
export function validateSession(session: WorkbookSession | null): {
  isValid: boolean
  error?: string
} {
  if (!session) {
    return { isValid: false, error: 'No session provided' }
  }

  // Check if session is expired
  const now = Math.floor(Date.now() / 1000)
  if (session.exp < now) {
    return { isValid: false, error: 'Session expired' }
  }

  // Check required fields
  if (!session.userId || !session.email) {
    return { isValid: false, error: 'Invalid session data' }
  }

  return { isValid: true }
}

// Security headers for workbook API responses
export const WORKBOOK_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.openai.com; " +
    "connect-src 'self' https://api.openai.com; " +
    "media-src 'self' blob: data:; " +
    "worker-src 'self' blob:;"
}

// User Progress Management Functions
// Simple localStorage-based progress saving for client-side workbook

/**
 * Save user progress data to localStorage
 */
export function saveUserProgress<T>(userId: string, key: string, data: T): void {
  try {
    const storageKey = `workbook_${userId}_${key}`
    const serializedData = JSON.stringify(data)
    localStorage.setItem(storageKey, serializedData)
  } catch (error) {
    console.error('Failed to save user progress:', error)
    throw new Error('Unable to save progress')
  }
}

/**
 * Load user progress data from localStorage
 */
export function loadUserProgress<T>(userId: string, key: string): T | null {
  try {
    const storageKey = `workbook_${userId}_${key}`
    const serializedData = localStorage.getItem(storageKey)

    if (!serializedData) {
      return null
    }

    return JSON.parse(serializedData) as T
  } catch (error) {
    console.error('Failed to load user progress:', error)
    return null
  }
}

/**
 * Clear all user progress data
 */
export function clearUserProgress(userId: string): void {
  try {
    const keys = Object.keys(localStorage)
    const userKeys = keys.filter(key => key.startsWith(`workbook_${userId}_`))

    userKeys.forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Failed to clear user progress:', error)
  }
}

/**
 * Get all available progress keys for a user
 */
export function getUserProgressKeys(userId: string): string[] {
  try {
    const keys = Object.keys(localStorage)
    const userKeys = keys.filter(key => key.startsWith(`workbook_${userId}_`))

    return userKeys.map(key => key.replace(`workbook_${userId}_`, ''))
  } catch (error) {
    console.error('Failed to get user progress keys:', error)
    return []
  }
}

// Workbook User Management (Simple in-memory storage for MVP)
// TODO: Replace with database storage in production

interface WorkbookUser {
  email: string
  password: string
  firstName: string
  lastName: string
  ticketType: string
  stripeSessionId: string
  createdAt: string
}

// In-memory storage for workbook users (for development)
const workbookUsers = new Map<string, WorkbookUser>()

/**
 * Store workbook user credentials
 */
export function storeWorkbookUser(user: WorkbookUser): void {
  const normalizedEmail = user.email.toLowerCase().trim()
  workbookUsers.set(normalizedEmail, user)
  console.log(`📝 Stored workbook user: ${normalizedEmail}`)
}

/**
 * Verify workbook password against stored credentials
 */
export async function verifyWorkbookPassword(email: string, password: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim()
  const user = workbookUsers.get(normalizedEmail)

  if (!user) {
    console.warn(`🔍 Workbook user not found: ${normalizedEmail}`)
    return false
  }

  const isValid = user.password === password.trim()
  console.log(`🔐 Password verification for ${normalizedEmail}: ${isValid ? 'SUCCESS' : 'FAILED'}`)

  return isValid
}

/**
 * Get workbook user by email
 */
export function getWorkbookUser(email: string): WorkbookUser | null {
  const normalizedEmail = email.toLowerCase().trim()
  return workbookUsers.get(normalizedEmail) || null
}