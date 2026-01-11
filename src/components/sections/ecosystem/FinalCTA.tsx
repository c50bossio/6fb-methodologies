'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';

export function FinalCTA() {
  const benefits = [
    'Join 2,000+ successful barbers',
    'Access all apps and tools',
    'Weekly coaching and support',
    '7-day money-back guarantee',
  ];

  return (
    <section className='py-20 bg-gradient-to-br from-green-900 via-zinc-900 to-black relative overflow-hidden'>
      {/* Background decorative elements */}
      <div className='absolute inset-0 opacity-10'>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500 rounded-full blur-3xl' />
      </div>

      <div className='container max-w-5xl mx-auto px-4 relative z-10'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center'
        >
          {/* Headline */}
          <h2 className='text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight'>
            Ready to Transform{' '}
            <span className='text-green-500'>Your Business?</span>
          </h2>

          {/* Subheadline */}
          <p className='text-xl md:text-2xl text-zinc-300 mb-8 max-w-3xl mx-auto'>
            Stop guessing and start growing. Join thousands of barbers who have
            transformed their businesses with the Bossio Standard.
          </p>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className='flex flex-wrap justify-center gap-4 md:gap-6 mb-10'
          >
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className='flex items-center gap-2 text-zinc-300'
              >
                <CheckCircle className='w-5 h-5 text-green-500 flex-shrink-0' />
                <span>{benefit}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className='flex flex-col sm:flex-row items-center justify-center gap-4'
          >
            <Link href='/app/signin'>
              <Button size='lg' className='shadow-green-glow w-full sm:w-auto'>
                Join 6FB Mentorship
                <ArrowRight className='w-5 h-5 ml-2' />
              </Button>
            </Link>
            <Link href='#pricing'>
              <Button
                size='lg'
                variant='outline'
                className='border-zinc-700 hover:border-green-500 w-full sm:w-auto'
              >
                View Pricing Options
              </Button>
            </Link>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className='mt-10 text-zinc-500 text-sm'
          >
            <p>
              Trusted by 2,000+ barbers worldwide • 4.9/5 rating • 7-day
              money-back guarantee
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
