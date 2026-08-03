'use client';

import { useCallback } from 'react';

import { EventInvitationRoutePage } from '@/app/_components/EventInvitationPage';
import { createInvitationPageFromSeed } from '@/config/weddingPages';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';
import type { InvitationPage } from '@/types/invitationPage';

export async function getDemoExperienceEvent(slug: string): Promise<InvitationPage | null> {
  const response = await fetch(`/api/experience/events/${encodeURIComponent(slug)}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as
    | { editableConfig?: EditableInvitationPageConfig; error?: string }
    | null;
  if (response.status === 404) return null;
  if (!response.ok || !payload?.editableConfig) {
    throw new Error(payload?.error || '체험 청첩장을 불러오지 못했습니다.');
  }

  const config = structuredClone(payload.editableConfig.config);
  config.features = {
    ...config.features,
    showGuestbook: false,
    shareMode: 'none',
  };
  config.musicEnabled = false;
  config.musicUrl = '';
  config.musicStoragePath = '';
  return createInvitationPageFromSeed(config, { published: true });
}

export default function ExperienceInvitationPreviewClient({
  slug,
  theme,
}: {
  slug: string;
  theme: InvitationThemeKey;
}) {
  const pageLoader = useCallback((pageSlug: string) => getDemoExperienceEvent(pageSlug), []);

  return (
    <EventInvitationRoutePage
      slug={slug}
      theme={theme}
      eventType="wedding"
      pageLoader={pageLoader}
      queryScope="experience"
      showGuestbook={false}
      allowStorageImages={false}
      externalShareEnabled={false}
    />
  );
}
