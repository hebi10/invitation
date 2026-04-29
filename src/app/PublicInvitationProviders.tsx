'use client';

import type { ReactNode } from 'react';

import { AnonymousAdminProvider } from '@/contexts';

import AppQueryProvider from './AppQueryProvider';

export default function PublicInvitationProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AnonymousAdminProvider>
      <AppQueryProvider>{children}</AppQueryProvider>
    </AnonymousAdminProvider>
  );
}
