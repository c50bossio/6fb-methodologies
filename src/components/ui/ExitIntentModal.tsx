'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { X, ArrowRight, Download, Mail, Calendar, Gift, Users } from 'lucide-react'

export function ExitIntentModal() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasShown, setHasShown] = useState(false)
  const [selectedOption, setSelectedOption] = useState<'register' | 'info' | 'waitlist' | null>(null)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from the top of the page
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true)
        setHasShown(true)
      }
    }

    const handleScroll = () => {
      // Show after scrolling 70% of page if not shown yet
      if (!hasShown) {
        const scrolled = window.scrollY
        const total = document.body.scrollHeight - window.innerHeight
        if (scrolled / total > 0.7) {
          timer = setTimeout(() => {
            setIsVisible(true)
            setHasShown(true)
          }, 2000)
        }
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('scroll', handleScroll)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('scroll', handleScroll)
      if (timer) clearTimeout(timer)
    }
  }, [hasShown])

  const scrollToPricing = () => {
    setIsVisible(false)
    // Add early bird discount parameter
    const url = new URL(window.location.href)
    url.searchParams.set('earlyBird', 'true')
    window.history.replaceState({}, '', url.toString())
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleInfoDownload = async () => {
    setIsSubmitting(true)
    try {
      // Simulate API call for download/info request
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In real implementation, this would:
      // 1. Save email to mailing list
      // 2. Send detailed workshop information
      // 3. Trigger download of PDF guide

      setSubmitSuccess(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 2000)
    } catch (error) {
      console.error('Info request failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWaitlistJoin = async () => {
    setIsSubmitting(true)
    try {
      // Simulate API call for waitlist
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In real implementation, this would:
      // 1. Add to waitlist
      // 2. Send confirmation email
      // 3. Notify about future workshops

      setSubmitSuccess(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 2000)
    } catch (error) {
      console.error('Waitlist join failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="max-w-md w-full"
          >
            <Card className="border-tomb45-green/20 shadow-2xl text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-tomb45-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-tomb45-green" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Thank You!
                </h3>
                <p className="text-text-secondary">
                  {selectedOption === 'info'
                    ? "We've sent the detailed workshop information to your email."
                    : "You've been added to our waitlist. We'll notify you about future workshops."
                  }
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsVisible(false)}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full"
          >
            <Card className="border-border-primary shadow-2xl">
              <CardHeader className="text-center relative">
                <button
                  onClick={() => setIsVisible(false)}
                  className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <Badge className="bg-tomb45-green/10 text-tomb45-green border-tomb45-green/20">
                    Quick Question
                  </Badge>
                </div>

                <CardTitle className="text-xl mb-2">
                  How Can We Help?
                </CardTitle>

                <p className="text-sm text-text-secondary">
                  We understand that timing and decisions matter. Let us know what would be most helpful for you right now.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {!selectedOption ? (
                  <>
                    {/* Three Main Options */}
                    <div className="space-y-3">
                      <button
                        onClick={() => setSelectedOption('register')}
                        className="w-full p-4 border border-border-primary rounded-xl hover:border-tomb45-green hover:bg-tomb45-green/5 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-tomb45-green" />
                          <div className="text-left">
                            <div className="font-medium text-text-primary">I'm ready to register</div>
                            <div className="text-sm text-text-secondary">Get early bird pricing (10% off through this week)</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-tomb45-green ml-auto" />
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedOption('info')}
                        className="w-full p-4 border border-border-primary rounded-xl hover:border-tomb45-green hover:bg-tomb45-green/5 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Download className="w-5 h-5 text-tomb45-green" />
                          <div className="text-left">
                            <div className="font-medium text-text-primary">I need more information</div>
                            <div className="text-sm text-text-secondary">Download detailed syllabus and FAQ</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-tomb45-green ml-auto" />
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedOption('waitlist')}
                        className="w-full p-4 border border-border-primary rounded-xl hover:border-tomb45-green hover:bg-tomb45-green/5 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-tomb45-green" />
                          <div className="text-left">
                            <div className="font-medium text-text-primary">Not ready yet</div>
                            <div className="text-sm text-text-secondary">Join waitlist for future workshops</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-tomb45-green ml-auto" />
                        </div>
                      </button>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={() => setIsVisible(false)}
                        className="text-xs text-text-muted hover:text-text-primary"
                      >
                        I'll browse a bit more
                      </button>
                    </div>
                  </>
                ) : selectedOption === 'register' ? (
                  <div className="text-center space-y-4">
                    <div className="bg-tomb45-green/10 border border-tomb45-green/20 rounded-xl p-4">
                      <h4 className="font-semibold text-text-primary mb-2 flex items-center justify-center gap-2">
                        <Gift className="w-5 h-5 text-tomb45-green" />
                        Early Bird Special
                      </h4>
                      <p className="text-sm text-text-secondary mb-3">
                        Register this week and save 10% on either ticket option. This discount is available until Sunday, then returns to regular pricing.
                      </p>
                      <div className="text-xs text-tomb45-green font-medium">
                        ✓ Valid through this Sunday • No pressure, genuine savings
                      </div>
                    </div>

                    <Button
                      onClick={scrollToPricing}
                      className="w-full group"
                      size="lg"
                    >
                      View Pricing with Early Bird Discount
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <button
                      onClick={() => setSelectedOption(null)}
                      className="text-sm text-text-muted hover:text-text-primary"
                    >
                      ← Back to options
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-text-primary mb-2">
                        {selectedOption === 'info' ? 'Get Detailed Information' : 'Join the Waitlist'}
                      </h4>
                      <p className="text-sm text-text-secondary mb-4">
                        {selectedOption === 'info'
                          ? "We'll send you a comprehensive guide with the complete workshop agenda, FAQ, and success stories."
                          : "We'll notify you about future workshop dates and give you first access to registration."
                        }
                      </p>
                    </div>

                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />

                    <div className="flex gap-3">
                      <Button
                        onClick={selectedOption === 'info' ? handleInfoDownload : handleWaitlistJoin}
                        disabled={!email || isSubmitting}
                        className="flex-1"
                        isLoading={isSubmitting}
                      >
                        {selectedOption === 'info' ? 'Send Information' : 'Join Waitlist'}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => setSelectedOption(null)}
                        disabled={isSubmitting}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}