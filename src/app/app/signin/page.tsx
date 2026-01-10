'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LogIn, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/**
 * Landing Page Sign In
 *
 * This is the ONLY web signin page - enforces single source of truth architecture.
 * Individual apps (Calculator, Productivity, Content Generator) use SSO only.
 *
 * Flow:
 * 1. User enters email + password
 * 2. Calls backend API: POST https://app.6fbmentorship.com/api/auth/signin
 * 3. Backend returns JWT with access flags
 * 4. Stores JWT in sessionStorage
 * 5. Redirects to dashboard (/app/dashboard)
 * 6. Dashboard shows available apps based on access flags
 * 7. Clicking app tile generates SSO URL with JWT
 */
export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Call backend signin endpoint
      const response = await fetch('https://app.6fbmentorship.com/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Invalid credentials' }));
        throw new Error(data.message || 'Invalid credentials');
      }

      const { data } = await response.json();

      // Store JWT in sessionStorage (for SSO redirects to apps)
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
            Sign In
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your credentials to access your apps
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
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
                  onChange={(e) => setPassword(e.target.value)}
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
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link href="/app/signup" className="text-lime-500 hover:text-lime-400 font-medium">
                Sign up
              </Link>
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-lime-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-zinc-500">
        <p>Single Sign-On for all 6FB apps</p>
      </div>
    </div>
  );
}
