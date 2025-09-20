/**
 * T016: WorkbookUser Model - Complete TypeScript interfaces and validation
 *
 * This module provides comprehensive user management types with:
 * - Complete TypeScript interfaces for users and subscription tiers
 * - Zod validation schemas for runtime validation
 * - User permission and role management utilities
 * - Integration with authentication system
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const UserRole = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const SubscriptionTier = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
} as const;

export type SubscriptionTierType = typeof SubscriptionTier[keyof typeof SubscriptionTier];

export const SubscriptionStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
} as const;

export type SubscriptionStatusType = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];

// =============================================================================
// User Preferences and Settings
// =============================================================================

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sessionReminders: boolean;
  progressUpdates: boolean;
  liveSessionInvites: boolean;
  newContentAlerts: boolean;
  weeklyDigest: boolean;
}

export interface AudioSettings {
  autoplay: boolean;
  defaultVolume: number; // 0-100
  transcriptionEnabled: boolean;
  enhancedQuality: boolean;
  downloadQuality: 'low' | 'medium' | 'high';
}

export interface InterfaceSettings {
  sidebarCollapsed: boolean;
  showProgressIndicators: boolean;
  compactMode: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: 'ISO' | 'US' | 'EU';
  timeFormat: '12h' | '24h';
}

export interface PrivacySettings {
  profileVisible: boolean;
  progressVisible: boolean;
  allowCollaboration: boolean;
  shareAnalytics: boolean;
  trackingEnabled: boolean;
}

export interface UserPreferences {
  notifications: NotificationSettings;
  audio: AudioSettings;
  interface: InterfaceSettings;
  privacy: PrivacySettings;
}

// =============================================================================
// Subscription and Billing
// =============================================================================

export interface SubscriptionFeatures {
  maxModules: number | 'unlimited';
  maxAudioHours: number | 'unlimited';
  maxNotes: number | 'unlimited';
  maxLiveSessions: number | 'unlimited';
  transcriptionMinutes: number | 'unlimited';
  exportFormats: string[];
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  collaborationTools: boolean;
  liveSessionRecording: boolean;
}

export interface SubscriptionPlan {
  id: UUID;
  tier: SubscriptionTierType;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: SubscriptionFeatures;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserSubscription {
  id: UUID;
  userId: UUID;
  planId: UUID;
  status: SubscriptionStatusType;
  startDate: Timestamp;
  endDate?: Timestamp;
  renewalDate?: Timestamp;
  trialEndsAt?: Timestamp;
  cancelledAt?: Timestamp;
  pausedAt?: Timestamp;
  billingCycle: 'monthly' | 'annual';
  autoRenew: boolean;
  paymentMethodId?: string;
  lastPaymentAt?: Timestamp;
  nextPaymentAt?: Timestamp;
  metadata: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// User Permissions and Roles
// =============================================================================

export interface UserPermissions {
  // Content permissions
  canCreateNotes: boolean;
  canEditNotes: boolean;
  canDeleteNotes: boolean;
  canExportNotes: boolean;
  canShareNotes: boolean;

  // Audio permissions
  canRecordAudio: boolean;
  canTranscribeAudio: boolean;
  canDownloadAudio: boolean;
  canUploadAudio: boolean;

  // Session permissions
  canAccessLiveSessions: boolean;
  canCreateLiveSessions: boolean;
  canModerateSessions: boolean;
  canRecordSessions: boolean;

  // Data permissions
  canExportData: boolean;
  canImportData: boolean;
  canAccessAnalytics: boolean;
  canViewOtherProfiles: boolean;

  // Collaboration permissions
  canCollaborate: boolean;
  canInviteUsers: boolean;
  canManageTeam: boolean;
  canAssignRoles: boolean;

  // Administrative permissions
  canModerate: boolean;
  canAdminister: boolean;
  canManageSubscriptions: boolean;
  canViewSystemLogs: boolean;
  canManageIntegrations: boolean;
}

export interface RoleDefinition {
  role: UserRoleType;
  name: string;
  description: string;
  permissions: UserPermissions;
  hierarchy: number; // Higher numbers have more authority
}

// =============================================================================
// Main User Interface
// =============================================================================

export interface WorkbookUser {
  id: UUID;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  profileImage?: string;
  role: UserRoleType;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';

  // Subscription info
  subscriptionId?: UUID;
  subscriptionTier: SubscriptionTierType;
  subscriptionStatus: SubscriptionStatusType;

  // Personal info
  timezone: string;
  language: string;
  phoneNumber?: string;
  bio?: string;
  website?: string;
  company?: string;
  position?: string;

  // System info
  emailVerifiedAt?: Timestamp;
  phoneVerifiedAt?: Timestamp;
  lastLoginAt?: Timestamp;
  lastActivityAt?: Timestamp;
  loginCount: number;

  // User preferences
  preferences: UserPreferences;

  // Metadata and tracking
  metadata: Record<string, any>;
  tags: string[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// Authentication and Session Management
// =============================================================================

export interface AuthSession {
  id: UUID;
  token: string;
  refreshToken: string;
  userId: UUID;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  expiresAt: Timestamp;
  refreshExpiresAt: Timestamp;
  lastUsedAt: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
}

export interface AuthResponse {
  success: boolean;
  session?: AuthSession;
  user?: WorkbookUser;
  permissions?: UserPermissions;
  subscription?: UserSubscription;
  error?: string;
  message?: string;
  requiresTwoFactor?: boolean;
  verificationToken?: string;
}

// =============================================================================
// Usage Analytics and Metrics
// =============================================================================

export interface UserUsageMetrics {
  userId: UUID;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string; // YYYY-MM-DD format

  // Content metrics
  modulesAccessed: number;
  lessonsCompleted: number;
  timeSpentMinutes: number;
  notesCreated: number;
  notesUpdated: number;

  // Audio metrics
  audioRecorded: number; // minutes
  audioTranscribed: number; // minutes
  audioDownloaded: number;

  // Session metrics
  liveSessionsAttended: number;
  liveSessionsHosted: number;
  liveSessionMinutes: number;

  // Engagement metrics
  loginCount: number;
  pageViews: number;
  searchQueries: number;
  exportCount: number;
  shareCount: number;

  createdAt: Timestamp;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base validation schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const UserRoleSchema = z.enum(['student', 'instructor', 'admin', 'moderator']);
export const SubscriptionTierSchema = z.enum(['free', 'basic', 'premium', 'enterprise']);
export const SubscriptionStatusSchema = z.enum(['active', 'inactive', 'expired', 'cancelled', 'past_due', 'trialing']);

// Preferences validation
export const NotificationSettingsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sessionReminders: z.boolean(),
  progressUpdates: z.boolean(),
  liveSessionInvites: z.boolean(),
  newContentAlerts: z.boolean(),
  weeklyDigest: z.boolean(),
});

export const AudioSettingsSchema = z.object({
  autoplay: z.boolean(),
  defaultVolume: z.number().min(0).max(100),
  transcriptionEnabled: z.boolean(),
  enhancedQuality: z.boolean(),
  downloadQuality: z.enum(['low', 'medium', 'high']),
});

export const InterfaceSettingsSchema = z.object({
  sidebarCollapsed: z.boolean(),
  showProgressIndicators: z.boolean(),
  compactMode: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().min(2).max(10),
  timezone: z.string(),
  dateFormat: z.enum(['ISO', 'US', 'EU']),
  timeFormat: z.enum(['12h', '24h']),
});

export const PrivacySettingsSchema = z.object({
  profileVisible: z.boolean(),
  progressVisible: z.boolean(),
  allowCollaboration: z.boolean(),
  shareAnalytics: z.boolean(),
  trackingEnabled: z.boolean(),
});

export const UserPreferencesSchema = z.object({
  notifications: NotificationSettingsSchema,
  audio: AudioSettingsSchema,
  interface: InterfaceSettingsSchema,
  privacy: PrivacySettingsSchema,
});

// Main user validation schema
export const WorkbookUserSchema = z.object({
  id: UUIDSchema,
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100).optional(),
  profileImage: z.string().url().optional(),
  role: UserRoleSchema,
  status: z.enum(['active', 'inactive', 'suspended', 'pending_verification']),
  subscriptionId: UUIDSchema.optional(),
  subscriptionTier: SubscriptionTierSchema,
  subscriptionStatus: SubscriptionStatusSchema,
  timezone: z.string(),
  language: z.string().min(2).max(10),
  phoneNumber: z.string().optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  company: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  emailVerifiedAt: TimestampSchema.optional(),
  phoneVerifiedAt: TimestampSchema.optional(),
  lastLoginAt: TimestampSchema.optional(),
  lastActivityAt: TimestampSchema.optional(),
  loginCount: z.number().min(0),
  preferences: UserPreferencesSchema,
  metadata: z.record(z.any()),
  tags: z.array(z.string()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Input schemas for API operations
export const CreateUserInputSchema = WorkbookUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  loginCount: true,
  lastLoginAt: true,
  lastActivityAt: true,
});

export const UpdateUserInputSchema = CreateUserInputSchema.partial();

export const LoginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
  deviceId: z.string().optional(),
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get default user preferences
 */
