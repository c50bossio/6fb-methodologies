'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkbookLogin } from '@/components/WorkbookLogin';
import { WorkbookAuthProvider } from '@/components/WorkbookAuthProvider';

export default function WorkbookLoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    // Redirect to the workbook after successful login
    router.push('/workbook');
  };

  return (
    <WorkbookAuthProvider>
      <WorkbookLogin onSuccess={handleLoginSuccess} />
    </WorkbookAuthProvider>
  );
}