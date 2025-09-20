'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { CityCard } from '@/components/ui/CityCard';
import { Clock, MapPin, Users } from 'lucide-react';
import {
  CITY_WORKSHOPS,
  getTotalRegisteredCountFromInventory,
} from '@/lib/cities';
import { useState, useEffect } from 'react';

interface CityGridProps {
  className?: string;
}

export function CityGrid({ className }: CityGridProps) {
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTotalRegistered = async () => {
      try {
        setIsLoading(true);
        const total = await getTotalRegisteredCountFromInventory();
        setTotalRegistered(total);
      } catch (error) {
        console.error('Error fetching total registered count:', error);
        // Fallback to static calculation
        const fallbackTotal = CITY_WORKSHOPS.reduce(
          (total, city) =>
            total + city.registeredCount.ga + city.registeredCount.vip,
          0
        );
        setTotalRegistered(fallbackTotal);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalRegistered();
  }, []);

  return (
    <section
      id='cities'
      className={`section-padding bg-background-primary ${className}`}
    >
      <div className='container-custom'>
        {/* Header */}
        <div className='text-center mb-16'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant='success' className='mb-4'>
              6-City National Tour • 2026
            </Badge>
            <h2 className='heading-lg mb-6'>Choose Your Workshop City</h2>
            <p className='body-lg max-w-3xl mx-auto text-text-secondary mb-8'>
              Experience the complete 6FB Methodologies in your region. Each
              workshop delivers the same comprehensive training with local
              market insights and networking opportunities.
            </p>

            {/* Tour Stats */}
            <div className='flex flex-wrap justify-center gap-6 text-sm text-text-muted mb-8'>
              <div className='flex items-center gap-2'>
                <Clock className='w-4 h-4' />
                <span>2 Full Days per City</span>
              </div>
              <div className='flex items-center gap-2'>
                <MapPin className='w-4 h-4' />
                <span>Premium Venues</span>
              </div>
              <div className='flex items-center gap-2'>
                <Users className='w-4 h-4' />
                <span>
                  {isLoading ? (
                    <>
                      <span className='inline-block w-8 h-4 bg-gray-200 animate-pulse rounded'></span>{' '}
                      Barbers Already Registered
                    </>
                  ) : (
                    `${totalRegistered} Barbers Already Registered`
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* City Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto'>
          {CITY_WORKSHOPS.map((city, index) => (
            <CityCard
              key={city.id}
              city={city}
              index={index}
              className='relative'
            />
          ))}
        </div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className='text-center mt-16 space-y-6'
        >
          {/* Benefits */}
          <div className='bg-background-secondary border border-border-primary rounded-xl p-8 max-w-4xl mx-auto'>
            <h3 className='text-xl font-semibold text-text-primary mb-4'>
              Every City Workshop Includes
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary'>
              <div className='flex items-start gap-3'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full mt-2 flex-shrink-0'></div>
                <span>
                  Complete 6FB methodology training with Dre, Nate, and Bossio
                </span>
              </div>
              <div className='flex items-start gap-3'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full mt-2 flex-shrink-0'></div>
                <span>
                  Local market insights and networking with regional barbers
                </span>
              </div>
              <div className='flex items-start gap-3'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full mt-2 flex-shrink-0'></div>
                <span>
                  All materials, workbooks, and certificate of completion
                </span>
              </div>
              <div className='flex items-start gap-3'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full mt-2 flex-shrink-0'></div>
                <span>
                  Snacks, refreshments, and exclusive networking opportunities
                </span>
              </div>
            </div>
          </div>

          {/* Scheduling Information */}
          <div className='bg-tomb45-green/10 border border-tomb45-green/20 rounded-xl p-6 max-w-2xl mx-auto'>
            <h4 className='font-semibold text-text-primary mb-2'>
              Strategic Scheduling
            </h4>
            <p className='text-sm text-text-secondary'>
              We've planned warmer cities during winter months (Dallas, Atlanta,
              Las Vegas) and cooler cities during summer (San Francisco,
              Chicago, NYC) for your comfort and convenience.
            </p>
          </div>

          {/* Security & Refund */}
          <p className='text-xs text-text-muted max-w-2xl mx-auto'>
            Secure payment processing by Stripe. All major credit cards
            accepted. Full refund available within 30 days of purchase AND more
            than 7 days before your selected workshop date.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
