import type { ReactNode } from 'react';

import AuthenticatedAppProviders from '@/app/AuthenticatedAppProviders';

export default function MyInvitationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthenticatedAppProviders>{children}</AuthenticatedAppProviders>;
}
