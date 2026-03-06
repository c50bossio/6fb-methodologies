'use client'

import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'

export function Footer() {
  return (
    <footer className="bg-background-secondary border-t border-border-primary py-12">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="text-center space-y-6">
            {/* Logo/Brand */}
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <Logo size="xl" variant="footer" />
              </div>
              <h3 className="text-2xl font-bold text-tomb45-green mb-2">
                6FB Methodologies Workshop
              </h3>
              <p className="text-text-muted">
                Transform Your Barbering Business
              </p>
            </div>

            {/* Contact Info */}
            <div className="text-sm text-text-muted space-y-2">
              <p>Questions? Email us at: info@6fbmethodologies.com</p>
              <p>Workshop Support: support@6fbmethodologies.com</p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
              <a href="/privacy" className="hover:text-tomb45-green transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-tomb45-green transition-colors">
                Terms of Service
              </a>
              <a href="/refund" className="hover:text-tomb45-green transition-colors">
                Refund Policy
              </a>
            </div>

            {/* Copyright */}
            <div className="pt-6 border-t border-border-primary text-xs text-text-muted">
              <p>© 2025 6 Figure Barber. All rights reserved.</p>
              <p className="mt-1">
                Powered by proven methodologies from Dre, Nate & Bossio
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}