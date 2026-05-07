import {
  buildApiUrl,
  createHeaders,
  fetchWithRetry,
  readJsonResponse,
  uploadFormDataResponse,
} from './apiCore';
import type {
  MobileBase64ImageUploadInput,
  MobileImageCleanupResponse,
  MobileImageUploadResponse,
} from './apiTypes';

export async function uploadMobileInvitationImage(
  baseUrl: string,
  pageSlug: string,
  token: string,
  payload: FormData | MobileBase64ImageUploadInput
) {
  const url = buildApiUrl(
    baseUrl,
    `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/images`
  );

  if (!(payload instanceof FormData)) {
    return readJsonResponse<MobileImageUploadResponse>(
      await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          ...createHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );
  }

  return uploadFormDataResponse<MobileImageUploadResponse>(
    url,
    token,
    payload
  );
}

export async function deleteMobileInvitationImages(
  baseUrl: string,
  pageSlug: string,
  token: string,
  payload: {
    paths: string[];
  }
) {
  return readJsonResponse<MobileImageCleanupResponse>(
    await fetchWithRetry(
      buildApiUrl(
        baseUrl,
        `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/images`
      ),
      {
        method: 'DELETE',
        headers: {
          ...createHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )
  );
}
