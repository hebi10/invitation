import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';

const BILLING_FULFILLMENTS_COLLECTION = 'billingFulfillments';

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
  eventId?: string | null;
  provider?: string | null;
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
    eventId: null,
    provider: 'revenuecat',
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
    eventId:
      typeof data.eventId === 'string' && data.eventId.trim() ? data.eventId.trim() : null,
    provider:
      typeof data.provider === 'string' && data.provider.trim()
        ? data.provider.trim()
        : 'revenuecat',
  };
}

async function findBillingFulfillmentByCollection(
  collectionName: string,
  transactionId: string
) {
  const normalizedTransactionId = transactionId.trim();
  if (!normalizedTransactionId) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db
    .collection(collectionName)
    .doc(normalizedTransactionId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeBillingFulfillmentRecord(normalizedTransactionId, snapshot.data() ?? {});
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

    return findBillingFulfillmentByCollection(
      BILLING_FULFILLMENTS_COLLECTION,
      normalizedTransactionId
    );
  },

  async acquireLock(purchase, kind) {
    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const normalizedTransactionId = purchase.transactionId.trim();
    const docRef = db.collection(BILLING_FULFILLMENTS_COLLECTION).doc(normalizedTransactionId);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);

      const existing = snapshot.exists
        ? normalizeBillingFulfillmentRecord(
            normalizedTransactionId,
            snapshot.data() ?? {}
          )
        : null;
      const currentRecord =
        existing ?? buildDefaultBillingFulfillmentRecord(purchase, kind);

      if (!existing) {
        transaction.set(docRef, currentRecord, { merge: true });
      }

      if (
        currentRecord.productId !== purchase.productId ||
        currentRecord.appUserId !== purchase.appUserId
      ) {
        throw new Error('This purchase record is already linked to another request.');
      }

      if (currentRecord.status === 'failed') {
        const nextRecord = {
          ...currentRecord,
          status: 'processing' as const,
          updatedAt: new Date().toISOString(),
          lastError: null,
        };
        transaction.set(docRef, nextRecord, { merge: true });
        return nextRecord;
      }

      return currentRecord;
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
