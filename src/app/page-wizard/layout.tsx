import type { ReactNode } from 'react';

import AuthenticatedAppProviders from '@/app/AuthenticatedAppProviders';

export default function PageWizardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthenticatedAppProviders>
      <div data-operation-ui>{children}</div>
    </AuthenticatedAppProviders>
  );
}
