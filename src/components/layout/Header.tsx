'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { label: 'Home', action: scrollToTop },
    { label: 'Bossio Standard', action: () => scrollToSection('bossio-standard') },
    { label: 'The Book', action: () => scrollToSection('book') },
    { label: 'Mentorship', action: () => scrollToSection('mentorship') },
    { label: 'Skool', action: () => scrollToSection('skool') },
    { label: 'Free School', action: () => scrollToSection('free-school') },
    { label: 'Apps', action: () => scrollToSection('apps') },
    { label: 'Pricing', action: () => scrollToSection('pricing') },
  ];

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
        className="fixed top-0 left-0 right-0 z-50 bg-background-primary/95 backdrop-blur-sm border-b border-border-primary"
        role="banner"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 sm:h-20">
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
              aria-label="Chris Bossio Ecosystem - Scroll to top"
              className="cursor-pointer focus-ring rounded-lg"
            >
              <Logo
                size="md"
                variant="header"
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6" role="navigation">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="text-sm text-zinc-300 hover:text-tomb45-green transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <Link href="/app/signin">
                <Button size="sm" className="shadow-green-glow">
                  Sign In
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-300 hover:text-white"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background-secondary border-t border-border-primary"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3" role="navigation">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="text-left py-2 text-zinc-300 hover:text-tomb45-green transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <Link href="/app/signin" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full mt-2 shadow-green-glow">
                  Sign In
                </Button>
              </Link>
            </nav>
          </motion.div>
        )}
      </motion.header>
    </>
  );
}
