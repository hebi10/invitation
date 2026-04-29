import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { DEFAULT_EVENT_TYPE, normalizeEventTypeKey, type EventTypeKey } from '@/lib/eventTypes';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import {
  DEFAULT_INVITATION_THEME,
  normalizeInvitationThemeKey,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import type {
  InvitationFeatureFlags,
  InvitationPageSeed,
  InvitationProductTier,
} from '@/types/invitationPage';
import { getCurrentFirebaseIdToken } from '@/services/adminAuth';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';
import {
  resolveClientStoredEventBySlug,
} from '@/services/repositories/clientEventRepositoryCore';

export interface CustomerOwnedEventSummary {
  eventId: string;
  slug: string;
  eventType: EventTypeKey;
  title: string | null;
  displayName: string | null;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  availableThemes: InvitationThemeKey[];
  updatedAt: Date | null;
}

export interface CustomerEventOwnershipSummary extends CustomerOwnedEventSummary {
  ownerUid?: string | null;
}

export type CustomerEventOwnershipStatus =
  | {
      status: 'owner';
      summary: CustomerEventOwnershipSummary;
    }
  | {
      status: 'claimable';
      summary: CustomerEventOwnershipSummary;
    }
  | {
      status: 'different-owner';
      summary: CustomerEventOwnershipSummary;
    }
  | {
      status: 'missing';
      summary: null;
    };

export type CustomerEditableInvitationPageState =
  | {
      status: 'ready';
      summary: CustomerEventOwnershipSummary;
      editableConfig: EditableInvitationPageConfig;
    }
  | {
      status: 'claim';
      summary: CustomerEventOwnershipSummary | null;
    }
  | {
      status: 'blocked';
      summary: CustomerEventOwnershipSummary | null;
      message: string;
    };

export interface CreateOwnedCustomerEventInput {
  slugBase: string;
  groomName: string;
  brideName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  productTier: InvitationProductTier;
  defaultTheme: InvitationThemeKey;
}

export interface CreateOwnedCustomerEventResult {
  slug: string;
  eventId: string;
}

export interface CustomerEventGuestbookComment {
  id: string;
  author: string;
  message: string;
  pageSlug: string;
  status: 'public' | 'hidden' | 'pending_delete';
  createdAt: Date | null;
  hiddenAt: Date | null;
  deletedAt: Date | null;
  scheduledDeleteAt: Date | null;
  restoredAt: Date | null;
}

function readDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function normalizeThemeList(
  value: unknown,
  fallbackTheme: InvitationThemeKey
) {
  const sourceThemes = Array.isArray(value) && value.length > 0 ? value : [fallbackTheme];
  const themes = sourceThemes.reduce<InvitationThemeKey[]>((themeList, theme) => {
    const normalizedTheme = normalizeInvitationThemeKey(theme, fallbackTheme);
    if (!themeList.includes(normalizedTheme)) {
      themeList.push(normalizedTheme);
    }

    return themeList;
  }, []);

  return themes.length > 0 ? themes : [fallbackTheme];
}

function normalizeOwnedEvent(input: unknown): CustomerOwnedEventSummary | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const eventId = typeof record.eventId === 'string' ? record.eventId.trim() : '';
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';

  if (!eventId || !slug) {
    return null;
  }

  const defaultTheme = normalizeInvitationThemeKey(
    record.defaultTheme,
    DEFAULT_INVITATION_THEME
  );

  return {
    eventId,
    slug,
    eventType: normalizeEventTypeKey(record.eventType, DEFAULT_EVENT_TYPE),
    title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : null,
    displayName:
      typeof record.displayName === 'string' && record.displayName.trim()
        ? record.displayName.trim()
        : null,
    published: record.published === true,
    defaultTheme,
    availableThemes: normalizeThemeList(record.availableThemes, defaultTheme),
    updatedAt: readDate(record.updatedAt),
  };
}

function normalizeOwnershipSummary(input: unknown): CustomerEventOwnershipSummary | null {
  const ownedEvent = normalizeOwnedEvent(input);
  if (!ownedEvent || !input || typeof input !== 'object' || Array.isArray(input)) {
    return ownedEvent;
  }

  const record = input as Record<string, unknown>;
  return {
    ...ownedEvent,
    ownerUid:
      typeof record.ownerUid === 'string' && record.ownerUid.trim()
        ? record.ownerUid.trim()
        : null,
  };
}

