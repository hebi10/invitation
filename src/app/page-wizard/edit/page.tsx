import { Suspense } from 'react';
import { normalizeEventTypeKey } from '@/lib/eventTypes';
import PageWizardClient from '../PageWizardClient';

export const dynamic = 'force-dynamic';

export default async function PageWizardSetupPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams ?? {};
  const slug = typeof query.slug === 'string' ? query.slug.trim() || null : null;
  const eventType = normalizeEventTypeKey(typeof query.eventType === 'string' ? query.eventType : undefined);
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8f8f7' }} />}>
    <PageWizardClient initialSlug={slug} forcedEventType={slug ? undefined : eventType} setupOnly />
  </Suspense>;
}
