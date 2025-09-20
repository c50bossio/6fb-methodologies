'use client';

import { WorkbookAuthProvider } from '@/components/WorkbookAuthProvider';

export default function WorkbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div suppressHydrationWarning>
      <WorkbookAuthProvider>{children}</WorkbookAuthProvider>
    </div>
  );
}
