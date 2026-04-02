import type { ReactNode } from 'react';

import { AdminProvider } from '@/contexts';

export default function PageEditorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminProvider>{children}</AdminProvider>;
}
