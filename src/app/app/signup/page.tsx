'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserPlus, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createAccount } from '@/lib/command-center-api';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupType, setSignupType] = useState<string | null>(null);

  // Load email from sessionStorage or URL params
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('6fb-app-signup-email');
    const storedType = sessionStorage.getItem('6fb-app-signup-type');
    const urlEmail = searchParams.get('email');
    const urlSessionId = searchParams.get('session_id');

    if (storedEmail) {
      setEmail(storedEmail);
    } else if (urlEmail) {
      setEmail(urlEmail);
    }

    if (storedType) {
      setSignupType(storedType);
    } else if (urlSessionId) {
      setSignupType('paid_subscriber');
    }

    // If coming from Stripe, mark as paid subscriber
    if (urlSessionId) {
      sessionStorage.setItem('6fb-app-stripe-session', urlSessionId);
    }
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await createAccount({
        email,
        password,
        name,
      });

      // Clear sessionStorage
      sessionStorage.removeItem('6fb-app-signup-email');
      sessionStorage.removeItem('6fb-app-signup-type');

      // Store credentials temporarily for success page
      sessionStorage.setItem('6fb-app-signup-success', JSON.stringify({
        email,
        name: result.user.name,
        userId: result.user.id,
      }));

      // Redirect to success page
      router.push('/app/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If no email, redirect to start
  if (!email && typeof window !== 'undefined') {
    // Check again after mount
    const storedEmail = sessionStorage.getItem('6fb-app-signup-email');
    if (!storedEmail) {
      return (
        <div className="min-h-screen bg-background-primary flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Session Expired
              </h2>
              <p className="text-text-secondary mb-6">
                Please start the signup process again.
              </p>
              <Link href="/app">
                <Button variant="primary" size="lg" className="w-full">
                  Start Over
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

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
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-tomb45-green/10 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-tomb45-green" />
            </div>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              {signupType === 'skool_member'
                ? 'Set up your 6FB Command Center account.'
                : 'Complete your registration to access the app.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                disabled={true} // Email is pre-filled from verification
                helperText="Email verified from previous step"
              />

              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={setName}
                required
                disabled={isLoading}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={setPassword}
                  required
                  disabled={isLoading}
                  validate={validatePassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
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
                disabled={isLoading || !email || !name || !password || !confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <p className="mt-6 text-xs text-text-muted text-center">
              By creating an account, you agree to our{' '}
              <a href="https://6fbmethodologies.com/terms" className="text-tomb45-green hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="https://6fbmethodologies.com/privacy" className="text-tomb45-green hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
