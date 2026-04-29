import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import {
  DEFAULT_EVENT_TYPE,
  normalizeEventTypeKey,
  type EventTypeKey,
} from '@/lib/eventTypes';
import {
  EMPTY_CUSTOMER_PAGE_CREATION_CREDITS,
  type CustomerWalletLedgerEntry,
  type CustomerWalletSummary,
} from '@/types/customerWallet';

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
  wallet: CustomerWalletSummary;
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

function normalizeWalletLedgerEntry(input: unknown): CustomerWalletLedgerEntry | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const ownerUid = typeof record.ownerUid === 'string' ? record.ownerUid.trim() : '';
  const kind = record.kind === 'pageCreation' || record.kind === 'operationTicket'
    ? record.kind
    : null;
  const direction = record.direction === 'credit' || record.direction === 'debit'
    ? record.direction
    : null;
  const source =
    record.source === 'adminGrant' ||
    record.source === 'mobilePurchase' ||
    record.source === 'webPurchase' ||
    record.source === 'eventAssignment' ||
    record.source === 'migration' ||
    record.source === 'system'
      ? record.source
      : null;
  const platform =
    record.platform === 'admin' ||
    record.platform === 'mobile' ||
    record.platform === 'web' ||
    record.platform === 'system'
      ? record.platform
      : null;
  const status =
    record.status === 'active' ||
    record.status === 'consumed' ||
    record.status === 'assigned' ||
    record.status === 'revoked' ||
    record.status === 'refunded'
      ? record.status
      : 'active';
  const quantity =
    typeof record.quantity === 'number' && Number.isFinite(record.quantity)
      ? Math.max(0, Math.trunc(record.quantity))
      : 0;
  const tier =
    record.tier === 'standard' || record.tier === 'deluxe' || record.tier === 'premium'
      ? record.tier
      : null;

  if (!id || !ownerUid || !kind || !direction || !source || !platform || quantity <= 0) {
    return null;
  }

  return {
    id,
    ownerUid,
    kind,
    direction,
    quantity,
    tier,
    source,
    platform,
    status,
    eventId: typeof record.eventId === 'string' && record.eventId.trim() ? record.eventId.trim() : null,
    pageSlug: typeof record.pageSlug === 'string' && record.pageSlug.trim() ? record.pageSlug.trim() : null,
    transactionId:
      typeof record.transactionId === 'string' && record.transactionId.trim()
        ? record.transactionId.trim()
        : null,
    provider: typeof record.provider === 'string' && record.provider.trim() ? record.provider.trim() : null,
    note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null,
    createdByUid:
      typeof record.createdByUid === 'string' && record.createdByUid.trim()
        ? record.createdByUid.trim()
        : null,
    createdAt: toDateString(record.createdAt),
  };
}

function readFiniteCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function normalizeWallet(input: unknown, ownerUid: string): CustomerWalletSummary {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ownerUid,
      pageCreationCredits: { ...EMPTY_CUSTOMER_PAGE_CREATION_CREDITS },
      operationTicketBalance: 0,
      updatedAt: null,
      recentLedger: [],
    };
  }

  const record = input as Record<string, unknown>;
  const creditsInput =
    record.pageCreationCredits &&
    typeof record.pageCreationCredits === 'object' &&
    !Array.isArray(record.pageCreationCredits)
      ? record.pageCreationCredits as Record<string, unknown>
      : {};

  return {
    ownerUid,
    pageCreationCredits: {
      standard: readFiniteCount(creditsInput.standard),
      deluxe: readFiniteCount(creditsInput.deluxe),
      premium: readFiniteCount(creditsInput.premium),
    },
    operationTicketBalance: readFiniteCount(record.operationTicketBalance),
    updatedAt: toDateString(record.updatedAt),
    recentLedger: Array.isArray(record.recentLedger)
      ? record.recentLedger
          .map((entry) => normalizeWalletLedgerEntry(entry))
          .filter((entry): entry is CustomerWalletLedgerEntry => Boolean(entry))
      : [],
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
    wallet: normalizeWallet(record.wallet, uid),
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

export async function deleteAdminCustomerAccount(uid: string) {
  const normalizedUid = uid.trim();
  if (!normalizedUid) {
    throw new Error('탈퇴 처리할 고객 계정을 먼저 확인해 주세요.');
  }

  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/customers/accounts', {
    method: 'DELETE',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: normalizedUid,
      confirm: true,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        error?: string;
        detachedEventCount?: unknown;
        unpublishedEventCount?: unknown;
        authUserDeleted?: unknown;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '고객 계정을 탈퇴 처리하지 못했습니다.'
    );
  }

  return {
    authUserDeleted: payload?.authUserDeleted === true,
    detachedEventCount:
      typeof payload?.detachedEventCount === 'number' &&
      Number.isFinite(payload.detachedEventCount)
        ? Math.max(0, Math.trunc(payload.detachedEventCount))
        : 0,
    unpublishedEventCount:
      typeof payload?.unpublishedEventCount === 'number' &&
      Number.isFinite(payload.unpublishedEventCount)
        ? Math.max(0, Math.trunc(payload.unpublishedEventCount))
        : 0,
  };
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

export async function grantAdminCustomerWalletCredit(input: {
  uid: string;
  kind: 'pageCreation' | 'operationTicket';
  quantity: number;
  tier?: 'standard' | 'deluxe' | 'premium' | null;
  note?: string | null;
}) {
  if (!input.uid.trim()) {
    throw new Error('지급할 고객 계정을 먼저 확인해 주세요.');
  }

  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/customers/wallet', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'grant',
      uid: input.uid.trim(),
      kind: input.kind,
      quantity: input.quantity,
      tier: input.kind === 'pageCreation' ? input.tier : null,
      note: input.note ?? null,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; wallet?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '고객 이용권을 지급하지 못했습니다.'
    );
  }

  return normalizeWallet(payload?.wallet, input.uid.trim());
}
