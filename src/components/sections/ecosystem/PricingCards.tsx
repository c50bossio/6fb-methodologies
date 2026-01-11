'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  ctaText: string;
  href: string;
  badge?: 'best-value';
  variant?: 'default' | 'featured';
}

function PricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className='h-full'
    >
      <div
        className={cn(
          'relative h-full rounded-xl p-6 transition-all duration-300',
          tier.variant === 'featured'
            ? 'bg-green-900/20 border-2 border-green-500 hover:bg-green-900/30 transform scale-105'
            : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-green-500/50',
          'hover:scale-[1.02]'
        )}
      >
        {/* Badge */}
        {tier.badge && (
          <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
            <span className='px-4 py-1 bg-green-500 text-white text-xs font-semibold rounded-full'>
              Best Value
            </span>
          </div>
        )}

        {/* Name */}
        <h3 className='text-2xl font-semibold text-white mb-6 text-center'>
          {tier.name}
        </h3>

        {/* Price */}
        <div className='text-center mb-8'>
          <div className='flex items-baseline justify-center gap-1'>
            <span className='text-5xl font-bold text-white'>{tier.price}</span>
            <span className='text-zinc-400 text-lg'>{tier.period}</span>
          </div>
        </div>

        {/* Features */}
        <ul className='space-y-4 mb-8'>
          {tier.features.map((feature, i) => (
            <li key={i} className='flex items-start gap-3'>
              <Check className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
              <span className='text-zinc-300'>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link href={tier.href} className='block'>
          <Button
            className={cn(
              'w-full',
              tier.variant === 'featured' && 'shadow-green-glow'
            )}
            variant={tier.variant === 'featured' ? 'default' : 'outline'}
          >
            {tier.ctaText}
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

export function PricingCards() {
  const tiers: PricingTier[] = [
    {
      name: 'Single App',
      price: '$10',
      period: '/mo',
      features: ['Access to 1 app', 'Basic support', 'Cancel anytime'],
      ctaText: 'Choose App',
      href: '/app/signin',
      variant: 'default',
    },
    {
      name: '2-App Bundle',
      price: '$18',
      period: '/mo',
      features: [
        'Access to 2 apps',
        'Priority support',
        'Save $2/month',
        'Cancel anytime',
      ],
      ctaText: 'Get Bundle',
      href: '/app/signin',
      variant: 'default',
    },
    {
      name: '3-App Bundle',
      price: '$25',
      period: '/mo',
      features: [
        'Access to all 3 apps',
        'Priority support',
        'Save $5/month',
        'Cancel anytime',
      ],
      ctaText: 'Get Bundle',
      href: '/app/signin',
      variant: 'default',
    },
    {
      name: '6FB Membership',
      price: '$197',
      period: '/mo',
      badge: 'best-value',
      features: [
        'All 3 apps included FREE',
        'Skool community access',
        'Weekly coaching calls',
        'Exclusive workshops',
        'Direct mentor support',
        'Networking events',
      ],
      variant: 'featured',
      ctaText: 'Join 6FB',
      href: '/app/signin',
    },
  ];

  return (
    <section id='pricing' className='py-20 bg-black'>
      <div className='container max-w-7xl mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center mb-16'
        >
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
            Choose Your Plan
          </h2>
          <p className='text-lg text-zinc-300 max-w-2xl mx-auto'>
            Select the option that fits your needs. All plans include access to
            premium features and ongoing updates.
          </p>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch'>
          {tiers.map((tier, index) => (
            <PricingCard key={tier.name} tier={tier} index={index} />
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className='text-center mt-12'
        >
          <p className='text-zinc-400 text-sm'>
            All plans include a 7-day money-back guarantee. No questions asked.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
