import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';

import { getCurrentFirebaseIdToken } from './adminAuth';

export type OwnershipInviteStatus =
  | 'valid'
  | 'expired'
  | 'consumed'
  | 'invalid'
  | 'different-owner';

export interface AdminOwnershipInviteResult {
  slug: string;
  url: string;
  expiresAt: Date;
}

type ApiErrorPayload = { error?: unknown } | null;

function readErrorMessage(payload: ApiErrorPayload, fallback: string) {
  return typeof payload?.error === 'string' && payload.error.trim()
    ? payload.error.trim()
    : fallback;
}

function normalizeStatus(value: unknown): OwnershipInviteStatus {
  return value === 'valid' ||
    value === 'expired' ||
    value === 'consumed' ||
    value === 'different-owner'
    ? value
    : 'invalid';
}

function requirePageSlug(pageSlug: string) {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('청첩장 연결 주소가 올바르지 않습니다.');
  }

  return normalizedPageSlug;
}

export async function issueAdminOwnershipInvite(
  pageSlug: string
): Promise<AdminOwnershipInviteResult> {
  const normalizedPageSlug = requirePageSlug(pageSlug);
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(
    `/api/admin/events/${encodeURIComponent(normalizedPageSlug)}/ownership-invite`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | {
        success?: unknown;
        slug?: unknown;
        url?: unknown;
        expiresAt?: unknown;
        error?: unknown;
      }
    | null;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, '청첩장 연결 링크를 만들지 못했습니다.'));
  }

  const url = typeof payload?.url === 'string' ? payload.url.trim() : '';
  const expiresAt =
    typeof payload?.expiresAt === 'string' ? new Date(payload.expiresAt) : null;
  if (!url || !expiresAt || Number.isNaN(expiresAt.getTime())) {
    throw new Error('청첩장 연결 링크 응답이 올바르지 않습니다.');
  }

  return {
    slug:
      typeof payload?.slug === 'string' && payload.slug.trim()
        ? payload.slug.trim()
        : normalizedPageSlug,
    url,
    expiresAt,
  };
}

export async function inspectOwnershipInvite(pageSlug: string, token: string) {
  const normalizedPageSlug = requirePageSlug(pageSlug);
  const response = await fetch(
    `/api/connect/events/${encodeURIComponent(normalizedPageSlug)}/ownership-invite-status`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | {
        status?: unknown;
        slug?: unknown;
        displayName?: unknown;
        error?: unknown;
      }
    | null;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, '청첩장 연결 링크를 확인하지 못했습니다.'));
  }

  return {
    status: normalizeStatus(payload?.status),
    slug:
      typeof payload?.slug === 'string' && payload.slug.trim()
        ? payload.slug.trim()
        : normalizedPageSlug,
    displayName:
      typeof payload?.displayName === 'string' && payload.displayName.trim()
        ? payload.displayName.trim()
        : null,
  };
}

export async function consumeCustomerOwnershipInvite(
  pageSlug: string,
  token: string
) {
  const normalizedPageSlug = requirePageSlug(pageSlug);
  const idToken = await getCurrentFirebaseIdToken({ forceRefresh: true });
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(
    `/api/customer/events/${encodeURIComponent(normalizedPageSlug)}/ownership-invite`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | { slug?: unknown; eventId?: unknown; error?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, '청첩장을 계정에 연결하지 못했습니다.'));
  }

  const eventId = typeof payload?.eventId === 'string' ? payload.eventId.trim() : '';
  if (!eventId) {
    throw new Error('청첩장 연결 결과를 확인하지 못했습니다.');
  }

  return {
    eventId,
    slug:
      typeof payload?.slug === 'string' && payload.slug.trim()
        ? payload.slug.trim()
        : normalizedPageSlug,
  };
}
