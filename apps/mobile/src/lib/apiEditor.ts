import { MOBILE_CLIENT_EDITOR_PAGE_ACTIONS } from '../../../../src/contracts/mobileClientEditorPageActions';
import type {
  MobileDisplayPeriodSummary,
  MobileEditableInvitationPageConfig,
  MobileInvitationCreationInput,
  MobileInvitationCreationResponse,
  MobileInvitationDashboard,
  MobileInvitationSeed,
  MobileInvitationSlugAvailabilityResponse,
  MobileInvitationThemeKey,
  MobileKakaoAddressSearchResult,
} from '../types/mobileInvitation';
import {
  buildApiUrl,
  createHeaders,
  fetchWithRetry,
  readJsonResponse,
} from './apiCore';
import type { MobileMusicLibraryResponse } from './apiTypes';

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
