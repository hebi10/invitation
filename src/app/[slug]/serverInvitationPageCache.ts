import { cache } from 'react';

import {
  getServerInvitationPageBySlug,
  getServerInvitationPageDefaultThemeBySlug,
} from '@/server/invitationPageServerService';

export const getCachedServerInvitationPageBySlug = cache(
  async (pageSlug: string, includePrivate = false) =>
    getServerInvitationPageBySlug(pageSlug, {
      includePrivate,
    })
);

export const getCachedServerInvitationPageDefaultThemeBySlug = cache(
  async (pageSlug: string) => getServerInvitationPageDefaultThemeBySlug(pageSlug)
);

export async function getCachedServerInvitationPreviewBySlug(pageSlug: string) {
  const publicPage = await getCachedServerInvitationPageBySlug(pageSlug);
  if (publicPage) {
    return publicPage;
  }

  return getCachedServerInvitationPageBySlug(pageSlug, true);
}
