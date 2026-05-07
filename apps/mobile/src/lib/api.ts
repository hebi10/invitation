import Constants from 'expo-constants';

import { MOBILE_CLIENT_EDITOR_PAGE_ACTIONS } from '../../../../src/contracts/mobileClientEditorPageActions';
import type { MobileClientEditorPermissions } from '../../../../src/types/mobileClientEditor';
import type {
  MobileDisplayPeriodSummary,
  MobileEditableInvitationPageConfig,
  MobileGuestbookComment,
  MobileGuestbookCommentAction,
  MobileHighRiskSessionSummary,
  MobileCustomerAuthSession,
  MobileInvitationCreationInput,
  MobileInvitationCreationResponse,
  MobileInvitationDashboard,
  MobileInvitationSlugAvailabilityResponse,
  MobileKakaoAddressSearchResult,
  MobileInvitationLinks,
  MobileMusicCategory,
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  MobilePageSummary,
  MobileSessionSummary,
} from '../types/mobileInvitation';
import type { MobileBillingProductId } from './mobileBillingProducts';
import { toUserFacingApiMessage } from './apiErrors';

export const PRODUCTION_API_BASE_URL = 'https://msgnote.kr';
const TRANSIENT_LOCAL_API_PORTS = new Set(['3000', '3001']);
const ALLOWED_API_HOSTS = new Set([
  'msgnote.kr',
  'www.msgnote.kr',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '0.0.0.0',
]);

function readConfiguredApiBaseUrl() {
  const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  const extraApiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof extraApiBaseUrl === 'string' && extraApiBaseUrl.trim()) {
    return extraApiBaseUrl.trim();
  }

  return PRODUCTION_API_BASE_URL;
}

export const DEFAULT_API_BASE_URL = readConfiguredApiBaseUrl();

export function isTransientLocalApiBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `http://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== 'http:' || !TRANSIENT_LOCAL_API_PORTS.has(parsed.port)) {
      return false;
    }

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      hostname === '0.0.0.0' ||
      isPrivateIpv4Host(hostname)
    );
  } catch {
    return false;
  }
}

function isPrivateIpv4Host(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const [first, second, third, fourth] = match.slice(1).map(Number);
  const octets = [first, second, third, fourth];
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  if (first === 10) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return first === 192 && second === 168;
}

function isAllowedApiHost(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (!normalizedHostname) {
    return false;
  }

  return (
    ALLOWED_API_HOSTS.has(normalizedHostname) ||
    normalizedHostname.endsWith('.msgnote.kr') ||
    isPrivateIpv4Host(normalizedHostname)
  );
}

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim();
  const fallback = DEFAULT_API_BASE_URL.trim();
  const target = trimmed || fallback;

  if (!target) {
    return '';
  }

  const normalized = target.replace(/\/+$/g, '');
  const candidateUrl = normalized.startsWith('http://') || normalized.startsWith('https://')
    ? normalized
    : `https://${normalized}`;

  try {
    const parsed = new URL(candidateUrl);
    if (!isAllowedApiHost(parsed.hostname)) {
      return PRODUCTION_API_BASE_URL;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return PRODUCTION_API_BASE_URL;
  }
}

function buildApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

const DEFAULT_GET_RETRY_COUNT = 1;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

async function waitForRetry(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? DEFAULT_GET_RETRY_COUNT : 0;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (attempt >= maxRetries || !RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
    }

    await waitForRetry(250 * (attempt + 1));
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;

  if (!response.ok) {
    throw new Error(toUserFacingApiMessage(payload?.error));
  }

  return payload as T;
}

async function uploadFormDataResponse<T>(
  url: string,
  token: string,
  formData: FormData
): Promise<T> {
  if (typeof XMLHttpRequest === 'undefined') {
    return readJsonResponse<T>(
      await fetchWithRetry(url, {
        method: 'POST',
        headers: createHeaders(token),
        body: formData,
      })
    );
  }

  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('POST', url);
    request.timeout = 30000;
    request.setRequestHeader('Accept', 'application/json');
    if (token) {
      request.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    request.onload = () => {
      const rawText = request.responseText;
      let payload: { error?: string } | null = null;

      if (rawText) {
        try {
          payload = (JSON.parse(rawText) as { error?: string } | null) ?? null;
        } catch {
          payload = null;
        }
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(payload as T);
        return;
      }

      reject(new Error(toUserFacingApiMessage(payload?.error)));
    };

    request.onerror = () => {
      reject(new Error('이미지 업로드 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.'));
    };

    request.ontimeout = () => {
      reject(new Error('이미지 업로드 요청이 시간 초과되었습니다. 다시 시도해 주세요.'));
    };

    try {
      request.send(formData);
    } catch (error) {
      reject(
        error instanceof Error
          ? new Error(toUserFacingApiMessage(error.message))
          : new Error('이미지 업로드 요청을 시작하지 못했습니다. 다시 시도해 주세요.')
      );
    }
  });
}

