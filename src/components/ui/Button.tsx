'use client';

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-tomb45-green hover:bg-tomb45-green-hover text-white shadow-md hover:shadow-lg hover:shadow-green-glow/25',
        secondary:
          'bg-background-secondary hover:bg-background-accent text-text-primary border border-border-primary shadow-dark hover:shadow-dark-lg',
        ghost: 'bg-transparent hover:bg-background-secondary text-text-primary',
        outline:
          'bg-transparent border-2 border-tomb45-green text-tomb45-green hover:bg-tomb45-green hover:text-white',
        destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
      },
      size: {
        sm: 'h-10 px-5 text-sm rounded-lg',
        md: 'h-12 px-7 text-base rounded-xl',
        lg: 'h-14 px-9 text-lg rounded-xl',
        xl: 'h-18 px-12 text-xl rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
