'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  CreditCard,
  Smartphone,
  Banknote,
  Calendar,
  Shield,
  Zap,
  Clock,
  Star
} from 'lucide-react'

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: any
  badge?: string
  badgeVariant?: 'default' | 'success' | 'warning' | 'info'
  processingTime: string
  fees?: string
  popular?: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    icon: CreditCard,
    processingTime: 'Instant',
    popular: true,
  },
  {
    id: 'apple_pay',
    name: 'Apple Pay',
    description: 'Quick and secure with Touch ID or Face ID',
    icon: Smartphone,
    badge: 'Mobile',
    badgeVariant: 'info',
    processingTime: 'Instant',
  },
  {
    id: 'google_pay',
    name: 'Google Pay',
    description: 'Pay with your Google account',
    icon: Smartphone,
    badge: 'Mobile',
    badgeVariant: 'info',
    processingTime: 'Instant',
  },
  {
    id: 'link',
    name: 'Link by Stripe',
    description: 'Save your info for faster future payments',
    icon: Zap,
    badge: 'Fast',
    badgeVariant: 'success',
    processingTime: 'Instant',
  },
  {
    id: 'cashapp',
    name: 'Cash App Pay',
    description: 'Pay directly from your Cash App balance',
    icon: Banknote,
    processingTime: 'Instant',
  },
  {
    id: 'affirm',
    name: 'Affirm',
    description: 'Payment plans available',
    icon: Calendar,
    badge: 'Payment Plans',
    badgeVariant: 'warning',
    processingTime: '1-2 min',
    fees: 'From 0% APR',
  },
  {
    id: 'klarna',
    name: 'Klarna',
    description: 'Payment plans available',
    icon: Calendar,
    badge: 'Payment Plans',
    badgeVariant: 'warning',
    processingTime: '1-2 min',
    fees: '0% interest',
  },
  {
    id: 'afterpay',
    name: 'Afterpay',
    description: 'Payment plans available',
    icon: Calendar,
    badge: 'Payment Plans',
    badgeVariant: 'warning',
    processingTime: '1-2 min',
    fees: '0% interest',
  },
]

interface PaymentMethodSelectorProps {
  selectedMethods: string[]
  onSelectionChange: (methods: string[]) => void
  currency: string
  amount: number
  isMobile?: boolean
}

export default function PaymentMethodSelector({
  selectedMethods,
  onSelectionChange,
  currency,
  amount,
  isMobile = false
}: PaymentMethodSelectorProps) {
  const [showAll, setShowAll] = useState(false)

  // Filter payment methods based on context
  const getAvailableMethods = () => {
    let methods = [...PAYMENT_METHODS]

    // Hide payment plans for small amounts
    if (amount < 50000) { // Less than $500
      methods = methods.filter(m => !['affirm', 'klarna', 'afterpay'].includes(m.id))
    }

    // Prioritize mobile payments on mobile devices
    if (isMobile) {
      methods = methods.sort((a, b) => {
        const mobilePayments = ['apple_pay', 'google_pay', 'link']
        const aIsMobile = mobilePayments.includes(a.id)
        const bIsMobile = mobilePayments.includes(b.id)

        if (aIsMobile && !bIsMobile) return -1
        if (!aIsMobile && bIsMobile) return 1
        return 0
      })
    }

    return showAll ? methods : methods.slice(0, 4)
  }

  const toggleMethod = (methodId: string) => {
    if (selectedMethods.includes(methodId)) {
      onSelectionChange(selectedMethods.filter(id => id !== methodId))
    } else {
      onSelectionChange([...selectedMethods, methodId])
    }
  }

  const selectRecommended = () => {
    const recommended = isMobile
      ? ['card', 'apple_pay', 'google_pay', 'link']
      : ['card', 'link', 'apple_pay', 'google_pay']

    onSelectionChange(recommended)
  }

  const availableMethods = getAvailableMethods()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Payment Methods
          </h3>
          <p className="text-sm text-text-muted">
            Choose which payment options to offer at checkout
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={selectRecommended}
        >
          <Star className="w-4 h-4 mr-2" />
          Select Recommended
        </Button>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableMethods.map((method) => {
          const isSelected = selectedMethods.includes(method.id)
          const IconComponent = method.icon

          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-tomb45-green bg-tomb45-green/5 shadow-lg'
                    : 'hover:border-border-secondary hover:shadow-md'
                }`}
                onClick={() => toggleMethod(method.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-tomb45-green/20 text-tomb45-green'
                        : 'bg-background-secondary text-text-muted'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-text-primary text-sm">
                          {method.name}
                        </h4>
                        {method.popular && (
                          <Badge variant="success" className="text-xs">
                            Popular
                          </Badge>
                        )}
                        {method.badge && (
                          <Badge variant={method.badgeVariant} className="text-xs">
                            {method.badge}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-text-muted mb-2">
                        {method.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {method.processingTime}
                        </div>
                        {method.fees && (
                          <div className="flex items-center gap-1">
                            <Banknote className="w-3 h-3" />
                            {method.fees}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-tomb45-green bg-tomb45-green'
                        : 'border-border-primary'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Show More Button */}
      {PAYMENT_METHODS.length > 4 && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="text-sm"
          >
            {showAll ? 'Show Less' : `Show ${PAYMENT_METHODS.length - 4} More Options`}
          </Button>
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center gap-3 p-4 bg-background-secondary rounded-xl">
        <Shield className="w-5 h-5 text-tomb45-green" />
        <div className="text-sm">
          <div className="font-medium text-text-primary">
            All payments secured by Stripe
          </div>
          <div className="text-text-muted">
            PCI DSS Level 1 certified with 256-bit SSL encryption
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedMethods.length > 0 && (
        <div className="p-4 bg-tomb45-green/5 rounded-xl border border-tomb45-green/20">
          <h4 className="font-medium text-text-primary mb-2">
            Selected Payment Methods ({selectedMethods.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedMethods.map(methodId => {
              const method = PAYMENT_METHODS.find(m => m.id === methodId)
              return method ? (
                <Badge key={methodId} variant="default" className="text-xs">
                  {method.name}
                </Badge>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}