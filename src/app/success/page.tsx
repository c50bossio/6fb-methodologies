'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Check, Calendar, Mail, Download, Users } from 'lucide-react';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      // Fetch session details
      fetch(`/api/create-checkout-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSessionData(data.session);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background-primary flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-tomb45-green border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-text-secondary'>Loading your confirmation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background-primary py-12'>
      <div className='container-custom max-w-2xl'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='text-center mb-8'
        >
          <div className='w-16 h-16 bg-tomb45-green rounded-full flex items-center justify-center mx-auto mb-4'>
            <Check className='w-8 h-8 text-white' />
          </div>

          <h1 className='heading-lg mb-4'>Registration Successful!</h1>

          <p className='body-md text-text-secondary'>
            Welcome to the 6FB Methodologies Workshop. You're all set!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='space-y-6'
        >
          {/* Order Confirmation */}
          <Card className='border-tomb45-green/20'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Check className='w-5 h-5 text-tomb45-green' />
                Order Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {sessionData && (
                <>
                  <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                      <span className='text-text-muted'>Order ID:</span>
                      <div className='font-mono'>{sessionData.id}</div>
                    </div>
                    <div>
                      <span className='text-text-muted'>Amount Paid:</span>
                      <div className='font-semibold text-tomb45-green'>
                        ${sessionData.amountTotal}
                      </div>
                    </div>
                    <div>
                      <span className='text-text-muted'>Email:</span>
                      <div>{sessionData.customerEmail}</div>
                    </div>
                    <div>
                      <span className='text-text-muted'>Payment Status:</span>
                      <Badge variant='success'>Paid</Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <Mail className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <div>
                    <h4 className='font-medium text-text-primary'>
                      Confirmation Email
                    </h4>
                    <p className='text-sm text-text-secondary'>
                      You'll receive a detailed confirmation email within 5
                      minutes with your receipt and workshop details.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <Calendar className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <div>
                    <h4 className='font-medium text-text-primary'>
                      Workshop Reminders
                    </h4>
                    <p className='text-sm text-text-secondary'>
                      We'll send you reminders 1 week and 1 day before the
                      workshop with location details and preparation materials.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <Download className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <div>
                    <h4 className='font-medium text-text-primary'>
                      Pre-Workshop Materials
                    </h4>
                    <p className='text-sm text-text-secondary'>
                      Download your preparation guide and worksheets 1 week
                      before the event.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <Users className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <div>
                    <h4 className='font-medium text-text-primary'>
                      Community Access
                    </h4>
                    <p className='text-sm text-text-secondary'>
                      Join our exclusive attendee group to connect with other
                      participants before the workshop.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workshop Details */}
          <Card className='bg-background-secondary'>
            <CardHeader>
              <CardTitle>6FB Methodologies Workshop</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <span className='text-text-muted'>Date:</span>
                  <div className='font-medium'>December 14-15, 2025</div>
                </div>
                <div>
                  <span className='text-text-muted'>Time:</span>
                  <div className='font-medium'>9:00 AM - 5:00 PM</div>
                </div>
                <div>
                  <span className='text-text-muted'>Location:</span>
                  <div className='font-medium'>Details coming via email</div>
                </div>
                <div>
                  <span className='text-text-muted'>Coaches:</span>
                  <div className='font-medium'>Dre, Nate & Bossio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className='flex flex-col sm:flex-row gap-4'>
            <Button
              onClick={() => window.print()}
              variant='secondary'
              className='flex-1'
            >
              <Download className='w-4 h-4 mr-2' />
              Print Confirmation
            </Button>

            <Button
              onClick={() => (window.location.href = '/')}
              className='flex-1'
            >
              Return to Home
            </Button>
          </div>

          {/* Support Contact */}
          <div className='text-center text-sm text-text-muted'>
            <p>
              Questions? Contact us at{' '}
              <a
                href='mailto:dre@tomb45.com'
                className='text-tomb45-green hover:underline'
              >
                dre@tomb45.com
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-background-primary flex items-center justify-center'>
          <div className='text-center'>
            <div className='w-16 h-16 border-4 border-tomb45-green border-t-transparent rounded-full animate-spin mx-auto mb-4' />
            <p className='text-text-secondary'>Loading...</p>
          </div>
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
