import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';

const BILLING_FULFILLMENTS_COLLECTION = 'mobile-billing-fulfillments';

export type BillingFulfillmentKind = 'pageCreation' | 'ticketPack';
export type BillingFulfillmentStatus = 'processing' | 'fulfilled' | 'failed';

export type BillingFulfillmentPurchaseInput = {
  appUserId: string;
  productId: string;
  transactionId: string;
};

export interface BillingFulfillmentRecord {
  transactionId: string;
  appUserId: string;
  productId: string;
  kind: BillingFulfillmentKind;
  status: BillingFulfillmentStatus;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  purchaseDate: string | null;
  createdPageSlug: string | null;
  targetPageSlug: string | null;
  grantedTicketCount: number | null;
  lastError: string | null;
}

export interface BillingFulfillmentRepository {
  isAvailable(): boolean;
  findByTransactionId(transactionId: string): Promise<BillingFulfillmentRecord | null>;
  acquireLock(
    purchase: BillingFulfillmentPurchaseInput,
    kind: BillingFulfillmentKind
  ): Promise<BillingFulfillmentRecord>;
  update(
    transactionId: string,
    patch: Partial<BillingFulfillmentRecord>
  ): Promise<void>;
  markFailed(transactionId: string, error: string): Promise<void>;
}

function buildDefaultBillingFulfillmentRecord(
  purchase: BillingFulfillmentPurchaseInput,
  kind: BillingFulfillmentKind
) {
  const now = new Date().toISOString();
  return {
    transactionId: purchase.transactionId,
    appUserId: purchase.appUserId,
    productId: purchase.productId,
    kind,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
    fulfilledAt: null,
    purchaseDate: null,
    createdPageSlug: null,
    targetPageSlug: null,
    grantedTicketCount: null,
    lastError: null,
  } satisfies BillingFulfillmentRecord;
}

function normalizeBillingFulfillmentRecord(
  transactionId: string,
  data: Record<string, unknown>
): BillingFulfillmentRecord | null {
  const productId = typeof data.productId === 'string' ? data.productId.trim() : '';

  if (
    !productId ||
    typeof data.appUserId !== 'string' ||
    !data.appUserId.trim() ||
    (data.kind !== 'pageCreation' && data.kind !== 'ticketPack') ||
    (data.status !== 'processing' &&
      data.status !== 'fulfilled' &&
      data.status !== 'failed')
  ) {
    return null;
  }

  return {
    transactionId,
    appUserId: data.appUserId.trim(),
    productId,
    kind: data.kind,
    status: data.status,
    createdAt:
      typeof data.createdAt === 'string' && data.createdAt.trim()
        ? data.createdAt.trim()
        : new Date().toISOString(),
    updatedAt:
      typeof data.updatedAt === 'string' && data.updatedAt.trim()
        ? data.updatedAt.trim()
        : new Date().toISOString(),
    fulfilledAt:
      typeof data.fulfilledAt === 'string' && data.fulfilledAt.trim()
        ? data.fulfilledAt.trim()
        : null,
    purchaseDate:
      typeof data.purchaseDate === 'string' && data.purchaseDate.trim()
        ? data.purchaseDate.trim()
        : null,
    createdPageSlug:
      typeof data.createdPageSlug === 'string' && data.createdPageSlug.trim()
        ? data.createdPageSlug.trim()
        : null,
    targetPageSlug:
      typeof data.targetPageSlug === 'string' && data.targetPageSlug.trim()
        ? data.targetPageSlug.trim()
        : null,
    grantedTicketCount:
      typeof data.grantedTicketCount === 'number' && Number.isFinite(data.grantedTicketCount)
        ? Math.max(0, Math.trunc(data.grantedTicketCount))
        : null,
    lastError:
      typeof data.lastError === 'string' && data.lastError.trim()
        ? data.lastError.trim()
        : null,
  };
}

export const firestoreBillingFulfillmentRepository: BillingFulfillmentRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async findByTransactionId(transactionId) {
    const normalizedTransactionId = transactionId.trim();
    if (!normalizedTransactionId) {
      return null;
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const snapshot = await db
      .collection(BILLING_FULFILLMENTS_COLLECTION)
      .doc(normalizedTransactionId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return normalizeBillingFulfillmentRecord(normalizedTransactionId, snapshot.data() ?? {});
  },

  async acquireLock(purchase, kind) {
    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const docRef = db.collection(BILLING_FULFILLMENTS_COLLECTION).doc(purchase.transactionId);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);

      if (!snapshot.exists) {
        const nextRecord = buildDefaultBillingFulfillmentRecord(purchase, kind);
        transaction.set(docRef, nextRecord);
        return nextRecord;
      }

      const existing = normalizeBillingFulfillmentRecord(
        purchase.transactionId,
        snapshot.data() ?? {}
      );

      if (!existing) {
        throw new Error('Billing fulfillment record is invalid.');
      }

      if (existing.productId !== purchase.productId || existing.appUserId !== purchase.appUserId) {
        throw new Error('This purchase record is already linked to another request.');
      }

      if (existing.status === 'failed') {
        transaction.set(
          docRef,
          {
            ...existing,
            status: 'processing',
            updatedAt: new Date().toISOString(),
            lastError: null,
          },
          { merge: true }
        );
        return {
          ...existing,
          status: 'processing',
          lastError: null,
        } satisfies BillingFulfillmentRecord;
      }

      return existing;
    });
  },

  async update(transactionId, patch) {
    const normalizedTransactionId = transactionId.trim();
    if (!normalizedTransactionId) {
      throw new Error('Transaction id is required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    await db
      .collection(BILLING_FULFILLMENTS_COLLECTION)
      .doc(normalizedTransactionId)
      .set(
        {
          ...patch,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  },

  async markFailed(transactionId, error) {
    await firestoreBillingFulfillmentRepository.update(transactionId, {
      status: 'failed',
      lastError: error,
    });
  },
};
