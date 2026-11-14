import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getInvitationIntroPreset } from '@/lib/invitationIntroCatalog';
import { getEventTypeMeta, isEventTypeKey } from '@/lib/eventTypes';
import MobileGifIntroPreviewClient from './MobileGifIntroPreviewClient';

export const metadata: Metadata = {
  title: '인트로 GIF 샘플 미리보기',
  robots: { index: false, follow: false },
};

export default async function MobileGifIntroPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; event?: string }>;
}) {
  const { preset, event } = await searchParams;
  const eventType = event === undefined ? 'wedding' : isEventTypeKey(event) && getEventTypeMeta(event).enabled ? event : null;
  if (!eventType) notFound();
  const selectedPreset = getInvitationIntroPreset(preset, eventType);
  if (!selectedPreset) notFound();

  return <MobileGifIntroPreviewClient preset={selectedPreset} />;
}