function createHeaders(token?: string, highRiskToken?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (highRiskToken) {
    headers['x-mobile-client-editor-high-risk-token'] = highRiskToken;
  }

  return headers;
}

export interface MobileLoginResponse {
  authenticated: boolean;
  permissions: MobileClientEditorPermissions;
  session: MobileSessionSummary;
  page: MobilePageSummary | null;
  dashboardPage?: MobileEditableInvitationPageConfig | null;
  links: MobileInvitationLinks;
}

export interface MobileSessionResponse {
  authenticated: boolean;
  pageSlug: string | null;
  permissions?: MobileClientEditorPermissions;
  page?: MobilePageSummary | null;
  dashboardPage?: MobileEditableInvitationPageConfig | null;
  links?: MobileInvitationLinks;
}

export interface MobileImageUploadResponse {
  name: string;
  url: string;
  path: string;
  originalUrl?: string;
  originalPath?: string;
  thumbnailUrl: string;
  thumbnailPath: string;
  uploadedAt: string;
}

export interface MobileBase64ImageUploadInput {
  assetKind: 'cover' | 'gallery' | 'favicon' | 'share-preview' | 'kakao-card';
  fileName: string;
  mimeType: string;
  base64: string;
  uploadSessionId: string;
}

export interface MobileImageCleanupResponse {
  success: boolean;
  deletedPaths: string[];
}

export interface MobileMusicLibraryResponse {
  categories: MobileMusicCategory[];
}

export interface MobileBillingPurchaseReceiptInput {
  appUserId: string;
  productId: MobileBillingProductId;
  transactionId: string;
}

export interface MobileCustomerAuthResponse {
  authenticated: boolean;
  session: MobileCustomerAuthSession;
}

export interface MobileHighRiskVerificationResponse {
  verified: boolean;
  session: MobileHighRiskSessionSummary;
}

export interface MobileLinkTokenIssueResponse {
  success: boolean;
  purpose: 'mobile-login';
  expiresAt: string;
  deepLinkUrl: string;
  webFallbackUrl: string;
  revokedExistingCount: number;
}

export interface MobileLinkTokenRevokeResponse {
  success: boolean;
  purpose: 'mobile-login';
  revokedCount: number;
}

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

export async function createMobileInvitationDraft(
  baseUrl: string,
  payload: MobileInvitationCreationInput,
  customerIdToken?: string | null
) {
  return readJsonResponse<MobileInvitationCreationResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/client-editor/drafts'), {
      method: 'POST',
      headers: {
        ...createHeaders(customerIdToken ?? undefined),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slugBase: payload.slugBase,
        groomName: payload.groomKoreanName,
        brideName: payload.brideKoreanName,
        groomEnglishName: payload.groomEnglishName,
        brideEnglishName: payload.brideEnglishName,
        productTier: payload.servicePlan,
        defaultTheme: payload.theme,
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

export async function fulfillMobileBillingPageCreation(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    input: MobileInvitationCreationInput;
    customerIdToken?: string | null;
  }
) {
  return readJsonResponse<MobileInvitationCreationResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
      method: 'POST',
      headers: {
        ...createHeaders(payload.customerIdToken ?? undefined),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createInvitationPage',
        purchase: payload.purchase,
        createInput: {
          slugBase: payload.input.slugBase,
          groomKoreanName: payload.input.groomKoreanName,
          brideKoreanName: payload.input.brideKoreanName,
          groomEnglishName: payload.input.groomEnglishName,
          brideEnglishName: payload.input.brideEnglishName,
          theme: payload.input.theme,
        },
      }),
    })
  );
}

