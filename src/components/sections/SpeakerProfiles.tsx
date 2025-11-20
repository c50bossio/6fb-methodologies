'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';

export function SpeakerProfiles() {
  const speakers = [
    {
      name: 'Dre',
      title: 'Enterprise Systems & Leadership',
      expertise: [
        'Payroll Systems',
        'Enterprise Operations',
        'Multi-Location Management',
        'KPI Tracking',
      ],
      bio: 'Dre specializes in scaling barbershops to enterprise level. His expertise in payroll systems, leadership, and delegation has helped countless shop owners manage multiple locations while maintaining consistency and profitability.',
      image: '/images/dre-profile.jpg',
      accent: 'blue',
    },
    {
      name: 'Nate',
      title: 'Systems & Marketing Expert',
      expertise: [
        'Barber Systems',
        'Grassroots Marketing',
        'Staff Accountability',
        'Client Retention',
      ],
      bio: 'Nate is the master of barber-level systems and grassroots marketing. He&apos;s helped thousands of barbers build consistent client flow through proven systems and marketing strategies that work at every level.',
      image: '/images/nate-profile.jpg',
      accent: 'green',
    },
    {
      name: 'Bossio',
      title: 'Marketing & Wealth Building',
      expertise: [
        'Paid Advertising',
        'Investment Strategy',
        'Wealth Building',
        'ROI Optimization',
      ],
      bio: 'Bossio brings the marketing and wealth-building expertise that transforms businesses. His proven paid advertising strategies and investment methodologies help barbers build lasting wealth while growing their businesses.',
      image: '/images/bossio-profile.jpg',
      accent: 'purple',
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
            className='flex justify-center mb-6'
          >
            <Logo size='sm' variant='subtle' />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant='outline' className='mb-4'>
              Expert Coaches
            </Badge>
            <h2 className='heading-lg mb-6'>
              Learn from the Best in the Business
            </h2>
            <p className='body-lg max-w-3xl mx-auto text-text-secondary'>
              Our six expert coaches bring decades of combined experience and
              have helped thousands of barbers transform their businesses and
              build lasting wealth.
            </p>
          </motion.div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {speakers.map((speaker, index) => (
            <motion.div
              key={speaker.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card hover className='h-full'>
                <CardContent className='p-6'>
                  {/* Profile Image */}
                  <div className='w-20 h-20 mb-4 mx-auto'>
                    <img
                      src={speaker.image}
                      alt={`${speaker.name} - ${speaker.title}`}
                      className='w-full h-full object-cover rounded-full'
                    />
                  </div>

                  {/* Speaker Info */}
                  <div className='text-center mb-4'>
                    <h3 className='text-2xl font-bold text-text-primary mb-1'>
                      {speaker.name}
                    </h3>
                    <p className='text-tomb45-green font-medium'>
                      {speaker.title}
                    </p>
                  </div>

                  {/* Expertise Tags */}
                  <div className='flex flex-wrap gap-2 justify-center mb-4'>
                    {speaker.expertise.map(skill => (
                      <Badge
                        key={skill}
                        variant='secondary'
                        className='text-xs'
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {/* Bio */}
                  <p className='text-text-secondary text-sm leading-relaxed text-center'>
                    {speaker.bio}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Combined Expertise Call-out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className='mt-16 text-center'
        >
          <Card className='max-w-4xl mx-auto p-8 gradient-radial'>
            <CardContent className='p-0'>
              <h3 className='text-2xl font-semibold text-text-primary mb-4'>
                Three Perspectives, One Powerful System
              </h3>
              <p className='body-md text-text-secondary mb-6'>
                Together, Dre, Nate, and Bossio cover every aspect of building
                and scaling a successful barbering business - from individual
                barber systems to enterprise operations and wealth building.
              </p>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 text-sm'>
                <div>
                  <div className='w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2' />
                  <span className='text-text-muted'>
                    Enterprise & Leadership
                  </span>
                </div>
                <div>
                  <div className='w-3 h-3 bg-tomb45-green rounded-full mx-auto mb-2' />
                  <span className='text-text-muted'>Systems & Marketing</span>
                </div>
                <div>
                  <div className='w-3 h-3 bg-purple-500 rounded-full mx-auto mb-2' />
                  <span className='text-text-muted'>Advertising & Wealth</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
