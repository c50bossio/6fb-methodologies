'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Clock,
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  MessageSquare,
  Gift
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentRecoveryProps {
  sessionId?: string
  customerEmail?: string
  amount?: number
  currency?: string
  onRetryPayment?: () => void
  onContactSupport?: () => void
}

interface RecoveryOption {
  id: string
  title: string
  description: string
  icon: any
  action: () => void
  variant: 'primary' | 'secondary' | 'outline'
  incentive?: string
}

export default function PaymentRecovery({
  sessionId,
  customerEmail,
  amount = 0,
  currency = 'USD',
  onRetryPayment,
  onContactSupport,
}: PaymentRecoveryProps) {
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showIncentive, setShowIncentive] = useState(false)

  useEffect(() => {
    // Show incentive after 30 seconds on page
    const timer = setTimeout(() => setShowIncentive(true), 30000)
    return () => clearTimeout(timer)
  }, [])

  const handleRetryPayment = async () => {
    setIsProcessing(true)
    setRetryAttempts(prev => prev + 1)

    try {
      if (onRetryPayment) {
        await onRetryPayment()
      }
    } catch (error) {
      console.error('Retry payment failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport()
    } else {
      // Default action: open email client
      const subject = encodeURIComponent('Payment Issue - 6FB Methodologies Workshop')
      const body = encodeURIComponent(`
        Hello,

        I encountered an issue with my payment for the 6FB Methodologies Workshop.

        Details:
        - Session ID: ${sessionId || 'N/A'}
        - Email: ${customerEmail || 'N/A'}
        - Amount: ${formatCurrency(amount)}
        - Retry Attempts: ${retryAttempts}

        Please assist me in completing my registration.

        Thank you!
      `)
      window.open(`mailto:dre@tomb45.com?subject=${subject}&body=${body}`)
    }
  }

  const recoveryOptions: RecoveryOption[] = [
    {
      id: 'retry',
      title: 'Try Different Payment Method',
      description: 'Use a different card, digital wallet, or payment option',
      icon: CreditCard,
      action: handleRetryPayment,
      variant: 'primary',
      incentive: showIncentive ? 'Free shipping on materials!' : undefined,
    },
    {
      id: 'contact',
      title: 'Contact Support',
      description: 'Get help from our team via email or phone',
      icon: MessageSquare,
      action: handleContactSupport,
      variant: 'secondary',
    },
    {
      id: 'later',
      title: 'Complete Later',
      description: 'Save your spot and complete payment within 24 hours',
      icon: Clock,
      action: () => {
        // Implement save for later functionality
        localStorage.setItem('pendingRegistration', JSON.stringify({
          sessionId,
          customerEmail,
          amount,
          currency,
          timestamp: Date.now(),
        }))
        alert('Your registration has been saved. You have 24 hours to complete payment.')
      },
      variant: 'secondary',
    },
  ]

  return (
    <div className="min-h-screen bg-background-primary py-12">
      <div className="container-custom max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="heading-lg mb-4">
              Payment Needs Attention
            </h1>
            <p className="body-md text-text-secondary">
              Don't worry! We can help you secure your spot at the workshop.
            </p>
          </div>

          {/* Payment Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-tomb45-green" />
                Your Registration Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Workshop:</span>
                <span className="font-medium">6FB Methodologies Workshop</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Amount:</span>
                <span className="font-semibold text-tomb45-green">
                  {formatCurrency(amount)}
                </span>
              </div>
              {customerEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Email:</span>
                  <span className="font-medium">{customerEmail}</span>
                </div>
              )}
              {sessionId && (
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Reference:</span>
                  <span className="font-mono text-sm">
                    {sessionId.slice(-8).toUpperCase()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Incentive */}
          {showIncentive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="mb-8 border-tomb45-green bg-tomb45-green/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-tomb45-green/20 rounded-lg">
                      <Gift className="w-6 h-6 text-tomb45-green" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary mb-1">
                        Limited Time Offer!
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Complete your payment now and receive free shipping on all workshop materials, plus a bonus digital resource pack worth $97!
                      </p>
                    </div>
                    <Badge variant="success">
                      $97 Value
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recovery Options */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-text-primary">
              What would you like to do?
            </h2>

            {recoveryOptions.map((option, index) => {
              const IconComponent = option.icon

              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-background-secondary rounded-lg group-hover:bg-tomb45-green/10 transition-colors">
                          <IconComponent className="w-6 h-6 text-text-muted group-hover:text-tomb45-green transition-colors" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-text-primary">
                              {option.title}
                            </h3>
                            {option.incentive && (
                              <Badge variant="success" className="text-xs">
                                {option.incentive}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-text-muted">
                            {option.description}
                          </p>
                        </div>

                        <Button
                          variant={option.variant}
                          onClick={option.action}
                          disabled={isProcessing && option.id === 'retry'}
                          className="group-hover:shadow-md transition-all"
                        >
                          {isProcessing && option.id === 'retry' ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              {option.title}
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Retry Attempts Counter */}
          {retryAttempts > 0 && (
            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-text-muted" />
                  <div className="text-sm">
                    <span className="text-text-muted">Retry attempts: </span>
                    <span className="font-medium">{retryAttempts}</span>
                    {retryAttempts >= 3 && (
                      <span className="text-yellow-600 ml-2">
                        Consider contacting support for assistance
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Support Contact Options */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <Mail className="w-5 h-5 text-tomb45-green" />
                  <div>
                    <div className="text-sm font-medium">Email Support</div>
                    <div className="text-xs text-text-muted">
                      dre@tomb45.com
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <Phone className="w-5 h-5 text-tomb45-green" />
                  <div>
                    <div className="text-sm font-medium">Phone Support</div>
                    <div className="text-xs text-text-muted">
                      (555) 123-4567
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <Clock className="w-5 h-5 text-tomb45-green" />
                  <div>
                    <div className="text-sm font-medium">Support Hours</div>
                    <div className="text-xs text-text-muted">
                      Mon-Fri 9AM-6PM EST
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Quick tip:</strong> Try using a different browser or clearing your cookies.
                  Sometimes payment issues are resolved with a fresh session.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}