export async function checkMobileInvitationSlugAvailability(
  baseUrl: string,
  slugBase: string
) {
  const params = new URLSearchParams({ slugBase });
  return readJsonResponse<MobileInvitationSlugAvailabilityResponse>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/slug-availability?${params.toString()}`),
      {
        headers: createHeaders(),
      }
    )
  );
}

export async function fulfillMobileBillingTicketPack(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    targetPageSlug: string;
    targetToken: string;
  }
) {
  return readJsonResponse<{ success: boolean; ticketCount: number }>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'grantTicketPack',
        purchase: payload.purchase,
        targetPageSlug: payload.targetPageSlug,
        targetToken: payload.targetToken,
      }),
    })
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

export async function fetchMobileInvitationDashboard(
  baseUrl: string,
  pageSlug: string,
  token: string,
  options: {
    includeComments?: boolean;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.includeComments) {
    params.set('includeComments', 'true');
  }

  return readJsonResponse<MobileInvitationDashboard>(
    await fetchWithRetry(
      buildApiUrl(
        baseUrl,
        `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/dashboard${
          params.size ? `?${params.toString()}` : ''
        }`
      ),
      {
        headers: createHeaders(token),
      }
    )
  );
}

export async function fetchMobileEditableInvitationPageConfig(
  baseUrl: string,
  pageSlug: string,
  token: string
) {
  return readJsonResponse<MobileEditableInvitationPageConfig>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        headers: createHeaders(token),
      }
    )
  );
}

export async function saveMobileInvitationPageConfig(
  baseUrl: string,
  pageSlug: string,
  token: string,
  payload: {
    config: MobileInvitationSeed;
    published?: boolean;
    defaultTheme?: MobileInvitationThemeKey;
  },
  highRiskToken?: string
) {
  return readJsonResponse<{ success: boolean }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.save,
          ...payload,
          config: {
            ...payload.config,
            slug: pageSlug,
          },
        }),
      }
    )
  );
}

export async function setMobileInvitationPublishedState(
  baseUrl: string,
  pageSlug: string,
  token: string,
  published: boolean,
  defaultTheme?: MobileInvitationThemeKey,
  highRiskToken?: string
) {
  return readJsonResponse<{ success: boolean }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.setPublished,
          published,
          defaultTheme,
        }),
      }
    )
  );
}

export async function setMobileInvitationVariantAvailability(
  baseUrl: string,
  pageSlug: string,
  token: string,
  variantKey: MobileInvitationThemeKey,
  available: boolean,
  options?: {
    published?: boolean;
    defaultTheme?: MobileInvitationThemeKey;
  },
  highRiskToken?: string
) {
  return readJsonResponse<{ success: boolean }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.setVariantAvailability,
          variantKey,
          available,
          published: options?.published,
          defaultTheme: options?.defaultTheme,
        }),
      }
    )
  );
}

export async function adjustMobileInvitationTicketCount(
  baseUrl: string,
  pageSlug: string,
  token: string,
  amount: number,
  highRiskToken?: string
) {
  return readJsonResponse<{ success: boolean; ticketCount: number }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.adjustTicketCount,
          amount,
        }),
      }
    )
  );
}

export async function extendMobileInvitationDisplayPeriod(
  baseUrl: string,
  pageSlug: string,
  token: string,
  months = 1,
  highRiskToken?: string
) {
  return readJsonResponse<{
    success: boolean;
    enabled: boolean;
    startDate: string | null;
    endDate: string | null;
  }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.extendDisplayPeriod,
          months,
        }),
      }
    )
  );
}

export async function verifyMobileClientEditorHighRiskSession(
  baseUrl: string,
  pageSlug: string,
  token: string
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
      }),
    })
  );
}

export async function setMobileInvitationDisplayPeriod(
  baseUrl: string,
  pageSlug: string,
  token: string,
  period: MobileDisplayPeriodSummary,
  highRiskToken?: string
) {
  return readJsonResponse<{
    success: boolean;
    enabled: boolean;
    startDate: string | null;
    endDate: string | null;
  }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.setDisplayPeriod,
          enabled: period.enabled,
          startDate: period.startDate,
          endDate: period.endDate,
        }),
      }
    )
  );
}

export async function transferMobileInvitationTicketCount(
  baseUrl: string,
  pageSlug: string,
  token: string,
  payload: {
    amount: number;
    targetPageSlug: string;
    targetToken: string;
  },
  highRiskToken?: string
) {
  return readJsonResponse<{
    success: boolean;
    ticketCount: number;
    targetTicketCount: number;
    targetPageSlug: string;
  }>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token, highRiskToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.transferTicketCount,
          amount: payload.amount,
          targetPageSlug: payload.targetPageSlug,
          targetToken: payload.targetToken,
        }),
      }
    )
  );
}

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

export async function fetchMobileInvitationMusicLibrary(baseUrl: string) {
  return readJsonResponse<MobileMusicLibraryResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/client-editor/music-library'), {
      headers: createHeaders(),
      cache: 'no-store',
    })
  );
}

export async function fetchMobileKakaoAddressSearch(baseUrl: string, query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error('검색할 주소를 먼저 입력해 주세요.');
  }

  const params = new URLSearchParams({ query: normalizedQuery });

  return readJsonResponse<MobileKakaoAddressSearchResult>(
    await fetchWithRetry(
      buildApiUrl(baseUrl, `/api/kakao/local/address-search?${params.toString()}`),
      {
        headers: createHeaders(),
        cache: 'no-store',
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
  return readJsonResponse<{ success: boolean; comment: MobileGuestbookComment | null }>(
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
