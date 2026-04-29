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

import {
  authorizeMobileClientEditorToken,
  buildMissingMobileClientEditorPermissionError,
  buildMobileInvitationLinks,
  hasMobileClientEditorPermission,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
  resolveMobileClientEditorPermissions,
} from './clientEditorMobileApi';
import {
  getServerClientPasswordRecord,
  setServerClientPassword,
} from './clientPasswordServerService';
import {
  createServerInvitationPageDraftFromSeed,
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from './invitationPageServerService';
import {
  adjustServerPageTicketCount,
  getServerPageTicketCount,
} from './pageTicketServerService';
import { recordMobileTicketPackAssignedToEvent } from './customerWalletServerService';
import {
  firestoreBillingFulfillmentRepository,
  type BillingFulfillmentPurchaseInput,
  type BillingFulfillmentRecord,
} from './repositories/billingFulfillmentRepository';
import {
  firestoreEventRepository,
  resolveStoredEventBySlug,
} from './repositories/eventRepository';

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
  ownerUid: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
};

type RevenueCatTransactionRecord = {
  purchaseDate: string | null;
  productIdentifier: string;
  transactionIdentifier: string;
};

function getRevenueCatApiKey() {
  return process.env.REVENUECAT_SERVER_API_KEY?.trim() ?? '';
}

function isMockBillingFulfillmentAllowed() {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.MOBILE_BILLING_ALLOW_MOCK === 'true'
  );
}

function buildMockTransactionRecord(
  purchase: MobileBillingPurchaseReceipt
): RevenueCatTransactionRecord | null {
  if (!purchase.transactionId.startsWith('mock_') || !isMockBillingFulfillmentAllowed()) {
    return null;
  }

  return {
    productIdentifier: purchase.productId,
    transactionIdentifier: purchase.transactionId,
    purchaseDate: new Date().toISOString(),
  };
}

async function getBillingFulfillmentRecord(transactionId: string) {
  return firestoreBillingFulfillmentRepository.findByTransactionId(transactionId);
}

async function acquireBillingFulfillmentLock(
  purchase: MobileBillingPurchaseReceipt,
  definition: MobileBillingProductDefinition
) {
  return firestoreBillingFulfillmentRepository.acquireLock(
    purchase as BillingFulfillmentPurchaseInput,
    definition.kind
  );
}

async function updateBillingFulfillmentRecord(
  transactionId: string,
  patch: Partial<BillingFulfillmentRecord>
) {
  await firestoreBillingFulfillmentRepository.update(transactionId, patch);
}

async function markBillingFulfillmentFailed(transactionId: string, error: string) {
  await firestoreBillingFulfillmentRepository.markFailed(transactionId, error);
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
  const mockTransaction = buildMockTransactionRecord(purchase);
  if (mockTransaction) {
    return mockTransaction;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error('REVENUECAT_SERVER_API_KEY is required for purchase verification.');
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
  const permissions = resolveMobileClientEditorPermissions();

  return {
    permissions,
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
    const resolvedCreatedEvent = await firestoreEventRepository.assignOwnerBySlug({
      pageSlug: createdDraft.slug,
      ownerUid: input.ownerUid,
      ownerEmail: input.ownerEmail ?? null,
      ownerDisplayName: input.ownerDisplayName ?? null,
    });

    await updateBillingFulfillmentRecord(purchase.transactionId, {
      status: 'fulfilled',
      fulfilledAt: new Date().toISOString(),
      purchaseDate: verifiedTransaction.purchaseDate,
      createdPageSlug: createdDraft.slug,
      targetPageSlug: createdDraft.slug,
      eventId: resolvedCreatedEvent?.summary.eventId ?? null,
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

  const authorizedSession = await authorizeMobileClientEditorToken(targetPageSlug, targetToken);
  if (!authorizedSession) {
    throw new Error('Target invitation page authorization failed.');
  }

  if (!hasMobileClientEditorPermission(authorizedSession.permissions, 'canManageTickets')) {
    throw new Error(buildMissingMobileClientEditorPermissionError('canManageTickets'));
  }

  try {
    const resolvedTargetEvent = await resolveStoredEventBySlug(targetPageSlug);
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
      eventId: resolvedTargetEvent?.summary.eventId ?? null,
    });

    const ownerUid = resolvedTargetEvent?.summary.ownerUid?.trim() ?? '';
    if (ownerUid) {
      try {
        await recordMobileTicketPackAssignedToEvent({
          ownerUid,
          appUserId: purchase.appUserId,
          transactionId: purchase.transactionId,
          productId: purchase.productId,
          ticketCount: definition.ticketCount,
          targetPageSlug,
          eventId: resolvedTargetEvent?.summary.eventId ?? null,
        });
      } catch (ledgerError) {
        console.error(
          '[mobileBillingServerService] failed to record ticket pack wallet ledger',
          ledgerError
        );
      }
    }

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
