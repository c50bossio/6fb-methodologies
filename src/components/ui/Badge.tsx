'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-background-accent text-text-primary hover:bg-background-secondary',
        secondary: 'border-transparent bg-border-primary text-text-secondary hover:bg-border-secondary',
        destructive: 'border-transparent bg-red-500 text-white hover:bg-red-600',
        outline: 'text-text-primary border-border-primary',
        success: 'border-transparent bg-tomb45-green text-white',
        warning: 'border-transparent bg-yellow-500 text-white',
        info: 'border-transparent bg-blue-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }