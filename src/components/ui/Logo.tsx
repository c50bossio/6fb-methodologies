'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'inline';
  variant?: 'default' | 'header' | 'hero' | 'footer' | 'subtle' | 'inline';
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 40, height: 40 },
  lg: { width: 60, height: 60 },
  xl: { width: 80, height: 80 },
  inline: { width: 0, height: 0 }, // Will use CSS classes for responsive scaling
};

const variantStyles = {
  default: '',
  header: 'hover:scale-105 transition-transform cursor-pointer',
  hero: 'drop-shadow-lg',
  footer: 'hover:scale-105 transition-transform',
  subtle: 'opacity-30 hover:opacity-50 transition-opacity',
  inline: 'inline-block align-text-bottom drop-shadow-lg',
};

export function Logo({
  size = 'md',
  variant = 'default',
  animated = false,
  className,
  onClick,
}: LogoProps) {
  const { width, height } = sizeMap[size];

  // Handle inline logos with responsive sizing
  if (size === 'inline') {
    const logoElement = (
      <img
        src='/images/6fb-logo-new.png'
        alt='6 Figure Barber'
        className={cn(
          'object-contain',
          // Responsive height that matches heading-xl text sizes (60% bigger total)
          'h-[3.4rem] md:h-[4.2rem] lg:h-[5.1rem]', // ~54px/67px/82px (60% increase from original)
          'w-auto', // Maintain aspect ratio
          'mx-1', // Small horizontal spacing
          variantStyles[variant],
          className
        )}
        onClick={onClick}
      />
    );

    if (animated) {
      return (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            type: 'spring',
            stiffness: 100,
          }}
          className='inline-block'
        >
          {logoElement}
        </motion.span>
      );
    }

    return logoElement;
  }

  // Standard logo handling for non-inline usage
  const logoElement = (
    <img
      src='/images/6fb-logo-new.png'
      alt='6 Figure Barber'
      width={width}
      height={height}
      className={cn('object-contain', variantStyles[variant], className)}
      onClick={onClick}
    />
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          type: 'spring',
          stiffness: 100,
        }}
      >
        {logoElement}
      </motion.div>
    );
  }

  return logoElement;
}
