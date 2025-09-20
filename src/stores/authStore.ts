/**
 * Authentication Store - Zustand store for user authentication state
 * Manages login, logout, token refresh, and user session persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  subscriptionTier: 'free' | 'basic' | 'premium' | 'enterprise';
  avatar?: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    autoSave: boolean;
    defaultView: 'grid' | 'list';
  };
}

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
  sessionTimeout: number; // in minutes

  // Actions
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLastActivity: () => void;
  checkSession: () => boolean;
  clearError: () => void;

  // Utilities
  hasPermission: (permission: string) => boolean;
  isSubscriptionActive: () => boolean;
  getTimeUntilExpiry: () => number;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
        sessionTimeout: 120, // 2 hours

        // Actions
        login: async credentials => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/workbook/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(credentials),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Login failed');
            }

            const data = await response.json();

            set({
              user: data.user,
              token: data.token,
              refreshToken: data.refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              lastActivity: Date.now(),
            });

            // Set up automatic token refresh
            const { refreshTokens } = get();
            const tokenExpiry =
              JSON.parse(atob(data.token.split('.')[1])).exp * 1000;
            const refreshTime = tokenExpiry - Date.now() - 5 * 60 * 1000; // 5 minutes before expiry

            if (refreshTime > 0) {
              setTimeout(() => {
                refreshTokens();
              }, refreshTime);
            }
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Login failed',
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
            });
            throw error;
          }
        },

        logout: () => {
          // Call logout API
          fetch('/api/workbook/auth/logout', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${get().token}`,
            },
          }).catch(console.error);

          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
            lastActivity: Date.now(),
          });
        },

        refreshTokens: async () => {
          const { refreshToken } = get();

          if (!refreshToken) {
            get().logout();
            return;
          }

          try {
            const response = await fetch('/api/workbook/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            const data = await response.json();

            set({
              token: data.token,
              refreshToken: data.refreshToken,
              lastActivity: Date.now(),
            });

            // Schedule next refresh
            const tokenExpiry =
              JSON.parse(atob(data.token.split('.')[1])).exp * 1000;
            const refreshTime = tokenExpiry - Date.now() - 5 * 60 * 1000;

            if (refreshTime > 0) {
              setTimeout(() => {
                get().refreshTokens();
              }, refreshTime);
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
            get().logout();
          }
        },

        updateUser: updates => {
          const { user } = get();
          if (user) {
            set({
              user: { ...user, ...updates },
              lastActivity: Date.now(),
            });
          }
        },

        setLoading: loading => {
          set({ isLoading: loading });
        },

        setError: error => {
          set({ error });
        },

        updateLastActivity: () => {
          set({ lastActivity: Date.now() });
        },

        checkSession: () => {
          const { lastActivity, sessionTimeout, token } = get();
          const now = Date.now();
          const timeSinceActivity = now - lastActivity;
          const sessionTimeoutMs = sessionTimeout * 60 * 1000;

          if (timeSinceActivity > sessionTimeoutMs || !token) {
            get().logout();
            return false;
          }

          return true;
        },

        clearError: () => {
          set({ error: null });
        },

        // Utilities
        hasPermission: permission => {
          const { user } = get();
          if (!user) return false;

          const permissions = {
            'admin.access': ['admin', 'super_admin'].includes(user.role),
            'super_admin.access': user.role === 'super_admin',
            'premium.features': ['premium', 'enterprise'].includes(
              user.subscriptionTier
            ),
            'enterprise.features': user.subscriptionTier === 'enterprise',
            'workbook.create': true, // All authenticated users can create
            'workbook.share': ['basic', 'premium', 'enterprise'].includes(
              user.subscriptionTier
            ),
            'live_sessions.host': ['premium', 'enterprise'].includes(
              user.subscriptionTier
            ),
            'live_sessions.join': true,
            'analytics.view': ['premium', 'enterprise'].includes(
              user.subscriptionTier
            ),
            'export.unlimited': user.subscriptionTier === 'enterprise',
          };

          return permissions[permission as keyof typeof permissions] || false;
        },

        isSubscriptionActive: () => {
          const { user } = get();
          return user ? user.subscriptionTier !== 'free' : false;
        },

        getTimeUntilExpiry: () => {
          const { token } = get();
          if (!token) return 0;

          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            return Math.max(0, expiry - Date.now());
          } catch {
            return 0;
          }
        },
      }),
      {
        name: 'workbook-auth',
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
          lastActivity: state.lastActivity,
          sessionTimeout: state.sessionTimeout,
        }),
        onRehydrateStorage: () => state => {
          if (state && state.isAuthenticated) {
            // Check if session is still valid
            if (!state.checkSession()) {
              state.logout();
            } else {
              // Set up token refresh
              const timeUntilExpiry = state.getTimeUntilExpiry();
              const refreshTime = timeUntilExpiry - 5 * 60 * 1000; // 5 minutes before expiry

              if (refreshTime > 0) {
                setTimeout(() => {
                  state.refreshTokens();
                }, refreshTime);
              }
            }
          }
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
