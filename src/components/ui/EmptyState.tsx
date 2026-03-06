'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import {
  FileQuestion,
  Search,
  Inbox,
  FolderOpen,
  Database,
  AlertCircle,
  Package,
  Users,
  Calendar,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';

/**
 * EmptyState Component
 *
 * Modern empty state pattern following 2025 UX best practices:
 * - Clear messaging about why content is empty
 * - Actionable next steps
 * - Contextual illustrations
 * - Helpful suggestions
 *
 * Industry Standard: Never show just "No data" - always provide context and actions
 */

interface EmptyStateProps {
  /**
   * Icon to display (Lucide icon component or custom icon)
   */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;

  /**
   * Main heading
   */
  title: string;

  /**
   * Descriptive message
   */
  description?: string;

  /**
   * Primary action button
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };

  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Preset variants for common use cases
   */
  variant?: 'no-data' | 'no-results' | 'no-access' | 'error' | 'empty-cart' | 'no-items' | 'custom';

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Whether to show the illustration
   * @default true
   */
  showIllustration?: boolean;

  /**
   * Size of the empty state
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
}

// Preset configurations
const presets = {
  'no-data': {
    icon: Database,
    title: 'No data available',
    description: 'There is no data to display at the moment. Try adding some items or check back later.',
  },
  'no-results': {
    icon: Search,
    title: 'No results found',
    description: 'We couldn\'t find anything matching your search. Try adjusting your filters or search terms.',
  },
  'no-access': {
    icon: AlertCircle,
    title: 'Access restricted',
    description: 'You don\'t have permission to view this content. Contact an administrator if you need access.',
  },
  'error': {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'We encountered an error loading this content. Please try again or contact support if the problem persists.',
  },
  'empty-cart': {
    icon: ShoppingCart,
    title: 'Your cart is empty',
    description: 'Start adding items to your cart to get started.',
  },
  'no-items': {
    icon: Package,
    title: 'No items yet',
    description: 'Get started by adding your first item.',
  },
  'custom': {
    icon: FileQuestion,
    title: 'Empty',
    description: 'No content available.',
  },
};

export function EmptyState({
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  action,
  secondaryAction,
  variant = 'custom',
  className,
  showIllustration = true,
  size = 'medium',
}: EmptyStateProps) {
  const preset = presets[variant];
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
      container: 'py-16',
      icon: 'h-20 w-20',
      title: 'text-2xl',
      description: 'text-lg',
    },
  }[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon/Illustration */}
      {showIllustration && Icon && (
        <div
          className={cn(
            'mb-6 rounded-full bg-background-accent p-4 text-text-muted',
            'animate-in fade-in-0 zoom-in-95 duration-500'
          )}
        >
          <Icon className={cn(sizeClasses.icon, 'opacity-50')} aria-hidden="true" />
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-text-primary mb-2',
          sizeClasses.title,
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-100'
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            'text-text-secondary max-w-md mb-6',
            sizeClasses.description,
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-150'
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div
          className={cn(
            'flex flex-col sm:flex-row gap-3 items-center justify-center',
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-200'
          )}
        >
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size={size === 'small' ? 'sm' : 'md'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size={size === 'small' ? 'sm' : 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-built empty state variants for common use cases
 */

export function NoDataEmptyState({
  onRefresh,
  onAdd,
}: {
  onRefresh?: () => void;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      variant="no-data"
      action={
        onAdd
          ? {
              label: 'Add Item',
              onClick: onAdd,
            }
          : undefined
      }
      secondaryAction={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function NoSearchResultsEmptyState({
  onClearFilters,
  searchQuery,
}: {
  onClearFilters: () => void;
  searchQuery?: string;
}) {
  return (
    <EmptyState
      variant="no-results"
      description={
        searchQuery
          ? `No results found for "${searchQuery}". Try different search terms or clear your filters.`
          : 'No results found. Try adjusting your filters or search terms.'
      }
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters,
        variant: 'outline',
      }}
    />
  );
}

export function NoAccessEmptyState({ onRequestAccess }: { onRequestAccess?: () => void }) {
  return (
    <EmptyState
      variant="no-access"
      action={
        onRequestAccess
          ? {
              label: 'Request Access',
              onClick: onRequestAccess,
            }
          : undefined
      }
    />
  );
}

export function ErrorEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      variant="error"
      action={{
        label: 'Try Again',
        onClick: onRetry,
      }}
    />
  );
}

export function EmptyCartState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <EmptyState
      variant="empty-cart"
      action={{
        label: 'Start Shopping',
        onClick: onBrowse,
      }}
    />
  );
}
