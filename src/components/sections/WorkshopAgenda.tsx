'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Clock,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  BarChart,
} from 'lucide-react';

export function WorkshopAgenda() {
  const day1Schedule = [
    {
      time: '8:30 - 9:00 AM',
      title: 'Registration & Networking',
      description:
        'Check in, grab workbook + swag bag. Coffee and light snacks.',
      type: 'registration',
    },
    {
      time: '9:00 - 10:30 AM',
      title: 'Systems That Scale',
      description: 'Why systems = freedom at every level (Nate & Dre)',
      details: [
        'Nate → Barber systems (rebooking, client flow, grassroots consistency)',
        'Nate → Barbershop staff accountability systems',
        'Dre → Payroll systems (making the numbers work)',
        'Dre → Enterprise systems (leadership, delegation, consistency across multiple shops)',
      ],
      workbook: 'Map your "Current System Gaps vs. Ideal Flow"',
      type: 'session',
    },
    {
      time: '10:30 - 10:45 AM',
      title: 'Break',
      type: 'break',
    },
    {
      time: '10:45 - 11:45 AM',
      title: 'Marketing That Builds Demand',
      description: 'How to consistently get clients in the door (Nate)',
      details: [
        'Barber Strategies: Facebook groups, Free Haircut campaigns, promo cards',
        'Shop Strategies: Reviews, referrals, seasonal promotions',
        'Enterprise Strategies: Brand + campaign duplication across shops',
      ],
      workbook: 'Pick one grassroots campaign to test in 30 days',
      type: 'session',
    },
    {
      time: '11:45 - 12:45 PM',
      title: 'Paid Ads That Convert',
      description: 'Step-by-step playbook for running profitable ads (Bossio)',
      details: [
        'Barber → small-budget local ads',
        'Shop → funnels that fill chairs',
        'Enterprise → ROI tracking & scaling spend',
      ],
      workbook: 'Fill out your "One Campaign Framework"',
      type: 'session',
    },
    {
      time: '12:45 - 2:00 PM',
      title: 'Lunch + Sponsor Showcase',
      type: 'break',
    },
    {
      time: '2:00 - 3:15 PM',
      title: 'The Investing & Wealth Machine',
      description: 'Goal: make your money work while you cut less (Bossio)',
      details: [
        'Barber → stocks, ETFs, IRAs',
        'Shop → reinvesting profits into cash-flowing assets',
        'Enterprise → options, tax strategy, wealth preservation',
      ],
      workbook: 'Build your "Wealth Plan 1.0"',
      type: 'session',
    },
    {
      time: '3:15 - 3:30 PM',
      title: 'Break',
      type: 'break',
    },
    {
      time: '3:30 - 4:15 PM',
      title: 'KPIs That Matter',
      description: 'The numbers that grow your business (Dre)',
      details: [
        'Barber → unique clients, rebooking %, average ticket',
        'Shop → chair utilization, payroll %, client retention',
        'Enterprise → profit across all shops ("what\'s left after all bills")',
      ],
      workbook: 'Identify your "Top 3 KPIs"',
      type: 'session',
    },
    {
      time: '4:15 - 5:00 PM',
      title: 'Breakout Groups by Avatar',
      description: 'Small group discussions by business type',
      type: 'session',
    },
    {
      time: '5:00 - 5:30 PM',
      title: 'Open Q&A',
      description: 'Direct access to Dre, Nate & Bossio',
      type: 'session',
    },
    {
      time: '7:00 PM',
      title: 'VIP Private Dinner',
      description: 'Private dinner with Dre, Nate & Bossio (VIP Only)',
      details: ['Intimate mentorship + high-level networking'],
      type: 'vip',
    },
  ];

  const day2Schedule = [
    {
      time: '9:30 - 10:15 AM',
      title: 'Roundtables (Rotation 1)',
      description: 'Intimate sessions with each coach',
      type: 'session',
    },
    {
      time: '10:15 - 11:00 AM',
      title: 'Roundtables (Rotation 2)',
      description: 'Continue rotating through expert sessions',
      type: 'session',
    },
    {
      time: '11:00 - 11:45 AM',
      title: 'Roundtables (Rotation 3)',
      description: 'Final rotation with personalized guidance',
      type: 'session',
    },
    {
      time: '11:45 - 12:00 PM',
      title: 'Recap',
      description: 'Key takeaways and next steps',
      type: 'session',
    },
    {
      time: '12:00 - 1:00 PM',
      title: 'Lunch',
      type: 'break',
    },
    {
      time: '1:00 - 3:00 PM',
      title: 'Roundtable Continuation + Action Plan Shareouts',
      description: 'Finalize your personalized action plan',
      type: 'session',
    },
    {
      time: '3:00 - 4:00 PM',
      title: 'Closing Session - Commitments + Next Steps',
      description: 'Everyone writes down their top 3 commitments',
      details: ['Certificate of Completion ceremony'],
      type: 'session',
    },
  ];

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return Users;
      case 'session':
        return Target;
      case 'break':
        return Clock;
      case 'vip':
        return DollarSign;
      default:
        return Target;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'blue';
      case 'session':
        return 'green';
      case 'break':
        return 'gray';
      case 'vip':
        return 'purple';
      default:
        return 'green';
    }
  };

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
              Complete Agenda
            </Badge>
            <h2 className='heading-lg mb-6'>2 Days of Intensive Learning</h2>
            <p className='body-lg max-w-3xl mx-auto text-text-secondary'>
              Every minute is designed to deliver maximum value. You'll leave
              with actionable strategies, clear KPIs, and a personalized 90-day
              plan.
            </p>
          </motion.div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
          {/* Day 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className='mb-8'>
              <h3 className='heading-md mb-2 text-center'>
                Day 1 - Collect the Data
              </h3>
              <p className='text-text-secondary text-center'>
                Learn the core methodologies and systems
              </p>
            </div>

            <div className='space-y-4'>
              {day1Schedule.map((item, index) => {
                const Icon = getSessionIcon(item.type);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <Card
                      className={`${item.type === 'session' ? 'border-tomb45-green/20' : ''}`}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-start gap-3'>
                          <div className='bg-tomb45-green/10 p-2 rounded-lg flex-shrink-0'>
                            <Icon className='w-4 h-4 text-tomb45-green' />
                          </div>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-1'>
                              <span className='text-sm font-mono text-tomb45-green'>
                                {item.time}
                              </span>
                              {item.type === 'vip' && (
                                <Badge variant='success' className='text-xs'>
                                  VIP Only
                                </Badge>
                              )}
                            </div>
                            <h4 className='font-semibold text-text-primary mb-1'>
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className='text-sm text-text-secondary mb-2'>
                                {item.description}
                              </p>
                            )}
                            {item.details && (
                              <ul className='text-xs text-text-muted space-y-1 mb-2'>
                                {item.details.map((detail, i) => (
                                  <li
                                    key={i}
                                    className='flex items-start gap-1'
                                  >
                                    <span className='w-1 h-1 bg-tomb45-green rounded-full mt-2 flex-shrink-0' />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {item.workbook && (
                              <div className='bg-tomb45-green/5 border border-tomb45-green/20 rounded-lg p-2 mt-2'>
                                <p className='text-xs text-tomb45-green'>
                                  📝 Workbook: {item.workbook}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Day 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className='mb-8'>
              <h3 className='heading-md mb-2 text-center'>
                Day 2 - Leverage the Data
              </h3>
              <p className='text-text-secondary text-center'>
                Apply insights and create your action plan
              </p>
            </div>

            <div className='space-y-4'>
              {day2Schedule.map((item, index) => {
                const Icon = getSessionIcon(item.type);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <Card
                      className={`${item.type === 'session' ? 'border-tomb45-green/20' : ''} ${item.type === 'vip' ? 'border-purple-500/20' : ''}`}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-start gap-3'>
                          <div
                            className={`${item.type === 'vip' ? 'bg-purple-500/10' : 'bg-tomb45-green/10'} p-2 rounded-lg flex-shrink-0`}
                          >
                            <Icon
                              className={`w-4 h-4 ${item.type === 'vip' ? 'text-purple-500' : 'text-tomb45-green'}`}
                            />
                          </div>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-1'>
                              <span
                                className={`text-sm font-mono ${item.type === 'vip' ? 'text-purple-500' : 'text-tomb45-green'}`}
                              >
                                {item.time}
                              </span>
                              {item.type === 'vip' && (
                                <Badge className='text-xs bg-purple-500 text-white'>
                                  VIP Only
                                </Badge>
                              )}
                            </div>
                            <h4 className='font-semibold text-text-primary mb-1'>
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className='text-sm text-text-secondary mb-2'>
                                {item.description}
                              </p>
                            )}
                            {item.details && (
                              <ul className='text-xs text-text-muted space-y-1'>
                                {item.details.map((detail, i) => (
                                  <li
                                    key={i}
                                    className='flex items-start gap-1'
                                  >
                                    <span
                                      className={`w-1 h-1 ${item.type === 'vip' ? 'bg-purple-500' : 'bg-tomb45-green'} rounded-full mt-2 flex-shrink-0`}
                                    />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
