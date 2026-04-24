import { cache } from 'react';

import {
  getServerInvitationPageBySlug,
  getServerInvitationPageDefaultThemeBySlug,
  type ServerInvitationPageLookupOptions,
} from '@/server/invitationPageServerService';

const getCachedServerInvitationPageBySlugCore = cache(
  async (
    pageSlug: string,
    includePrivate: boolean,
    sampleFallbackMode: NonNullable<
      ServerInvitationPageLookupOptions['sampleFallbackMode']
    >
  ) =>
    getServerInvitationPageBySlug(pageSlug, {
      includePrivate,
      sampleFallbackMode,
    })
);

export function getCachedServerInvitationPageBySlug(
  pageSlug: string,
  options: boolean | ServerInvitationPageLookupOptions = {}
) {
  const lookupOptions =
    typeof options === 'boolean' ? { includePrivate: options } : options;

  return getCachedServerInvitationPageBySlugCore(
    pageSlug,
    lookupOptions.includePrivate === true,
    lookupOptions.sampleFallbackMode ?? 'always'
  );
}

export function getCachedServerPublicInvitationPageBySlug(pageSlug: string) {
  return getCachedServerInvitationPageBySlugCore(
    pageSlug,
    false,
    'when-firestore-unavailable'
  );
}

export const getCachedServerInvitationPageDefaultThemeBySlug = cache(
  async (pageSlug: string) => getServerInvitationPageDefaultThemeBySlug(pageSlug)
);

export async function getCachedServerInvitationPreviewBySlug(pageSlug: string) {
  const publicPage = await getCachedServerPublicInvitationPageBySlug(pageSlug);
  if (publicPage) {
    return publicPage;
  }

  return getCachedServerInvitationPageBySlug(pageSlug, true);
}
