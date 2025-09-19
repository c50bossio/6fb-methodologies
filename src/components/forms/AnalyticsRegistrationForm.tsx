/**
 * Analytics-Enhanced Registration Form
 *
 * Comprehensive tracking for conversion optimization
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CreditCard,
  Shield,
  Users,
  Star,
  Clock
} from 'lucide-react'
import { formatCurrency, validateEmail, formatPhoneNumber } from '@/lib/utils'
import { RegistrationData, TicketType } from '@/types'
import { useFormTracking, useConversionTracking, useUserBehavior, usePerformanceTracking } from '@/hooks/useAnalytics'
import { useCSRF } from '@/hooks/useCSRF'

interface FormStep {
  id: number
  title: string
  description: string
}

const FORM_STEPS: FormStep[] = [
  { id: 1, title: 'Quick Details', description: 'Just the essentials to secure your spot' },
  { id: 2, title: 'Secure Payment', description: 'Complete your registration' }
]

interface AnalyticsRegistrationFormProps {
  searchParams: URLSearchParams
}

export function AnalyticsRegistrationForm({ searchParams }: AnalyticsRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formStartTime] = useState(Date.now())
  const stepStartTime = useRef(Date.now())
  const fieldFocusTime = useRef<Record<string, number>>({})

  // Analytics hooks
  const { trackStepProgress, trackStepValidation, trackFieldInteraction } = useFormTracking('workshop_registration')
  const { trackPriceCalculation, trackMemberVerification, trackCheckoutInitiation } = useConversionTracking()
  const { trackButtonClick, trackSectionView } = useUserBehavior()
  const { trackCustomTiming, trackError } = usePerformanceTracking()

  // CSRF hook for secure API requests
  const { authenticatedFetch, isReady: csrfReady, error: csrfError } = useCSRF()

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
  })

  const [pricingData, setPricingData] = useState({
    originalPrice: 0,
    finalPrice: 0,
    discount: 0,
    discountReason: '',
    ticketType: 'GA' as TicketType,
    quantity: 1,
  })

  // Track initial form load
  useEffect(() => {
    trackSectionView('registration_form_loaded')

    // Track pricing data from URL
    const type = searchParams.get('type') as TicketType || 'GA'
    const quantity = parseInt(searchParams.get('quantity') || '1')
    const price = parseFloat(searchParams.get('price') || '1000')
    const originalPrice = parseFloat(searchParams.get('originalPrice') || '1000')
    const discount = parseFloat(searchParams.get('discount') || '0')
    const discountReason = searchParams.get('discountReason') || ''
    const isMember = searchParams.get('isMember') === 'true'
    const memberName = searchParams.get('memberName') || ''

    const newPricingData = {
      originalPrice,
      finalPrice: price,
      discount,
      discountReason,
      ticketType: type,
      quantity,
    }

    setPricingData(newPricingData)

    // Track pricing parameters
    trackPriceCalculation(newPricingData)

    // Track member status
    if (isMember && memberName) {
      trackMemberVerification(true, memberName, discount)
    }

    setFormData(prev => ({
      ...prev,
      ticketType: type,
      quantity,
      isSixFBMember: isMember,
      firstName: memberName ? memberName.split(' ')[0] : '',
      lastName: memberName ? memberName.split(' ').slice(1).join(' ') : '',
    }))

    // Track step 1 view
    trackStepProgress(1, 'Quick Details', formData)
    stepStartTime.current = Date.now()
  }, [searchParams, trackPriceCalculation, trackMemberVerification, trackStepProgress, trackSectionView])

  const updateFormData = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Track field changes
    trackFieldInteraction(field, 'change', String(value))
  }

  const handleFieldFocus = (fieldName: string) => {
    fieldFocusTime.current[fieldName] = Date.now()
    trackFieldInteraction(fieldName, 'focus')
  }

  const handleFieldBlur = (fieldName: string, value: string) => {
    const focusTime = fieldFocusTime.current[fieldName]
    if (focusTime) {
      const timeSpent = Date.now() - focusTime
      trackCustomTiming(`field_${fieldName}_focus_time`, focusTime)
    }
    trackFieldInteraction(fieldName, 'blur', value)
  }

  const validateStep = (step: number): boolean => {
    const isValid = (() => {
      switch (step) {
        case 1:
          return !!(formData.firstName && formData.lastName && formData.email && formData.phone &&
                   validateEmail(formData.email))
        case 2:
          return true // Payment step, no additional validation
        default:
          return false
      }
    })()

    // Track validation results
    const errors: string[] = []
    if (step === 1) {
      if (!formData.firstName) errors.push('firstName')
      if (!formData.lastName) errors.push('lastName')
      if (!formData.email) errors.push('email')
      if (!formData.phone) errors.push('phone')
      if (formData.email && !validateEmail(formData.email)) errors.push('email_invalid')
    }

    trackStepValidation(step, isValid, errors.length > 0 ? errors : undefined)
    return isValid
  }

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < FORM_STEPS.length) {
      // Track step completion time
      const stepTime = Date.now() - stepStartTime.current
      trackCustomTiming(`step_${currentStep}_completion_time`, stepStartTime.current)

      // Move to next step
      setCurrentStep(prev => prev + 1)
      stepStartTime.current = Date.now()

      // Track step progress
      trackStepProgress(currentStep + 1, FORM_STEPS[currentStep].title, formData)
      trackButtonClick('Next', `step_${currentStep}`)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      stepStartTime.current = Date.now()
      trackButtonClick('Previous', `step_${currentStep}`)
      trackStepProgress(currentStep - 1, FORM_STEPS[currentStep - 2].title, formData)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    const submitStartTime = Date.now()

    try {
      // Track checkout initiation
      trackCheckoutInitiation({
        value: pricingData.finalPrice,
        items: [{
          item_id: `workshop_${pricingData.ticketType}`,
          item_name: `6FB Workshop ${pricingData.ticketType} Ticket`,
          item_category: 'workshop_registration',
          quantity: pricingData.quantity,
          price: pricingData.finalPrice,
        }]
      })

      trackButtonClick('Proceed to Payment', 'step_2')

      // Check CSRF readiness
      if (!csrfReady) {
        throw new Error('Security token not ready. Please refresh the page and try again.')
      }

      // Create checkout session with CSRF protection
      const response = await authenticatedFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: pricingData.ticketType,
          quantity: pricingData.quantity,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          isSixFBMember: formData.isSixFBMember,
          registrationData: formData,
        }),
      })

      const result = await response.json()

      if (result.success && result.checkoutUrl) {
        // Track successful checkout session creation
        const checkoutTime = Date.now() - submitStartTime
        trackCustomTiming('checkout_session_creation_time', submitStartTime)

        // Track form completion
        const totalFormTime = Date.now() - formStartTime
        trackCustomTiming('total_form_completion_time', formStartTime)

        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl
      } else {
        throw new Error(result.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)

      // Track error
      trackError('checkout_error', error instanceof Error ? error.message : 'Unknown error')

      alert('Failed to proceed to payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(value) => updateFormData('firstName', value)}
                onFocus={() => handleFieldFocus('firstName')}
                onBlur={(e) => handleFieldBlur('firstName', e.target.value)}
                required
              />
              <Input
                label="Last Name"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(value) => updateFormData('lastName', value)}
                onFocus={() => handleFieldFocus('lastName')}
                onBlur={(e) => handleFieldBlur('lastName', e.target.value)}
                required
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(value) => updateFormData('email', value)}
              onFocus={() => handleFieldFocus('email')}
              onBlur={(e) => handleFieldBlur('email', e.target.value)}
              helperText="We'll send your confirmation and workshop details here"
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(value) => updateFormData('phone', formatPhoneNumber(value))}
              onFocus={() => handleFieldFocus('phone')}
              onBlur={(e) => handleFieldBlur('phone', e.target.value)}
              helperText="For emergency contact and workshop updates"
              required
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-tomb45-green/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-tomb45-green" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>
                    {pricingData.ticketType} Ticket × {pricingData.quantity}
                  </span>
                  <span>{formatCurrency(pricingData.originalPrice)}</span>
                </div>

                {pricingData.discount > 0 && (
                  <div className="flex justify-between items-center text-tomb45-green">
                    <span>{pricingData.discountReason}</span>
                    <span>-{formatCurrency(pricingData.originalPrice - pricingData.finalPrice)}</span>
                  </div>
                )}

                <hr className="border-border-primary" />

                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-tomb45-green">{formatCurrency(pricingData.finalPrice)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Registration Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Registration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-text-muted">Name:</span>
                    <div className="font-medium">{formData.firstName} {formData.lastName}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Email:</span>
                    <div className="font-medium">{formData.email}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Phone:</span>
                    <div className="font-medium">{formData.phone}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Business Type:</span>
                    <div className="font-medium capitalize">{formData.businessType.replace('_', ' ')}</div>
                  </div>
                </div>

                {formData.isSixFBMember && (
                  <Badge variant="success" className="mt-2">
                    6FB Member - 20% Discount Applied
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="flex items-center gap-3 p-4 bg-background-secondary rounded-xl">
              <Shield className="w-5 h-5 text-tomb45-green" />
              <div className="text-sm">
                <div className="font-medium text-text-primary">Secure Payment by Stripe</div>
                <div className="text-text-muted">Your payment information is encrypted and secure</div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background-primary py-12">
      <div className="container-custom max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
          onViewportEnter={() => trackSectionView('registration_header')}
        >
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mb-4">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400 animate-pulse">
              ⚠️ Only 23 spots remaining - Secure yours now!
            </span>
          </div>
          <h1 className="heading-lg mb-4">
            You're Almost In! 🎆
          </h1>
          <p className="body-md text-text-secondary">
            Just 2 quick steps to secure your spot at the 6FB Methodologies Workshop
          </p>
          <div className="bg-tomb45-green/10 border border-tomb45-green/20 rounded-xl p-3 max-w-md mx-auto mt-4">
            <p className="text-sm text-tomb45-green font-medium">
              🔒 Your spot is reserved for 10 minutes
            </p>
          </div>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
          onViewportEnter={() => trackSectionView('registration_progress')}
        >
          <div className="flex items-center justify-between mb-4">
            {FORM_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.id
                      ? 'bg-tomb45-green text-white'
                      : 'bg-background-secondary text-text-muted border border-border-primary'
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div
                    className={`w-full h-1 mx-4 ${
                      currentStep > step.id ? 'bg-tomb45-green' : 'bg-border-primary'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-text-primary">
              {FORM_STEPS[currentStep - 1].title}
            </h3>
            <p className="text-sm text-text-muted">
              {FORM_STEPS[currentStep - 1].description}
            </p>
          </div>
        </motion.div>

        {/* Form Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onViewportEnter={() => trackSectionView(`registration_step_${currentStep}`)}
        >
          <Card className="mb-8">
            <CardContent className="p-8">
              {renderStep()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex gap-4"
        >
          {currentStep > 1 && (
            <Button
              variant="secondary"
              onClick={handlePrevious}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}

          {currentStep < FORM_STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !csrfReady}
              className="flex-1"
              isLoading={isLoading || !csrfReady}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !csrfReady ? (
                <>
                  <Shield className="w-4 h-4 mr-2 animate-pulse" />
                  Initializing Security...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  )
}