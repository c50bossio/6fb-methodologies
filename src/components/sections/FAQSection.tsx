'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChevronDown } from 'lucide-react';

export function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const faqs = [
    {
      question: "What's the difference between GA and VIP tickets?",
      answer:
        'Both tickets include complete access to all workshop content, materials, and methodologies. VIP tickets add exclusive perks: priority seating, a private dinner with the coaches (end of day one), extended Q&A access, and premium networking opportunities.',
    },
    {
      question: 'How do I verify my 6FB membership for the discount?',
      answer:
        'Simply enter the email address you used to join your 6FB community. Our system will automatically verify your membership and apply the 20% discount. If you have issues, contact our support team.',
    },
    {
      question: 'Can I bring team members with bulk pricing?',
      answer:
        "Yes! General Admission tickets qualify for bulk discounts: 5% off for 2 tickets, 10% off for 3 tickets, and 15% off for 4+ tickets. VIP tickets don't qualify for bulk pricing but 6FB members still save 20%.",
    },
    {
      question: "What if I can't attend after purchasing?",
      answer:
        'We offer a full refund up to 30 days before the event. Within 30 days, you can transfer your ticket to another person or receive a credit for future 6FB workshops.',
    },
    {
      question: 'Is this suitable for new barbers or just experienced ones?',
      answer:
        "The methodologies work at every level. We have specific breakout sessions for individual barbers, shop owners, and enterprise operators. Whether you're just starting or running multiple locations, you'll get tailored strategies.",
    },
    {
      question: 'What materials and resources are included?',
      answer:
        "You'll receive a comprehensive workbook, access to digital resources, templates for systems implementation, and a certificate of completion. VIP attendees also get a premium welcome package.",
    },
    {
      question: 'Will the content be recorded or available online?',
      answer:
        'No, this is an exclusive in-person experience. The intimate nature of the workshops, roundtables, and networking is what makes this so valuable. Recordings would compromise the exclusivity.',
    },
    {
      question: "What's the format of the roundtables on Day 2?",
      answer:
        "Small groups of 8-10 people rotate through intimate sessions with each coach. You'll get personalized advice, can ask specific questions about your business, and develop your custom 90-day action plan.",
    },
  ];

  return (
    <section className='section-padding bg-background-secondary'>
      <div className='container-custom'>
        <div className='text-center mb-16'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant='outline' className='mb-4'>
              Common Questions
            </Badge>
            <h2 className='heading-lg mb-6'>Frequently Asked Questions</h2>
            <p className='body-lg max-w-3xl mx-auto text-text-secondary'>
              Got questions? We've got answers. Here are the most common
              questions about the 6FB Methodologies Workshop.
            </p>
          </motion.div>
        </div>

        <div className='max-w-3xl mx-auto'>
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
              className='mb-4'
            >
              <Card className='overflow-hidden'>
                <CardContent className='p-0'>
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className='w-full p-6 text-left flex items-center justify-between hover:bg-background-accent transition-colors duration-200'
                  >
                    <span className='font-semibold text-text-primary pr-4'>
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-tomb45-green transition-transform duration-200 flex-shrink-0 ${
                        openFAQ === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <motion.div
                    initial={false}
                    animate={{ height: openFAQ === index ? 'auto' : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className='overflow-hidden'
                  >
                    <div className='px-6 pb-6 text-text-secondary leading-relaxed'>
                      {faq.answer}
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
