'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle, XCircle, ArrowLeft, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { checkEligibility } from '@/lib/command-center-api';

export default function VerifyMembershipPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    eligible: boolean;
    reason: string;
    memberName?: string;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await checkEligibility(email);

      if (result.eligible && result.reason === 'skool_member') {
        setVerificationResult({
          eligible: true,
          reason: result.reason,
          memberName: result.skoolMember?.name,
        });
      } else if (result.reason === 'already_registered') {
        setVerificationResult({
          eligible: false,
          reason: 'already_registered',
        });
      } else {
        setVerificationResult({
          eligible: false,
          reason: 'not_eligible',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToSignup = () => {
    // Store email in sessionStorage for the signup page
    sessionStorage.setItem('6fb-app-signup-email', email);
    sessionStorage.setItem('6fb-app-signup-type', 'skool_member');
    router.push('/app/signup');
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
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-tomb45-green/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-tomb45-green" />
            </div>
            <CardTitle>Verify Your Membership</CardTitle>
            <CardDescription>
              Enter the email address you used to join the 6FB Skool community.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Not yet verified */}
            {!verificationResult && (
              <form onSubmit={handleVerify} className="space-y-6">
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
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Membership'
                  )}
                </Button>
              </form>
            )}

            {/* Verified successfully */}
            {verificationResult?.eligible && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-tomb45-green/10 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-tomb45-green" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Membership Verified!
                  </h3>
                  <p className="text-text-secondary">
                    Welcome back{verificationResult.memberName ? `, ${verificationResult.memberName}` : ''}!
                    Your 6FB Skool membership has been confirmed.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToSignup}
                >
                  Continue to Create Account
                </Button>
              </div>
            )}

            {/* Already registered */}
            {verificationResult?.reason === 'already_registered' && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-blue-400" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Account Already Exists
                  </h3>
                  <p className="text-text-secondary">
                    You already have a 6FB Command Center account. Open the app and log in with your credentials.
                  </p>
                </div>

                <div className="space-y-3">
                  <a
                    href="sixfb://login"
                    className="block"
                  >
                    <Button variant="primary" size="lg" className="w-full">
                      Open in App
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      setVerificationResult(null);
                      setEmail('');
                    }}
                  >
                    Try Different Email
                  </Button>
                </div>
              </div>
            )}

            {/* Not eligible */}
            {verificationResult?.reason === 'not_eligible' && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Membership Not Found
                  </h3>
                  <p className="text-text-secondary">
                    We couldn&apos;t find an active 6FB Skool membership with this email address.
                  </p>
                </div>

                <div className="space-y-3">
                  <Link href="/app/subscribe">
                    <Button variant="primary" size="lg" className="w-full">
                      Subscribe for $10/month
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      setVerificationResult(null);
                      setEmail('');
                    }}
                  >
                    Try Different Email
                  </Button>
                </div>

                <p className="text-sm text-text-muted">
                  Already a Skool member? Make sure you&apos;re using the same email you used to join the 6FB community.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
