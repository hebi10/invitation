import {
  EMPTY_CUSTOMER_PAGE_CREATION_CREDITS,
  type CustomerWalletLedgerEntry,
  type CustomerWalletSummary,
} from '@/types/customerWallet';

import { getCurrentFirebaseIdToken } from './adminAuth';

function toDateString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readFiniteCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function normalizeLedgerEntry(input: unknown): CustomerWalletLedgerEntry | null {
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
  const quantity = readFiniteCount(record.quantity);

  if (!id || !ownerUid || !kind || !direction || quantity <= 0) {
    return null;
  }

  return {
    id,
    ownerUid,
    kind,
    direction,
    quantity,
    tier:
      record.tier === 'standard' || record.tier === 'deluxe' || record.tier === 'premium'
        ? record.tier
        : null,
    source:
      record.source === 'adminGrant' ||
      record.source === 'mobilePurchase' ||
      record.source === 'webPurchase' ||
      record.source === 'eventAssignment' ||
      record.source === 'migration' ||
      record.source === 'system'
        ? record.source
        : 'system',
    platform:
      record.platform === 'admin' ||
      record.platform === 'mobile' ||
      record.platform === 'web' ||
      record.platform === 'system'
        ? record.platform
        : 'system',
    status:
      record.status === 'active' ||
      record.status === 'consumed' ||
      record.status === 'assigned' ||
      record.status === 'revoked' ||
      record.status === 'refunded'
        ? record.status
        : 'active',
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
  const credits =
    record.pageCreationCredits &&
    typeof record.pageCreationCredits === 'object' &&
    !Array.isArray(record.pageCreationCredits)
      ? (record.pageCreationCredits as Record<string, unknown>)
      : {};

  return {
    ownerUid,
    pageCreationCredits: {
      standard: readFiniteCount(credits.standard),
      deluxe: readFiniteCount(credits.deluxe),
      premium: readFiniteCount(credits.premium),
    },
    operationTicketBalance: readFiniteCount(record.operationTicketBalance),
    updatedAt: toDateString(record.updatedAt),
    recentLedger: Array.isArray(record.recentLedger)
      ? record.recentLedger
          .map((entry) => normalizeLedgerEntry(entry))
          .filter((entry): entry is CustomerWalletLedgerEntry => Boolean(entry))
      : [],
  };
}

export async function getCustomerWalletSnapshot(ownerUid: string) {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch('/api/customer/wallet', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; wallet?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '보유 이용권 정보를 불러오지 못했습니다.'
    );
  }

  return normalizeWallet(payload?.wallet, ownerUid);
}
