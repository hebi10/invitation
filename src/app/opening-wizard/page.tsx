import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function OpeningWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f3',
      }}
    />
  );
}

export default function OpeningWizardCreatePage() {
  return (
    <Suspense fallback={<OpeningWizardFallback />}>
      <PageWizardClient initialSlug={null} forcedEventType="opening" />
    </Suspense>
  );
}
