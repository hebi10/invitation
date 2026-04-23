import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import {
  DEFAULT_EVENT_TYPE,
  normalizeEventTypeKey,
  type EventTypeKey,
} from '@/lib/eventTypes';

import { getCurrentFirebaseIdToken } from './adminAuth';

export interface AdminCustomerLinkedEventSummary {
  eventId: string;
  slug: string;
  eventType: EventTypeKey;
  displayName: string;
  published: boolean;
  defaultTheme: string;
  updatedAt: string | null;
}

export interface AdminCustomerAccountSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  disabled: boolean;
  emailVerified: boolean;
  providerIds: string[];
  createdAt: string | null;
  lastSignInAt: string | null;
  missingAuthUser: boolean;
  linkedEvents: AdminCustomerLinkedEventSummary[];
}

export interface AdminCustomerAccountsSnapshot {
  accounts: AdminCustomerAccountSummary[];
  unassignedEvents: AdminCustomerLinkedEventSummary[];
}

async function createAdminAuthHeaders() {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

function toDateString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeLinkedEvent(input: unknown): AdminCustomerLinkedEventSummary | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const eventId = typeof record.eventId === 'string' ? record.eventId.trim() : '';
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
  const displayName =
    typeof record.displayName === 'string' && record.displayName.trim()
      ? record.displayName.trim()
      : slug;

  if (!eventId || !slug) {
    return null;
  }

  return {
    eventId,
    slug,
    eventType: normalizeEventTypeKey(record.eventType, DEFAULT_EVENT_TYPE),
    displayName,
    published: record.published === true,
    defaultTheme:
      typeof record.defaultTheme === 'string' && record.defaultTheme.trim()
        ? record.defaultTheme.trim()
        : 'emotional',
    updatedAt: toDateString(record.updatedAt),
  };
}

function normalizeAccount(input: unknown): AdminCustomerAccountSummary | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const uid = typeof record.uid === 'string' ? record.uid.trim() : '';
  if (!uid) {
    return null;
  }

  return {
    uid,
    email: typeof record.email === 'string' && record.email.trim() ? record.email.trim() : null,
    displayName:
      typeof record.displayName === 'string' && record.displayName.trim()
        ? record.displayName.trim()
        : null,
    isAdmin: record.isAdmin === true,
    disabled: record.disabled === true,
    emailVerified: record.emailVerified === true,
    providerIds: Array.isArray(record.providerIds)
      ? record.providerIds.filter(
          (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
        )
      : [],
    createdAt: toDateString(record.createdAt),
    lastSignInAt: toDateString(record.lastSignInAt),
    missingAuthUser: record.missingAuthUser === true,
    linkedEvents: Array.isArray(record.linkedEvents)
      ? record.linkedEvents
          .map((entry) => normalizeLinkedEvent(entry))
          .filter((entry): entry is AdminCustomerLinkedEventSummary => Boolean(entry))
      : [],
  };
}

export async function getAdminCustomerAccountsSnapshot() {
  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/customers/accounts', {
    method: 'GET',
    headers,
  });
  const payload = (await response.json().catch(() => null)) as
    | ({ success?: boolean; accounts?: unknown[]; unassignedEvents?: unknown[]; error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '고객 계정 목록을 불러오지 못했습니다.'
    );
  }

  return {
    accounts: Array.isArray(payload?.accounts)
      ? payload.accounts
          .map((entry) => normalizeAccount(entry))
          .filter((entry): entry is AdminCustomerAccountSummary => Boolean(entry))
      : [],
    unassignedEvents: Array.isArray(payload?.unassignedEvents)
      ? payload.unassignedEvents
          .map((entry) => normalizeLinkedEvent(entry))
          .filter((entry): entry is AdminCustomerLinkedEventSummary => Boolean(entry))
      : [],
  } satisfies AdminCustomerAccountsSnapshot;
}

export async function assignAdminCustomerEventOwnership(uid: string, pageSlug: string) {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!uid.trim() || !normalizedPageSlug) {
    throw new Error('고객 계정과 청첩장 주소를 모두 확인해 주세요.');
  }

  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/customers/ownership', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'assign',
      uid: uid.trim(),
      pageSlug: normalizedPageSlug,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '고객 계정에 청첩장을 연결하지 못했습니다.'
    );
  }
}

export async function clearAdminCustomerEventOwnership(pageSlug: string) {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('연결 해제할 청첩장 주소가 올바르지 않습니다.');
  }

  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/customers/ownership', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'clear',
      pageSlug: normalizedPageSlug,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '고객 계정 연결을 해제하지 못했습니다.'
    );
  }
}
