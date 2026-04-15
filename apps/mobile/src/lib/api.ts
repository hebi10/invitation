import type {
  MobileEditableInvitationPageConfig,
  MobileInvitationCreationInput,
  MobileInvitationCreationResponse,
  MobileInvitationDashboard,
  MobileKakaoAddressSearchResult,
  MobileInvitationLinks,
  MobileMusicCategory,
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  MobilePageSummary,
  MobileSessionSummary,
} from '../types/mobileInvitation';

export const DEFAULT_API_BASE_URL = 'https://msgnote.kr';

const ERROR_MESSAGE_MAP: Record<string, string> = {
  'Page slug and password are required.': '페이지 주소와 비밀번호를 모두 입력해 주세요.',
  'Invalid page password.': '비밀번호가 올바르지 않습니다.',
  'Failed to verify the page password.': '페이지 비밀번호를 확인하지 못했습니다.',
  'Invitation page was not found.': '청첩장 페이지를 찾을 수 없습니다.',
  'Invitation page config is required.': '저장할 청첩장 설정이 필요합니다.',
  'Published state is required.': '공개 상태 값이 필요합니다.',
  'Unsupported action.': '지원하지 않는 요청입니다.',
  'Unauthorized.': '연동 세션이 만료되었습니다. 다시 청첩장을 연동해 주세요.',
  'Server Firestore is not available.': '서버 저장소 연결을 확인하지 못했습니다.',
  'Comment was not found.': '댓글을 찾을 수 없습니다.',
  'Comment target was not specified.': '삭제할 댓글 정보를 찾지 못했습니다.',
  'Comment page does not match the requested page.': '댓글과 페이지 정보가 일치하지 않습니다.',
  'Failed to delete comment.': '댓글을 삭제하지 못했습니다.',
  'Page slug base is required.': '페이지 주소를 만들 영문 이름을 먼저 확인해 주세요.',
  'Page password is required.': '페이지 비밀번호를 입력해 주세요.',
  'Groom and bride names are required.': '신랑과 신부 이름을 모두 입력해 주세요.',
  'A valid URL slug base is required.': '사용 가능한 페이지 주소를 다시 확인해 주세요.',
  'Invitation page seed was not found.': '초기 청첩장 템플릿을 찾지 못했습니다.',
  'Failed to create invitation page draft.': '청첩장 초안 생성에 실패했습니다.',
  'Invitation page slug does not match the authenticated session.':
    '요청한 청첩장 주소가 현재 로그인 세션과 일치하지 않습니다.',
  'Mobile invitation draft creation is disabled.':
    '모바일 청첩장 생성이 아직 열려 있지 않습니다. 관리자에게 문의해 주세요.',
  'Request failed.': '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

function toUserFacingMessage(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return ERROR_MESSAGE_MAP['Request failed.'];
  }

  return ERROR_MESSAGE_MAP[value] ?? value;
}

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  const normalized = trimmed.replace(/\/+$/g, '');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return `https://${normalized}`;
}

function buildApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
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

function createHeaders(token?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export interface MobileLoginResponse {
  authenticated: boolean;
  session: MobileSessionSummary;
  page: MobilePageSummary | null;
  dashboardPage?: MobileEditableInvitationPageConfig | null;
  links: MobileInvitationLinks;
}

export interface MobileSessionResponse {
  authenticated: boolean;
  pageSlug: string | null;
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

export interface MobileMusicLibraryResponse {
  categories: MobileMusicCategory[];
}

export async function loginMobileClientEditor(
  baseUrl: string,
  pageSlug: string,
  password: string
) {
  return readJsonResponse<MobileLoginResponse>(
    await fetch(buildApiUrl(baseUrl, '/api/mobile/client-editor/login'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pageSlug,
        password,
      }),
    })
  );
}

export async function createMobileInvitationDraft(
  baseUrl: string,
  payload: MobileInvitationCreationInput
) {
  return readJsonResponse<MobileInvitationCreationResponse>(
    await fetch(buildApiUrl(baseUrl, '/api/mobile/client-editor/drafts'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slugBase: payload.slugBase,
        groomName: payload.groomKoreanName,
        brideName: payload.brideKoreanName,
        groomEnglishName: payload.groomEnglishName,
        brideEnglishName: payload.brideEnglishName,
        password: payload.password,
        productTier: payload.servicePlan,
        defaultTheme: payload.theme,
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
    await fetch(
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
  token: string
) {
  return readJsonResponse<MobileInvitationDashboard>(
    await fetch(
      buildApiUrl(
        baseUrl,
        `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/dashboard`
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
    await fetch(
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
  }
) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token),
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
  defaultTheme?: MobileInvitationThemeKey
) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(
      buildApiUrl(baseUrl, `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}`),
      {
        method: 'POST',
        headers: {
          ...createHeaders(token),
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

export async function deleteMobileInvitationComment(
  baseUrl: string,
  pageSlug: string,
  commentId: string,
  token: string
) {
  return readJsonResponse<{ success: boolean }>(
    await fetch(
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
    await fetch(buildApiUrl(baseUrl, '/api/mobile/client-editor/music-library'), {
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
    await fetch(buildApiUrl(baseUrl, `/api/kakao/local/address-search?${params.toString()}`), {
      headers: createHeaders(),
      cache: 'no-store',
    })
  );
}

export async function uploadMobileInvitationImage(
  baseUrl: string,
  pageSlug: string,
  token: string,
  formData: FormData
) {
  return readJsonResponse<MobileImageUploadResponse>(
    await fetch(
      buildApiUrl(
        baseUrl,
        `/api/mobile/client-editor/pages/${encodeURIComponent(pageSlug)}/images`
      ),
      {
        method: 'POST',
        headers: createHeaders(token),
        body: formData,
      }
    )
  );
}
