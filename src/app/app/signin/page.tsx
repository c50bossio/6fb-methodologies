'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LogIn, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/**
 * Enhanced Multi-Step Sign In Flow
 *
 * Phase 3: Frontend rewrite with intelligent routing based on membership status
 *
 * Flow:
 * 1. Email step: Check if user is a 6FB member and if account exists
 * 2. Route to appropriate next step:
 *    - 6FB member + no account → auto-create → set password
 *    - 6FB member + account but no password → set password
 *    - 6FB member + has password → password login
 *    - Not 6FB member + no account → error (must purchase or verify membership)
 *    - Not 6FB member + has account → password login
 * 3. Set password step: For first-time 6FB members (auto-login after)
 * 4. Password step: Normal login for existing accounts with passwords
 */

type SignInStep = 'email' | 'password' | 'set-password';

interface AccountStatus {
  exists: boolean;
  hasPassword: boolean;
  userId?: string;
}

export default function SignInPage() {
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState<SignInStep>('email');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Membership status
  const [is6FBMember, setIs6FBMember] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  /**
   * Step 1: Email submission
   * Checks 6FB membership and account existence
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Check if user is a 6FB member
      const membershipResponse = await fetch('/api/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const membershipData = await membershipResponse.json();
      const isMember = membershipResponse.ok && membershipData.isVerified === true;
      setIs6FBMember(isMember);

      // Check if account exists in backend
      const accountResponse = await fetch('https://app.6fbmentorship.com/api/auth/check-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const accountData = await accountResponse.json();
      const account: AccountStatus = {
        exists: accountData.exists || false,
        hasPassword: accountData.hasPassword || false,
        userId: accountData.userId,
      };
      setAccountStatus(account);

      // Route based on membership and account status
      if (isMember && !account.exists) {
        // Scenario 1: 6FB member + no account → auto-create account
        await createMemberAccount();
      } else if (isMember && account.exists && !account.hasPassword) {
        // Scenario 2: 6FB member + account but no password → set password
        setCurrentStep('set-password');
      } else if (isMember && account.exists && account.hasPassword) {
        // Scenario 3: 6FB member + has password → normal login
        setCurrentStep('password');
      } else if (!isMember && !account.exists) {
        // Scenario 4: Not 6FB member + no account → show error
        setError('No account found. Please purchase an app or verify your 6FB membership.');
      } else if (!isMember && account.exists) {
        // Scenario 5: Not 6FB member + has account → normal login
        setCurrentStep('password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify account');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-create account for verified 6FB member
   */
  const createMemberAccount = async () => {
    try {
      const response = await fetch('https://app.6fbmentorship.com/api/auth/create-member-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'fallback'  // Source is 'fallback' since we verified via frontend fallback list
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      const data = await response.json();
      setAccountStatus({
        exists: true,
        hasPassword: false,
        userId: data.userId,
      });

      // Move to password setup
      setCurrentStep('set-password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  /**
   * Step 2: Password login
   */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://app.6fbmentorship.com/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Invalid credentials' }));
        throw new Error(data.message || 'Invalid credentials');
      }

      const { data } = await response.json();

      // Store JWT in sessionStorage
      if (data.token) {
        sessionStorage.setItem('auth_token', data.token);
      }

      // Redirect to dashboard
      router.push('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 3: Set password for first-time 6FB members
   */
  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://app.6fbmentorship.com/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to set password');
      }

      const { data } = await response.json();

      // Store JWT in sessionStorage
      if (data.token) {
        sessionStorage.setItem('auth_token', data.token);
      }

      // Auto-login: redirect to dashboard
      router.push('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Back to email step
   */
  const handleBackToEmail = () => {
    setCurrentStep('email');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setIs6FBMember(false);
    setAccountStatus(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/images/6fb-logo-new.png"
          alt="6FB Methodologies"
          width={120}
          height={40}
          priority
        />
      </div>

      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <LogIn className="w-6 h-6 text-lime-500" />
            {currentStep === 'email' && 'Sign In'}
            {currentStep === 'password' && 'Enter Password'}
            {currentStep === 'set-password' && 'Create Password'}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {currentStep === 'email' && 'Enter your email to continue'}
            {currentStep === 'password' && 'Enter your password to sign in'}
            {currentStep === 'set-password' && 'Set up your password for free 6FB member access'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* 6FB Member Badge (shown on set-password step) */}
          {currentStep === 'set-password' && is6FBMember && (
            <div className="mb-4 p-3 rounded-lg bg-lime-900/30 border border-lime-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-lime-500" />
                <p className="text-sm font-semibold text-lime-400">
                  Verified 6FB Member - Free Access
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {currentStep === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={setEmail}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Password Login */}
          {currentStep === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="email-display" className="block text-sm font-medium text-zinc-300 mb-1">
                  Email
                </label>
                <div className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700">
                  <p className="text-white">{email}</p>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={setPassword}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <button
                type="button"
                onClick={handleBackToEmail}
                className="w-full text-sm text-zinc-400 hover:text-lime-500 transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {/* Step 3: Set Password */}
          {currentStep === 'set-password' && (
            <form onSubmit={handleSetPasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="email-display" className="block text-sm font-medium text-zinc-300 mb-1">
                  Email
                </label>
                <div className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700">
                  <p className="text-white">{email}</p>
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-zinc-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    required
                    value={password}
                    onChange={setPassword}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    required
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account & Sign In'
                )}
              </Button>

              <button
                type="button"
                onClick={handleBackToEmail}
                className="w-full text-sm text-zinc-400 hover:text-lime-500 transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            {currentStep === 'email' && (
              <>
                <p className="text-sm text-zinc-400">
                  Don&apos;t have access yet?{' '}
                  <Link href="/app/pricing" className="text-lime-500 hover:text-lime-400 font-medium">
                    View Pricing
                  </Link>
                </p>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-lime-500 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to home
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-zinc-500">
        <p>Single Sign-On for all 6FB apps</p>
      </div>
    </div>
  );
}
