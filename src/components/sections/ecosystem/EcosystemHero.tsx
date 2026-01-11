'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { StatBadge } from '@/components/ui/StatBadge';
import Link from 'next/link';
import { Users, Calendar, TrendingUp, ChevronDown } from 'lucide-react';

export function EcosystemHero() {
  const scrollToContent = () => {
    const offset = window.innerHeight;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  };

  return (
    <section className='relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-zinc-900 to-black overflow-hidden'>
      {/* Background decorative elements */}
      <div className='absolute inset-0 opacity-20'>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/30 rounded-full blur-3xl' />
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl' />
      </div>

      <div className='container mx-auto px-4 py-20 relative z-10'>
        <div className='max-w-4xl mx-auto text-center'>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className='inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-green-500/50 mb-8'
          >
            <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
            <span className='text-sm font-semibold text-white'>
              Built for Six-Figure Barbers
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className='text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight'
          >
            Transform Your{' '}
            <span className='text-green-500 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent'>
              Barber Business
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className='text-xl md:text-2xl text-zinc-300 mb-8 max-w-2xl mx-auto'
          >
            6FB members get{' '}
            <span className='text-green-500 font-semibold'>FREE access</span> to
            all apps and tools. Build your empire with proven systems and AI-powered
            coaching.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-6'
          >
            <Link href='/app/signin'>
              <Button size='lg' className='shadow-green-glow w-full sm:w-auto'>
                Join 6FB Mentorship
              </Button>
            </Link>
            <Link href='/app/signin'>
              <Button
                size='lg'
                variant='outline'
                className='border-zinc-700 hover:border-green-500 w-full sm:w-auto'
              >
                Already a member? Login
              </Button>
            </Link>
          </motion.div>

          {/* Secondary Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              href='#apps'
              className='inline-flex items-center gap-2 text-zinc-400 hover:text-green-500 transition-colors text-sm'
            >
              Get the apps standalone
              <svg
                className='w-4 h-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 8l4 4m0 0l-4 4m4-4H3'
                />
              </svg>
            </Link>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.button
            onClick={scrollToContent}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
              repeatDelay: 1,
            }}
            className='mt-12 flex flex-col items-center gap-2 text-zinc-500 hover:text-green-500 transition-colors mx-auto'
            aria-label='Scroll to explore'
          >
            <span className='text-sm'>Scroll to explore</span>
            <ChevronDown className='w-6 h-6' />
          </motion.button>
        </div>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className='absolute bottom-8 left-0 right-0 z-10'
      >
        <div className='container mx-auto px-4'>
          <div className='flex flex-wrap items-center justify-center gap-4 md:gap-8'>
            <StatBadge icon={Users} value='2,000+' label='Active Users' />
            <StatBadge icon={Calendar} value='5+ Years' label='Experience' />
            <StatBadge icon={TrendingUp} value='$100K+' label='Success Stories' />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
