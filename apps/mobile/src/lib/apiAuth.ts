import {
  buildApiUrl,
  createHeaders,
  fetchWithRetry,
  readJsonResponse,
} from './apiCore';
import type {
  MobileCustomerAuthResponse,
  MobileHighRiskVerificationResponse,
  MobileLinkTokenIssueResponse,
  MobileLinkTokenRevokeResponse,
  MobileLoginResponse,
  MobileSessionResponse,
} from './apiTypes';

export async function loginMobileCustomerAuth(
  baseUrl: string,
  email: string,
  password: string
) {
  return readJsonResponse<MobileCustomerAuthResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/auth/login'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })
  );
}

export async function refreshMobileCustomerAuth(baseUrl: string, refreshToken: string) {
  return readJsonResponse<MobileCustomerAuthResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/auth/refresh'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    })
  );
}

export async function exchangeMobileClientEditorLinkToken(
  baseUrl: string,
  token: string
) {
  return readJsonResponse<MobileLoginResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/client-editor/link-tokens/exchange'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
      }),
    })
  );
}

export async function issueMobileClientEditorLinkToken(
  baseUrl: string,
  pageSlug: string,
  token: string,
  highRiskToken: string
) {
  return readJsonResponse<MobileLinkTokenIssueResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/client-editor/link-tokens'), {
      method: 'POST',
      headers: {
        ...createHeaders(token, highRiskToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageSlug,
        purpose: 'mobile-login',
      }),
    })
  );
}

export async function revokeMobileClientEditorLinkTokens(
  baseUrl: string,
  pageSlug: string,
  token: string,
  highRiskToken: string
) {
  const params = new URLSearchParams({
    pageSlug,
    purpose: 'mobile-login',
  });

  return readJsonResponse<MobileLinkTokenRevokeResponse>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/link-tokens?${params.toString()}`),
      {
        method: 'DELETE',
        headers: createHeaders(token, highRiskToken),
      }
    )
  );
}

export async function validateMobileClientEditorSession(
  baseUrl: string,
  pageSlug: string,
  token: string
) {
  const params = new URLSearchParams({ pageSlug });
  return readJsonResponse<MobileSessionResponse>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/session?${params.toString()}`),
      {
        headers: createHeaders(token),
      }
    )
  );
}

export async function verifyMobileClientEditorHighRiskSession(
  baseUrl: string,
  pageSlug: string,
  token: string,
  customerIdToken?: string | null
) {
  return readJsonResponse<MobileHighRiskVerificationResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/client-editor/high-risk/verify'), {
      method: 'POST',
      headers: {
        ...createHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageSlug,
        customerIdToken: customerIdToken ?? null,
      }),
    })
  );
}
