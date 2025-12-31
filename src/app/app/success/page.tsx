'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Smartphone, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface SignupData {
  email: string;
  name: string;
  userId: string;
}

export default function SuccessPage() {
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [copied, setCopied] = useState(false);
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  useEffect(() => {
    // Get signup data from sessionStorage
    const data = sessionStorage.getItem('6fb-app-signup-success');
    if (data) {
      try {
        setSignupData(JSON.parse(data));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const handleOpenApp = () => {
    setDeepLinkAttempted(true);
    // Try to open the app with deep link
    window.location.href = `sixfb://login?email=${encodeURIComponent(signupData?.email || '')}`;

    // If the app doesn't open, they'll stay on this page
    // The button will show "App Store" option after a delay
  };

  const copyEmail = () => {
    if (signupData?.email) {
      navigator.clipboard.writeText(signupData.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <main className="max-w-md mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-tomb45-green/10 flex items-center justify-center animate-scale-in">
              <CheckCircle className="w-12 h-12 text-tomb45-green" />
            </div>
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription>
              Your 6FB Command Center account is ready. Open the app to start tracking your business.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Account Info */}
            {signupData && (
              <div className="p-4 bg-background-accent rounded-xl border border-border-primary space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-primary font-medium">{signupData.email}</span>
                    <button
                      onClick={copyEmail}
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-tomb45-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Name</span>
                  <span className="text-sm text-text-primary font-medium">{signupData.name}</span>
                </div>
              </div>
            )}

            {/* Open App Button */}
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleOpenApp}
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Open in App
              </Button>

              {deepLinkAttempted && (
                <div className="text-center">
                  <p className="text-sm text-text-muted mb-2">
                    App didn&apos;t open?
                  </p>
                  <a
                    href="https://apps.apple.com/app/6fb-command-center/id123456789"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-tomb45-green hover:underline"
                  >
                    Download from App Store
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="border-t border-border-primary pt-6">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Next Steps:
              </h3>
              <ol className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-tomb45-green/10 text-tomb45-green text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Open the 6FB Command Center app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-tomb45-green/10 text-tomb45-green text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Log in with your email and password</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-tomb45-green/10 text-tomb45-green text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Complete the quick onboarding tutorial</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-tomb45-green/10 text-tomb45-green text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <span>Start tracking your KPIs and growing your business!</span>
                </li>
              </ol>
            </div>

            {/* Support */}
            <div className="text-center text-sm text-text-muted">
              <p>
                Need help?{' '}
                <a
                  href="mailto:support@6fbmethodologies.com"
                  className="text-tomb45-green hover:underline"
                >
                  Contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Return to website */}
        <div className="mt-6 text-center">
          <Link
            href="https://6fbmethodologies.com"
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Return to 6FB Methodologies website
          </Link>
        </div>
      </main>
    </div>
  );
}