export function getDefaultUserPreferences(): UserPreferences {
  return {
    notifications: {
      email: true,
      push: false,
      sessionReminders: true,
      progressUpdates: true,
      liveSessionInvites: true,
      newContentAlerts: false,
      weeklyDigest: true,
    },
    audio: {
      autoplay: false,
      defaultVolume: 70,
      transcriptionEnabled: true,
      enhancedQuality: false,
      downloadQuality: 'medium',
    },
    interface: {
      sidebarCollapsed: false,
      showProgressIndicators: true,
      compactMode: false,
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'ISO',
      timeFormat: '12h',
    },
    privacy: {
      profileVisible: true,
      progressVisible: true,
      allowCollaboration: true,
      shareAnalytics: false,
      trackingEnabled: true,
    },
  };
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: UserRoleType): UserPermissions {
  const basePermissions: UserPermissions = {
    canCreateNotes: false,
    canEditNotes: false,
    canDeleteNotes: false,
    canExportNotes: false,
    canShareNotes: false,
    canRecordAudio: false,
    canTranscribeAudio: false,
    canDownloadAudio: false,
    canUploadAudio: false,
    canAccessLiveSessions: false,
    canCreateLiveSessions: false,
    canModerateSessions: false,
    canRecordSessions: false,
    canExportData: false,
    canImportData: false,
    canAccessAnalytics: false,
    canViewOtherProfiles: false,
    canCollaborate: false,
    canInviteUsers: false,
    canManageTeam: false,
    canAssignRoles: false,
    canModerate: false,
    canAdminister: false,
    canManageSubscriptions: false,
    canViewSystemLogs: false,
    canManageIntegrations: false,
  };

  switch (role) {
    case UserRole.STUDENT:
      return {
        ...basePermissions,
        canCreateNotes: true,
        canEditNotes: true,
        canDeleteNotes: true,
        canExportNotes: true,
        canShareNotes: true,
        canRecordAudio: true,
        canTranscribeAudio: true,
        canDownloadAudio: true,
        canAccessLiveSessions: true,
        canExportData: true,
        canCollaborate: true,
      };

    case UserRole.INSTRUCTOR:
      return {
        ...basePermissions,
        canCreateNotes: true,
        canEditNotes: true,
        canDeleteNotes: true,
        canExportNotes: true,
        canShareNotes: true,
        canRecordAudio: true,
        canTranscribeAudio: true,
        canDownloadAudio: true,
        canUploadAudio: true,
        canAccessLiveSessions: true,
        canCreateLiveSessions: true,
        canModerateSessions: true,
        canRecordSessions: true,
        canExportData: true,
        canImportData: true,
        canAccessAnalytics: true,
        canViewOtherProfiles: true,
        canCollaborate: true,
        canInviteUsers: true,
        canManageTeam: true,
      };

    case UserRole.MODERATOR:
      return {
        ...getPermissionsForRole(UserRole.INSTRUCTOR),
        canModerate: true,
        canAssignRoles: true,
        canViewSystemLogs: true,
      };

    case UserRole.ADMIN:
      return Object.keys(basePermissions).reduce((permissions, key) => {
        permissions[key as keyof UserPermissions] = true;
        return permissions;
      }, {} as UserPermissions);

    default:
      return basePermissions;
  }
}

