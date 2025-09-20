'use client';

import { useEffect, useRef } from 'react';

/**
 * HydrationOptimizer component to prevent content flash and optimize hydration
 */
export default function HydrationOptimizer({
  children,
}: {
  children: React.ReactNode;
}) {
  const isHydratedRef = useRef(false);

  useEffect(() => {
    // Mark as hydrated immediately when component mounts
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      document.body.classList.add('hydrated');
    }
  }, []);

  // Simple wrapper component - no router dependencies
  return (
    <div
      className='contents'
      suppressHydrationWarning={true}
      style={{
        // Prevent layout shift during hydration
        minHeight: 'inherit',
        display: 'contents',
      }}
    >
      {children}
    </div>
  );
}