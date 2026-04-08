import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

import PageWizardResultClient from '../../PageWizardResultClient';

export const dynamic = 'force-dynamic';

function PageWizardResultFallback() {
  return <div style={{ minHeight: '100vh', background: '#f8fafc' }} />;
}

export default async function PageWizardResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getServerInvitationPageBySlug(slug, {
    includePrivate: true,
  });

  if (!page) {
    notFound();
  }

  return (
    <Suspense fallback={<PageWizardResultFallback />}>
      <PageWizardResultClient slug={slug} />
    </Suspense>
  );
}
