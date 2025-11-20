'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { CityCard } from '@/components/ui/CityCard';
import { Clock, MapPin } from 'lucide-react';
import { CITY_WORKSHOPS } from '@/lib/cities';
import { useState, useEffect } from 'react';

interface CityGridProps {
  className?: string;
}

export function CityGrid({ className }: CityGridProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <section
        id='cities'
        className={`section-padding bg-background-primary ${className}`}
      >
        <div className='container-custom'>
          <div className='text-center mb-16'>
            <div>
              <Badge variant='success' className='mb-4'>
                Tampa Workshop • July 19-20, 2025
              </Badge>
              <h2 className='heading-lg mb-6'>Register for Tampa Workshop</h2>
              <p className='body-lg max-w-3xl mx-auto text-text-secondary mb-8'>
                Experience the complete 6FB Methodologies with our team of 6 expert coaches.
                Comprehensive training with market insights and networking opportunities.
              </p>
              <div className='flex flex-wrap justify-center gap-6 text-sm text-text-muted mb-8'>
                <div className='flex items-center gap-2'>
                  <Clock className='w-4 h-4' />
                  <span>2 Full Days</span>
                </div>
                <div className='flex items-center gap-2'>
                  <MapPin className='w-4 h-4' />
                  <span>Tampa, Florida</span>
                </div>
              </div>
            </div>
          </div>
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
        </div>
      </section>
    );
  }

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
              Tampa Workshop • July 19-20, 2025
            </Badge>
            <h2 className='heading-lg mb-6'>Register for Tampa Workshop</h2>
            <p className='body-lg max-w-3xl mx-auto text-text-secondary mb-8'>
              Experience the complete 6FB Methodologies with our team of 6 expert coaches.
              Comprehensive training with market insights and networking opportunities.
            </p>

            {/* Tour Stats */}
            <div className='flex flex-wrap justify-center gap-6 text-sm text-text-muted mb-8'>
              <div className='flex items-center gap-2'>
                <Clock className='w-4 h-4' />
                <span>2 Full Days</span>
              </div>
              <div className='flex items-center gap-2'>
                <MapPin className='w-4 h-4' />
                <span>Tampa, Florida</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* City Grid */}
        <div className='flex justify-center max-w-7xl mx-auto'>
          {CITY_WORKSHOPS.map((city, index) => (
            <CityCard
              key={city.id}
              city={city}
              index={index}
              className='relative w-full max-w-md'
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
              Tampa Workshop Includes
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary'>
              <div className='flex items-start gap-3'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full mt-2 flex-shrink-0'></div>
                <span>
                  Complete 6FB methodology training with our team of 6 expert coaches
                </span>
              </div>
              <div className='flex items-start gap-3'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full mt-2 flex-shrink-0'></div>
                <span>
                  Tampa market insights and networking with local barbers
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
