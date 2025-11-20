'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  MapPin,
  Calendar,
  Thermometer,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CityWorkshop } from '@/types';
import { getTotalAvailableSpotsSync } from '@/lib/cities';

interface CityCardProps {
  city: CityWorkshop;
  index: number;
  className?: string;
}

export function CityCard({ city, index, className }: CityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const router = useRouter();

  // Performance optimization: Reduce re-renders
  const expandedId = `city-details-${city.id}`;

  // Memoize expensive calculations using sync version for UI performance
  const availability = useMemo(() => {
    const ga = getTotalAvailableSpotsSync(city.id, 'ga');
    const vip = getTotalAvailableSpotsSync(city.id, 'vip');
    const vipElite = getTotalAvailableSpotsSync(city.id, 'vipElite');
    const total = ga + vip + vipElite;
    const isBooked = ga === 0 && vip === 0 && vipElite === 0;

    return { ga, vip, vipElite, total, isBooked };
  }, [city.id]);

  const statusBadge = useMemo(() => {
    if (availability.isBooked) {
      return <Badge variant='destructive'>Sold Out</Badge>;
    }

    if (availability.total <= 10) {
      return <Badge variant='secondary'>Almost Full</Badge>;
    }

    if (city.status === 'upcoming' && index === 0) {
      return <Badge variant='success'>Next Available</Badge>;
    }

    return <Badge variant='secondary'>Available</Badge>;
  }, [availability, city.status, index]);

  const handleSelectCity = useCallback(async () => {
    if (availability.isBooked || isLoading) return;

    setIsLoading(true);

    try {
      // Add slight delay for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      // Navigate to city-specific pricing page
      router.push(`/pricing?city=${city.id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsLoading(false);
    }
  }, [availability.isBooked, isLoading, router, city.id]);

  const toggleExpanded = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      setIsExpanded(prev => !prev);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpanded(e);
      }
    },
    [toggleExpanded]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={className}
    >
      <Card
        className={`transition-all duration-300 overflow-hidden transform hover:scale-[1.02] ${
          availability.isBooked
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:border-tomb45-green hover:shadow-green-glow hover:shadow-lg cursor-pointer'
        }`}
      >
        {/* Status Badge */}
        <div className='absolute top-3 left-1/2 transform -translate-x-1/2 z-10'>
          {statusBadge}
        </div>

        {/* Compact Header - Always Visible */}
        <CardHeader
          className='text-center pb-3 pt-12 cursor-pointer min-h-[44px] touch-manipulation'
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role='button'
          aria-expanded={isExpanded}
          aria-controls={expandedId}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${city.city}, ${city.state} workshop`}
        >
          {/* City Name & Expand Button */}
          <div className='flex items-center justify-between mb-2'>
            <CardTitle className='text-xl flex-1'>
              {city.city}, {city.state}
            </CardTitle>
            <button
              type='button'
              className='ml-2 p-2 rounded-full hover:bg-tomb45-green hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-tomb45-green focus:ring-offset-2 group'
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className='w-5 h-5 text-text-secondary group-hover:text-white transition-colors' />
              ) : (
                <ChevronDown className='w-5 h-5 text-text-secondary group-hover:text-white transition-colors' />
              )}
            </button>
          </div>

          {/* Month & Basic Info */}
          <div className='text-lg font-semibold text-tomb45-green mb-2'>
            {city.month}
          </div>

          {/* Quick Summary */}
          <div className='text-sm text-text-secondary'>
            Starting at {formatCurrency(300)}
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
                opacity: { duration: 0.2 },
              }}
              className='overflow-hidden'
            >
              <CardContent className='space-y-4 pt-0'>
                {/* Detailed Info Section */}
                <div className='border-t border-border-primary pt-4'>
                  {/* Dates & Location */}
                  <div className='space-y-3 mb-4'>
                    <div className='flex items-center justify-center gap-2 text-sm text-text-secondary'>
                      <Calendar className='w-4 h-4' />
                      <span>
                        {city.dates.length > 1
                          ? `${city.dates[0]} or ${city.dates[1]}`
                          : city.dates[0] || 'Dates TBA'}
                      </span>
                    </div>

                    <div className='flex items-center justify-center gap-2 text-sm text-text-secondary'>
                      <MapPin className='w-4 h-4' />
                      <span>{city.location}</span>
                    </div>

                    <div className='flex items-center justify-center gap-2 text-sm text-tomb45-green'>
                      <Thermometer className='w-4 h-4' />
                      <span>{city.climateAppeal}</span>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className='text-center space-y-2 mb-4'>
                    <div className='text-sm text-text-muted'>
                      Pricing Options
                    </div>
                    <div className='space-y-2'>
                      {/* General Admission */}
                      <div className='relative'>
                        <div className='flex justify-between items-center'>
                          <div className='flex items-center gap-1'>
                            <span className='text-sm'>General Admission:</span>
                            <button
                              type='button'
                              className='p-1 hover:bg-background-secondary rounded-full transition-colors'
                              onMouseEnter={() => setHoveredTier('ga')}
                              onMouseLeave={() => setHoveredTier(null)}
                              onClick={e => {
                                e.stopPropagation();
                                setHoveredTier(
                                  hoveredTier === 'ga' ? null : 'ga'
                                );
                              }}
                            >
                              <Info className='w-3 h-3 text-text-muted' />
                            </button>
                          </div>
                          <span className='font-semibold text-tomb45-green'>
                            {formatCurrency(300)}
                          </span>
                        </div>
                        {hoveredTier === 'ga' && (
                          <div className='absolute left-0 right-0 top-full mt-1 p-2 bg-background-secondary border border-border-primary rounded-lg shadow-lg z-10 text-xs text-left'>
                            <ul className='space-y-1 text-text-secondary'>
                              <li>• Access to both workshop days</li>
                              <li>• All workshop materials</li>
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* VIP Experience */}
                      <div className='relative'>
                        <div className='flex justify-between items-center'>
                          <div className='flex items-center gap-1'>
                            <span className='text-sm'>VIP Experience:</span>
                            <button
                              type='button'
                              className='p-1 hover:bg-background-secondary rounded-full transition-colors'
                              onMouseEnter={() => setHoveredTier('vip')}
                              onMouseLeave={() => setHoveredTier(null)}
                              onClick={e => {
                                e.stopPropagation();
                                setHoveredTier(
                                  hoveredTier === 'vip' ? null : 'vip'
                                );
                              }}
                            >
                              <Info className='w-3 h-3 text-text-muted' />
                            </button>
                          </div>
                          <span className='font-semibold text-tomb45-green'>
                            {formatCurrency(500)}
                          </span>
                        </div>
                        {hoveredTier === 'vip' && (
                          <div className='absolute left-0 right-0 top-full mt-1 p-2 bg-background-secondary border border-border-primary rounded-lg shadow-lg z-10 text-xs text-left'>
                            <ul className='space-y-1 text-text-secondary'>
                              <li>• Everything in General Admission</li>
                              <li>• Best seating at the event</li>
                              <li>• Gift bag with products</li>
                              <li>• Workbooks included</li>
                              <li>• After-party admission</li>
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* VIP Elite */}
                      <div className='relative'>
                        <div className='flex justify-between items-center'>
                          <div className='flex items-center gap-1'>
                            <span className='text-sm'>VIP Elite:</span>
                            <button
                              type='button'
                              className='p-1 hover:bg-background-secondary rounded-full transition-colors'
                              onMouseEnter={() => setHoveredTier('elite')}
                              onMouseLeave={() => setHoveredTier(null)}
                              onClick={e => {
                                e.stopPropagation();
                                setHoveredTier(
                                  hoveredTier === 'elite' ? null : 'elite'
                                );
                              }}
                            >
                              <Info className='w-3 h-3 text-text-muted' />
                            </button>
                          </div>
                          <span className='font-semibold text-tomb45-green'>
                            {formatCurrency(750)}
                          </span>
                        </div>
                        {hoveredTier === 'elite' && (
                          <div className='absolute left-0 right-0 top-full mt-1 p-2 bg-background-secondary border border-border-primary rounded-lg shadow-lg z-10 text-xs text-left'>
                            <ul className='space-y-1 text-text-secondary'>
                              <li>• Everything in VIP</li>
                              <li>• After-party admission</li>
                              <li>• Exclusive dinner with Bossio</li>
                              <li>• Premium networking opportunity</li>
                              <li>• Direct mentorship access</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Availability Status */}
                  <div className='space-y-2 mb-4'>
                    <div className='text-sm font-medium text-center text-text-primary'>
                      Availability
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>
                        General Admission:
                      </span>
                      <span
                        className={`font-medium ${availability.ga > 0 ? 'text-tomb45-green' : 'text-red-500'}`}
                      >
                        {availability.ga > 0 ? 'Available' : 'Sold Out'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>
                        VIP Experience:
                      </span>
                      <span
                        className={`font-medium ${availability.vip > 0 ? 'text-tomb45-green' : 'text-red-500'}`}
                      >
                        {availability.vip > 0 ? 'Available' : 'Sold Out'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>VIP Elite:</span>
                      <span
                        className={`font-medium ${availability.vipElite > 0 ? 'text-tomb45-green' : 'text-red-500'}`}
                      >
                        {availability.vipElite > 0 ? 'Available' : 'Sold Out'}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    className='w-full mb-4 min-h-[48px] touch-manipulation text-base font-semibold transition-all duration-200'
                    variant='primary'
                    disabled={availability.isBooked || isLoading}
                    onClick={e => {
                      e.stopPropagation();
                      handleSelectCity();
                    }}
                  >
                    {availability.isBooked ? (
                      <>
                        <Clock className='w-4 h-4 mr-2' />
                        Join Waitlist
                      </>
                    ) : isLoading ? (
                      <>
                        <div className='w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin' />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className='w-4 h-4 mr-2' />
                        Select {city.city} Workshop
                      </>
                    )}
                  </Button>

                  {/* Additional Info */}
                  <div className='text-center'>
                    <p className='text-xs text-text-muted'>
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
  );
}
