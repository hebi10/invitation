import Constants from 'expo-constants';

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

const ERROR_MESSAGE_MAP: Record<string, string> = {
  'Invitation page was not found.': '청첩장 페이지를 찾을 수 없습니다.',
  'Invitation page config is required.': '저장할 청첩장 설정이 필요합니다.',
  'Published state is required.': '공개 상태 값이 필요합니다.',
  'Unsupported action.': '지원하지 않는 요청입니다.',
  'Unauthorized.': '연동 세션이 만료되었습니다. 다시 청첩장을 연동해 주세요.',
  'Forbidden.': '현재 연동 세션으로는 이 작업을 수행할 수 없습니다.',
  'Server Firestore is not available.': '서버 저장소 연결을 확인하지 못했습니다.',
  'Comment was not found.': '댓글을 찾을 수 없습니다.',
  'Comment target was not specified.': '삭제할 댓글 정보를 찾지 못했습니다.',
  'Comment page does not match the requested page.': '댓글과 페이지 정보가 일치하지 않습니다.',
  'Failed to delete comment.': '댓글을 삭제하지 못했습니다.',
  'Comment action is required.': '방명록 처리 방식을 다시 확인해 주세요.',
  'Unsupported comment action.': '지원하지 않는 방명록 처리입니다.',
  'Failed to update comment status.': '방명록 상태를 변경하지 못했습니다.',
  'Too many comment update requests. Please try again later.':
    '방명록 처리 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Page slug base is required.': '청첩장 주소를 입력해 주세요.',
  'Groom and bride names are required.': '신랑과 신부 이름을 모두 입력해 주세요.',
  'A valid URL slug base is required.': '사용 가능한 페이지 주소를 다시 확인해 주세요.',
  'Page slug base must be at least 3 characters.': '청첩장 주소는 3자 이상으로 입력해 주세요.',
  'Page slug base must be 40 characters or fewer.': '청첩장 주소는 40자 이하로 입력해 주세요.',
  'Page slug base is reserved.': '이미 예약된 청첩장 주소입니다. 다른 주소를 입력해 주세요.',
  'Invitation page seed was not found.': '초기 청첩장 템플릿을 찾지 못했습니다.',
  'Failed to create invitation page draft.': '청첩장 초안 생성에 실패했습니다.',
  'Invitation page slug does not match the authenticated session.':
    '요청한 청첩장 주소가 현재 로그인 세션과 일치하지 않습니다.',
  'Mobile invitation draft creation is disabled.':
    '모바일 청첩장 생성이 아직 열려 있지 않습니다. 관리자에게 문의해 주세요.',
  'Invitation page draft input is required.':
    '청첩장 생성에 필요한 정보를 모두 입력해 주세요.',
  'Ticket count adjustment amount is required.': '변경할 티켓 수량이 올바르지 않습니다.',
  'Target page slug and session are required.':
    '티켓을 이동할 대상 청첩장 정보를 확인해 주세요.',
  'Transfer ticket count amount is required.': '이동할 티켓 수량이 올바르지 않습니다.',
  'Display period enabled state is required.': '노출 기간 활성화 상태가 올바르지 않습니다.',
  'Display period dates are required.': '노출 기간 시작일과 종료일을 확인해 주세요.',
  'Display period date is invalid.': '노출 기간 날짜 형식이 올바르지 않습니다.',
  'Target page slug must be different.': '현재 청첩장과 다른 연동 페이지를 선택해 주세요.',
  'Target invitation page authorization failed.':
    '대상 청첩장의 연동 정보가 만료되었습니다. 다시 연동해 주세요.',
  'Not enough tickets.': '보유 티켓이 부족합니다.',
  'Recent authentication is required for this action.':
    '민감한 작업이라 로그인 세션을 다시 확인해야 합니다.',
  'Too many high-risk verification attempts. Please try again later.':
    '재인증 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Page slug is required.': '청첩장 주소를 다시 확인해 주세요.',
  'Invitation link token is required.': '연동 링크 정보를 다시 확인해 주세요.',
  'Invitation link token is invalid.': '유효하지 않은 앱 연동 링크입니다.',
  'Invitation link token was already used.': '이미 사용한 앱 연동 링크입니다.',
  'Invitation link token has expired.': '만료된 앱 연동 링크입니다. 새 링크를 발급해 주세요.',
  'Invitation link token has been revoked.': '폐기된 앱 연동 링크입니다. 새 링크를 발급해 주세요.',
  'Too many link token requests. Please try again later.':
    '앱 연동 링크 발급 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Too many invitation link attempts. Please try again later.':
    '앱 연동 링크 확인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to issue the invitation link token.':
    '앱 연동 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to revoke the invitation link token.':
    '앱 연동 링크를 폐기하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to exchange the invitation link token.':
    '앱 연동 링크를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Image cleanup paths are required.': '정리할 업로드 이미지 경로를 다시 확인해 주세요.',
  'Too many image cleanup paths were requested.':
    '한 번에 정리할 이미지 수가 너무 많습니다. 다시 시도해 주세요.',
  'Image cleanup path is invalid.': '정리할 이미지 경로 형식이 올바르지 않습니다.',
  'Image cleanup path does not belong to the current page.':
    '현재 청첩장에 속한 이미지 경로만 정리할 수 있습니다.',
  'Image storage is not available.':
    '이미지 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Failed to clean up uploaded images.':
    '임시 업로드 이미지를 정리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Google Play purchase information is required.':
    'Google Play 결제 정보가 누락되었습니다. 다시 시도해 주세요.',
  'RevenueCat API key is not configured.':
    '결제 검증 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.',
  'RevenueCat purchase verification failed.':
    'Google Play 결제를 아직 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'The Google Play purchase could not be verified yet.':
    'Google Play 결제가 아직 검증되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  'The selected Google Play product is not a page creation SKU.':
    '선택한 결제 상품이 페이지 생성용이 아닙니다.',
  'The selected Google Play product is not a ticket pack SKU.':
    '선택한 결제 상품이 티켓 상품이 아닙니다.',
  'This purchase record is already linked to another request.':
    '이미 다른 요청에 사용된 결제 정보입니다.',
  'The created invitation page could not be loaded.':
    '생성한 청첩장 정보를 다시 불러오지 못했습니다.',
  'Firebase Auth API key is not configured.':
    '고객 로그인을 위한 Firebase 설정이 아직 준비되지 않았습니다.',
  'Firebase Admin Auth is not available.':
    '고객 인증을 확인할 수 없습니다. 관리자에게 문의해 주세요.',
  'Customer email and password are required.': '이메일과 비밀번호를 입력해 주세요.',
  'Customer refresh token is required.': '고객 로그인 정보가 만료되었습니다. 다시 로그인해 주세요.',
  'Invalid customer credentials.': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Customer authentication is required.': '고객 계정으로 로그인한 뒤 다시 진행해 주세요.',
  'Too many login attempts. Please try again later.':
    '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'Request failed.': '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

function toUserFacingMessage(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return ERROR_MESSAGE_MAP['Request failed.'];
  }

  if (value.startsWith('Missing mobile client editor permission:')) {
    return '현재 연동 세션으로는 이 작업을 수행할 수 없습니다.';
  }

  return ERROR_MESSAGE_MAP[value] ?? value;
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
    throw new Error(toUserFacingMessage(payload?.error));
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

      reject(new Error(toUserFacingMessage(payload?.error)));
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
          ? new Error(toUserFacingMessage(error.message))
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
          action: 'save',
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
          action: 'setPublished',
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
          action: 'setVariantAvailability',
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
          action: 'adjustTicketCount',
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
          action: 'extendDisplayPeriod',
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
          action: 'setDisplayPeriod',
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
          action: 'transferTicketCount',
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
