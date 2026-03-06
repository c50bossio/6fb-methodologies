'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ArrowRight, X } from 'lucide-react'

export function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const heroHeight = window.innerHeight

      // Show CTA when scrolled past hero section
      const pastHero = scrollY > heroHeight * 0.7
      setIsScrolledPastHero(pastHero)

      // Hide when near pricing section
      const pricingSection = document.getElementById('pricing')
      if (pricingSection) {
        const pricingTop = pricingSection.offsetTop
        const shouldHide = scrollY > pricingTop - 200
        setIsVisible(pastHero && !shouldHide)
      } else {
        setIsVisible(pastHero)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:hidden"
        >
          <div className="bg-background-secondary/95 backdrop-blur-md border border-border-primary rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-400">
                  Only 23 spots left!
                </span>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Button
              onClick={scrollToPricing}
              className="w-full group relative overflow-hidden"
              size="lg"
            >
              <span className="relative z-10">🚀 Secure My Spot Now</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>

            <div className="text-center mt-2">
              <p className="text-xs text-text-muted">
                💰 ROI: 847% average within 90 days
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}