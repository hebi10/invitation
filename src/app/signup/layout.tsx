import type { ReactNode } from 'react';

import AuthenticatedAppProviders from '@/app/AuthenticatedAppProviders';

export default function SignupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthenticatedAppProviders>{children}</AuthenticatedAppProviders>;
}
