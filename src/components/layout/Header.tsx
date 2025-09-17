'use client'

import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

export function Header() {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-background-primary/95 backdrop-blur-sm border-b border-border-primary"
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div onClick={scrollToTop}>
            <Logo
              size="md"
              variant="header"
              className="w-8 h-8 sm:w-10 sm:h-10"
            />
          </div>

          {/* CTA Button */}
          <Button
            size="sm"
            onClick={scrollToPricing}
            className="hidden sm:flex shadow-green-glow"
          >
            Get Tickets
          </Button>

          {/* Mobile CTA */}
          <Button
            size="sm"
            onClick={scrollToPricing}
            className="sm:hidden text-xs px-3"
          >
            Tickets
          </Button>
        </div>
      </div>
    </motion.header>
  )
}