'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  MapPin,
  Calendar,
  Thermometer,
  Users,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CityWorkshop } from '@/types'
import { getTotalAvailableSpots } from '@/lib/cities'

interface CityCardProps {
  city: CityWorkshop
  index: number
  className?: string
}

export function CityCard({ city, index, className }: CityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()

  // Performance optimization: Reduce re-renders
  const expandedId = `city-details-${city.id}`

  // Memoize expensive calculations
  const availability = useMemo(() => {
    const ga = getTotalAvailableSpots(city.id, 'ga')
    const vip = getTotalAvailableSpots(city.id, 'vip')
    const total = ga + vip
    const isBooked = ga === 0 && vip === 0

    return { ga, vip, total, isBooked }
  }, [city.id])

  const statusBadge = useMemo(() => {
    if (availability.isBooked) {
      return <Badge variant="destructive">Sold Out</Badge>
    }

    if (availability.total <= 10) {
      return <Badge variant="secondary">Almost Full</Badge>
    }

    if (city.status === 'upcoming' && index === 0) {
      return <Badge variant="success">Next Available</Badge>
    }

    return <Badge variant="secondary">Available</Badge>
  }, [availability, city.status, index])

  const handleSelectCity = useCallback(() => {
    if (availability.isBooked) return

    // Navigate to city-specific pricing page
    router.push(`/pricing?city=${city.id}`)
  }, [availability.isBooked, router, city.id])

  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(prev => !prev)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleExpanded(e as any)
    }
  }, [toggleExpanded])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={className}
    >
      <Card
        className={`transition-all duration-300 overflow-hidden ${
          availability.isBooked
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:border-tomb45-green hover:shadow-green-glow'
        }`}
      >
        {/* Status Badge */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          {statusBadge}
        </div>

        {/* Compact Header - Always Visible */}
        <CardHeader
          className="text-center pb-3 pt-6 cursor-pointer"
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={expandedId}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${city.city}, ${city.state} workshop`}
        >
          {/* City Name & Expand Button */}
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xl flex-1">
              {city.city}, {city.state}
            </CardTitle>
            <button
              type="button"
              className="ml-2 p-1 rounded-full hover:bg-background-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-tomb45-green focus:ring-offset-2"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>

          {/* Month & Basic Info */}
          <div className="text-lg font-semibold text-tomb45-green mb-2">
            {city.month}
          </div>

          {/* Quick Summary */}
          <div className="text-sm text-text-secondary">
            Starting at {formatCurrency(1000)} • {availability.total} spots available
          </div>
        </CardHeader>

        {/* Collapsible Details Section */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={expandedId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1], // Custom easing for smooth animation
                opacity: { duration: 0.2 }
              }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-4 pt-0">
                {/* Detailed Info Section */}
                <div className="border-t border-border-primary pt-4">
                  {/* Dates & Location */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {city.dates.length > 1
                          ? `${city.dates[0]} or ${city.dates[1]}`
                          : city.dates[0] || 'Dates TBA'
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                      <MapPin className="w-4 h-4" />
                      <span>{city.location}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-tomb45-green">
                      <Thermometer className="w-4 h-4" />
                      <span>{city.climateAppeal}</span>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className="text-center space-y-2 mb-4">
                    <div className="text-sm text-text-muted">Pricing Options</div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">General Admission:</span>
                        <span className="font-semibold text-tomb45-green">{formatCurrency(1000)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">VIP Experience:</span>
                        <span className="font-semibold text-tomb45-green">{formatCurrency(1500)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Availability Details */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium text-center text-text-primary">Availability</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">General Admission:</span>
                      <span className={`font-medium ${availability.ga > 0 ? 'text-tomb45-green' : 'text-red-500'}`}>
                        {availability.ga > 0 ? `${availability.ga} spots` : 'Sold Out'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">VIP Experience:</span>
                      <span className={`font-medium ${availability.vip > 0 ? 'text-tomb45-green' : 'text-red-500'}`}>
                        {availability.vip > 0 ? `${availability.vip} spots` : 'Sold Out'}
                      </span>
                    </div>
                  </div>

                  {/* Registration Count */}
                  <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-4">
                    <Users className="w-4 h-4" />
                    <span>
                      {city.registeredCount.ga + city.registeredCount.vip} barbers already registered
                    </span>
                  </div>

                  {/* CTA Button */}
                  <Button
                    className="w-full mb-4"
                    variant="primary"
                    disabled={availability.isBooked}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectCity()
                    }}
                  >
                    {availability.isBooked ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        Join Waitlist
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Select {city.city} Workshop
                      </>
                    )}
                  </Button>

                  {/* Additional Info */}
                  <div className="text-center">
                    <p className="text-xs text-text-muted">
                      Premium venue location • Updates coming soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}