'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, Target, TrendingUp, DollarSign } from 'lucide-react'

export function WorkshopOverview() {
  const benefits = [
    {
      icon: Target,
      title: 'Clarity on Your Numbers',
      description: 'Identify the KPIs that actually drive income and profit in your barbering business'
    },
    {
      icon: TrendingUp,
      title: 'Clear-Cut 90-Day Plan',
      description: 'Leave with a tailored roadmap to take your business to the next level'
    },
    {
      icon: CheckCircle,
      title: 'Exposure to All Three Coaches',
      description: 'Learn directly from Dre, Nate, and Bossio - each bringing unique expertise'
    },
    {
      icon: DollarSign,
      title: 'Action Steps + Accountability',
      description: 'Practical steps and accountability systems to ensure follow-through'
    }
  ]

  const outcomes = [
    'Master systems that scale at every business level',
    'Learn grassroots marketing that consistently fills chairs',
    'Discover paid advertising strategies that actually convert',
    'Build an investing & wealth machine for long-term success',
    'Track the KPIs that matter most for growth',
    'Network with like-minded business owners'
  ]

  return (
    <section id="overview" className="section-padding bg-background-primary">
      <div className="container-custom">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant="success" className="mb-4">
              Proven Methodologies
            </Badge>
            <h2 className="heading-lg mb-6">
              Why 6FB Methodologies Workshop?
            </h2>
            <p className="body-lg max-w-3xl mx-auto text-text-secondary">
              This isn't just another business workshop. It's a complete transformation system
              that's helped thousands of barbers break through their income ceiling and build
              sustainable, profitable businesses.
            </p>
          </motion.div>
        </div>

        {/* Core Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card hover className="h-full p-6">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="bg-tomb45-green/10 p-3 rounded-xl">
                      <benefit.icon className="w-6 h-6 text-tomb45-green" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-text-secondary">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* What You'll Achieve */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-background-secondary border border-border-primary rounded-2xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <h3 className="heading-md mb-4">
              What You'll Achieve in Just 2 Days
            </h3>
            <p className="body-md text-text-secondary max-w-2xl mx-auto">
              Every attendee leaves with concrete, actionable strategies they can implement immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {outcomes.map((outcome, index) => (
              <motion.div
                key={outcome}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-tomb45-green flex-shrink-0" />
                <span className="text-text-secondary">{outcome}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}