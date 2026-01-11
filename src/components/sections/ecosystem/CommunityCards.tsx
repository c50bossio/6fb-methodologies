'use client';

import { motion } from 'framer-motion';
import { OfferingCard } from '@/components/ui/OfferingCard';
import { BookOpen, Users, GraduationCap } from 'lucide-react';

export function CommunityCards() {
  const offerings = [
    {
      icon: <BookOpen className='w-6 h-6' />,
      title: 'The Book',
      description:
        "Discover the complete framework for building a six-figure barbershop business in Chris Bossio's comprehensive guide. The blueprint that started it all.",
      href: 'https://www.amazon.com/Bossio-Standard-Structure-Before-Scale-ebook/dp/B0G4KM4X85/ref=sr_1_1?crid=3H0NZ6UIV3CKK&dib=eyJ2IjoiMSJ9.Rn86EAZ-MQGL1LJoHLNFqA.aLY3yR-Hy_mK7mFs1NN1PUSA5Q_e4wj-CK70eqiPIYM&dib_tag=se&keywords=the+bossio+standard&qid=1768136785&sprefix=the+bossio+%2Caps%2C167&sr=8-1',
      ctaText: 'Get the Book',
    },
    {
      icon: <Users className='w-6 h-6' />,
      title: 'Skool Community',
      description:
        'Connect with thousands of barbers in our private Skool community. Share wins, get support, ask questions, and grow together.',
      href: 'https://www.skool.com/tomb45',
      ctaText: 'Join Community',
    },
    {
      icon: <GraduationCap className='w-6 h-6' />,
      title: 'The Free School',
      description:
        'Access free educational resources, tutorials, and training to start your journey to six figures. No credit card required.',
      href: 'https://www.skool.com/tomb45',
      ctaText: 'Access Free Resources',
    },
  ];

  return (
    <section id='community' className='py-20 bg-zinc-950'>
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
            Community & Education
          </h2>
          <p className='text-lg text-zinc-300 max-w-2xl mx-auto'>
            Learn, connect, and grow with the 6FB ecosystem. From beginner to
            expert, we have resources for every stage of your journey.
          </p>
        </motion.div>

        {/* Community Cards Grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {offerings.map((offering, index) => (
            <motion.div
              key={offering.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <OfferingCard {...offering} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
