import { Suspense } from 'react';

import PageWizardClient from '../PageWizardClient';

export const dynamic = 'force-dynamic';

function OpeningWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
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

