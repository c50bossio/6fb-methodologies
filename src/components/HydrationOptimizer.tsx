'use client'

import { useEffect, useRef } from 'react'

/**
 * HydrationOptimizer component to prevent content flash and optimize hydration
 */
export default function HydrationOptimizer({ children }: { children: React.ReactNode }) {
  const isHydratedRef = useRef(false)

  useEffect(() => {
    // Mark as hydrated immediately when component mounts
    if (!isHydratedRef.current) {
      isHydratedRef.current = true
      document.body.classList.add('hydrated')

      // Optimize subsequent navigations
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          // Preload critical routes
          const router = require('next/router')
          if (router?.default?.prefetch) {
            router.default.prefetch('/')
            router.default.prefetch('/register')
          }
        }, { timeout: 2000 })
      }
    }
  }, [])

  // For server-side rendering, show content immediately
  // For client-side, wait for hydration to complete
  return (
    <div
      className="contents"
      suppressHydrationWarning={true}
      style={{
        // Prevent layout shift during hydration
        minHeight: 'inherit',
        display: 'contents'
      }}
    >
      {children}
    </div>
  )
}