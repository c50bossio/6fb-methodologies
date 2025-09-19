'use client'

import React, { useState } from 'react'
import { useWorkbookAuth } from './WorkbookAuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LogIn, Shield, Star, Crown } from 'lucide-react'

interface WorkbookLoginProps {
  onSuccess?: () => void
}

export function WorkbookLogin({ onSuccess }: WorkbookLoginProps) {
  const { login, isLoading } = useWorkbookAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate inputs
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    if (!password.trim()) {
      setError('Access code is required')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await login(email.trim().toLowerCase(), password.trim())

      if (result.success) {
        setSuccess('Authentication successful! Welcome to the workbook.')
        onSuccess?.()
      } else {
        setError(result.error || 'Invalid email or access code. Please check your credentials.')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Shield className="w-16 h-16 text-tomb45-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Workbook Access
          </h1>
          <p className="text-text-secondary">
            Enter your email to access the 6FB workshop workbook
          </p>
        </div>

        {/* Login Form */}
        <Card className="bg-background-secondary border-border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-tomb45-green" />
              Member Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your.email@example.com"
                  disabled={isSubmitting || isLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                  Access Code
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="6FB-XXXX-XXXX"
                  disabled={isSubmitting || isLoading}
                  className="w-full font-mono"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Enter the access code from your registration email
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={!isValidEmail(email) || !password.trim() || isSubmitting || isLoading}
                className="w-full"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Verifying...
                  </div>
                ) : (
                  'Access Workbook'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Access Tiers Information */}
        <Card className="bg-background-secondary border-border-primary">
          <CardHeader>
            <CardTitle className="text-center">Access Tiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-text-primary">Basic Access</h3>
                <p className="text-sm text-text-secondary">
                  View content, save progress
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-text-primary">Premium Access</h3>
                <p className="text-sm text-text-secondary">
                  Audio recording, transcription, export notes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-tomb45-green mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-text-primary">VIP Access</h3>
                <p className="text-sm text-text-secondary">
                  All features plus exclusive VIP content
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Information */}
        <div className="text-center text-sm text-text-secondary">
          <p>
            Your access level is determined by your 6FB membership status.
          </p>
          <p className="mt-1">
            Need help? Contact{' '}
            <a
              href="mailto:dre@tomb45.com"
              className="text-tomb45-green hover:underline"
            >
              dre@tomb45.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}