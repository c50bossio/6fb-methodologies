'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Check,
  Star,
  Users,
  Calendar,
  Clock,
  Coffee,
  Award,
  Mail,
  Loader2,
  ArrowLeft,
  MapPin,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  calculatePricing,
  calculateBulkDiscount,
  getSixFBDiscount,
} from '@/lib/stripe';
import { getCityById } from '@/lib/cities';
import type { CityWorkshop } from '@/types';

interface PricingTier {
  id: 'ga' | 'vip' | 'vip_elite';
  name: string;
  originalPrice: number;
  description: string;
  features: string[];
  icon: React.ElementType;
  popular?: boolean;
}

function PricingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<CityWorkshop | null>(null);
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isVerified: boolean;
    memberName?: string;
  } | null>(null);
  const [quantities, setQuantities] = useState({ ga: 1, vip: 1, vip_elite: 1 });
  const [pricing, setPricing] = useState<{ ga: any; vip: any; vip_elite: any }>({
    ga: null,
    vip: null,
    vip_elite: null,
  });
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);

  const tiers: PricingTier[] = [
    {
      id: 'ga',
      name: 'General Admission',
      originalPrice: 300,
      description: 'Access to both workshop days',
      icon: Users,
      features: [
        'Access to Day 1 workshop',
        'Access to Day 2 workshop',
      ],
    },
    {
      id: 'vip',
      name: 'VIP',
      originalPrice: 500,
      description: 'Best seating and exclusive gift bag',
      icon: Star,
      popular: true,
      features: [
        'Everything in General Admission',
        'Best seating at the event',
        'Gift bag with products',
        'Workbooks included',
        'After-party admission',
        'Sponsor surprises',
      ],
    },
    {
      id: 'vip_elite',
      name: 'VIP Elite',
      originalPrice: 750,
      description: 'Ultimate experience with exclusive dinner with Bossio',
      icon: Award,
      popular: false,
      features: [
        'Everything in VIP',
        'After-party admission',
        'Exclusive dinner with Bossio',
        'Premium networking opportunity',
        'Direct mentorship access',
      ],
    },
  ];

  useEffect(() => {
    const cityId = searchParams.get('city');
    console.log('Pricing page - City ID from URL:', cityId);

    if (cityId) {
      const city = getCityById(cityId);
      console.log('Found city data:', city);

      if (city) {
        setSelectedCity(city);
      } else {
        console.warn(`Invalid city ID: ${cityId}`);
        // Add a delay before redirect to avoid immediate bounce
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } else {
      console.warn('No city selected');
      // Add a delay before redirect to avoid immediate bounce
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  }, [searchParams, router]);

  const verifyMember = async () => {
    if (!email) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      setVerificationResult(result);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({ isVerified: false });
    } finally {
      setIsVerifying(false);
    }
  };

  // Calculate prices with proper async handling
  useEffect(() => {
    const calculatePrices = async () => {
      if (!selectedCity) return;

      setIsCalculatingPrices(true);
      try {
        const gaResult = await calculatePricing(
          'GA',
          quantities.ga,
          verificationResult?.isVerified || false,
          verificationResult?.isVerified ? email : undefined
        );

        const vipResult = await calculatePricing(
          'VIP',
          quantities.vip,
          verificationResult?.isVerified || false,
          verificationResult?.isVerified ? email : undefined
        );

        const vipEliteResult = await calculatePricing(
          'VIP_ELITE',
          quantities.vip_elite,
          verificationResult?.isVerified || false,
          verificationResult?.isVerified ? email : undefined
        );

        setPricing({ ga: gaResult, vip: vipResult, vip_elite: vipEliteResult });
      } catch (error) {
        console.error('Pricing calculation error:', error);
        // Fallback to default prices
        setPricing({
          ga: {
            originalPrice: 300,
            finalPrice: 300,
            discount: 0,
            discountReason: '',
            savings: 0,
            discountEligible: true,
          },
          vip: {
            originalPrice: 500,
            finalPrice: 500,
            discount: 0,
            discountReason: '',
            savings: 0,
            discountEligible: true,
          },
          vip_elite: {
            originalPrice: 750,
            finalPrice: 750,
            discount: 0,
            discountReason: '',
            savings: 0,
            discountEligible: true,
          },
        });
      } finally {
        setIsCalculatingPrices(false);
      }
    };

    calculatePrices();
  }, [
    selectedCity,
    quantities,
    verificationResult,
    email,
  ]);

  const getPricing = (tierId: 'ga' | 'vip' | 'vip_elite') => {
    const defaultPrices = {
      ga: 300,
      vip: 500,
      vip_elite: 750,
    };

    return (
      pricing[tierId] || {
        originalPrice: defaultPrices[tierId],
        finalPrice: defaultPrices[tierId],
        discount: 0,
        discountReason: '',
        savings: 0,
        discountEligible: true,
      }
    );
  };

  const navigateToCitiesSection = () => {
    router.push('/');

    // Enhanced navigation completion detection with fallback timeouts
    const attemptScroll = (attempts = 0, maxAttempts = 10) => {
      const citiesElement = document.getElementById('cities');

      if (citiesElement) {
        citiesElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }

      if (attempts < maxAttempts) {
        const delay = attempts < 3 ? 100 : 200;
        setTimeout(() => attemptScroll(attempts + 1, maxAttempts), delay);
      } else {
        console.warn('Could not find cities section element after navigation');
      }
    };

    attemptScroll();
  };

  const handleRegister = (tierId: 'ga' | 'vip' | 'vip_elite') => {
    const tier = tiers.find(t => t.id === tierId)!;
    const quantity = quantities[tierId];
    const currentPricing = getPricing(tierId);

    // Store registration data
    const registrationData = {
      pricing: {
        originalPrice: currentPricing.originalPrice,
        finalPrice: currentPricing.finalPrice,
        discount: currentPricing.discount,
        discountReason: currentPricing.discountReason,
        savings: currentPricing.savings,
      },
      ticketInfo: {
        type: tierId,
        quantity: quantity,
        tierName: tier.name,
      },
      userInfo: {
        isVerified: verificationResult?.isVerified || false,
        memberName: verificationResult?.memberName || '',
      },
    };

    // Store city selection data
    const citySelection = {
      cityId: selectedCity?.id || '',
      cityName: `${selectedCity?.city}, ${selectedCity?.state}` || '',
      month: selectedCity?.month || '',
      dates: selectedCity?.dates || [],
      location: selectedCity?.location || '',
    };

    try {
      sessionStorage.setItem(
        '6fb-registration-data',
        JSON.stringify(registrationData)
      );
      sessionStorage.setItem(
        '6fb-city-selection',
        JSON.stringify(citySelection)
      );
    } catch (error) {
      console.error('Failed to store registration data:', error);
    }

    // Navigate to registration with member status as backup URL parameter
    const memberParam = verificationResult?.isVerified
      ? '&isVerified=true'
      : '';
    router.push(
      `/register?city=${selectedCity?.id}&type=${tierId}&quantity=${quantity}${memberParam}`
    );
  };

  if (!selectedCity) {
    return (
      <div className='min-h-screen bg-background-primary flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-tomb45-green border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-text-secondary'>Loading city information...</p>
        </div>
      </div>
    );
  }

  return (
    <div id='pricing' className='min-h-screen bg-background-primary py-12'>
      <div className='container-custom'>
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-8'
        >
          <Button
            variant='ghost'
            onClick={navigateToCitiesSection}
            className='text-text-secondary hover:text-text-primary'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Cities
          </Button>
        </motion.div>

        {/* City Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='text-center mb-12'
        >
          <Badge variant='success' className='mb-4'>
            {selectedCity.city}, {selectedCity.state} • {selectedCity.month}
          </Badge>
          <h1 className='heading-lg mb-4'>Choose Your Experience Level</h1>
          <div className='flex items-center justify-center gap-4 text-sm text-text-muted mb-6'>
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4' />
              <span>
                {selectedCity.dates.length > 1
                  ? `${selectedCity.dates[0]} or ${selectedCity.dates[1]}`
                  : selectedCity.dates[0] || 'Dates TBA'}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <MapPin className='w-4 h-4' />
              <span>{selectedCity.location}</span>
            </div>
          </div>
          <p className='body-lg max-w-3xl mx-auto text-text-secondary'>
            Both options provide complete access to the methodologies that will
            transform your business in {selectedCity.city}. Choose the
            experience level that fits your goals.
          </p>
        </motion.div>

        {/* 6FB Member Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className='max-w-md mx-auto mb-12'
        >
          <Card className='p-6 border-tomb45-green/20'>
            <CardContent className='p-0'>
              <div className='text-center mb-4'>
                <Badge variant='success' className='mb-2'>
                  6FB Members Save 10%
                </Badge>
                <p className='text-sm text-text-secondary'>
                  Verify your 6FB membership for exclusive discount
                </p>
              </div>

              {!verificationResult ? (
                <div className='space-y-3'>
                  <Input
                    type='email'
                    placeholder='Enter your 6FB registered email'
                    value={email}
                    onChange={value => setEmail(value)}
                  />
                  <Button
                    onClick={verifyMember}
                    disabled={!email || isVerifying}
                    className='w-full'
                    size='sm'
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Mail className='w-4 h-4 mr-2' />
                        Verify Membership
                      </>
                    )}
                  </Button>
                </div>
              ) : verificationResult.isVerified ? (
                <div className='text-center space-y-2'>
                  <div className='flex items-center justify-center gap-2 text-tomb45-green'>
                    <Check className='w-5 h-5' />
                    <span className='font-medium'>Verified 6FB Member!</span>
                  </div>
                  <p className='text-sm text-text-secondary'>
                    Welcome back, {verificationResult.memberName}
                  </p>
                  <Badge variant='success' className='text-xs'>
                    10% Discount Applied
                  </Badge>
                </div>
              ) : (
                <div className='text-center space-y-2'>
                  <p className='text-sm text-text-secondary'>
                    Email not found in our 6FB member database
                  </p>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setVerificationResult(null);
                      setEmail('');
                    }}
                    className='text-xs'
                  >
                    Try Different Email
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pricing Tiers */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto'>
          {tiers.map((tier, index) => {
            const quantity = quantities[tier.id];
            const currentPricing = getPricing(tier.id);

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full ${tier.popular ? 'border-tomb45-green shadow-green-glow' : ''}`}
                >
                  {tier.popular && (
                    <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                      <Badge variant='success' className='px-4 py-1'>
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className='text-center pb-4'>
                    <div className='flex items-center justify-center gap-2 mb-2'>
                      <tier.icon className='w-6 h-6 text-tomb45-green' />
                      <CardTitle className='text-2xl'>{tier.name}</CardTitle>
                    </div>

                    <div className='space-y-2'>
                      {currentPricing.savings > 0 && (
                        <div className='text-sm'>
                          <span className='text-text-muted line-through'>
                            {formatCurrency(currentPricing.originalPrice)}
                          </span>
                          <Badge variant='success' className='ml-2 text-xs'>
                            Save {formatCurrency(currentPricing.savings)}
                          </Badge>
                        </div>
                      )}

                      <div className='text-4xl font-bold text-tomb45-green'>
                        {isCalculatingPrices ? (
                          <div className='flex items-center justify-center gap-2'>
                            <Loader2 className='w-6 h-6 animate-spin' />
                            <span>Loading...</span>
                          </div>
                        ) : (
                          formatCurrency(currentPricing.finalPrice)
                        )}
                      </div>

                      {currentPricing.discountReason && (
                        <div className='text-xs text-tomb45-green'>
                          {currentPricing.discountReason} (
                          {currentPricing.discount}% off)
                        </div>
                      )}
                    </div>

                    <p className='text-text-secondary text-sm mt-2'>
                      {tier.description}
                    </p>
                  </CardHeader>

                  <CardContent className='space-y-6'>
                    {/* Quantity Selector for GA */}
                    {tier.id === 'ga' && (
                      <div className='border border-border-primary rounded-xl p-4'>
                        <label className='block text-sm font-medium text-text-primary mb-2'>
                          Number of Tickets
                        </label>
                        <div className='flex items-center gap-3'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setQuantities(prev => ({
                                ...prev,
                                ga: Math.max(1, prev.ga - 1),
                              }))
                            }
                            disabled={quantity <= 1}
                          >
                            -
                          </Button>
                          <span className='w-8 text-center font-medium'>
                            {quantity}
                          </span>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setQuantities(prev => ({
                                ...prev,
                                ga: Math.min(10, prev.ga + 1),
                              }))
                            }
                            disabled={quantity >= 10}
                          >
                            +
                          </Button>
                        </div>
                        {quantity > 1 && (
                          <div className='mt-2 text-xs text-tomb45-green'>
                            {verificationResult?.isVerified ? (
                              <span>
                                1 Member ticket (
                                {getSixFBDiscount(
                                  tier.id.toUpperCase() as 'GA' | 'VIP'
                                ) * 100}
                                % off) + {quantity - 1} Bulk tickets (
                                {calculateBulkDiscount(quantity) * 100}% off)
                              </span>
                            ) : (
                              <span>
                                Bulk discount:{' '}
                                {calculateBulkDiscount(quantity) * 100}% off
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Features List */}
                    <div className='space-y-3'>
                      {tier.features.map(feature => (
                        <div key={feature} className='flex items-start gap-3'>
                          <Check className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                          <span className='text-sm text-text-secondary'>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleRegister(tier.id)}
                      className='w-full bg-blue-600 hover:bg-blue-700 text-white h-16 px-12 text-lg font-semibold transition-colors'
                      size='lg'
                      disabled={
                        isCalculatingPrices || !currentPricing.discountEligible
                      }
                    >
                      {isCalculatingPrices ? (
                        <>
                          <Loader2 className='w-5 h-5 mr-3 animate-spin' />
                          Calculating...
                        </>
                      ) : !currentPricing.discountEligible ? (
                        'Discount Not Available'
                      ) : (
                        `Secure Your ${selectedCity.city} ${tier.name} Spot`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='text-center mt-12 space-y-4'
        >
          <div className='flex flex-wrap justify-center gap-6 text-sm text-text-muted'>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4' />
              <span>2 Full Days</span>
            </div>
            <div className='flex items-center gap-2'>
              <Coffee className='w-4 h-4' />
              <span>Snacks and refreshments included</span>
            </div>
            <div className='flex items-center gap-2'>
              <Award className='w-4 h-4' />
              <span>Certificate Provided</span>
            </div>
          </div>

          <p className='text-xs text-text-muted max-w-2xl mx-auto'>
            Secure payment processing by Stripe. All major credit cards
            accepted. Refund policy: Full refund available within 30 days of
            purchase AND more than 7 days before {selectedCity.city} workshop.
          </p>

          {/* Payment Plans Section */}
          <div className='mt-8 space-y-4'>
            <div className='text-center'>
              <h3 className='text-lg font-semibold text-text-primary mb-4'>
                Payment plans available
              </h3>
              <div className='flex items-center justify-center gap-6 mb-6'>
                {/* Klarna Logo */}
                <div className='flex items-center gap-2 px-4 py-2 border border-border-primary rounded-lg'>
                  <div className='text-2xl font-bold text-pink-500'>klarna</div>
                </div>
                {/* Afterpay Logo */}
                <div className='flex items-center gap-2 px-4 py-2 border border-border-primary rounded-lg'>
                  <div className='text-xl font-bold text-green-600'>
                    afterpay
                  </div>
                </div>
              </div>

              {/* Link Warning */}
              <div className='flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto mb-4'>
                <div className='flex-shrink-0'>
                  <img
                    src='/images/link-logo.svg'
                    alt='Link by Stripe'
                    className='w-24 h-24'
                  />
                </div>
                <div className='text-sm text-left'>
                  <div className='font-semibold text-amber-800 mb-1'>
                    For payment plans, do not use Link
                  </div>
                  <div className='text-amber-700'>
                    Link does not support payment plans. Use your card directly
                    or select Klarna/Afterpay.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-background-primary flex items-center justify-center'>
          <div className='text-center'>
            <div className='w-16 h-16 border-4 border-tomb45-green border-t-transparent rounded-full animate-spin mx-auto mb-4' />
            <p className='text-text-secondary'>
              Loading pricing information...
            </p>
          </div>
        </div>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}
