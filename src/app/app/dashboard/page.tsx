'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calculator, BarChart3, FileText, Loader2, ExternalLink, LogOut } from 'lucide-react';

/**
 * Landing Page Dashboard - App Selector
 *
 * Shows available apps based on user's access flags:
 * - is6FBMember: Access to ALL apps (Calculator, Productivity, Content Generator)
 * - calculatorAccess: Access to Calculator only
 * - productivityAccess: Access to Productivity App only
 *
 * Flow:
 * 1. Calls /api/auth/me to get user + access flags
 * 2. Shows app tiles based on access
 * 3. Clicking tile generates SSO URL with JWT
 * 4. Redirects to app's /api/auth/sso-login endpoint
 */

interface UserAccess {
  is6FBMember: boolean;
  calculatorAccess: boolean;
  productivityAccess: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  is6FBMember: boolean;
  calculatorAccess: boolean;
  productivityAccess: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      // Get user info from backend (includes access flags)
      const response = await fetch('https://app.6fbmentorship.com/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        router.push('/app/signin');
        return;
      }

      const data = await response.json();
      const userData = data.user || data.data?.user;

      if (!userData) {
        router.push('/app/signin');
        return;
      }

      setUser(userData);
      setAccess({
        is6FBMember: userData.is6FBMember || false,
        calculatorAccess: userData.calculatorAccess || false,
        productivityAccess: userData.productivityAccess || false,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auth check failed:', error);
      setError('Failed to load your apps. Please try signing in again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppClick = async (appUrl: string) => {
    try {
      // Get JWT token from sessionStorage
      const token = sessionStorage.getItem('auth_token');
      if (!token) {
        // No token - redirect to signin
        router.push('/app/signin');
        return;
      }

      // Redirect to app with SSO token
      window.location.href = `${appUrl}/api/auth/sso-login?token=${token}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('SSO redirect failed:', error);
      setError('Failed to launch app. Please try again.');
    }
  };

  const handleSignOut = () => {
    // Clear session storage
    sessionStorage.removeItem('auth_token');
    // Redirect to home
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-lime-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading your apps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Link href="/app/signin">
                <Button className="bg-lime-500 hover:bg-lime-600 text-black">
                  Sign In Again
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAnyAccess = access?.calculatorAccess || access?.productivityAccess || access?.is6FBMember;

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/images/6fb-logo-new.png"
              alt="6FB Methodologies"
              width={100}
              height={33}
              priority
            />
            <div>
              <h1 className="text-2xl font-bold text-white">My Apps</h1>
              <p className="text-zinc-400 text-sm">Welcome back, {user?.name || user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="max-w-7xl mx-auto">
        {hasAnyAccess ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Calculator App */}
            {(access?.calculatorAccess || access?.is6FBMember) && (
              <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-500 transition-all cursor-pointer group">
                <CardContent className="p-6" onClick={() => handleAppClick('https://calculator.6fbmentorship.com')}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Calculator className="w-8 h-8 text-blue-500" />
                    </div>
                    <ExternalLink className="w-5 h-5 text-zinc-400 group-hover:text-lime-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Booth vs Suite Calculator
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Financial comparison tool to help you decide between booth rental and suite ownership
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="px-2 py-1 bg-blue-500/10 rounded">Financial Analysis</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Productivity App */}
            {(access?.productivityAccess || access?.is6FBMember) && (
              <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-500 transition-all cursor-pointer group">
                <CardContent className="p-6" onClick={() => handleAppClick('https://app.6fbmentorship.com')}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-lime-500/10 rounded-lg">
                      <BarChart3 className="w-8 h-8 text-lime-500" />
                    </div>
                    <ExternalLink className="w-5 h-5 text-zinc-400 group-hover:text-lime-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    6FB Command Center
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Track KPIs, get AI coaching insights, compete on the leaderboard, and grow your business
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="px-2 py-1 bg-lime-500/10 rounded">Productivity</div>
                    <div className="px-2 py-1 bg-purple-500/10 rounded">AI Coaching</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Generator */}
            {access?.is6FBMember && (
              <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-500 transition-all cursor-pointer group">
                <CardContent className="p-6" onClick={() => handleAppClick('https://content.6fbmentorship.com')}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <FileText className="w-8 h-8 text-purple-500" />
                    </div>
                    <ExternalLink className="w-5 h-5 text-zinc-400 group-hover:text-lime-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Content Generator
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    AI-powered content creation for social media, marketing, and client communication
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="px-2 py-1 bg-purple-500/10 rounded">6FB Members Only</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No Apps Available</h3>
              <p className="text-zinc-400 mb-6">
                You don&apos;t have access to any apps yet. Purchase a subscription to get started.
              </p>
              <Link href="/">
                <Button className="bg-lime-500 hover:bg-lime-600 text-black font-semibold">
                  View Available Apps
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Footer Note */}
        {hasAnyAccess && (
          <div className="mt-8 text-center text-sm text-zinc-500">
            <p>Click any app to launch via Single Sign-On</p>
            {access?.is6FBMember && (
              <p className="mt-1 text-lime-500 font-medium">
                ✓ 6FB Member - Full Access to All Apps
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
