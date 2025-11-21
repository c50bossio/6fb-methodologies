'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ArrowRight, Calendar, MapPin, Users } from 'lucide-react';

export function HeroSection() {
  const scrollToCities = () => {
    document.getElementById('cities')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className='relative min-h-screen flex items-center justify-center overflow-hidden pt-20'>
      {/* Layer 1: Background Banner Image */}
      <div className='absolute inset-0'>
        <div className='absolute inset-0 bg-gradient-to-br from-background-primary via-background-secondary to-background-primary opacity-30' />
        <img
          src='/images/6fb-banner.png'
          alt='6FB Workshop Group Photo'
          className='w-full h-full object-cover object-center'
          loading='eager'
          fetchPriority='high'
          decoding='sync'
        />
      </div>

      {/* Layer 2: Dark Overlay for Text Readability */}
      <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/40' />

      {/* Layer 3: Content Overlay */}
      <div className='container-custom relative z-10'>
        <div className='text-center max-w-5xl mx-auto critical-content'>
          {/* Event Badge - More Prominent */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className='inline-flex items-center gap-2 bg-tomb45-green/20 backdrop-blur-sm border border-tomb45-green/40 rounded-full px-6 py-3 mb-8'
          >
            <Calendar className='w-4 h-4 text-tomb45-green' />
            <span className='text-sm font-semibold text-tomb45-green'>
              An EWP Event • Tampa • July 19-20, 2025
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
            className='heading-xl mb-6 text-balance text-white drop-shadow-lg'
          >
            <span className='text-tomb45-green block mb-2'>
              EWP: <Logo size='inline' variant='inline' /> Methodologies
            </span>
            Transform Your Barbering Business with Proven Systems
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className='body-lg max-w-3xl mx-auto mb-8 text-balance text-white/90 drop-shadow-md'
          >
            Join our team of 6 expert coaches in Tampa for an intensive 2-day
            workshop where you&apos;ll master the systems, marketing strategies,
            and wealth-building techniques that have helped thousands of barbers
            build six-figure businesses.
          </motion.p>

          {/* Key Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            className='flex flex-wrap justify-center gap-8 mb-10'
          >
            <div className='flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2'>
              <Users className='w-5 h-5 text-tomb45-green' />
              <span className='text-white/90 font-medium'>
                2 Intensive Days
              </span>
            </div>
            <div className='flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2'>
              <MapPin className='w-5 h-5 text-tomb45-green' />
              <span className='text-white/90 font-medium'>
                6 Expert Coaches
              </span>
            </div>
            <div className='flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2'>
              <Calendar className='w-5 h-5 text-tomb45-green' />
              <span className='text-white/90 font-medium'>Proven Systems</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            className='flex flex-col sm:flex-row gap-4 justify-center mb-12'
          >
            <Button
              size='xl'
              onClick={scrollToCities}
              className='group shadow-green-glow animate-pulse-green'
            >
              Register for Tampa Workshop
              <ArrowRight className='ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform' />
            </Button>
            <Button
              variant='outline'
              size='xl'
              onClick={() =>
                document
                  .getElementById('overview')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className='bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:border-white/50'
            >
              Learn More
            </Button>
          </motion.div>

          {/* Value Proposition */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
            className='bg-black/30 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-2xl mx-auto'
          >
            <h3 className='text-lg font-semibold text-white mb-3'>
              What You&apos;ll Leave With:
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/90'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full' />
                <span>Clear KPIs that drive profit</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full' />
                <span>90-day growth plan</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full' />
                <span>Proven marketing systems</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-tomb45-green rounded-full' />
                <span>Wealth-building strategies</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Scroll indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
        className='absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer group'
        onClick={() =>
          document
            .getElementById('overview')
            ?.scrollIntoView({ behavior: 'smooth' })
        }
        suppressHydrationWarning
      >
        <div className='w-7 h-12 border-2 border-white/30 rounded-full flex justify-center bg-black/10 backdrop-blur-sm shadow-green-glow/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-green-glow/40 group-hover:border-white/50'>
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatType: 'reverse',
            }}
            className='w-1.5 h-4 bg-tomb45-green rounded-full mt-2 group-hover:bg-tomb45-green-light transition-colors duration-300'
          />
        </div>

        {/* Touch target for mobile */}
        <div
          className='absolute inset-0 w-12 h-12 -m-3 rounded-full'
          aria-label='Scroll to next section'
        />
      </motion.div>
    </section>
  );
}
