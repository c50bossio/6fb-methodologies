'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { WorkbookSession, WorkbookRole } from '@/lib/workbook-auth';

// Authentication context
interface WorkbookAuthContextType {
  session: WorkbookSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessVIPContent: boolean;
  canRecordAudio: boolean;
  canTranscribeAudio: boolean;
}

const WorkbookAuthContext = createContext<WorkbookAuthContextType | undefined>(
  undefined
);

// Authentication provider component
interface WorkbookAuthProviderProps {
  children: ReactNode;
}

export function WorkbookAuthProvider({ children }: WorkbookAuthProviderProps) {
  const [session, setSession] = useState<WorkbookSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const verificationRef = useRef<Promise<void> | null>(null);
  const hasInitialized = useRef(false);
  const lastVerificationTime = useRef<number>(0);
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Client-side mounting check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verify current authentication status with proper debouncing and rate limiting
  const verifyAuthentication = useCallback(async () => {
    // Rate limiting: Don't verify more than once every 2 seconds, but allow initial loads
    const now = Date.now();
    const timeSinceLastVerification = now - lastVerificationTime.current;
    const isInitialLoad = lastVerificationTime.current === 0;

    console.log('🔍 Auth verification called:', {
      isInitialLoad,
      timeSinceLastVerification,
      isLoading,
    });

    if (!isInitialLoad && timeSinceLastVerification < 2000) {
      console.log(
        '⏱️ Auth verification rate limited - ensuring isLoading is false'
      );
      setIsLoading(false);
      return;
    }

    // If already verifying, return the existing promise
    if (verificationRef.current) {
      return verificationRef.current;
    }

    // Update last verification time
    lastVerificationTime.current = now;

    // Create new verification promise
    verificationRef.current = (async () => {
      try {
        console.log('🚀 Starting auth verification...');
        setIsVerifying(true);

        const response = await fetch('/api/workbook/auth/verify', {
          method: 'GET',
          credentials: 'include',
        });

        console.log('📡 Auth verification response:', response.status);

        if (response.ok) {
          const data = await response.json();
          setSession(data.user);
          console.log(
            `✅ Auth verification successful for: ${data.user?.email}`
          );
        } else if (response.status === 401) {
          // 401 is expected when not authenticated - don't log as error
          setSession(null);
          console.log(
            'ℹ️ Auth verification: Not authenticated (401 - expected)'
          );
        } else {
          // Other errors should be logged
          console.warn(
            `❌ Auth verification failed with status ${response.status}`
          );
          setSession(null);
        }
      } catch (error) {
        // Only log network errors, not expected auth failures
        console.error('❌ Auth verification network error:', error);
        setSession(null);
      } finally {
        console.log(
          '🏁 Auth verification complete - setting isLoading to false'
        );
        setIsLoading(false);
        setIsVerifying(false);
        verificationRef.current = null;
      }
    })();

    return verificationRef.current;
  }, []);

  // Initialize authentication state only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      console.log(
        '🎯 Initializing WorkbookAuthProvider - calling verifyAuthentication'
      );

      // Always call verification immediately, without delays
      verifyAuthentication().catch(error => {
        console.error(
          '❌ Auth verification failed during initialization:',
          error
        );
        // Ensure isLoading is set to false even on error
        setIsLoading(false);
      });
    }
  }, []);

  // Fallback timeout to ensure inputs are never permanently disabled
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log(
        '🔄 Fallback timeout: Forcing isLoading to false after 5 seconds'
      );
      setIsLoading(false);
    }, 5000); // 5 seconds maximum wait time

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Cleanup on component unmount (including Fast Refresh)
  useEffect(() => {
    return () => {
      // Cancel any pending verification on unmount
      if (verificationRef.current) {
        verificationRef.current = null;
      }
      // Clear any pending timeout
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
    };
  }, []);

  // Login function
  const login = useCallback(
    async (email: string, password?: string) => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/workbook/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Set session directly from login response data (more reliable than verification)
          if (data.user) {
            setSession({
              userId: data.user.userId || `user_${Date.now()}`,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              permissions: data.user.permissions,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
            });
            console.log(`✅ Session set for user: ${data.user.email}`);
          }
          return { success: true };
        } else {
          return {
            success: false,
            error: data.error || data.message || 'Login failed',
          };
        }
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: 'Network error during login',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [verifyAuthentication]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch('/api/workbook/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setSession(null);
    }
  }, []);

  // Refresh authentication token
  const refreshToken = async () => {
    try {
      const response = await fetch('/api/workbook/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await verifyAuthentication();
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      setSession(null);
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    return session?.permissions.includes(permission) || false;
  };

  // Computed permission checks
  const canAccessVIPContent = hasPermission('access_vip_content');
  const canRecordAudio = hasPermission('record_audio');
  const canTranscribeAudio = hasPermission('transcribe_audio');

  // Auto-refresh token before expiration
  useEffect(() => {
    if (session && session.exp) {
      const timeUntilExpiry = session.exp * 1000 - Date.now();
      const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000); // 5 minutes before expiry

      if (refreshTime > 0) {
        const timer = setTimeout(() => {
          refreshToken();
        }, refreshTime);

        return () => clearTimeout(timer);
      }
    }
  }, [session]);

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
    canTranscribeAudio,
  };

  return (
    <WorkbookAuthContext.Provider value={contextValue}>
      {children}
    </WorkbookAuthContext.Provider>
  );
}

// Hook to use authentication context
export function useWorkbookAuth() {
  const context = useContext(WorkbookAuthContext);
  if (context === undefined) {
    throw new Error(
      'useWorkbookAuth must be used within a WorkbookAuthProvider'
    );
  }
  return context;
}

// Role-based access control component
interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: WorkbookRole;
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: RoleGuardProps) {
  const { session, hasPermission } = useWorkbookAuth();

  // Check role requirement
  if (requiredRole && session?.role !== requiredRole) {
    const roleHierarchy: Record<WorkbookRole, number> = {
      [WorkbookRole.BASIC]: 1,
      [WorkbookRole.PREMIUM]: 2,
      [WorkbookRole.VIP]: 3,
    };

    const userLevel = session ? roleHierarchy[session.role] || 0 : 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return <>{fallback || null}</>;
    }
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// Authentication guard component
interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useWorkbookAuth();

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-tomb45-green'></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}
