import { Suspense } from 'react';

import PageWizardClient from './PageWizardClient';

export const dynamic = 'force-dynamic';

function PageWizardFallback() {
  return <div style={{ minHeight: '100vh', background: '#f8fafc' }} />;
}

export default function PageWizardCreatePage() {
  return (
    <Suspense fallback={<PageWizardFallback />}>
      <PageWizardClient initialSlug={null} />
    </Suspense>
  );
}
