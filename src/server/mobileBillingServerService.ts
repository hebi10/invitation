import 'server-only';

import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import { DEFAULT_INVITATION_THEME, isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  type MobileBillingProductDefinition,
  type MobileBillingProductId,
  getMobileBillingProductDefinition,
} from '@/lib/mobileBillingProducts';
import {
  createClientEditorSessionValue,
} from '@/server/clientEditorSession';

import { getAuthorizedClientEditorSession } from './clientEditorSessionAuth';
import { MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS, buildMobileInvitationLinks } from './clientEditorMobileApi';
import {
  getServerClientPasswordRecord,
  setServerClientPassword,
} from './clientPasswordServerService';
import { getServerFirestore } from './firebaseAdmin';
import {
  createServerInvitationPageDraftFromSeed,
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from './invitationPageServerService';
import {
  adjustServerPageTicketCount,
  getServerPageTicketCount,
} from './pageTicketServerService';

type MobileBillingPurchaseReceipt = {
  appUserId: string;
  productId: MobileBillingProductId;
  transactionId: string;
};

type MobileBillingCreatePageInput = {
  slugBase: string;
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  password: string;
  theme: string;
};

type RevenueCatTransactionRecord = {
  purchaseDate: string | null;
  productIdentifier: string;
  transactionIdentifier: string;
};

type BillingFulfillmentStatus = 'processing' | 'fulfilled' | 'failed';

type BillingFulfillmentRecord = {
  transactionId: string;
  appUserId: string;
  productId: MobileBillingProductId;
  kind: MobileBillingProductDefinition['kind'];
  status: BillingFulfillmentStatus;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  purchaseDate: string | null;
  createdPageSlug: string | null;
  targetPageSlug: string | null;
  grantedTicketCount: number | null;
  lastError: string | null;
};

const BILLING_FULFILLMENTS_COLLECTION = 'mobile-billing-fulfillments';

function getRevenueCatApiKey() {
  return (
    process.env.REVENUECAT_SERVER_API_KEY?.trim() ??
    process.env.REVENUECAT_PUBLIC_API_KEY?.trim() ??
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ??
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ??
    ''
  );
}

function buildDefaultBillingFulfillmentRecord(
  purchase: MobileBillingPurchaseReceipt,
  definition: MobileBillingProductDefinition
) {
  const now = new Date().toISOString();
  return {
    transactionId: purchase.transactionId,
    appUserId: purchase.appUserId,
    productId: purchase.productId,
    kind: definition.kind,
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
  const productId =
    typeof data.productId === 'string' ? data.productId.trim() : '';

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
    productId: productId as MobileBillingProductId,
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

async function getBillingFulfillmentRecord(transactionId: string) {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db
    .collection(BILLING_FULFILLMENTS_COLLECTION)
    .doc(transactionId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeBillingFulfillmentRecord(transactionId, snapshot.data() ?? {});
}

async function acquireBillingFulfillmentLock(
  purchase: MobileBillingPurchaseReceipt,
  definition: MobileBillingProductDefinition
) {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const docRef = db.collection(BILLING_FULFILLMENTS_COLLECTION).doc(purchase.transactionId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      const nextRecord = buildDefaultBillingFulfillmentRecord(purchase, definition);
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
}

async function updateBillingFulfillmentRecord(
  transactionId: string,
  patch: Partial<BillingFulfillmentRecord>
) {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  await db
    .collection(BILLING_FULFILLMENTS_COLLECTION)
    .doc(transactionId)
    .set(
      {
        ...patch,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
}

async function markBillingFulfillmentFailed(transactionId: string, error: string) {
  await updateBillingFulfillmentRecord(transactionId, {
    status: 'failed',
    lastError: error,
  });
}

function collectTransactionCandidateIds(record: Record<string, unknown>) {
  return [
    record.transactionIdentifier,
    record.transaction_id,
    record.storeTransactionId,
    record.store_transaction_id,
    record.id,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

function normalizeRevenueCatTransactionRecord(input: unknown): RevenueCatTransactionRecord | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;
  const productIdentifier =
    typeof record.productIdentifier === 'string' && record.productIdentifier.trim()
      ? record.productIdentifier.trim()
      : typeof record.product_id === 'string' && record.product_id.trim()
        ? record.product_id.trim()
        : '';
  const transactionIdentifier = collectTransactionCandidateIds(record)[0] ?? '';

  if (!productIdentifier || !transactionIdentifier) {
    return null;
  }

  return {
    productIdentifier,
    transactionIdentifier,
    purchaseDate:
      typeof record.purchaseDate === 'string' && record.purchaseDate.trim()
        ? record.purchaseDate.trim()
        : typeof record.purchase_date === 'string' && record.purchase_date.trim()
          ? record.purchase_date.trim()
          : null,
  };
}

async function verifyRevenueCatNonSubscriptionTransaction(
  purchase: MobileBillingPurchaseReceipt
) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error('RevenueCat API key is not configured.');
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(purchase.appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error('RevenueCat purchase verification failed.');
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        subscriber?: {
          non_subscriptions?: Record<string, unknown[]>;
        };
      }
    | null;

  const matchingTransactions = Array.isArray(
    payload?.subscriber?.non_subscriptions?.[purchase.productId]
  )
    ? payload?.subscriber?.non_subscriptions?.[purchase.productId] ?? []
    : [];

  const verifiedTransaction = matchingTransactions
    .map((entry) => normalizeRevenueCatTransactionRecord(entry))
    .filter((entry): entry is RevenueCatTransactionRecord => entry !== null)
    .find(
      (entry) =>
        entry.productIdentifier === purchase.productId &&
        entry.transactionIdentifier === purchase.transactionId
    );

  if (!verifiedTransaction) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }

  return verifiedTransaction;
}

async function buildMobileDraftCreationResponse(origin: string, pageSlug: string) {
  const passwordRecord = await getServerClientPasswordRecord(pageSlug);
  if (!passwordRecord) {
    throw new Error('The page password record could not be loaded.');
  }

  const [config, displayPeriod, ticketCount] = await Promise.all([
    getServerEditableInvitationPageConfig(pageSlug),
    getServerInvitationPageDisplayPeriodSummary(pageSlug),
    getServerPageTicketCount(pageSlug),
  ]);

  if (!config) {
    throw new Error('The created invitation page could not be loaded.');
  }

  const { value, expiresAt } = createClientEditorSessionValue(
    {
      pageSlug,
      passwordVersion: passwordRecord.passwordVersion,
    },
    {
      ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
    }
  );
  const links = buildMobileInvitationLinks(origin, pageSlug, config.defaultTheme);

  return {
    session: {
      token: value,
      expiresAt,
      pageSlug,
    },
    dashboardPage: config,
    page: {
      slug: config.slug,
      displayName: config.config.displayName,
      published: config.published,
      productTier: config.productTier,
      defaultTheme: config.defaultTheme,
      features: config.features,
      ticketCount,
      displayPeriod: {
        enabled: displayPeriod.enabled,
        startDate: displayPeriod.startDate?.toISOString() ?? null,
        endDate: displayPeriod.endDate?.toISOString() ?? null,
      },
    },
    links,
  };
}

export async function fulfillServerMobilePageCreationPurchase(
  origin: string,
  purchase: MobileBillingPurchaseReceipt,
  input: MobileBillingCreatePageInput
) {
  const definition = getMobileBillingProductDefinition(purchase.productId);
  if (!definition || definition.kind !== 'pageCreation') {
    throw new Error('The selected Google Play product is not a page creation SKU.');
  }

  const verifiedTransaction = await verifyRevenueCatNonSubscriptionTransaction(purchase);
  const lockRecord = await acquireBillingFulfillmentLock(purchase, definition);

  if (lockRecord.status === 'fulfilled' && lockRecord.createdPageSlug) {
    return buildMobileDraftCreationResponse(origin, lockRecord.createdPageSlug);
  }

  if (lockRecord.status === 'processing' && lockRecord.createdPageSlug) {
    return buildMobileDraftCreationResponse(origin, lockRecord.createdPageSlug);
  }

  try {
    const seedSlug = getAllWeddingPageSeeds()[0]?.slug ?? '';
    const defaultTheme = isInvitationThemeKey(input.theme)
      ? input.theme
      : DEFAULT_INVITATION_THEME;

    const createdDraft = await createServerInvitationPageDraftFromSeed({
      seedSlug,
      slugBase: input.slugBase,
      groomName: input.groomKoreanName,
      brideName: input.brideKoreanName,
      published: false,
      defaultTheme,
      productTier: definition.productTier,
      initialDisplayPeriodMonths: 6,
    });

    await setServerClientPassword(createdDraft.slug, input.password);

    await updateBillingFulfillmentRecord(purchase.transactionId, {
      status: 'fulfilled',
      fulfilledAt: new Date().toISOString(),
      purchaseDate: verifiedTransaction.purchaseDate,
      createdPageSlug: createdDraft.slug,
      targetPageSlug: createdDraft.slug,
    });

    return buildMobileDraftCreationResponse(origin, createdDraft.slug);
  } catch (error) {
    await markBillingFulfillmentFailed(
      purchase.transactionId,
      error instanceof Error ? error.message : 'Failed to fulfill page creation purchase.'
    );
    throw error;
  }
}

export async function fulfillServerMobileTicketPackPurchase(
  purchase: MobileBillingPurchaseReceipt,
  targetPageSlug: string,
  targetToken: string
) {
  const definition = getMobileBillingProductDefinition(purchase.productId);
  if (!definition || definition.kind !== 'ticketPack') {
    throw new Error('The selected Google Play product is not a ticket pack SKU.');
  }

  const verifiedTransaction = await verifyRevenueCatNonSubscriptionTransaction(purchase);
  const lockRecord = await acquireBillingFulfillmentLock(purchase, definition);

  if (lockRecord.status === 'fulfilled') {
    return {
      success: true,
      ticketCount: await getServerPageTicketCount(targetPageSlug),
    };
  }

  const authorizedSession = await getAuthorizedClientEditorSession(
    targetPageSlug,
    targetToken
  );
  if (!authorizedSession) {
    throw new Error('Target invitation page authorization failed.');
  }

  try {
    const ticketCount = await adjustServerPageTicketCount(
      targetPageSlug,
      definition.ticketCount
    );

    await updateBillingFulfillmentRecord(purchase.transactionId, {
      status: 'fulfilled',
      fulfilledAt: new Date().toISOString(),
      purchaseDate: verifiedTransaction.purchaseDate,
      targetPageSlug,
      grantedTicketCount: definition.ticketCount,
    });

    return {
      success: true,
      ticketCount,
    };
  } catch (error) {
    await markBillingFulfillmentFailed(
      purchase.transactionId,
      error instanceof Error ? error.message : 'Failed to fulfill ticket pack purchase.'
    );
    throw error;
  }
}

export async function getServerMobileBillingFulfillmentRecord(transactionId: string) {
  return getBillingFulfillmentRecord(transactionId);
}
