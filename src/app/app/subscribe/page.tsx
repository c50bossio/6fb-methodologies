'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CreditCard, ArrowLeft, CheckCircle, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createSubscription } from '@/lib/command-center-api';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await createSubscription(email, name);

      // If user is already a Skool member, redirect to verify page
      if (result.isSkoolMember) {
        window.location.href = '/app/verify';
        return;
      }

      // If already has pending subscription, redirect to signup
      if (result.canProceedToSignup) {
        sessionStorage.setItem('6fb-app-signup-email', email);
        sessionStorage.setItem('6fb-app-signup-type', 'paid_subscriber');
        window.location.href = '/app/signup';
        return;
      }

      // Redirect to Stripe Checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-primary bg-background-secondary">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <Image
            src="/images/6fb-logo-new.png"
            alt="6FB Logo"
            width={100}
            height={33}
            className="h-8 w-auto"
          />
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle>Subscribe to Command Center</CardTitle>
            <CardDescription>
              Get instant access to all features for just $10/month.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Pricing */}
            <div className="text-center py-4 px-6 bg-background-accent rounded-xl border border-border-primary">
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-4xl font-bold text-text-primary">$10</span>
                <span className="text-text-muted">/month</span>
              </div>
              <p className="text-sm text-text-muted">Cancel anytime. No commitment.</p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              {[
                'Full app access',
                'AI Coach with personalized insights',
                'Track all your KPIs',
                'Compete on the leaderboard',
                'Goal tracking & Money Moves',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-tomb45-green flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubscribe} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={setName}
                required
                disabled={isLoading}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={setEmail}
                required
                disabled={isLoading}
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading || !email || !name}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </form>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <Shield className="w-4 h-4" />
              <span>Secure payment powered by Stripe</span>
            </div>

            {/* Alternative */}
            <div className="text-center pt-4 border-t border-border-primary">
              <p className="text-sm text-text-muted mb-2">
                Already a 6FB Skool member?
              </p>
              <Link href="/app/verify" className="text-tomb45-green hover:underline text-sm">
                Verify your membership for free access
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
