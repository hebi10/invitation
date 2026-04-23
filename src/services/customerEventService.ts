import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { getCurrentFirebaseIdToken } from '@/services/adminAuth';
import {
  listOwnedClientEventSummaries,
  resolveClientStoredEventBySlug,
} from '@/services/repositories/clientEventRepositoryCore';

export type CustomerOwnedEventSummary = Awaited<
  ReturnType<typeof listOwnedClientEventSummaries>
>[number];

export type CustomerEventOwnershipStatus =
  | {
      status: 'owner';
      summary: NonNullable<Awaited<ReturnType<typeof resolveClientStoredEventBySlug>>>['summary'];
    }
  | {
      status: 'claimable';
      summary: NonNullable<Awaited<ReturnType<typeof resolveClientStoredEventBySlug>>>['summary'];
    }
  | {
      status: 'different-owner';
      summary: NonNullable<Awaited<ReturnType<typeof resolveClientStoredEventBySlug>>>['summary'];
    }
  | {
      status: 'missing';
      summary: null;
    };

function extractPageSlugFromInput(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  try {
    const normalizedUrl = trimmedValue.startsWith('http')
      ? new URL(trimmedValue)
      : new URL(trimmedValue, 'https://placeholder.local');
    const segments = normalizedUrl.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    return normalizeInvitationPageSlugInput(segments[0] ?? '');
  } catch {
    const firstSegment = trimmedValue
      .replace(/^\/+/, '')
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)[0] ?? '';
    return normalizeInvitationPageSlugInput(firstSegment);
  }
}

export async function listOwnedCustomerEvents(uid: string) {
  return listOwnedClientEventSummaries(uid);
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

  const resolvedEvent = await resolveClientStoredEventBySlug(normalizedPageSlug);
  if (!resolvedEvent) {
    return {
      status: 'missing',
      summary: null,
    };
  }

  const normalizedUid = uid?.trim() ?? '';
  const ownerUid = resolvedEvent.summary.ownerUid?.trim() ?? '';

  if (!ownerUid) {
    return {
      status: 'claimable',
      summary: resolvedEvent.summary,
    };
  }

  if (normalizedUid && ownerUid === normalizedUid) {
    return {
      status: 'owner',
      summary: resolvedEvent.summary,
    };
  }

  return {
    status: 'different-owner',
    summary: resolvedEvent.summary,
  };
}

export async function claimOwnedCustomerEvent(input: {
  pageSlugOrUrl: string;
  password: string;
}) {
  const pageSlug = extractPageSlugFromInput(input.pageSlugOrUrl);
  const password = input.password.trim();

  if (!pageSlug || !password) {
    throw new Error('청첩장 링크 또는 주소와 기존 페이지 비밀번호를 모두 입력해 주세요.');
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch('/api/customer/events/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      pageSlug,
      password,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; slug?: string; eventId?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 계정 연결에 실패했습니다.'
    );
  }

  return {
    slug: payload?.slug ?? pageSlug,
    eventId: payload?.eventId ?? '',
  };
}
