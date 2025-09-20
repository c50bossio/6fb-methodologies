'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autocomplete?: string;
  id?: string;
  name?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      value = '',
      onChange,
      onFocus,
      onBlur,
      onKeyPress,
      id,
      name,
      autocomplete,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    // Generate stable ID for SSR/client consistency
    const inputId = id || (name ? `input-${name}` : undefined);

    // Ensure consistent props for SSR/client hydration
    const inputProps = {
      id: inputId,
      name: name,
      type,
      value: value || '',
      onChange: handleChange,
      onFocus,
      onBlur,
      onKeyPress,
      autoComplete: autocomplete || 'off',
      disabled: props.disabled || false,
      required: props.required || false,
      placeholder: props.placeholder || '',
      className: cn(
        'flex h-12 w-full rounded-xl border border-border-primary bg-background-accent px-4 py-3 text-base text-text-primary placeholder:text-text-muted',
        'focus:border-tomb45-green focus:ring-1 focus:ring-tomb45-green focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-200',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        className
      ),
      ref,
    };

    return (
      <div className='w-full'>
        {label && (
          <label
            htmlFor={inputId}
            className='block text-sm font-medium text-text-primary mb-2'
          >
            {label}
            {props.required && <span className='text-red-500 ml-1'>*</span>}
          </label>
        )}
        <input {...inputProps} />
        {error && <p className='mt-1 text-sm text-red-500'>{error}</p>}
        {helperText && !error && (
          <p className='mt-1 text-sm text-text-muted'>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
