import type {
  MobileGuestbookComment,
  MobileGuestbookCommentAction,
} from '../types/mobileInvitation';
import {
  buildApiUrl,
  createHeaders,
  fetchWithRetry,
  readJsonResponse,
} from './apiCore';
import type { MobileCommentMutationResponse } from './apiTypes';

export async function deleteMobileInvitationComment(
  baseUrl: string,
  pageSlug: string,
  commentId: string,
  token: string
) {
  return readJsonResponse<{ success: boolean; comment?: MobileGuestbookComment | null }>(
    await fetchWithRetry(
      buildApiUrl(
        baseUrl,
        `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/comments/${encodeURIComponent(commentId)}`
      ),
      {
        method: 'DELETE',
        headers: createHeaders(token),
      }
    )
  );
}

export async function manageMobileInvitationComment(
  baseUrl: string,
  pageSlug: string,
  commentId: string,
  token: string,
  action: MobileGuestbookCommentAction
) {
  return readJsonResponse<MobileCommentMutationResponse>(
    await fetchWithRetry(
      buildApiUrl(
        baseUrl,
        `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/comments/${encodeURIComponent(commentId)}`
      ),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      }
    )
  );
}
