'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeType = 'most-popular' | 'new' | '6fb-only' | 'best-value';

interface OfferingCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: BadgeType;
  href?: string;
  ctaText?: string;
  variant?: 'default' | 'featured';
  className?: string;
}

const badgeStyles: Record<BadgeType, string> = {
  'most-popular': 'bg-green-500 text-white',
  new: 'bg-blue-500 text-white',
  '6fb-only': 'bg-purple-500 text-white',
  'best-value': 'bg-green-500 text-white',
};

const badgeText: Record<BadgeType, string> = {
  'most-popular': 'Most Popular',
  new: 'NEW',
  '6fb-only': '6FB Members Only',
  'best-value': 'Best Value',
};

export function OfferingCard({
  icon,
  title,
  description,
  badge,
  href,
  ctaText = 'Learn More',
  variant = 'default',
  className,
}: OfferingCardProps) {
  const cardContent = (
    <div
      className={cn(
        'group relative h-full rounded-xl p-6 transition-all duration-300',
        variant === 'featured'
          ? 'bg-green-900/20 border-2 border-green-500 hover:bg-green-900/30'
          : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-green-500/50',
        'hover:scale-[1.02]',
        className
      )}
    >
      {/* Icon and Badge Row */}
      <div className='flex items-start justify-between mb-4'>
        <div className='w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center text-green-500'>
          {icon}
        </div>
        {badge && (
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold',
              badgeStyles[badge]
            )}
          >
            {badgeText[badge]}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className='text-2xl font-semibold text-white mb-3'>{title}</h3>

      {/* Description */}
      <p className='text-zinc-300 mb-6 leading-relaxed'>{description}</p>

      {/* CTA Link/Button */}
      {href ? (
        <Link
          href={href}
          className='inline-flex items-center gap-2 text-green-500 hover:text-green-400 font-medium transition-colors'
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {ctaText}
          <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
        </Link>
      ) : (
        <div className='inline-flex items-center gap-2 text-green-500 font-medium'>
          {ctaText}
          <ArrowRight className='w-4 h-4' />
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className='h-full'
    >
      {cardContent}
    </motion.div>
  );
}
