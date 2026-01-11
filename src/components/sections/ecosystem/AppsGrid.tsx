'use client';

import { motion } from 'framer-motion';
import { OfferingCard } from '@/components/ui/OfferingCard';
import { Smartphone, Sparkles, Calculator, TrendingUp } from 'lucide-react';

export function AppsGrid() {
  const apps = [
    {
      icon: <Smartphone className='w-6 h-6' />,
      title: 'Productivity App',
      description:
        'Track KPIs, set goals, and get AI coaching to grow your business. Your personal business dashboard.',
      badge: 'most-popular' as const,
      href: '/app/signin',
      ctaText: 'Get Started',
    },
    {
      icon: <Sparkles className='w-6 h-6' />,
      title: 'Content Generator',
      description:
        'Create content that sounds like you. AI-powered captions, posts, and marketing materials.',
      badge: '6fb-only' as const,
      href: '/app/signin',
      ctaText: 'Learn More',
    },
    {
      icon: <Calculator className='w-6 h-6' />,
      title: 'Booth vs Suite Calculator',
      description:
        'Make informed decisions about booth rental vs suite ownership with data-driven insights.',
      href: '/app/signin',
      ctaText: 'Try Calculator',
    },
    {
      icon: <TrendingUp className='w-6 h-6' />,
      title: 'Bossio Investing',
      description:
        'Learn to invest and build wealth. Stock market education designed specifically for barbers.',
      badge: 'new' as const,
      href: '/app/signin',
      ctaText: 'Start Learning',
    },
  ];

  return (
    <section id='apps' className='py-20 bg-zinc-950'>
      <div className='container max-w-7xl mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center mb-12'
        >
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
            6FB Apps & Tools
          </h2>
          <p className='text-lg text-zinc-300 max-w-2xl mx-auto'>
            Choose individual apps at{' '}
            <span className='text-green-500 font-semibold'>$10/month</span> each,
            or get{' '}
            <span className='text-green-500 font-semibold'>FREE access</span> to
            all with 6FB Membership
          </p>
        </motion.div>

        {/* Apps Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {apps.map((app, index) => (
            <motion.div
              key={app.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <OfferingCard {...app} />
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className='text-center mt-12'
        >
          <p className='text-zinc-400'>
            Want all apps included?{' '}
            <a
              href='#pricing'
              className='text-green-500 hover:text-green-400 font-semibold transition-colors'
            >
              See 6FB Membership →
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
