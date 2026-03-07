'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Package, Users, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStripeCheckout = async (plan: 'apps') => {
    setError(null);
    setLoading(plan);

    try {
      const response = await fetch('https://app.6fbmentorship.com/api/v1/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

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

  const handleSkoolRedirect = () => {
    window.location.href = 'https://www.skool.com/6fb/about';
  };

  const pricingTiers = [
    {
      id: 'apps',
      name: 'Apps',
      price: '$59',
      period: '/month',
      description: 'Essential tools for productivity',
      icon: Package,
      features: [
        'Productivity App (iOS & Web)',
        'Content Generator',
        'KPI tracking & analytics',
        'AI-powered insights',
      ],
      buttonText: 'Subscribe to Apps',
      onClick: () => handleStripeCheckout('apps'),
    },
    {
      id: 'mentorship',
      name: 'Mentorship',
      price: '$120',
      period: '/month',
      description: 'Coaching community + all apps',
      icon: Users,
      features: [
        'Everything in Apps plan',
        'Skool community access',
        'Weekly coaching calls',
        'Exclusive content library',
        'Priority support',
      ],
      buttonText: 'Join Mentorship',
      onClick: handleSkoolRedirect,
      badge: 'Most Popular',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-white hover:opacity-90 transition-opacity">
            <span className="text-green-500">6FB</span> Methodologies
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            Choose Your Plan
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
            Get the tools and support you need to grow your business.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {pricingTiers.map((tier) => {
            const Icon = tier.icon;
            const isLoading = loading === tier.id;

            return (
              <Card
                key={tier.id}
                className={`relative bg-zinc-800 border-zinc-700 hover:border-green-500 transition-all ${
                  tier.badge ? 'border-green-500/50' : ''
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-black text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <CardTitle className="text-white text-xl sm:text-2xl">{tier.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl sm:text-5xl font-bold text-white">{tier.price}</span>
                    <span className="text-zinc-400 text-lg">{tier.period}</span>
                  </div>
                  <CardDescription className="text-zinc-400 text-sm sm:text-base">
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2.5 sm:space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-zinc-300 text-sm sm:text-base">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold text-base sm:text-lg h-11 sm:h-12"
                    onClick={tier.onClick}
                    disabled={loading !== null}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      tier.buttonText
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="text-center mt-8 sm:mt-12">
          <p className="text-zinc-400 mb-2 text-sm sm:text-base">Questions about pricing?</p>
          <a href="mailto:support@6fbmentorship.com" className="text-green-500 hover:text-green-400 font-medium text-sm sm:text-base">
            Contact support
          </a>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm">
            ← Back to main page
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-xs sm:text-sm text-zinc-500">
            © {new Date().getFullYear()} 6FB Methodologies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
