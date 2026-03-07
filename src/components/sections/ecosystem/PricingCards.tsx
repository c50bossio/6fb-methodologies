'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Check, Package, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  badge?: string;
  variant?: 'default' | 'featured';
  action: 'stripe' | 'skool';
}

function PricingCard({
  tier,
  index,
  loading,
  onAction,
}: {
  tier: PricingTier;
  index: number;
  loading: string | null;
  onAction: (tier: PricingTier) => void;
}) {
  const isLoading = loading === tier.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="h-full"
    >
      <div
        className={cn(
          'relative h-full rounded-xl p-8 transition-all duration-300',
          tier.variant === 'featured'
            ? 'bg-green-900/20 border-2 border-green-500 hover:bg-green-900/30'
            : 'bg-zinc-900 border border-zinc-800 hover:border-green-500/50',
          'hover:scale-[1.02]'
        )}
      >
        {/* Badge */}
        {tier.badge && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="px-4 py-1 bg-green-500 text-black text-xs font-bold rounded-full whitespace-nowrap">
              {tier.badge}
            </span>
          </div>
        )}

        {/* Name & Description */}
        <h3 className="text-2xl font-semibold text-white mb-2 text-center">
          {tier.name}
        </h3>
        <p className="text-zinc-400 text-sm text-center mb-6">
          {tier.description}
        </p>

        {/* Price */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold text-white">{tier.price}</span>
            <span className="text-zinc-400 text-lg">{tier.period}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-4 mb-8">
          {tier.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-zinc-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          className={cn(
            'w-full',
            tier.variant === 'featured' && 'shadow-green-glow'
          )}
          variant={tier.variant === 'featured' ? 'primary' : 'outline'}
          onClick={() => onAction(tier)}
          disabled={loading !== null}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            tier.ctaText
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (tier: PricingTier) => {
    if (tier.action === 'skool') {
      window.location.href = 'https://www.skool.com/6fb/about';
      return;
    }

    // Stripe checkout
    setError(null);
    setLoading(tier.id);

    try {
      const response = await fetch(
        'https://app.6fbmentorship.com/api/v1/stripe/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'apps' }),
        }
      );

      if (!response.ok) throw new Error('Checkout failed');

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(null);
    }
  };

  const tiers: PricingTier[] = [
    {
      id: 'apps',
      name: 'All Apps',
      price: '$59',
      period: '/mo',
      description: 'Essential tools for productivity',
      features: [
        'Productivity App (iOS & Web)',
        'Content Generator',
        'KPI tracking & analytics',
        'AI-powered coaching & insights',
        'Up to 5 team seats',
        'All future apps included FREE',
      ],
      ctaText: 'Subscribe to Apps',
      action: 'stripe',
      variant: 'default',
    },
    {
      id: 'mentorship',
      name: '6FB Mentorship',
      price: '$120',
      period: '/mo',
      description: 'Coaching community + all apps included',
      badge: 'Best Value',
      features: [
        'Everything in All Apps plan',
        'Skool community access',
        'Weekly coaching calls',
        'Exclusive content library',
        'Direct mentor support',
        'Networking events & workshops',
      ],
      ctaText: 'Join 6FB Mentorship',
      action: 'skool',
      variant: 'featured',
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-black">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto">
            Get the tools and support you need to grow your business.
            6FB Mentorship members get all apps included FREE.
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards Grid - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              index={index}
              loading={loading}
              onAction={handleAction}
            />
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-zinc-400 text-sm">
            Secure payment processing by Stripe. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