function normalizeEditableConfig(input: unknown): EditableInvitationPageConfig | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
  const config =
    record.config && typeof record.config === 'object' && !Array.isArray(record.config)
      ? (record.config as InvitationPageSeed)
      : null;

  if (!slug || !config) {
    return null;
  }

  const productTier = normalizeInvitationProductTier(
    record.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );
  const features =
    record.features && typeof record.features === 'object' && !Array.isArray(record.features)
      ? (record.features as InvitationFeatureFlags)
      : resolveInvitationFeatures(productTier, config.features);

  return {
    slug,
    config,
    published: record.published === true,
    defaultTheme: normalizeInvitationThemeKey(record.defaultTheme, DEFAULT_INVITATION_THEME),
    productTier: productTier as InvitationProductTier,
    features,
    hasCustomConfig: record.hasCustomConfig === true,
    dataSource: record.dataSource === 'firestore' ? 'firestore' : 'seed',
    lastSavedAt: readDate(record.lastSavedAt),
  };
}

function normalizeGuestbookComment(input: unknown): CustomerEventGuestbookComment | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const pageSlug = typeof record.pageSlug === 'string' ? record.pageSlug.trim() : '';
  const status =
    record.status === 'hidden' || record.status === 'pending_delete'
      ? record.status
      : 'public';

  if (!id || !pageSlug) {
    return null;
  }

  return {
    id,
    author:
      typeof record.author === 'string' && record.author.trim()
        ? record.author.trim()
        : '익명',
    message: typeof record.message === 'string' ? record.message : '',
    pageSlug,
    status,
    createdAt: readDate(record.createdAt),
    hiddenAt: readDate(record.hiddenAt),
    deletedAt: readDate(record.deletedAt),
    scheduledDeleteAt: readDate(record.scheduledDeleteAt),
    restoredAt: readDate(record.restoredAt),
  };
}

function mapClientResolvedEventToOwnershipStatus(
  pageSlug: string,
  uid: string | null | undefined
): Promise<CustomerEventOwnershipStatus> {
  return resolveClientStoredEventBySlug(pageSlug).then((resolvedEvent) => {
    if (!resolvedEvent) {
      return {
        status: 'missing',
        summary: null,
      };
    }

    const normalizedUid = uid?.trim() ?? '';
    const ownerUid = resolvedEvent.summary.ownerUid?.trim() ?? '';
    const summary = {
      eventId: resolvedEvent.summary.eventId,
      slug: resolvedEvent.summary.slug,
      eventType: resolvedEvent.summary.eventType,
      title: resolvedEvent.summary.title,
      displayName: resolvedEvent.summary.displayName,
      published: resolvedEvent.summary.published,
      defaultTheme: resolvedEvent.summary.defaultTheme,
      availableThemes: normalizeThemeList(
        resolvedEvent.summary.supportedVariants,
        resolvedEvent.summary.defaultTheme
      ),
      updatedAt: resolvedEvent.summary.updatedAt,
      ownerUid: ownerUid || null,
    } satisfies CustomerEventOwnershipSummary;

    if (!ownerUid) {
      return {
        status: 'claimable',
        summary,
      };
    }

    if (normalizedUid && ownerUid === normalizedUid) {
      return {
        status: 'owner',
        summary,
      };
    }

    return {
      status: 'different-owner',
      summary,
    };
  });
}

export async function listOwnedCustomerEvents(_uid: string) {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch('/api/customer/events/', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; events?: unknown[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '내 청첩장 목록을 불러오지 못했습니다.'
    );
  }

  return Array.isArray(payload?.events)
    ? payload.events
        .map((entry) => normalizeOwnedEvent(entry))
        .filter((entry): entry is CustomerOwnedEventSummary => entry !== null)
    : [];
}

