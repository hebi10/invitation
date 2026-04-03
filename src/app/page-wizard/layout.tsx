import 'swiper/css';
import 'swiper/css/pagination';

import type { ReactNode } from 'react';

import { AdminProvider } from '@/contexts';

export default function PageWizardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminProvider>{children}</AdminProvider>;
}
