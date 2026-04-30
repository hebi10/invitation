import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function FirstBirthdayWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fff7fb 0%, #edfdf8 100%)',
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
