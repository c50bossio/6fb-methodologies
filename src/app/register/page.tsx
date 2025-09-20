'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CreditCard,
  Shield,
  Users,
  Star,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, validateEmail, formatPhoneNumber } from '@/lib/utils';
import { RegistrationData, TicketType } from '@/types';
import { useCSRF } from '@/hooks/useCSRF';

interface FormStep {
  id: number;
  title: string;
  description: string;
}

const FORM_STEPS: FormStep[] = [
  { id: 1, title: 'Personal Info', description: 'Tell us about yourself' },
  {
    id: 2,
    title: 'Business Details',
    description: 'Your barbering background',
  },
  {
    id: 3,
    title: 'Review & Payment',
    description: 'Confirm and secure your spot',
  },
];

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCityChangeModal, setShowCityChangeModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

  // CSRF hook for secure API requests
  const {
    authenticatedFetch,
    isReady: csrfReady,
    error: csrfError,
  } = useCSRF();
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: 'individual',
    yearsExperience: '1-2',
    ticketType: 'GA',
    quantity: 1,
    isSixFBMember: false,
    dietaryRestrictions: '',
    specialRequests: '',
  });

  // Extract pricing data from URL params
  const [pricingData, setPricingData] = useState({
    originalPrice: 0,
    finalPrice: 0,
    discount: 0,
    discountReason: '',
    ticketType: 'GA' as TicketType,
    quantity: 1,
  });

  // City selection data
  const [selectedCity, setSelectedCity] = useState<{
    cityId: string;
    cityName: string;
    month: string;
    dates: string[];
    location: string;
  } | null>(null);

  useEffect(() => {
    try {
      // Get simple URL parameters
      const type = (searchParams.get('type') as TicketType) || 'GA';
      const quantity = parseInt(searchParams.get('quantity') || '1');
      const cityId = searchParams.get('city');

      // Get city selection data from sessionStorage
      try {
        const cityData = sessionStorage.getItem('6fb-city-selection');
        if (cityData) {
          const parsedCityData = JSON.parse(cityData);
          setSelectedCity(parsedCityData);
          console.log('Selected city:', parsedCityData);
        }
      } catch (error) {
        console.error('Error loading city selection:', error);
      }

      // Get complex data from sessionStorage (much cleaner!)
      const storedData = sessionStorage.getItem('6fb-registration-data');
      console.log('Reading registration data from sessionStorage:', storedData);

      if (storedData) {
        const registrationData = JSON.parse(storedData);
        console.log('Parsed registration data:', registrationData);

        // Use stored pricing data
        setPricingData({
          originalPrice:
            registrationData.pricing?.originalPrice ||
            (type === 'VIP' ? 1500 : 1000),
          finalPrice:
            registrationData.pricing?.finalPrice ||
            (type === 'VIP' ? 1500 : 1000),
          discount: registrationData.pricing?.discount || 0,
          discountReason: registrationData.pricing?.discountReason || '',
          ticketType: type,
          quantity: quantity,
        });

        // Pre-fill form with user data
        const memberName = registrationData.userInfo?.memberName || '';
        const firstName = memberName ? memberName.split(' ')[0] || '' : '';
        const lastName = memberName
          ? memberName.split(' ').slice(1).join(' ') || ''
          : '';

        setFormData(prev => ({
          ...prev,
          ticketType: type,
          quantity: quantity,
          isSixFBMember: registrationData.userInfo?.isVerified || false,
          firstName: firstName,
          lastName: lastName,
        }));
      } else {
        // Fallback if no sessionStorage data - preserve member status from URL if available
        console.log('No registration data found, using defaults');
        const defaultPrice = type === 'VIP' ? 1500 : 1000;

        // Check if member status is passed via URL parameters
        const memberStatus = searchParams.get('isMember') === 'true' ||
                            searchParams.get('isVerified') === 'true' ||
                            false;

        setPricingData({
          originalPrice: defaultPrice,
          finalPrice: defaultPrice,
          discount: 0,
          discountReason: '',
          ticketType: type,
          quantity: quantity,
        });

        setFormData(prev => ({
          ...prev,
          ticketType: type,
          quantity: quantity,
          isSixFBMember: memberStatus,
          firstName: '',
          lastName: '',
        }));
      }

      console.log('Form initialization complete');

      // Try to load saved form progress after initial setup
      loadFormProgress();
    } catch (error) {
      console.error('Error loading registration data:', error);
      // Fallback to safe defaults
      const type = 'GA';
      setPricingData({
        originalPrice: 1000,
        finalPrice: 1000,
        discount: 0,
        discountReason: '',
        ticketType: type,
        quantity: 1,
      });
      setFormData(prev => ({
        ...prev,
        ticketType: type,
        quantity: 1,
        isSixFBMember: false,
        firstName: '',
        lastName: '',
      }));
    }
  }, [searchParams]);

  const saveFormProgress = () => {
    try {
      sessionStorage.setItem(
        '6fb-registration-form-progress',
        JSON.stringify({
          formData,
          currentStep,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Failed to save form progress:', error);
    }
  };

  const loadFormProgress = () => {
    try {
      const saved = sessionStorage.getItem('6fb-registration-form-progress');
      if (saved) {
        const {
          formData: savedFormData,
          currentStep: savedStep,
          timestamp,
        } = JSON.parse(saved);

        // Only restore if saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setFormData(prev => ({ ...prev, ...savedFormData }));
          setCurrentStep(savedStep);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load form progress:', error);
    }
    return false;
  };

  const handleCityChangeConfirm = () => {
    if (pendingNavigation) {
      if (pendingNavigation === 'cities-section') {
        navigateToCitiesSection();
      } else {
        saveFormProgress();
        router.push(pendingNavigation);
      }
      setShowCityChangeModal(false);
      setPendingNavigation(null);
    }
  };

  const handleCityChangeCancel = () => {
    setShowCityChangeModal(false);
    setPendingNavigation(null);
  };

  const handleNavigationWithConfirm = (path: string) => {
    // If there's form data to save, show confirmation
    if (
      formData.firstName ||
      formData.lastName ||
      formData.email ||
      formData.phone
    ) {
      setPendingNavigation(path);
      setShowCityChangeModal(true);
    } else {
      // No form data, navigate directly
      router.push(path);
    }
  };

  const handleNavigateToCitiesSection = () => {
    // If there's form data to save, show confirmation
    if (
      formData.firstName ||
      formData.lastName ||
      formData.email ||
      formData.phone
    ) {
      setPendingNavigation('cities-section');
      setShowCityChangeModal(true);
    } else {
      // No form data, navigate directly to cities section
      navigateToCitiesSection();
    }
  };

  const navigateToCitiesSection = () => {
    saveFormProgress();
    router.push('/');

    // Enhanced navigation completion detection with fallback timeouts
    const attemptScroll = (attempts = 0, maxAttempts = 10) => {
      const citiesElement = document.getElementById('cities');

      if (citiesElement) {
        // Element found, scroll to it
        citiesElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }

      if (attempts < maxAttempts) {
        // Element not found yet, try again after a delay
        const delay = attempts < 3 ? 100 : 200; // Start with shorter delays, then longer
        setTimeout(() => attemptScroll(attempts + 1, maxAttempts), delay);
      } else {
        // Fallback: if we still can't find the element after max attempts
        console.warn('Could not find cities section element after navigation');
      }
    };

    // Start attempting to scroll
    attemptScroll();
  };

  const updateFormData = (field: keyof RegistrationData, value: any) => {
    // Ensure we always store clean string values
    const cleanValue = typeof value === 'string' ? value : String(value || '');
    console.log(`Updating form field '${field}' with:`, cleanValue);
    setFormData(prev => {
      const newData = { ...prev, [field]: cleanValue };
      // Auto-save progress when form data changes
      setTimeout(() => {
        try {
          sessionStorage.setItem(
            '6fb-registration-form-progress',
            JSON.stringify({
              formData: newData,
              currentStep,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error('Failed to auto-save form progress:', error);
        }
      }, 500); // Debounce auto-save
      return newData;
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.phone &&
          validateEmail(formData.email)
        );
      case 2:
        return !!(formData.businessType && formData.yearsExperience);
      case 3:
        return true; // Review step, no additional validation
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < FORM_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Note: CSRF protection is disabled for payment endpoint

      // Validate city selection
      if (!selectedCity?.cityId) {
        throw new Error(
          'Please select a city first. Go back to the cities section to choose your workshop location.'
        );
      }

      // Create checkout session (CSRF-exempt endpoint)
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: pricingData.ticketType,
          quantity: pricingData.quantity,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          isSixFBMember: formData.isSixFBMember,
          cityId: selectedCity?.cityId,
          registrationData: {
            ...formData,
            ...(selectedCity && {
              citySelection: {
                cityId: selectedCity.cityId,
                cityName: selectedCity.cityName,
                month: selectedCity.month,
                dates: selectedCity.dates,
                location: selectedCity.location,
              },
            }),
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
      } else {
        // Handle specific error cases
        if (result.discountBlocked) {
          throw new Error(
            `Member discount not available: ${result.details || result.error}`
          );
        }
        throw new Error(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);

      // Provide specific error messages
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to proceed to payment. Please try again.';

      // Show user-friendly alert
      alert(errorMessage);

      // Log additional debug info
      console.error('Checkout debug info:', {
        cityId: selectedCity?.cityId,
        customerEmail: formData.email,
        ticketType: pricingData.ticketType,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Input
                label='First Name'
                placeholder='Enter your first name'
                value={formData.firstName || ''}
                onChange={value => updateFormData('firstName', value)}
                required
              />
              <Input
                label='Last Name'
                placeholder='Enter your last name'
                value={formData.lastName || ''}
                onChange={value => updateFormData('lastName', value)}
                required
              />
            </div>

            <Input
              label='Email Address'
              type='email'
              placeholder='your.email@example.com'
              value={formData.email || ''}
              onChange={value => updateFormData('email', value)}
              helperText="We'll send your confirmation and workshop details here"
              required
            />

            <Input
              label='Phone Number'
              type='tel'
              placeholder='(555) 123-4567'
              value={formData.phone || ''}
              onChange={value =>
                updateFormData('phone', formatPhoneNumber(value))
              }
              helperText='For emergency contact and workshop updates'
              required
            />
          </div>
        );

      case 2:
        return (
          <div className='space-y-6'>
            <Input
              label='Business Name (Optional)'
              placeholder='Your barbershop or business name'
              value={formData.businessName || ''}
              onChange={value => updateFormData('businessName', value)}
            />

            <div>
              <label className='block text-sm font-medium text-text-primary mb-2'>
                Business Type *
              </label>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                {[
                  {
                    value: 'individual',
                    label: 'Individual Barber',
                    icon: Users,
                  },
                  { value: 'shop_owner', label: 'Shop Owner', icon: Star },
                  {
                    value: 'enterprise',
                    label: 'Enterprise/Multiple Shops',
                    icon: CreditCard,
                  },
                ].map(option => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      formData.businessType === option.value
                        ? 'border-tomb45-green bg-tomb45-green/5'
                        : 'hover:border-border-secondary'
                    }`}
                    onClick={() => updateFormData('businessType', option.value)}
                  >
                    <CardContent className='p-4 text-center'>
                      <option.icon
                        className={`w-6 h-6 mx-auto mb-2 ${
                          formData.businessType === option.value
                            ? 'text-tomb45-green'
                            : 'text-text-muted'
                        }`}
                      />
                      <div className='text-sm font-medium'>{option.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-text-primary mb-2'>
                Years of Experience *
              </label>
              <select
                className='w-full h-12 rounded-xl border border-border-primary bg-background-accent px-4 py-3 text-base text-text-primary focus:border-tomb45-green focus:ring-1 focus:ring-tomb45-green focus:outline-none'
                value={formData.yearsExperience}
                onChange={value => updateFormData('yearsExperience', value)}
              >
                <option value='less-than-1'>Less than 1 year</option>
                <option value='1-2'>1-2 years</option>
                <option value='3-5'>3-5 years</option>
                <option value='6-10'>6-10 years</option>
                <option value='more-than-10'>More than 10 years</option>
              </select>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Input
                label='Dietary Restrictions (Optional)'
                placeholder='Any food allergies or preferences'
                value={formData.dietaryRestrictions || ''}
                onChange={value => updateFormData('dietaryRestrictions', value)}
              />
              <Input
                label='Special Requests (Optional)'
                placeholder='Accessibility needs, etc.'
                value={formData.specialRequests || ''}
                onChange={value => updateFormData('specialRequests', value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className='space-y-6'>
            {/* Order Summary */}
            <Card className='border-tomb45-green/20'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Check className='w-5 h-5 text-tomb45-green' />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <span>
                    {pricingData.ticketType} Ticket × {pricingData.quantity}
                  </span>
                  <span>{formatCurrency(pricingData.originalPrice)}</span>
                </div>

                {pricingData.discount > 0 && (
                  <div className='flex justify-between items-center text-tomb45-green'>
                    <span>{pricingData.discountReason}</span>
                    <span>
                      -
                      {formatCurrency(
                        pricingData.originalPrice - pricingData.finalPrice
                      )}
                    </span>
                  </div>
                )}

                <hr className='border-border-primary' />

                <div className='flex justify-between items-center text-lg font-semibold'>
                  <span>Total</span>
                  <span className='text-tomb45-green'>
                    {formatCurrency(pricingData.finalPrice)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Registration Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Registration Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <span className='text-text-muted'>Name:</span>
                    <div className='font-medium'>
                      {formData.firstName} {formData.lastName}
                    </div>
                  </div>
                  <div>
                    <span className='text-text-muted'>Email:</span>
                    <div className='font-medium'>{formData.email}</div>
                  </div>
                  <div>
                    <span className='text-text-muted'>Phone:</span>
                    <div className='font-medium'>{formData.phone}</div>
                  </div>
                  <div>
                    <span className='text-text-muted'>Business Type:</span>
                    <div className='font-medium capitalize'>
                      {formData.businessType.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {formData.isSixFBMember && (
                  <Badge variant='success' className='mt-2'>
                    6FB Member - 20% Discount Applied
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Link Warning */}
            <div className='flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl'>
              <div className='flex-shrink-0'>
                <img
                  src='/images/link-logo.svg'
                  alt='Link by Stripe'
                  className='w-24 h-24'
                />
              </div>
              <div className='text-sm'>
                <div className='font-medium text-amber-800 mb-1'>
                  For payment plans, do not use Link
                </div>
                <div className='text-amber-700'>
                  Link does not support payment plans. Please use your card
                  directly or choose Klarna/Afterpay for payment plans.
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className='flex items-center gap-3 p-4 bg-background-secondary rounded-xl'>
              <Shield className='w-5 h-5 text-tomb45-green' />
              <div className='text-sm'>
                <div className='font-medium text-text-primary'>
                  Secure Payment by Stripe
                </div>
                <div className='text-text-muted'>
                  Your payment information is encrypted and secure
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className='min-h-screen bg-background-primary py-12'>
      <div className='container-custom max-w-2xl'>
        {/* Breadcrumb Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-6'
        >
          <nav className='flex items-center space-x-2 text-sm text-text-muted'>
            <button
              onClick={handleNavigateToCitiesSection}
              className='hover:text-text-primary transition-colors'
            >
              Cities
            </button>
            <ChevronRight className='w-4 h-4' />
            <button
              onClick={() =>
                handleNavigationWithConfirm(
                  `/pricing?city=${selectedCity?.cityId || ''}`
                )
              }
              className='hover:text-text-primary transition-colors'
            >
              {selectedCity?.cityName || 'Pricing'}
            </button>
            <ChevronRight className='w-4 h-4' />
            <span className='text-text-primary font-medium'>Registration</span>
          </nav>
        </motion.div>

        {/* Smart Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-6'
        >
          <Button
            variant='ghost'
            onClick={handleNavigateToCitiesSection}
            className='text-text-secondary hover:text-text-primary'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Cities
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='text-center mb-8'
        >
          <h1 className='heading-lg mb-4'>Complete Your Registration</h1>
          {selectedCity ? (
            <div className='mb-4'>
              <div
                className='inline-flex items-center gap-2 bg-tomb45-green/10 border border-tomb45-green/20 rounded-full px-4 py-2 mb-2 cursor-pointer hover:bg-tomb45-green/15 transition-colors group'
                onClick={handleNavigateToCitiesSection}
              >
                <span className='text-sm font-medium text-tomb45-green'>
                  {selectedCity.cityName} • {selectedCity.month}
                </span>
                <span className='text-xs text-tomb45-green/70 group-hover:text-tomb45-green transition-colors ml-1'>
                  Change
                </span>
              </div>
              <p className='body-md text-text-secondary'>
                Secure your spot at the {selectedCity.cityName} 6FB
                Methodologies Workshop
              </p>
              <p className='text-sm text-text-muted'>
                {selectedCity.dates.length > 1
                  ? `${selectedCity.dates[0]} or ${selectedCity.dates[1]}`
                  : selectedCity.dates[0]}{' '}
                • {selectedCity.location}
              </p>
            </div>
          ) : (
            <p className='body-md text-text-secondary'>
              Secure your spot at the 6FB Methodologies Workshop
            </p>
          )}
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className='mb-8'
        >
          <div className='flex items-center justify-between mb-4'>
            {FORM_STEPS.map((step, index) => (
              <div key={step.id} className='flex items-center'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.id
                      ? 'bg-tomb45-green text-white'
                      : 'bg-background-secondary text-text-muted border border-border-primary'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className='w-4 h-4' />
                  ) : (
                    step.id
                  )}
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div
                    className={`w-full h-1 mx-4 ${
                      currentStep > step.id
                        ? 'bg-tomb45-green'
                        : 'bg-border-primary'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className='text-center'>
            <h3 className='font-semibold text-text-primary'>
              {FORM_STEPS[currentStep - 1].title}
            </h3>
            <p className='text-sm text-text-muted'>
              {FORM_STEPS[currentStep - 1].description}
            </p>
            <p className='text-xs text-text-muted mt-2 opacity-75'>
              2-3 minutes to complete • Step {currentStep} of{' '}
              {FORM_STEPS.length}
            </p>
          </div>
        </motion.div>

        {/* Form Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className='mb-8'>
            <CardContent className='p-8'>{renderStep()}</CardContent>
          </Card>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='flex gap-4'
        >
          {currentStep > 1 && (
            <Button
              variant='secondary'
              onClick={handlePrevious}
              className='flex-1 min-h-[48px] touch-manipulation text-base'
            >
              <ArrowLeft className='w-4 h-4 mr-2' />
              Previous
            </Button>
          )}

          {currentStep < FORM_STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className='flex-1 min-h-[48px] touch-manipulation text-base font-semibold'
            >
              Next
              <ArrowRight className='w-4 h-4 ml-2' />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className='flex-1 min-h-[48px] touch-manipulation text-base font-semibold'
              isLoading={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className='w-4 h-4 mr-2' />
                  Proceed to Payment
                </>
              )}
            </Button>
          )}
        </motion.div>

        {/* City Change Confirmation Modal */}
        {showCityChangeModal && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className='bg-background-primary rounded-xl p-6 max-w-md mx-4 shadow-xl'
            >
              <h3 className='text-lg font-semibold text-text-primary mb-3'>
                Change City Selection?
              </h3>
              <p className='text-text-secondary mb-4'>
                Your registration progress will be saved and you can return to
                continue where you left off.
              </p>
              <div className='flex gap-3'>
                <Button
                  variant='secondary'
                  onClick={handleCityChangeCancel}
                  className='flex-1'
                >
                  Stay Here
                </Button>
                <Button onClick={handleCityChangeConfirm} className='flex-1'>
                  Change City
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-background-primary flex items-center justify-center'>
          <div className='text-center'>
            <div className='w-16 h-16 border-4 border-tomb45-green border-t-transparent rounded-full animate-spin mx-auto mb-4' />
            <p className='text-text-secondary'>Loading registration...</p>
          </div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
