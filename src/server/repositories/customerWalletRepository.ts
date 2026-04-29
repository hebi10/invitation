import 'server-only';

import type { Transaction } from 'firebase-admin/firestore';

import {
  EMPTY_CUSTOMER_PAGE_CREATION_CREDITS,
  type CustomerPageCreationCredits,
  type CustomerWalletCreditKind,
  type CustomerWalletLedgerDirection,
  type CustomerWalletLedgerEntry,
  type CustomerWalletLedgerPlatform,
  type CustomerWalletLedgerSource,
  type CustomerWalletSummary,
} from '@/types/customerWallet';
import type { InvitationProductTier } from '@/types/invitationPage';

import { getServerFirestore } from '../firebaseAdmin';

const CUSTOMER_WALLETS_COLLECTION = 'customerWallets';
const CUSTOMER_WALLET_LEDGER_COLLECTION = 'ledger';

export interface CustomerWalletAdjustmentInput {
  ownerUid: string;
  kind: CustomerWalletCreditKind;
  direction: CustomerWalletLedgerDirection;
  quantity: number;
  tier?: InvitationProductTier | null;
  source: CustomerWalletLedgerSource;
  platform: CustomerWalletLedgerPlatform;
  status?: CustomerWalletLedgerEntry['status'];
  eventId?: string | null;
  pageSlug?: string | null;
  transactionId?: string | null;
  provider?: string | null;
  note?: string | null;
  createdByUid?: string | null;
  idempotencyKey?: string | null;
}

export interface CustomerWalletRepository {
  isAvailable(): boolean;
  findSummaryByOwnerUid(ownerUid: string): Promise<CustomerWalletSummary>;
  listSummariesByOwnerUids(ownerUids: string[]): Promise<Map<string, CustomerWalletSummary>>;
  adjustBalance(input: CustomerWalletAdjustmentInput): Promise<CustomerWalletSummary>;
}

function normalizeOwnerUid(ownerUid: string) {
  return ownerUid.trim();
}

function readFiniteCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function normalizePageCreationCredits(value: unknown): CustomerPageCreationCredits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...EMPTY_CUSTOMER_PAGE_CREATION_CREDITS };
  }

  const record = value as Record<string, unknown>;
  return {
    standard: readFiniteCount(record.standard),
    deluxe: readFiniteCount(record.deluxe),
    premium: readFiniteCount(record.premium),
  };
}

function toIsoString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate() as Date;
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
}

function readNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeLedgerEntry(
  id: string,
  ownerUid: string,
  data: Record<string, unknown>
): CustomerWalletLedgerEntry | null {
  const kind = data.kind === 'pageCreation' || data.kind === 'operationTicket'
    ? data.kind
    : null;
  const direction = data.direction === 'credit' || data.direction === 'debit'
    ? data.direction
    : null;
  const source =
    data.source === 'adminGrant' ||
    data.source === 'mobilePurchase' ||
    data.source === 'webPurchase' ||
    data.source === 'eventAssignment' ||
    data.source === 'migration' ||
    data.source === 'system'
      ? data.source
      : null;
  const platform =
    data.platform === 'admin' ||
    data.platform === 'mobile' ||
    data.platform === 'web' ||
    data.platform === 'system'
      ? data.platform
      : null;
  const status =
    data.status === 'active' ||
    data.status === 'consumed' ||
    data.status === 'assigned' ||
    data.status === 'revoked' ||
    data.status === 'refunded'
      ? data.status
      : 'active';
  const tier =
    data.tier === 'standard' || data.tier === 'deluxe' || data.tier === 'premium'
      ? data.tier
      : null;
  const quantity = readFiniteCount(data.quantity);

  if (!kind || !direction || !source || !platform || quantity <= 0) {
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
    eventId: readNullableString(data.eventId),
    pageSlug: readNullableString(data.pageSlug),
    transactionId: readNullableString(data.transactionId),
    provider: readNullableString(data.provider),
    note: readNullableString(data.note),
    createdByUid: readNullableString(data.createdByUid),
    createdAt: toIsoString(data.createdAt),
  };
}

function buildEmptyWallet(ownerUid: string): CustomerWalletSummary {
  return {
    ownerUid,
    pageCreationCredits: { ...EMPTY_CUSTOMER_PAGE_CREATION_CREDITS },
    operationTicketBalance: 0,
    updatedAt: null,
    recentLedger: [],
  };
}

function normalizeWalletSummary(
  ownerUid: string,
  data: Record<string, unknown> | null | undefined,
  recentLedger: CustomerWalletLedgerEntry[] = []
): CustomerWalletSummary {
  if (!data) {
    return buildEmptyWallet(ownerUid);
  }

  return {
    ownerUid,
    pageCreationCredits: normalizePageCreationCredits(data.pageCreationCredits),
    operationTicketBalance: readFiniteCount(data.operationTicketBalance),
    updatedAt: toIsoString(data.updatedAt),
    recentLedger,
  };
}

function getWalletDoc(ownerUid: string) {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  return db.collection(CUSTOMER_WALLETS_COLLECTION).doc(ownerUid);
}