export async function getCustomerEventOwnershipStatus(
  pageSlug: string,
  uid: string | null | undefined
): Promise<CustomerEventOwnershipStatus> {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return {
      status: 'missing',
      summary: null,
    };
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    return mapClientResolvedEventToOwnershipStatus(normalizedPageSlug, uid);
  }

  const response = await fetch(
    `/api/customer/events/${encodeURIComponent(normalizedPageSlug)}/ownership/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | {
        status?: unknown;
        summary?: unknown;
        error?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 소유권을 확인하지 못했습니다.'
    );
  }

  const summary = normalizeOwnershipSummary(payload?.summary);
  if (payload?.status === 'owner' && summary) {
    return { status: 'owner', summary };
  }
  if (payload?.status === 'claimable' && summary) {
    return { status: 'claimable', summary };
  }
  if (payload?.status === 'different-owner' && summary) {
    return { status: 'different-owner', summary };
  }

  return { status: 'missing', summary: null };
}

export async function getCustomerEditableInvitationPageState(
  pageSlug: string
): Promise<CustomerEditableInvitationPageState> {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return {
      status: 'blocked',
      summary: null,
      message: '청첩장 주소가 올바르지 않습니다.',
    };
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(
    `/api/customer/events/${encodeURIComponent(normalizedPageSlug)}/editable/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | {
        status?: unknown;
        summary?: unknown;
        config?: unknown;
        error?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 편집 정보를 불러오지 못했습니다.'
    );
  }

  const summary = normalizeOwnershipSummary(payload?.summary);
  if (payload?.status === 'ready') {
    const editableConfig = normalizeEditableConfig(payload.config);
    if (summary && editableConfig) {
      return {
        status: 'ready',
        summary,
        editableConfig,
      };
    }

    return {
      status: 'blocked',
      summary,
      message: '저장된 청첩장 데이터를 찾을 수 없습니다.',
    };
  }

  if (payload?.status === 'different-owner') {
    return {
      status: 'blocked',
      summary,
      message: '이미 다른 계정에 연결된 청첩장입니다. 다른 계정으로 로그인했는지 확인해 주세요.',
    };
  }

  if (payload?.status === 'claimable') {
    return {
      status: 'claim',
      summary,
    };
  }

  if (payload?.status === 'missing') {
    return summary
      ? {
          status: 'blocked',
          summary,
          message:
            '현재 계정에 연결된 청첩장이지만 편집 정보를 찾지 못했습니다. 관리자에게 데이터 복구를 요청해 주세요.',
        }
      : {
          status: 'claim',
          summary: null,
        };
  }

  return {
    status: 'blocked',
    summary,
    message: '청첩장 편집 권한을 확인하지 못했습니다.',
  };
}

export async function createOwnedCustomerEvent(
  input: CreateOwnedCustomerEventInput
): Promise<CreateOwnedCustomerEventResult> {
  const idToken = await getCurrentFirebaseIdToken({ forceRefresh: true });
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch('/api/customer/events/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      slugBase: input.slugBase,
      groomName: input.groomName,
      brideName: input.brideName,
      groomEnglishName: input.groomEnglishName,
      brideEnglishName: input.brideEnglishName,
      productTier: input.productTier,
      defaultTheme: input.defaultTheme,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        slug?: string;
        eventId?: string;
        error?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 생성에 실패했습니다.'
    );
  }

  return {
    slug: typeof payload?.slug === 'string' ? payload.slug : '',
    eventId: typeof payload?.eventId === 'string' ? payload.eventId : '',
  };
}

export async function listCustomerEventGuestbookComments(
  pageSlug: string
): Promise<CustomerEventGuestbookComment[]> {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return [];
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(
    `/api/customer/events/${encodeURIComponent(normalizedPageSlug)}/comments/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; comments?: unknown[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '방명록을 불러오지 못했습니다.'
    );
  }

  return Array.isArray(payload?.comments)
    ? payload.comments
        .map((entry) => normalizeGuestbookComment(entry))
        .filter((entry): entry is CustomerEventGuestbookComment => entry !== null)
    : [];
}

export async function deleteCustomerEventGuestbookComment(
  pageSlug: string,
  commentId: string
): Promise<void> {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  const normalizedCommentId = commentId.trim();
  if (!normalizedPageSlug || !normalizedCommentId) {
    throw new Error('삭제할 방명록 댓글을 확인하지 못했습니다.');
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(
    `/api/customer/events/${encodeURIComponent(normalizedPageSlug)}/comments/${encodeURIComponent(normalizedCommentId)}/`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '방명록 댓글을 삭제하지 못했습니다.'
    );
  }
}
