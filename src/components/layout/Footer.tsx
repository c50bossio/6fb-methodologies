'use client';

import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className='bg-background-secondary border-t border-border-primary py-12' role="contentinfo" aria-label="Site footer">
      <div className='container-custom'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className='text-center space-y-6'>
            {/* Logo/Brand */}
            <div className='flex flex-col items-center'>
              <div className='mb-4'>
                <Logo size='xl' variant='footer' />
              </div>
              <h3 className='text-2xl font-bold text-tomb45-green mb-2'>
                EWP: 6FB Methodologies Workshop
              </h3>
              <p className='text-text-muted'>
                An Executive Workshop Program Event
              </p>
            </div>

            {/* Contact Info */}
            <div className='text-sm text-text-muted space-y-2'>
              <p>
                Questions? Email us at:{' '}
                <a
                  href='mailto:dre@tomb45.com'
                  className='text-tomb45-green hover:underline focus-ring rounded px-1'
                  aria-label="Contact us via email at dre@tomb45.com"
                >
                  dre@tomb45.com
                </a>
              </p>
            </div>

            {/* Quick Links */}
            <nav className='flex flex-wrap justify-center gap-6 text-sm text-text-muted' aria-label="Footer navigation">
              <a
                href='/workbook/login'
                className='hover:text-tomb45-green transition-colors font-medium focus-ring rounded px-2 py-1'
                aria-label="Access workshop workbook"
              >
                Workshop Workbook
              </a>
              <a
                href='/privacy'
                className='hover:text-tomb45-green transition-colors focus-ring rounded px-2 py-1'
                aria-label="Read our privacy policy"
              >
                Privacy Policy
              </a>
              <a
                href='/terms'
                className='hover:text-tomb45-green transition-colors focus-ring rounded px-2 py-1'
                aria-label="Read our terms of service"
              >
                Terms of Service
              </a>
              <a
                href='/refund-policy'
                className='hover:text-tomb45-green transition-colors focus-ring rounded px-2 py-1'
                aria-label="Read our refund policy"
              >
                Refund Policy
              </a>
            </nav>

            {/* Copyright */}
            <div className='pt-6 border-t border-border-primary text-xs text-text-muted'>
              <p>© 2025 EWP - Executive Workshop Program. All rights reserved.</p>
              <p className='mt-1'>
                Powered by proven methodologies from Dre, Nate & Bossio
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
