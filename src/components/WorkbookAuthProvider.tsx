'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { WorkbookSession, WorkbookRole } from '@/lib/workbook-auth'

// Authentication context
interface WorkbookAuthContextType {
  session: WorkbookSession | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  hasPermission: (permission: string) => boolean
  canAccessVIPContent: boolean
  canRecordAudio: boolean
  canTranscribeAudio: boolean
}

const WorkbookAuthContext = createContext<WorkbookAuthContextType | undefined>(undefined)

// Authentication provider component
interface WorkbookAuthProviderProps {
  children: ReactNode
}

export function WorkbookAuthProvider({ children }: WorkbookAuthProviderProps) {
  const [session, setSession] = useState<WorkbookSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize authentication state
  useEffect(() => {
    verifyAuthentication()
  }, [])

  // Verify current authentication status
  const verifyAuthentication = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/workbook/auth/verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated && data.user) {
          setSession({
            userId: data.user.userId,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            permissions: data.user.permissions,
            iat: Math.floor(Date.now() / 1000),
            exp: data.expiresAt
          })
        } else {
          setSession(null)
        }
      } else {
        setSession(null)
      }
    } catch (error) {
      console.error('Authentication verification failed:', error)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Login function
  const login = async (email: string, password?: string) => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/workbook/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Verify authentication after successful login
        await verifyAuthentication()
        return { success: true }
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Login failed'
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Network error during login'
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/workbook/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setSession(null)
    }
  }

  // Refresh authentication token
  const refreshToken = async () => {
    try {
      const response = await fetch('/api/workbook/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        await verifyAuthentication()
      } else {
        setSession(null)
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      setSession(null)
    }
  }

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    return session?.permissions.includes(permission) || false
  }

  // Computed permission checks
  const canAccessVIPContent = hasPermission('access_vip_content')
  const canRecordAudio = hasPermission('record_audio')
  const canTranscribeAudio = hasPermission('transcribe_audio')

  // Auto-refresh token before expiration
  useEffect(() => {
    if (session && session.exp) {
      const timeUntilExpiry = (session.exp * 1000) - Date.now()
      const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000)) // 5 minutes before expiry

      if (refreshTime > 0) {
        const timer = setTimeout(() => {
          refreshToken()
        }, refreshTime)

        return () => clearTimeout(timer)
      }
    }
  }, [session])

  const contextValue: WorkbookAuthContextType = {
    session,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    refreshToken,
    hasPermission,
    canAccessVIPContent,
    canRecordAudio,
    canTranscribeAudio
  }

  return (
    <WorkbookAuthContext.Provider value={contextValue}>
      {children}
    </WorkbookAuthContext.Provider>
  )
}

// Hook to use authentication context
export function useWorkbookAuth() {
  const context = useContext(WorkbookAuthContext)
  if (context === undefined) {
    throw new Error('useWorkbookAuth must be used within a WorkbookAuthProvider')
  }
  return context
}

// Role-based access control component
interface RoleGuardProps {
  children: ReactNode
  requiredRole?: WorkbookRole
  requiredPermission?: string
  fallback?: ReactNode
}

export function RoleGuard({
  children,
  requiredRole,
  requiredPermission,
  fallback
}: RoleGuardProps) {
  const { session, hasPermission } = useWorkbookAuth()

  // Check role requirement
  if (requiredRole && session?.role !== requiredRole) {
    const roleHierarchy: Record<WorkbookRole, number> = {
      [WorkbookRole.BASIC]: 1,
      [WorkbookRole.PREMIUM]: 2,
      [WorkbookRole.VIP]: 3
    }

    const userLevel = session ? roleHierarchy[session.role] || 0 : 0
    const requiredLevel = roleHierarchy[requiredRole] || 0

    if (userLevel < requiredLevel) {
      return <>{fallback || null}</>
    }
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback || null}</>
  }

  return <>{children}</>
}

// Authentication guard component
interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useWorkbookAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tomb45-green"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <>{fallback || null}</>
  }

  return <>{children}</>
}