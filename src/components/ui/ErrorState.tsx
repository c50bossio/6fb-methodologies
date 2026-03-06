'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import {
  AlertTriangle,
  WifiOff,
  ServerCrash,
  ShieldAlert,
  Bug,
  Clock,
  RefreshCw,
  Home,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';

/**
 * ErrorState Component
 *
 * Comprehensive error state component following 2025 best practices:
 * - Clear error messaging
 * - Actionable recovery steps
 * - Contextual illustrations
 * - Error tracking integration ready
 *
 * Industry Standard: Show helpful errors, not technical jargon
 */

export interface ErrorStateProps {
  /**
   * Icon to display
   */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;

  /**
   * Error title
   */
  title?: string;

  /**
   * Error description
   */
  description?: string;

  /**
   * Error code or ID for tracking
   */
  errorCode?: string;

  /**
   * Preset error types
   */
  variant?:
    | 'network'
    | 'server'
    | 'not-found'
    | 'forbidden'
    | 'timeout'
    | 'generic'
    | 'maintenance'
    | 'custom';

  /**
   * Primary action (usually retry)
   */
  onRetry?: () => void;

  /**
   * Secondary action (usually go back)
   */
  onGoBack?: () => void;

  /**
   * Go to home action
   */
  onGoHome?: () => void;

  /**
   * Custom actions
   */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  }>;

  /**
   * Show technical details (for debugging)
   * @default false
   */
  showDetails?: boolean;

  /**
   * Technical error message
   */
  technicalMessage?: string;

  /**
   * Stack trace or additional debug info
   */
  debugInfo?: string;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Size variant
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Whether this is a full-page error
   * @default false
   */
  fullPage?: boolean;
}

