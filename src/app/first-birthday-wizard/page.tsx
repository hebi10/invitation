import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function FirstBirthdayWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f3',
      }}
    />
  );
}

export default function FirstBirthdayWizardCreatePage() {
  return (
    <Suspense fallback={<FirstBirthdayWizardFallback />}>
      <PageWizardClient initialSlug={null} forcedEventType="first-birthday" />
    </Suspense>
  );
}
