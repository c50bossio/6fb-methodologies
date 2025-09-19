'use client'

import { WorkbookAuthProvider } from '@/components/WorkbookAuthProvider'

export default function WorkbookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkbookAuthProvider>
      {children}
    </WorkbookAuthProvider>
  )
}