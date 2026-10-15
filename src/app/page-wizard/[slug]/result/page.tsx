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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const returnTo = typeof query?.returnTo === 'string' ? query.returnTo : null;
  const page = await getServerInvitationPageBySlug(slug, {
    includePrivate: true,
  });

  if (!page) {
    notFound();
  }

  return (
    <Suspense fallback={<PageWizardResultFallback />}>
      <PageWizardResultClient slug={slug} returnTo={returnTo} />
    </Suspense>
  );
}
