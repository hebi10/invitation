import { buildApiUrl, createHeaders, fetchWithRetry, readJsonResponse } from './apiCore';
import type { MobileInvitationThemeKey } from '../types/mobileInvitation';

export async function createPrivatePreviewUrl(baseUrl: string, pageSlug: string, token: string, theme: MobileInvitationThemeKey) {
  const grant = await readJsonResponse<{ token: string }>(await fetchWithRetry(
    buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/preview`),
    { method: 'POST', headers: createHeaders(token) }
  ));
  // A scoped, short-lived read token travels in the fragment, never in server URL logs.
  return `${buildApiUrl(baseUrl, `/mobile-preview/${encodeURIComponent(pageSlug)}/${theme}`)}#token=${encodeURIComponent(grant.token)}`;
}