async function listRecentLedgerEntries(ownerUid: string, limit = 8) {
  const walletRef = getWalletDoc(ownerUid);
  const snapshot = await walletRef
    .collection(CUSTOMER_WALLET_LEDGER_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((docSnapshot) =>
      normalizeLedgerEntry(docSnapshot.id, ownerUid, docSnapshot.data() ?? {})
    )
    .filter((entry): entry is CustomerWalletLedgerEntry => Boolean(entry));
}

function buildLedgerId(input: CustomerWalletAdjustmentInput) {
  const idempotencyKey = input.idempotencyKey?.trim();
  if (idempotencyKey) {
    return idempotencyKey.replace(/[\/#?\[\]]/g, '_');
  }

  return null;
}

function applyWalletAdjustment(
  current: CustomerWalletSummary,
  input: CustomerWalletAdjustmentInput
) {
  const quantity = Number.isFinite(input.quantity)
    ? Math.max(0, Math.trunc(input.quantity))
    : 0;
  if (quantity <= 0) {
    throw new Error('지급할 수량을 1 이상으로 입력해 주세요.');
  }

  const multiplier = input.direction === 'credit' ? 1 : -1;
  const nextCredits = { ...current.pageCreationCredits };
  let nextOperationTicketBalance = current.operationTicketBalance;

  if (input.kind === 'pageCreation') {
    if (!input.tier) {
      throw new Error('제작권 지급에는 서비스 등급이 필요합니다.');
    }

    const nextValue = nextCredits[input.tier] + quantity * multiplier;
    if (nextValue < 0) {
      throw new Error('보유 제작권이 부족합니다.');
    }
    nextCredits[input.tier] = nextValue;
  } else {
    nextOperationTicketBalance += quantity * multiplier;
    if (nextOperationTicketBalance < 0) {
      throw new Error('보유 운영 티켓이 부족합니다.');
    }
  }

  return {
    pageCreationCredits: nextCredits,
    operationTicketBalance: nextOperationTicketBalance,
  };
}

async function normalizeWalletInTransaction(
  transaction: Transaction,
  ownerUid: string
) {
  const walletRef = getWalletDoc(ownerUid);
  const snapshot = await transaction.get(walletRef);
  return normalizeWalletSummary(ownerUid, snapshot.exists ? snapshot.data() ?? {} : null);
}

export const firestoreCustomerWalletRepository: CustomerWalletRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async findSummaryByOwnerUid(ownerUid) {
    const normalizedOwnerUid = normalizeOwnerUid(ownerUid);
    if (!normalizedOwnerUid) {
      throw new Error('고객 UID가 필요합니다.');
    }

    const walletRef = getWalletDoc(normalizedOwnerUid);
    const [walletSnapshot, recentLedger] = await Promise.all([
      walletRef.get(),
      listRecentLedgerEntries(normalizedOwnerUid),
    ]);

    return normalizeWalletSummary(
      normalizedOwnerUid,
      walletSnapshot.exists ? walletSnapshot.data() ?? {} : null,
      recentLedger
    );
  },

  async listSummariesByOwnerUids(ownerUids) {
    const normalizedOwnerUids = [
      ...new Set(ownerUids.map(normalizeOwnerUid).filter(Boolean)),
    ];
    const entries = await Promise.all(
      normalizedOwnerUids.map(async (ownerUid) => [
        ownerUid,
        await firestoreCustomerWalletRepository.findSummaryByOwnerUid(ownerUid),
      ] as const)
    );

    return new Map(entries);
  },

  async adjustBalance(input) {
    const normalizedOwnerUid = normalizeOwnerUid(input.ownerUid);
    if (!normalizedOwnerUid) {
      throw new Error('고객 UID가 필요합니다.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const walletRef = db.collection(CUSTOMER_WALLETS_COLLECTION).doc(normalizedOwnerUid);
    const ledgerId = buildLedgerId(input);
    const ledgerRef = ledgerId
      ? walletRef.collection(CUSTOMER_WALLET_LEDGER_COLLECTION).doc(ledgerId)
      : walletRef.collection(CUSTOMER_WALLET_LEDGER_COLLECTION).doc();
    const normalizedQuantity = Number.isFinite(input.quantity)
      ? Math.max(1, Math.trunc(input.quantity))
      : 1;
    const now = new Date();

    await db.runTransaction(async (transaction) => {
      if (ledgerId) {
        const ledgerSnapshot = await transaction.get(ledgerRef);
        if (ledgerSnapshot.exists) {
          return;
        }
      }

      const current = await normalizeWalletInTransaction(transaction, normalizedOwnerUid);
      const nextWallet = applyWalletAdjustment(current, input);

      transaction.set(
        walletRef,
        {
          ownerUid: normalizedOwnerUid,
          pageCreationCredits: nextWallet.pageCreationCredits,
          operationTicketBalance: nextWallet.operationTicketBalance,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(ledgerRef, {
        ownerUid: normalizedOwnerUid,
        kind: input.kind,
        direction: input.direction,
        quantity: normalizedQuantity,
        tier: input.kind === 'pageCreation' ? input.tier ?? null : null,
        source: input.source,
        platform: input.platform,
        status: input.status ?? 'active',
        eventId: input.eventId?.trim() || null,
        pageSlug: input.pageSlug?.trim() || null,
        transactionId: input.transactionId?.trim() || null,
        provider: input.provider?.trim() || null,
        note: input.note?.trim() || null,
        createdByUid: input.createdByUid?.trim() || null,
        createdAt: now,
      });
    });

    return firestoreCustomerWalletRepository.findSummaryByOwnerUid(normalizedOwnerUid);
  },
};
