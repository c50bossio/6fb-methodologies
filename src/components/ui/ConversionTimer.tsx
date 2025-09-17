'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ConversionTimerProps {
  initialMinutes?: number
  onExpire?: () => void
  className?: string
}

export function ConversionTimer({
  initialMinutes = 10,
  onExpire,
  className = ""
}: ConversionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60) // Convert to seconds
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true)
      onExpire?.()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onExpire])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const formatTime = (time: number) => time.toString().padStart(2, '0')

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-center text-red-400 ${className}`}
      >
        ⚠️ Time expired - Spots may no longer be available
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-center ${className}`}
    >
      <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400">
          ⏰ Your spot reserved for:
        </span>
        <div className="font-mono text-red-400 font-bold">
          {formatTime(minutes)}:{formatTime(seconds)}
        </div>
      </div>
      <p className="text-xs text-text-muted mt-1">
        Complete registration before timer expires
      </p>
    </motion.div>
  )
}