/**
 * Check if user has specific permission
 */
export function userHasPermission(
  user: WorkbookUser,
  permission: keyof UserPermissions,
  subscription?: UserSubscription
): boolean {
  const rolePermissions = getPermissionsForRole(user.role);
  const hasRolePermission = rolePermissions[permission];

  // Check subscription-based restrictions
  if (subscription && subscription.status !== 'active') {
    // Inactive subscriptions might have limited permissions
    const limitedPermissions: (keyof UserPermissions)[] = [
      'canTranscribeAudio',
      'canAccessAnalytics',
      'canExportData',
      'canRecordSessions',
    ];

    if (limitedPermissions.includes(permission)) {
      return false;
    }
  }

  return hasRolePermission;
}

/**
 * Check if user can access specific subscription features
 */
export function userCanAccessFeature(
  user: WorkbookUser,
  feature: keyof SubscriptionFeatures,
  subscription?: UserSubscription
): boolean {
  if (!subscription || subscription.status !== 'active') {
    // Free tier limitations
    const freeTierFeatures: (keyof SubscriptionFeatures)[] = [
      'maxModules',
      'maxNotes',
    ];
    return freeTierFeatures.includes(feature);
  }

  // Feature access based on subscription tier
  return true; // Implement tier-based feature checks here
}

