'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'header' | 'hero' | 'footer' | 'subtle'
  animated?: boolean
  className?: string
  onClick?: () => void
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 40, height: 40 },
  lg: { width: 60, height: 60 },
  xl: { width: 80, height: 80 }
}

const variantStyles = {
  default: '',
  header: 'hover:scale-105 transition-transform cursor-pointer',
  hero: 'drop-shadow-lg',
  footer: 'hover:scale-105 transition-transform',
  subtle: 'opacity-30 hover:opacity-50 transition-opacity'
}

export function Logo({
  size = 'md',
  variant = 'default',
  animated = false,
  className,
  onClick
}: LogoProps) {
  const { width, height } = sizeMap[size]

  const logoElement = (
    <Image
      src="/images/6fb-logo.png"
      alt="6 Figure Barber"
      width={width}
      height={height}
      className={cn(
        'object-contain',
        variantStyles[variant],
        className
      )}
      priority={variant === 'header' || variant === 'hero'}
      onClick={onClick}
    />
  )

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          type: "spring",
          stiffness: 100
        }}
      >
        {logoElement}
      </motion.div>
    )
  }

  return logoElement
}