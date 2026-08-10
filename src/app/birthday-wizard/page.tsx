import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function BirthdayWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f3',
      }}
    />
  );
}

export default function BirthdayWizardCreatePage() {
  return (
    <Suspense fallback={<BirthdayWizardFallback />}>
      <PageWizardClient initialSlug={null} forcedEventType="birthday" />
    </Suspense>
  );
}