/**
 * Validate user data
 */
export function validateUser(data: unknown): { valid: boolean; errors?: string[]; data?: WorkbookUser } {
  try {
    const validData = WorkbookUserSchema.parse(data);
    return { valid: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return { valid: false, errors: ['Invalid data format'] };
  }
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: WorkbookUser): string {
  if (user.displayName) {
    return user.displayName;
  }
  return `${user.firstName} ${user.lastName}`.trim();
}

/**
 * Check if user subscription is active
 */
export function isSubscriptionActive(subscription?: UserSubscription): boolean {
  if (!subscription) return false;

  return subscription.status === 'active' ||
         subscription.status === 'trialing';
}

/**
 * Get subscription tier display name
 */
export function getSubscriptionTierDisplayName(tier: SubscriptionTierType): string {
  const displayNames: Record<SubscriptionTierType, string> = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };

  return displayNames[tier] || tier;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isWorkbookUser(obj: any): obj is WorkbookUser {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.id === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.role === 'string';
}

export function isAuthSession(obj: any): obj is AuthSession {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.token === 'string' &&
         typeof obj.userId === 'string';
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
export type LoginCredentialsInput = z.infer<typeof LoginCredentialsSchema>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  WorkbookUser: WorkbookUserSchema,
  CreateUserInput: CreateUserInputSchema,
  UpdateUserInput: UpdateUserInputSchema,
  LoginCredentials: LoginCredentialsSchema,
  UserPreferences: UserPreferencesSchema,
  NotificationSettings: NotificationSettingsSchema,
  AudioSettings: AudioSettingsSchema,
  InterfaceSettings: InterfaceSettingsSchema,
  PrivacySettings: PrivacySettingsSchema,
} as const;