// Preset configurations
const errorPresets = {
  network: {
    icon: WifiOff,
    title: 'Connection Lost',
    description: 'Please check your internet connection and try again.',
  },
  server: {
    icon: ServerCrash,
    title: 'Server Error',
    description: 'Something went wrong on our end. Our team has been notified and is working on a fix.',
  },
  'not-found': {
    icon: AlertTriangle,
    title: 'Page Not Found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.',
  },
  forbidden: {
    icon: ShieldAlert,
    title: 'Access Denied',
    description: 'You don\'t have permission to access this resource.',
  },
  timeout: {
    icon: Clock,
    title: 'Request Timeout',
    description: 'The request took too long to complete. Please try again.',
  },
  maintenance: {
    icon: ServerCrash,
    title: 'Under Maintenance',
    description: 'We\'re currently performing scheduled maintenance. We\'ll be back shortly.',
  },
  generic: {
    icon: Bug,
    title: 'Oops! Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  },
  custom: {
    icon: AlertTriangle,
    title: 'Error',
    description: 'An error occurred.',
  },
};

export function ErrorState({
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  errorCode,
  variant = 'generic',
  onRetry,
  onGoBack,
  onGoHome,
  actions,
  showDetails = false,
  technicalMessage,
  debugInfo,
  className,
  size = 'medium',
  fullPage = false,
}: ErrorStateProps) {
  const [showTechnical, setShowTechnical] = React.useState(false);

  const preset = errorPresets[variant];
  const Icon = CustomIcon || preset.icon;
  const title = customTitle || preset.title;
  const description = customDescription || preset.description;

  const sizeClasses = {
    small: {
      container: 'py-8',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    medium: {
      container: 'py-12',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
    },
    large: {
      container: 'py-20',
      icon: 'h-24 w-24',
      title: 'text-3xl',
      description: 'text-lg',
    },
  }[size];

  const containerClasses = cn(
    'flex flex-col items-center justify-center text-center',
    sizeClasses.container,
    fullPage && 'min-h-screen',
    className
  );

  return (
    <div className={containerClasses} role="alert" aria-live="assertive">
      {/* Error Icon */}
      <div
        className={cn(
          'mb-6 rounded-full p-4',
          'bg-red-500/10 text-red-500',
          'animate-in zoom-in-95 duration-500'
        )}
      >
        <Icon className={cn(sizeClasses.icon)} aria-hidden="true" />
      </div>

      {/* Error Title */}
      <h2
        className={cn(
          'font-bold text-text-primary mb-3',
          sizeClasses.title,
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-100'
        )}
      >
        {title}
      </h2>

      {/* Error Description */}
      {description && (
        <p
          className={cn(
            'text-text-secondary max-w-md mb-2',
            sizeClasses.description,
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-150'
          )}
        >
          {description}
        </p>
      )}

      {/* Error Code */}
      {errorCode && (
        <p
          className={cn(
            'text-text-muted text-sm mb-6',
            'animate-in fade-in-0 duration-500 delay-200'
          )}
        >
          Error Code: <code className="font-mono bg-background-accent px-2 py-1 rounded">{errorCode}</code>
        </p>
      )}

      {/* Action Buttons */}
      <div
        className={cn(
          'flex flex-col sm:flex-row gap-3 items-center justify-center mb-6',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-250'
        )}
      >
        {/* Custom actions first */}
        {actions?.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            variant={action.variant || 'primary'}
            size={size === 'small' ? 'sm' : 'md'}
          >
            {action.label}
          </Button>
        ))}

        {/* Default actions if no custom actions */}
        {!actions && (
          <>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="primary"
                size={size === 'small' ? 'sm' : 'md'}
              >
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Try Again
              </Button>
            )}
            {onGoBack && (
              <Button
                onClick={onGoBack}
                variant="outline"
                size={size === 'small' ? 'sm' : 'md'}
              >
                <ChevronLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Go Back
              </Button>
            )}
            {onGoHome && (
              <Button
                onClick={onGoHome}
                variant="ghost"
                size={size === 'small' ? 'sm' : 'md'}
              >
                <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                Go Home
              </Button>
            )}
          </>
        )}
      </div>

      {/* Technical Details (for debugging) */}
      {showDetails && (technicalMessage || debugInfo) && (
        <div className="w-full max-w-2xl mt-8 animate-in fade-in-0 duration-500 delay-300">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-4 focus-ring rounded-lg px-2 py-1"
          >
            {showTechnical ? '▼' : '▶'} Technical Details
          </button>

          {showTechnical && (
            <div className="bg-background-secondary border border-border-primary rounded-lg p-4 text-left">
              {technicalMessage && (
                <div className="mb-4">
                  <p className="text-xs text-text-muted mb-1">Error Message:</p>
                  <code className="text-sm text-red-400 font-mono block break-all">
                    {technicalMessage}
                  </code>
                </div>
              )}
              {debugInfo && (
                <div>
                  <p className="text-xs text-text-muted mb-1">Debug Info:</p>
                  <pre className="text-xs text-text-secondary font-mono bg-background-primary p-3 rounded overflow-x-auto">
                    {debugInfo}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-built error state variants for common use cases
 */

export function NetworkErrorState({ onRetry }: { onRetry: () => void }) {
  return <ErrorState variant="network" onRetry={onRetry} />;
}

export function ServerErrorState({
  onRetry,
  errorCode
}: {
  onRetry: () => void;
  errorCode?: string;
}) {
  return <ErrorState variant="server" onRetry={onRetry} errorCode={errorCode} />;
}

export function NotFoundErrorState({
  onGoHome
}: {
  onGoHome: () => void;
}) {
  return <ErrorState variant="not-found" onGoHome={onGoHome} />;
}

export function ForbiddenErrorState({ onGoBack }: { onGoBack?: () => void }) {
  return <ErrorState variant="forbidden" onGoBack={onGoBack} />;
}

export function TimeoutErrorState({ onRetry }: { onRetry: () => void }) {
  return <ErrorState variant="timeout" onRetry={onRetry} />;
}

export function MaintenanceErrorState() {
  return (
    <ErrorState
      variant="maintenance"
      description="We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly. Thank you for your patience!"
    />
  );
}
