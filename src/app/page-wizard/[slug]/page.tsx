import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

import PageWizardClient from '../PageWizardClient';

export const dynamic = 'force-dynamic';

function PageWizardFallback() {
  return <div style={{ minHeight: '100vh', background: '#f8fafc' }} />;
}

export default async function PageWizardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getServerInvitationPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <Suspense fallback={<PageWizardFallback />}>
      <PageWizardClient initialSlug={slug} />
    </Suspense>
  );
}
