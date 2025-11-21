'use client';

import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export function Header() {
  const scrollToCities = () => {
    requestAnimationFrame(() => {
      document.getElementById('cities')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className='fixed top-0 left-0 right-0 z-50 bg-background-primary/95 backdrop-blur-sm border-b border-border-primary'
        role="banner"
      >
        <div className='container-custom'>
          <div className='flex items-center justify-between h-16 sm:h-20'>
          {/* Logo */}
          <div
            onClick={scrollToTop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToTop();
              }
            }}
            aria-label="EWP: 6FB Methodologies - Scroll to top"
            className="cursor-pointer focus-ring rounded-lg"
          >
            <Logo
              size='md'
              variant='header'
              className='w-8 h-8 sm:w-10 sm:h-10'
            />
          </div>

          {/* CTA Button */}
          <Button
            size='sm'
            onClick={scrollToCities}
            className='hidden sm:flex shadow-green-glow'
            aria-label="View workshop tickets and select your city"
          >
            Get Tickets
          </Button>

          {/* Mobile CTA */}
          <Button
            size='sm'
            onClick={scrollToCities}
            className='sm:hidden text-xs px-3'
            aria-label="View workshop tickets"
          >
            Tickets
          </Button>
          </div>
        </div>
      </motion.header>
    </>
  );
}
