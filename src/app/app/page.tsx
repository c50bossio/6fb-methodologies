'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, CreditCard, Users, Smartphone, TrendingUp, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AppAccessPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-primary bg-background-secondary">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center">
          <Image
            src="/images/6fb-logo-new.png"
            alt="6FB Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Get Access to the
            <span className="text-tomb45-green"> 6FB Command Center</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Track your KPIs, get AI coaching, compete on the leaderboard, and build your six-figure barbershop business.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: TrendingUp, label: 'Track KPIs' },
            { icon: MessageSquare, label: 'AI Coach' },
            { icon: Users, label: 'Leaderboard' },
            { icon: Smartphone, label: 'Mobile App' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center p-4 bg-background-secondary rounded-xl border border-border-primary">
              <Icon className="w-8 h-8 text-tomb45-green mb-2" />
              <span className="text-sm text-text-secondary">{label}</span>
            </div>
          ))}
        </div>

        {/* Access Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Option 1: 6FB Members */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-tomb45-green" />
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-6 h-6 text-tomb45-green" />
                <span className="text-sm font-medium text-tomb45-green uppercase tracking-wide">
                  6FB Members
                </span>
              </div>
              <CardTitle>Already a Member?</CardTitle>
              <CardDescription>
                If you&apos;re part of the 6FB Skool community, you get free access to the Command Center app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {['Free access for Skool members', 'Full app features', 'AI coaching included', 'Leaderboard access'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle className="w-5 h-5 text-tomb45-green flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app/verify">
                <Button variant="primary" size="lg" className="w-full">
                  Verify My Membership
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Option 2: Subscribe */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tomb45-green to-blue-500" />
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-6 h-6 text-blue-400" />
                <span className="text-sm font-medium text-blue-400 uppercase tracking-wide">
                  Subscribe
                </span>
              </div>
              <CardTitle>Not a Member Yet?</CardTitle>
              <CardDescription>
                Get instant access to the Command Center app with a monthly subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-text-primary">$10</span>
                  <span className="text-text-muted">/month</span>
                </div>
                <p className="text-sm text-text-muted">Cancel anytime. No commitment.</p>
              </div>
              <ul className="space-y-3 mb-6">
                {['Full app access', 'AI coaching', 'Track all your KPIs', 'Compete on leaderboard'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app/subscribe">
                <Button variant="outline" size="lg" className="w-full border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white">
                  Subscribe Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Already have account */}
        <div className="text-center">
          <p className="text-text-muted mb-2">Already have an account?</p>
          <p className="text-text-secondary">
            Open the 6FB Command Center app and log in with your credentials.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary bg-background-secondary mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} 6FB Methodologies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
