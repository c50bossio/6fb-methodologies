'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatBadgeProps {
  icon: LucideIcon;
  value: string;
  label?: string;
}

export function StatBadge({ icon: Icon, value, label }: StatBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className='flex items-center gap-3 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-zinc-800'
    >
      <Icon className='w-5 h-5 text-green-500' />
      <div className='flex flex-col'>
        <span className='text-white font-semibold text-lg'>{value}</span>
        {label && <span className='text-zinc-400 text-xs'>{label}</span>}
      </div>
    </motion.div>
  );
}
