import { DEFAULT_INVITATION_PRODUCT_TIER, INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS, INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS, isLegacyMobilePurchaseDate } from '@/lib/invitationProductPolicy';
import 'server-only';

import { verifyGooglePlayOneTimePurchase } from './googlePlayPurchaseVerifier';

import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import { DEFAULT_INVITATION_THEME, isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  type MobileBillingProductDefinition,
  type MobileBillingProductId,
  getMobileBillingProductDefinition,
  MOBILE_BILLING_PAGE_CREATION_PRODUCTS,
} from '@/lib/mobileBillingProducts';
import {
  CLIENT_EDITOR_OWNER_SESSION_VERSION,
} from '@/server/clientEditorSession';

import {
  authorizeMobileClientEditorToken,
  buildMissingMobileClientEditorPermissionError,
  buildMobileInvitationLinks,
  hasMobileClientEditorPermission,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
  createServerBackedMobileClientEditorSession,
  resolveMobileClientEditorPermissions,
} from './clientEditorMobileApi';
import {
  createServerInvitationPageDraftFromSeed,
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from './invitationPageServerService';
import {
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
  purchaseToken?: string;
};

type MobileBillingCreatePageInput = {
  slugBase: string;
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  theme: string;
  ownerUid: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
};

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

async function buildMobileDraftCreationResponse(
  origin: string,
  pageSlug: string,
  options: {
    ownerUid?: string | null;
    eventId?: string | null;
    deviceId?: string | null;
    issuedVia: 'purchase' | 'draft-create' | 'link-token';
  }
) {
  const [config, displayPeriod, ticketCount] = await Promise.all([
    getServerEditableInvitationPageConfig(pageSlug),
    getServerInvitationPageDisplayPeriodSummary(pageSlug),
    getServerPageTicketCount(pageSlug),
  ]);

  if (!config) {
    throw new Error('The created invitation page could not be loaded.');
  }

  const { value, expiresAt, scopes } = await createServerBackedMobileClientEditorSession(
    {
      pageSlug,
      passwordVersion: CLIENT_EDITOR_OWNER_SESSION_VERSION,
      ownerUid: options.ownerUid,
      eventId: options.eventId,
      deviceId: options.deviceId,
      issuedVia: options.issuedVia,
      ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
    },
  );
  const links = buildMobileInvitationLinks(origin, pageSlug, config.defaultTheme);
  const permissions = resolveMobileClientEditorPermissions({ scopes });

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
  input: MobileBillingCreatePageInput & { deviceId?: string | null }
) {
  const definition = getMobileBillingProductDefinition(purchase.productId);
  if (!definition || definition.kind !== 'pageCreation') {
    throw new Error('The selected Google Play product is not a page creation SKU.');
  }

  const verifiedTransaction = await verifyGooglePlayOneTimePurchase(purchase);
  purchase = { ...purchase, transactionId: verifiedTransaction.transactionIdentifier };
  const lock = await acquireBillingFulfillmentLock(purchase, definition);
  const lockRecord = lock.record;

  if (lockRecord.status === 'fulfilled' && lockRecord.createdPageSlug) {
    return buildMobileDraftCreationResponse(origin, lockRecord.createdPageSlug, {
      ownerUid: input.ownerUid,
      eventId: lockRecord.eventId,
      deviceId: input.deviceId,
      issuedVia: 'purchase',
    });
  }

  if (lockRecord.status === 'processing' && lockRecord.createdPageSlug) {
    return buildMobileDraftCreationResponse(origin, lockRecord.createdPageSlug, {
      ownerUid: input.ownerUid,
      eventId: lockRecord.eventId,
      deviceId: input.deviceId,
      issuedVia: 'purchase',
    });
  }

  if (!lock.acquired) {
    if (lockRecord.status === 'failed') {
      throw Object.assign(new Error('This paid invitation requires reconciliation before retrying.'), {
        code: 'billing-fulfillment-requires-review',
      });
    }
    throw new Error('This purchase is already being processed.');
  }

  let fulfillmentRecorded = false;
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
      productTier: DEFAULT_INVITATION_PRODUCT_TIER,
      initialDisplayPeriodMonths: INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS,
    });

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
    fulfillmentRecorded = true;

    return buildMobileDraftCreationResponse(origin, createdDraft.slug, {
      ownerUid: input.ownerUid,
      eventId: resolvedCreatedEvent?.summary.eventId ?? null,
      deviceId: input.deviceId,
      issuedVia: 'purchase',
    });
  } catch (error) {
    // An editor-session/readback failure after the grant must not overwrite its fulfilled state.
    // Retrying this verified receipt can then recover the already-created invitation.
    if (!fulfillmentRecorded) {
      await markBillingFulfillmentFailed(
        purchase.transactionId,
        error instanceof Error ? error.message : 'Failed to fulfill page creation purchase.'
      );
    }
    throw error;
  }
}

