import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

import PageEditorClient from '../PageEditorClient';

export const dynamic = 'force-dynamic';

function PageEditorFallback() {
  return <div style={{ minHeight: '100vh', background: '#f8fafc' }} />;
}

export default async function PageEditorDetailPage({
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
    <Suspense fallback={<PageEditorFallback />}>
      <PageEditorClient
        slug={slug}
        initialDisplayName={page.displayName}
        initialGroomName={page.couple.groom.name || page.groomName}
        initialBrideName={page.couple.bride.name || page.brideName}
        initialDate={page.date}
        initialVenue={page.venue}
      />
    </Suspense>
  );
}
