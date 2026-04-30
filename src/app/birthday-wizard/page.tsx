import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function BirthdayWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fff8f5 0%, #fff0f7 100%)',
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
