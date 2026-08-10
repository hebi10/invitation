import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function GeneralEventWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f3',
      }}
    />
  );
}

export default function GeneralEventWizardCreatePage() {
  return (
    <Suspense fallback={<GeneralEventWizardFallback />}>
      <PageWizardClient initialSlug={null} forcedEventType="general-event" />
    </Suspense>
  );
}
