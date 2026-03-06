'use client';

import { cn } from '@/lib/utils';

/**
 * Skeleton Component
 *
 * Modern loading placeholder that mimics the structure of content being loaded.
 * Provides better perceived performance than traditional spinners.
 *
 * Industry Best Practices (2025):
 * - Shows layout structure while loading
 * - Smooth shimmer animation for visual feedback
 * - Maintains layout stability (prevents CLS)
 * - Accessible with aria-label
 *
 * @example
 * <Skeleton className="h-12 w-full" />
 * <Skeleton variant="circle" className="h-12 w-12" />
 * <Skeleton variant="text" className="w-3/4" />
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant of the skeleton
   * - rectangular: Default, for cards and containers
   * - circle: For avatars and icons
   * - text: For text content with rounded edges
   */
  variant?: 'rectangular' | 'circle' | 'text';

  /**
   * Animation speed
   * - slow: 2s duration
   * - normal: 1.5s duration (default)
   * - fast: 1s duration
   */
  animation?: 'slow' | 'normal' | 'fast' | 'none';

  /**
   * Whether to show shimmer effect
   * @default true
   */
  shimmer?: boolean;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'normal',
  shimmer = true,
  ...props
}: SkeletonProps) {
  const animationDuration = {
    slow: 'animate-[shimmer_2s_ease-in-out_infinite]',
    normal: 'animate-[shimmer_1.5s_ease-in-out_infinite]',
    fast: 'animate-[shimmer_1s_ease-in-out_infinite]',
    none: '',
  }[animation];

  return (
    <div
      className={cn(
        'bg-background-accent relative overflow-hidden',
        {
          'rounded-xl': variant === 'rectangular',
          'rounded-full': variant === 'circle',
          'rounded-md h-4': variant === 'text',
        },
        shimmer && animationDuration,
        shimmer && 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        className
      )}
      role="status"
      aria-label="Loading content..."
      aria-live="polite"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * SkeletonText Component
 *
 * Specialized skeleton for text content with proper line spacing
 */
interface SkeletonTextProps {
  /**
   * Number of lines to display
   * @default 1
   */
  lines?: number;

  /**
   * Custom class name for each line
   */
  className?: string;

  /**
   * Whether the last line should be shorter (more realistic)
   * @default true
   */
  lastLineShort?: boolean;
}

export function SkeletonText({
  lines = 1,
  className,
  lastLineShort = true,
}: SkeletonTextProps) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading text content...">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={cn(
            'h-4',
            lastLineShort && index === lines - 1 ? 'w-3/4' : 'w-full',
            className
          )}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard Component
 *
 * Pre-built skeleton for card-like content
 */
interface SkeletonCardProps {
  /**
   * Whether to include an avatar/icon
   * @default false
   */
  showAvatar?: boolean;

  /**
   * Number of text lines
   * @default 3
   */
  lines?: number;

  /**
   * Custom class name
   */
  className?: string;
}

export function SkeletonCard({
  showAvatar = false,
  lines = 3,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'p-6 bg-background-secondary border border-border-primary rounded-xl space-y-4',
        className
      )}
      role="status"
      aria-label="Loading card content..."
    >
      {showAvatar && (
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/3" />
            <Skeleton variant="text" className="h-3 w-1/2" />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

/**
 * SkeletonTable Component
 *
 * Pre-built skeleton for table content
 */
interface SkeletonTableProps {
  /**
   * Number of rows
   * @default 5
   */
  rows?: number;

  /**
   * Number of columns
   * @default 4
   */
  columns?: number;

  /**
   * Whether to show header
   * @default true
   */
  showHeader?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-label="Loading table content..."
    >
      {showHeader && (
        <div className="flex gap-4 pb-3 border-b border-border-primary">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonList Component
 *
 * Pre-built skeleton for list content
 */
interface SkeletonListProps {
  /**
   * Number of items
   * @default 5
   */
  items?: number;

  /**
   * Whether to show icons/avatars
   * @default false
   */
  showIcon?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

export function SkeletonList({
  items = 5,
  showIcon = false,
  className,
}: SkeletonListProps) {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-label="Loading list content..."
    >
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary">
          {showIcon && <Skeleton variant="circle" className="h-10 w-10" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-2/3" />
            <Skeleton variant="text" className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
