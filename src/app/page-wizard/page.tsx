import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { normalizeEventTypeKey } from '@/lib/eventTypes';

import PageWizardClient from './PageWizardClient';
import {
  getPageWizardCreateHrefForEventType,
  isDedicatedPageWizardEventType,
} from './pageWizardEventConfig';

export const dynamic = 'force-dynamic';

type PageWizardCreatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PageWizardFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f3',
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

  if (isDedicatedPageWizardEventType(eventType)) {
    redirect(getPageWizardCreateHrefForEventType(eventType));
  }

  return (
    <Suspense fallback={<PageWizardFallback />}>
      <PageWizardClient initialSlug={null} forcedEventType={eventType} />
    </Suspense>
  );
}