function assertLegacyPaidTransactionDate(purchaseDate: string | null) {
  if (isLegacyMobilePurchaseDate(purchaseDate)) return;
  throw Object.assign(
    new Error('신규 연장·티켓 구매는 지원하지 않습니다. 이미 결제했다면 추가 구매하지 말고 고객 문의로 확인해 주세요.'),
    { code: 'billing-fulfillment-requires-review' }
  );
}

export async function fulfillServerMobileTicketPackPurchase(
  purchase: MobileBillingPurchaseReceipt,
  targetPageSlug: string,
  targetToken: string,
  options: { deviceId?: string | null } = {}
) {
  const definition = getMobileBillingProductDefinition(purchase.productId);
  if (!definition || definition.kind !== 'ticketPack') {
    throw new Error('The selected Google Play product is not a ticket pack SKU.');
  }

  const authorizedSession = await authorizeMobileClientEditorToken(targetPageSlug, targetToken, {
    deviceId: options.deviceId,
  });
  if (!authorizedSession) {
    throw new Error('Target invitation page authorization failed.');
  }

  if (!hasMobileClientEditorPermission(authorizedSession.permissions, 'canManageTickets')) {
    throw new Error(buildMissingMobileClientEditorPermissionError('canManageTickets'));
  }

  const verifiedTransaction = await verifyGooglePlayOneTimePurchase(purchase);
  assertLegacyPaidTransactionDate(verifiedTransaction.purchaseDate);
  purchase = { ...purchase, transactionId: verifiedTransaction.transactionIdentifier };
  const resolvedTargetEvent = await resolveStoredEventBySlug(targetPageSlug);
  if (!resolvedTargetEvent) {
    throw new Error('Target invitation page is not available.');
  }
  const ownerUid = authorizedSession.mobileSession?.ownerUid ??
    authorizedSession.session.ownerUid ?? resolvedTargetEvent.summary.ownerUid;
  const result = await firestoreBillingFulfillmentRepository.fulfillTicketPack({
    purchase,
    eventId: authorizedSession.mobileSession?.eventId ??
      authorizedSession.session.eventId ?? resolvedTargetEvent.summary.eventId,
    targetPageSlug: resolvedTargetEvent.summary.slug,
    ownerUid,
    ticketCount: definition.ticketCount,
    purchaseDate: verifiedTransaction.purchaseDate,
  });

  if (result.applied && ownerUid) {
    try {
      await recordMobileTicketPackAssignedToEvent({
        ownerUid,
        appUserId: purchase.appUserId,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        ticketCount: definition.ticketCount,
        targetPageSlug,
        eventId: resolvedTargetEvent.summary.eventId,
      });
    } catch (ledgerError) {
      console.error(
        '[mobileBillingServerService] failed to record ticket pack wallet ledger',
        ledgerError
      );
    }
  }

  return { success: true, ticketCount: result.ticketCount };
}

export async function getServerMobileBillingFulfillmentRecord(transactionId: string) {
  return getBillingFulfillmentRecord(transactionId);
}

// A renewal uses the same published Google Play SKU, but its store transaction
// is bound atomically to exactly one page and the periodExtension purpose.
export async function fulfillServerMobilePeriodExtensionPurchase(
  purchase: MobileBillingPurchaseReceipt,
  targetPageSlug: string,
  ownerUid: string
) {
  if (purchase.productId !== MOBILE_BILLING_PAGE_CREATION_PRODUCTS.premium ||
      purchase.appUserId !== ownerUid) {
    throw new Error('Only a verified premium purchase by the owner can renew a page.');
  }
  const event = await resolveStoredEventBySlug(targetPageSlug);
  if (!event || event.summary.ownerUid !== ownerUid || event.summary.eventType !== 'wedding') {
    throw new Error('The customer does not own this invitation.');
  }
  const verifiedTransaction = await verifyGooglePlayOneTimePurchase(purchase);
  assertLegacyPaidTransactionDate(verifiedTransaction.purchaseDate);
  const result = await firestoreBillingFulfillmentRepository.fulfillPeriodExtension({
    purchase: { ...purchase, transactionId: verifiedTransaction.transactionIdentifier },
    eventId: event.summary.eventId,
    targetPageSlug: event.summary.slug,
    ownerUid,
    purchaseDate: verifiedTransaction.purchaseDate,
  });
  return {
    success: true,
    enabled: result.enabled,
    startDate: result.startDate.toISOString(),
    endDate: result.endDate.toISOString(),
    monthsAdded: INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS,
  };
}
