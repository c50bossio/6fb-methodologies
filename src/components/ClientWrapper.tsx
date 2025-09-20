'use client';

import { useEffect } from 'react';

/**
 * ClientWrapper component for client-side initialization
 * Clean implementation without any router dependencies
 */
export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Mark as hydrated for any hydration-dependent styling
    document.body.classList.add('hydrated');
  }, []);

  return (
    <div className='contents' suppressHydrationWarning={true}>
      {children}
    </div>
  );
}