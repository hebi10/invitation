import { Suspense } from 'react';

import PageWizardClient from '../page-wizard/PageWizardClient';

export const dynamic = 'force-dynamic';

function GeneralEventWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 0%, rgba(201, 169, 110, 0.16), transparent 34%), #0b0b16',
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
