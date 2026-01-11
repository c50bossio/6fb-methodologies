'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  location: string;
  quote: string;
  result: string;
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className='h-full'
    >
      <div className='relative h-full rounded-xl p-6 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-green-500/50 transition-all duration-300'>
        {/* Quote Icon */}
        <Quote className='w-10 h-10 text-green-500/20 mb-4' />

        {/* Star Rating */}
        <div className='flex gap-1 mb-4'>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className='w-4 h-4 fill-green-500 text-green-500'
            />
          ))}
        </div>

        {/* Quote */}
        <p className='text-zinc-300 mb-6 leading-relaxed text-lg italic'>
          &ldquo;{testimonial.quote}&rdquo;
        </p>

        {/* Result Highlight */}
        <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6'>
          <p className='text-green-500 font-semibold'>{testimonial.result}</p>
        </div>

        {/* Author */}
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-green-500 font-bold text-xl'>
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <div className='font-semibold text-white'>{testimonial.name}</div>
            <div className='text-sm text-zinc-400'>
              {testimonial.role} • {testimonial.location}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SuccessStories() {
  const testimonials: Testimonial[] = [
    {
      name: 'Marcus Johnson',
      role: 'Shop Owner',
      location: 'Atlanta, GA',
      quote:
        "The 6FB methodology completely transformed how I run my business. The KPI tracking alone helped me identify where I was losing money. Now I'm making data-driven decisions instead of guessing.",
      result: 'Increased revenue by 47% in 6 months',
    },
    {
      name: 'David Chen',
      role: 'Booth Renter',
      location: 'Los Angeles, CA',
      quote:
        "I went from struggling to pay rent to booking out weeks in advance. The content generator app helps me stay consistent on social media, and the AI coach keeps me accountable to my goals.",
      result: 'Doubled income and opened 2nd location',
    },
    {
      name: 'Andre Williams',
      role: 'Suite Owner',
      location: 'Miami, FL',
      quote:
        "The Skool community is invaluable. Being around other barbers who think like entrepreneurs changed my mindset. The weekly calls with Chris gave me strategies I implemented immediately.",
      result: 'Hit $15K/month consistently',
    },
  ];

  return (
    <section className='py-20 bg-black'>
      <div className='container max-w-7xl mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center mb-12'
        >
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
            Success Stories
          </h2>
          <p className='text-lg text-zinc-300 max-w-2xl mx-auto'>
            Real barbers, real results. See how the 6FB methodology and tools are
            helping barbers across the country build six-figure businesses.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className='mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center'
        >
          <div>
            <div className='text-4xl font-bold text-green-500 mb-2'>2,000+</div>
            <div className='text-zinc-400'>Active Members</div>
          </div>
          <div>
            <div className='text-4xl font-bold text-green-500 mb-2'>$100K+</div>
            <div className='text-zinc-400'>Average Member Revenue</div>
          </div>
          <div>
            <div className='text-4xl font-bold text-green-500 mb-2'>4.9/5</div>
            <div className='text-zinc-400'>Member Satisfaction</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
