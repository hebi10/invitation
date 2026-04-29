import 'swiper/css';
import 'swiper/css/pagination';

import type { ReactNode } from 'react';

import AuthenticatedAppProviders from '@/app/AuthenticatedAppProviders';

export default function PageWizardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthenticatedAppProviders>{children}</AuthenticatedAppProviders>;
}
