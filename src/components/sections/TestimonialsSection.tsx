'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Star, Quote } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Marcus Rodriguez',
      title: 'Shop Owner, Miami',
      content:
        'The 6FB methodologies completely transformed my business. In 90 days, I went from struggling to stay afloat to having a waiting list. The systems Nate taught me for client retention alone increased my revenue by 40%.',
      beforeAfter: 'From $3K/month to $12K/month',
      avatar: 'M',
    },
    {
      name: 'Jamal Washington',
      title: 'Independent Barber, Atlanta',
      content:
        "Bossio's investment strategies opened my eyes to building real wealth. I'm not just cutting hair anymore - my money is working for me. The portfolio I built following his advice is now my biggest income source.",
      beforeAfter: 'Built $50K investment portfolio',
      avatar: 'J',
    },
    {
      name: 'David Chen',
      title: 'Enterprise Owner, 5 Locations',
      content:
        "Dre's enterprise systems saved my sanity. I used to work 80-hour weeks managing my shops. Now I work 30 hours and my locations run themselves. The KPI tracking system alone is worth 10x the workshop price.",
      beforeAfter: '80 hours/week to 30 hours/week',
      avatar: 'D',
    },
    {
      name: 'Tony Soprano',
      title: 'Shop Owner, New Jersey',
      content:
        "These guys don't just talk theory - they give you the exact blueprints they use. The marketing funnel I learned from this workshop brought in 200 new clients in 6 months. Game changer.",
      beforeAfter: '200 new clients in 6 months',
      avatar: 'T',
    },
    {
      name: 'Carlos Martinez',
      title: 'Independent Barber, Phoenix',
      content:
        "I was skeptical about 'business workshops' but this was different. Real strategies from real barbers who've done it. My average ticket went from $25 to $65 using their pricing strategies.",
      beforeAfter: '$25 tickets to $65 tickets',
      avatar: 'C',
    },
    {
      name: 'Brandon Smith',
      title: 'Shop Owner, Dallas',
      content:
        "The networking alone was worth it. Connected with 3 other shop owners who became business partners. We're now opening our 4th location together using the systems we learned.",
      beforeAfter: '1 shop to 4 shops in partnership',
      avatar: 'B',
    },
  ];

  const stats = [
    { number: '2,000+', label: 'Barbers Trained' },
    { number: '95%', label: 'Report Increased Revenue' },
    { number: '$2.3M+', label: 'Additional Revenue Generated' },
    { number: '4.9/5', label: 'Average Rating' },
  ];

  return (
    <section className='section-padding bg-background-primary'>
      <div className='container-custom'>
        <div className='text-center mb-16'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant='success' className='mb-4'>
              Proven Results
            </Badge>
            <h2 className='heading-lg mb-6'>Real Stories from Real Barbers</h2>
            <p className='body-lg max-w-3xl mx-auto text-text-secondary'>
              Don&apos;t just take our word for it. Here&apos;s what barbers are saying
              about the EWP: 6FB Methodologies Workshop and the results they&apos;ve
              achieved.
            </p>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className='grid grid-cols-2 md:grid-cols-4 gap-8 mb-16'
        >
          {stats.map((stat) => (
            <div key={stat.label} className='text-center'>
              <div className='text-3xl md:text-4xl font-bold text-tomb45-green mb-2'>
                {stat.number}
              </div>
              <div className='text-sm text-text-muted'>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className='h-full p-6 hover:shadow-dark-lg transition-shadow duration-300'>
                <CardContent className='p-0'>
                  {/* Quote Icon */}
                  <Quote className='w-8 h-8 text-tomb45-green mb-4' />

                  {/* Star Rating */}
                  <div className='flex gap-1 mb-4'>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className='w-4 h-4 fill-tomb45-green text-tomb45-green'
                      />
                    ))}
                  </div>

                  {/* Testimonial Content */}
                  <p className='text-text-secondary text-sm leading-relaxed mb-4'>
                    &ldquo;{testimonial.content}&rdquo;
                  </p>

                  {/* Before/After Result */}
                  <div className='bg-tomb45-green/10 border border-tomb45-green/20 rounded-lg p-3 mb-4'>
                    <p className='text-xs font-medium text-tomb45-green'>
                      Result: {testimonial.beforeAfter}
                    </p>
                  </div>

                  {/* Author Info */}
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-tomb45-green/10 rounded-full flex items-center justify-center'>
                      <span className='text-sm font-bold text-tomb45-green'>
                        {testimonial.avatar}
                      </span>
                    </div>
                    <div>
                      <div className='font-semibold text-text-primary text-sm'>
                        {testimonial.name}
                      </div>
                      <div className='text-xs text-text-muted'>
                        {testimonial.title}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className='text-center mt-16'
        >
          <Card className='max-w-2xl mx-auto p-8 gradient-radial'>
            <CardContent className='p-0'>
              <h3 className='text-2xl font-semibold text-text-primary mb-4'>
                Your Success Story Starts Here
              </h3>
              <p className='text-text-secondary mb-6'>
                Join thousands of barbers who have transformed their businesses
                and built lasting wealth with proven 6FB methodologies.
              </p>
              <div className='text-sm text-text-muted'>
                &ldquo;The best investment I ever made was in myself and my business
                education.&rdquo;
                <span className='block mt-1 text-tomb45-green'>
                  - Every successful workshop graduate
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
