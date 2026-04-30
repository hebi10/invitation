import { Suspense } from 'react';

import { normalizeEventTypeKey, type EventTypeKey } from '@/lib/eventTypes';

import PageWizardClient from './PageWizardClient';

export const dynamic = 'force-dynamic';

type PageWizardCreatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PageWizardFallback({ eventType }: { eventType: EventTypeKey }) {
  const isFirstBirthday = eventType === 'first-birthday';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isFirstBirthday
          ? 'linear-gradient(180deg, #fff7fb 0%, #edfdf8 100%)'
          : '#f8fafc',
      }}
    />
  );
}

export default async function PageWizardCreatePage({
  searchParams,
}: PageWizardCreatePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const eventType = normalizeEventTypeKey(
    getSearchParamValue(resolvedSearchParams.eventType)
  );

  return (
    <Suspense fallback={<PageWizardFallback eventType={eventType} />}>
      <PageWizardClient initialSlug={null} forcedEventType={eventType} />
    </Suspense>
  );
}
