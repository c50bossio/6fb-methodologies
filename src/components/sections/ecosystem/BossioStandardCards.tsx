'use client';

import { motion } from 'framer-motion';
import { OfferingCard } from '@/components/ui/OfferingCard';
import { Badge } from '@/components/ui/Badge';
import { BarChart3, CheckCircle, Users } from 'lucide-react';

export function BossioStandardCards() {
  const pillars = [
    {
      icon: <BarChart3 className='w-6 h-6' />,
      iconColor: 'blue',
      title: 'Clear KPIs',
      description:
        'Track the metrics that matter: revenue, rebooking rate, average ticket, and profit margins. Data-driven decisions for sustainable growth.',
    },
    {
      icon: <CheckCircle className='w-6 h-6' />,
      iconColor: 'green',
      title: 'Proven Systems',
      description:
        'Marketing, operations, and wealth-building strategies that have helped thousands of barbers scale to six figures and beyond.',
    },
    {
      icon: <Users className='w-6 h-6' />,
      iconColor: 'purple',
      title: 'Community',
      description:
        'Join a network of driven barbers committed to excellence and financial freedom. Learn from peers and celebrate wins together.',
    },
  ];

  return (
    <section id='bossio-standard' className='py-20 bg-zinc-900'>
      <div className='container max-w-7xl mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className='text-center mb-12'
        >
          <Badge
            variant='outline'
            className='mb-4 border-green-500/50 text-green-500'
          >
            The Foundation
          </Badge>
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
            The Bossio Standard
          </h2>
          <p className='text-lg text-zinc-300 max-w-2xl mx-auto'>
            A proven methodology for building a six-figure barbershop business
            through clear metrics, proven systems, and community support.
          </p>
        </motion.div>

        {/* Pillar Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <OfferingCard
                icon={
                  <div
                    className={`text-${pillar.iconColor}-500`}
                    style={{
                      color:
                        pillar.iconColor === 'blue'
                          ? '#3b82f6'
                          : pillar.iconColor === 'green'
                            ? '#00c851'
                            : '#a855f7',
                    }}
                  >
                    {pillar.icon}
                  </div>
                }
                title={pillar.title}
                description={pillar.description}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
