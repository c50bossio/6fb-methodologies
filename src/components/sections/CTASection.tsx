'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowRight, Clock, Users, Target } from 'lucide-react';

export function CTASection() {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  const urgencyFactors = [
    {
      icon: Clock,
      title: 'Limited Time',
      description: 'Early bird pricing ends soon',
    },
    {
      icon: Users,
      title: 'Limited Seats',
      description: 'Only 100 spots available',
    },
    {
      icon: Target,
      title: 'Proven Results',
      description: '95% see increased revenue',
    },
  ];

  return (
    <section className='section-padding bg-background-primary gradient-radial'>
      <div className='container-custom'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center'
        >
          <Card className='max-w-4xl mx-auto p-8 md:p-12 border-tomb45-green/20 shadow-green-glow'>
            <CardContent className='p-0'>
              <h2 className='heading-lg mb-6'>
                Ready to Transform Your Business?
              </h2>

              <p className='body-lg max-w-2xl mx-auto text-text-secondary mb-8'>
                Stop struggling with inconsistent income and build the
                profitable, scalable barbering business you've always wanted.
                The methodologies work - you just need to implement them.
              </p>

              {/* Urgency Factors */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-10'>
                {urgencyFactors.map((factor, index) => (
                  <motion.div
                    key={factor.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className='flex flex-col items-center text-center'
                  >
                    <div className='bg-tomb45-green/10 p-3 rounded-xl mb-3'>
                      <factor.icon className='w-6 h-6 text-tomb45-green' />
                    </div>
                    <h4 className='font-semibold text-text-primary mb-1'>
                      {factor.title}
                    </h4>
                    <p className='text-sm text-text-muted'>
                      {factor.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Main CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className='space-y-6'
              >
                <Button
                  size='xl'
                  onClick={scrollToPricing}
                  className='group shadow-green-glow animate-pulse-green text-lg px-12 py-4'
                >
                  Secure Your Spot Now
                  <ArrowRight className='ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform' />
                </Button>

                <div className='text-sm text-text-muted space-y-1'>
                  <p>✓ Secure payment by Stripe</p>
                  <p>✓ 30-day refund policy</p>
                  <p>✓ 6FB members save 20%</p>
                </div>
              </motion.div>

              {/* Final Social Proof */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className='mt-10 pt-8 border-t border-border-primary'
              >
                <p className='text-lg font-medium text-text-primary mb-2'>
                  "The best investment I ever made was in myself and my
                  business."
                </p>
                <p className='text-sm text-text-muted'>
                  - Marcus R., Shop Owner (Increased revenue from $3K to
                  $12K/month)
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
