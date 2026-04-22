import { DEFAULT_INVITATION_THEME, type InvitationThemeKey } from '@/lib/invitationThemes';
import type { InvitationPageSeed } from '@/types/invitationPage';

import { ensureClientFirestoreState } from './clientFirestoreRepositoryCore';
import {
  buildInvitationPageConfigRecordFromClientEventContent,
  buildInvitationPageDisplayPeriodRecordFromClientEventSummary,
  buildInvitationPageRegistryRecordFromClientEventSummary,
  normalizeClientEventSlugIndexRecord,
  normalizeClientEventSummaryRecord,
  type ClientEventSlugIndexRecord,
  type ClientEventSummaryRecord,
} from './mappers/clientEventRepositoryMapper';
import type { StoredInvitationPageConfigRecord } from './mappers/invitationPageRepositoryMapper';

export const CLIENT_EVENTS_COLLECTION = 'events';
export const CLIENT_EVENT_CONTENT_COLLECTION = 'content';
export const CLIENT_EVENT_CURRENT_CONTENT_DOC = 'current';
export const CLIENT_EVENT_SLUG_INDEX_COLLECTION = 'eventSlugIndex';
export const CLIENT_EVENT_SECRETS_COLLECTION = 'eventSecrets';
export const CLIENT_EVENT_COMMENTS_COLLECTION = 'comments';

const DEFAULT_EVENT_TYPE = 'wedding';

export interface ResolvedClientEventRecord {
  requestedSlug: string;
  slugIndex: ClientEventSlugIndexRecord | null;
  summary: ClientEventSummaryRecord;
}

export interface ClientEventSummaryWriteInput {
  slug: string;
  displayName?: string | null;
  summary?: string | null;
  published?: boolean;
  defaultTheme?: InvitationThemeKey | null;
  supportedVariants?: string[];
  featureFlags?: Record<string, unknown> | null;
  hasCustomConfig?: boolean;
  displayStartAt?: Date | null;
  displayEndAt?: Date | null;
  ticketBalance?: number | null;
  commentCount?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  seedSourceSlug?: string | null;
  eventType?: string | null;
}

function normalizePageSlug(pageSlug: string) {
  return pageSlug.trim();
}

function readSupportedVariants(config: InvitationPageSeed) {
  return Object.keys(config.variants ?? {}).filter((entry) => entry.trim().length > 0);
}

export function buildInitialClientEventIdFromSlug(pageSlug: string) {
  return `evt_${pageSlug}`;
}

export function buildClientEventCommentCollectionPath(eventId: string) {
  return `${CLIENT_EVENTS_COLLECTION}/${eventId}/${CLIENT_EVENT_COMMENTS_COLLECTION}`;
}

async function findClientEventSummaryById(
  eventId: string,
  fallbackSlug?: string | null
) {
  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, CLIENT_EVENTS_COLLECTION, eventId)
  );
  if (!snapshot.exists()) {
    return null;
  }

  return normalizeClientEventSummaryRecord(
    snapshot.id,
    snapshot.data() as Record<string, unknown>,
    fallbackSlug
  );
}

export async function findClientEventSlugIndexBySlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(
      firestore.db,
      CLIENT_EVENT_SLUG_INDEX_COLLECTION,
      normalizedPageSlug
    )
  );
  if (!snapshot.exists()) {
    return null;
  }

  return normalizeClientEventSlugIndexRecord(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );
}

async function findClientEventSummaryBySlugQuery(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.modules.getDocs(
    firestore.modules.query(
      firestore.modules.collection(firestore.db, CLIENT_EVENTS_COLLECTION),
      firestore.modules.where('slug', '==', normalizedPageSlug)
    )
  );
  const matchedDoc = snapshot.docs[0] ?? null;
  if (!matchedDoc) {
    return null;
  }

  return normalizeClientEventSummaryRecord(
    matchedDoc.id,
    matchedDoc.data() as Record<string, unknown>,
    normalizedPageSlug
  );
}

async function repairClientEventSlugIndexBySlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const repairedSummary =
    (await findClientEventSummaryBySlugQuery(normalizedPageSlug)) ??
    (await findClientEventSummaryById(
      buildInitialClientEventIdFromSlug(normalizedPageSlug),
      normalizedPageSlug
    ));

  if (!repairedSummary) {
    return null;
  }

  const slugIndex = await syncClientEventSlugIndexRecord({
    slug: normalizedPageSlug,
    eventId: repairedSummary.eventId,
    eventType: repairedSummary.eventType,
    status: 'active',
    targetSlug: null,
    createdAt: repairedSummary.createdAt,
    updatedAt: repairedSummary.updatedAt,
  });

  return {
    requestedSlug: normalizedPageSlug,
    slugIndex,
    summary: repairedSummary,
  } satisfies ResolvedClientEventRecord;
}

async function resolveClientStoredEventBySlugInternal(
  pageSlug: string,
  visited: Set<string>
): Promise<ResolvedClientEventRecord | null> {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug || visited.has(normalizedPageSlug)) {
    return null;
  }

  visited.add(normalizedPageSlug);

  const slugIndex = await findClientEventSlugIndexBySlug(normalizedPageSlug);
  if (!slugIndex) {
    return repairClientEventSlugIndexBySlug(normalizedPageSlug);
  }

  if (
    slugIndex.status === 'redirect' &&
    slugIndex.targetSlug &&
    slugIndex.targetSlug !== normalizedPageSlug
  ) {
    return resolveClientStoredEventBySlugInternal(slugIndex.targetSlug, visited);
  }

  if (slugIndex.status !== 'active' && slugIndex.status !== 'redirect') {
    return null;
  }

  const summary = await findClientEventSummaryById(slugIndex.eventId, slugIndex.slug);
  if (!summary) {
    return null;
  }

  return {
    requestedSlug: normalizedPageSlug,
    slugIndex,
    summary,
  };
}

export async function resolveClientStoredEventBySlug(pageSlug: string) {
  return resolveClientStoredEventBySlugInternal(pageSlug, new Set<string>());
}

export async function fetchClientEventContentBySlug(pageSlug: string) {
  const resolvedEvent = await resolveClientStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(
      firestore.db,
      CLIENT_EVENTS_COLLECTION,
      resolvedEvent.summary.eventId,
      CLIENT_EVENT_CONTENT_COLLECTION,
      CLIENT_EVENT_CURRENT_CONTENT_DOC
    )
  );
  if (!snapshot.exists()) {
    return null;
  }

  return buildInvitationPageConfigRecordFromClientEventContent(
    resolvedEvent.summary,
    snapshot.data() as Record<string, unknown>
  );
}

export async function listClientEventSummaries() {
  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return [];
  }

  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collection(firestore.db, CLIENT_EVENTS_COLLECTION)
  );

  return snapshot.docs
    .map((docSnapshot: { id: string; data: () => Record<string, unknown> }) =>
      normalizeClientEventSummaryRecord(docSnapshot.id, docSnapshot.data())
    )
    .filter(
      (record: ClientEventSummaryRecord | null): record is ClientEventSummaryRecord =>
        record !== null && typeof record.slug === 'string' && record.slug.length > 0
    );
}

export async function syncClientEventSlugIndexRecord(input: {
  slug: string;
  eventId: string;
  eventType?: string | null;
  status?: string;
  targetSlug?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}) {
  const normalizedPageSlug = normalizePageSlug(input.slug);
  const normalizedEventId = input.eventId.trim();
  if (!normalizedPageSlug || !normalizedEventId) {
    throw new Error('Page slug is required.');
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  const existing = await findClientEventSlugIndexBySlug(normalizedPageSlug);
  if (existing && existing.eventId !== normalizedEventId) {
    throw new Error('This page slug is already linked to another event.');
  }

  const now = input.updatedAt ?? new Date();
  const nextStatus = input.status?.trim() || existing?.status || 'active';
  const normalizedTargetSlug = normalizePageSlug(input.targetSlug ?? '');

  await firestore.modules.setDoc(
    firestore.modules.doc(
      firestore.db,
      CLIENT_EVENT_SLUG_INDEX_COLLECTION,
      normalizedPageSlug
    ),
    {
      slug: normalizedPageSlug,
      eventId: normalizedEventId,
      eventType: input.eventType?.trim() || existing?.eventType || DEFAULT_EVENT_TYPE,
      status: nextStatus,
      targetSlug:
        nextStatus === 'redirect'
          ? normalizedTargetSlug || existing?.targetSlug || null
          : null,
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );

  return {
    slug: normalizedPageSlug,
    eventId: normalizedEventId,
    eventType: input.eventType?.trim() || existing?.eventType || DEFAULT_EVENT_TYPE,
    status: nextStatus,
    targetSlug:
      nextStatus === 'redirect'
        ? normalizedTargetSlug || existing?.targetSlug || null
        : null,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  } satisfies ClientEventSlugIndexRecord;
}

export async function upsertClientEventSummary(
  input: ClientEventSummaryWriteInput
) {
  const normalizedPageSlug = normalizePageSlug(input.slug);
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  const resolvedEvent = await resolveClientStoredEventBySlug(normalizedPageSlug);
  const eventId =
    resolvedEvent?.summary.eventId ?? buildInitialClientEventIdFromSlug(normalizedPageSlug);
  const existingSummary =
    resolvedEvent?.summary ??
    (await findClientEventSummaryById(eventId, normalizedPageSlug));
  const now = input.updatedAt ?? new Date();
  const nextCreatedAt = existingSummary?.createdAt ?? input.createdAt ?? now;
  const nextDisplayStartAt =
    input.displayStartAt !== undefined
      ? input.displayStartAt
      : existingSummary?.visibility?.displayStartAt ??
        existingSummary?.displayPeriod?.startDate ??
        null;
  const nextDisplayEndAt =
    input.displayEndAt !== undefined
      ? input.displayEndAt
      : existingSummary?.visibility?.displayEndAt ??
        existingSummary?.displayPeriod?.endDate ??
        null;
  const nextPublished =
    input.published ??
    existingSummary?.visibility?.published ??
    existingSummary?.published ??
    true;
  const nextSupportedVariants =
    input.supportedVariants && input.supportedVariants.length > 0
      ? input.supportedVariants
      : existingSummary?.supportedVariants ?? [];
  const nextTicketBalance =
    input.ticketBalance !== undefined
      ? input.ticketBalance
      : existingSummary?.ticketBalance ?? existingSummary?.ticketCount ?? 0;
  const nextCommentCount =
    input.commentCount !== undefined
      ? input.commentCount
      : existingSummary?.commentCount ?? 0;
  const nextDefaultTheme =
    input.defaultTheme ??
    existingSummary?.defaultTheme ??
    DEFAULT_INVITATION_THEME;
  const nextHasCustomConfig =
    input.hasCustomConfig ?? existingSummary?.hasCustomContent ?? false;

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, CLIENT_EVENTS_COLLECTION, eventId),
    {
      eventId,
      eventType: input.eventType?.trim() || existingSummary?.eventType || DEFAULT_EVENT_TYPE,
      slug: normalizedPageSlug,
      status: existingSummary?.status ?? 'active',
      title: input.displayName ?? existingSummary?.title ?? null,
      displayName: input.displayName ?? existingSummary?.displayName ?? null,
      summary: input.summary ?? existingSummary?.summary ?? null,
      supportedVariants: nextSupportedVariants,
      published: nextPublished,
      defaultTheme: nextDefaultTheme,
      featureFlags: input.featureFlags ?? existingSummary?.featureFlags ?? {},
      stats: {
        commentCount: nextCommentCount,
        ticketCount: nextTicketBalance,
        ticketBalance: nextTicketBalance,
      },
      visibility: {
        published: nextPublished,
        displayStartAt: nextDisplayStartAt,
        displayEndAt: nextDisplayEndAt,
      },
      displayPeriod:
        nextDisplayStartAt || nextDisplayEndAt
          ? {
              isActive: Boolean(nextDisplayStartAt && nextDisplayEndAt),
              startDate: nextDisplayStartAt,
              endDate: nextDisplayEndAt,
            }
          : {
              isActive: false,
              startDate: null,
              endDate: null,
            },
      hasCustomConfig: nextHasCustomConfig,
      hasCustomContent: nextHasCustomConfig,
      createdAt: nextCreatedAt,
      updatedAt: now,
      lastSavedAt: existingSummary?.lastSavedAt ?? now,
      version: (existingSummary?.version ?? 0) + 1,
      migratedFromPageSlug: existingSummary?.migratedFromPageSlug ?? input.seedSourceSlug ?? normalizedPageSlug,
    },
    { merge: true }
  );

  const slugIndex = await syncClientEventSlugIndexRecord({
    slug: normalizedPageSlug,
    eventId,
    eventType: input.eventType ?? existingSummary?.eventType ?? DEFAULT_EVENT_TYPE,
    status: 'active',
    targetSlug: null,
    createdAt: resolvedEvent?.slugIndex?.createdAt ?? nextCreatedAt,
    updatedAt: now,
  });

  const nextSummary =
    (await findClientEventSummaryById(eventId, normalizedPageSlug)) ??
    ({
      eventId,
      slug: normalizedPageSlug,
      eventType: input.eventType?.trim() || DEFAULT_EVENT_TYPE,
      status: 'active',
      title: input.displayName ?? null,
      displayName: input.displayName ?? null,
      summary: input.summary ?? null,
      supportedVariants: nextSupportedVariants,
      published: nextPublished,
      defaultTheme: nextDefaultTheme,
      featureFlags: input.featureFlags ?? {},
      commentCount: nextCommentCount,
      ticketCount: nextTicketBalance,
      ticketBalance: nextTicketBalance,
      visibility: {
        published: nextPublished,
        displayStartAt: nextDisplayStartAt,
        displayEndAt: nextDisplayEndAt,
      },
      displayPeriod:
        nextDisplayStartAt || nextDisplayEndAt
          ? {
              isActive: Boolean(nextDisplayStartAt && nextDisplayEndAt),
              startDate: nextDisplayStartAt,
              endDate: nextDisplayEndAt,
            }
          : null,
      hasCustomContent: nextHasCustomConfig,
      createdAt: nextCreatedAt,
      updatedAt: now,
      lastSavedAt: now,
      version: (existingSummary?.version ?? 0) + 1,
      migratedFromPageSlug: input.seedSourceSlug ?? normalizedPageSlug,
    } satisfies ClientEventSummaryRecord);

  return {
    requestedSlug: normalizedPageSlug,
    slugIndex,
    summary: nextSummary,
  } satisfies ResolvedClientEventRecord;
}

export async function saveClientEventContentBySlug(input: {
  slug: string;
  config: InvitationPageSeed;
  seedSourceSlug?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}) {
  const normalizedPageSlug = normalizePageSlug(input.slug);
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  const nextSupportedVariants = readSupportedVariants(input.config);
  const resolvedEvent = await upsertClientEventSummary({
    slug: normalizedPageSlug,
    displayName: input.config.displayName,
    summary: input.config.description,
    published: true,
    defaultTheme: DEFAULT_INVITATION_THEME,
    supportedVariants: nextSupportedVariants,
    featureFlags:
      typeof input.config.features === 'object' && input.config.features !== null
        ? (input.config.features as Record<string, unknown>)
        : {},
    hasCustomConfig: true,
    createdAt: input.createdAt ?? null,
    updatedAt: input.updatedAt ?? new Date(),
    seedSourceSlug: input.seedSourceSlug ?? null,
  });

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  const now = input.updatedAt ?? new Date();
  await firestore.modules.setDoc(
    firestore.modules.doc(
      firestore.db,
      CLIENT_EVENTS_COLLECTION,
      resolvedEvent.summary.eventId,
      CLIENT_EVENT_CONTENT_COLLECTION,
      CLIENT_EVENT_CURRENT_CONTENT_DOC
    ),
    {
      schemaVersion: 1,
      eventType: resolvedEvent.summary.eventType,
      slug: normalizedPageSlug,
      content: input.config,
      themeState: {
        defaultTheme: resolvedEvent.summary.defaultTheme,
        variants: input.config.variants ?? {},
      },
      productTier: input.config.productTier ?? null,
      featureFlags:
        typeof input.config.features === 'object' && input.config.features !== null
          ? input.config.features
          : {},
      seedSourceSlug: input.seedSourceSlug ?? null,
      createdAt: input.createdAt ?? resolvedEvent.summary.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );

  return resolvedEvent;
}

export async function listClientEventRegistryMap() {
  const summaryMap = new Map<string, ReturnType<typeof buildInvitationPageRegistryRecordFromClientEventSummary>>();
  const eventSummaries = await listClientEventSummaries();
  eventSummaries.forEach((summary: ClientEventSummaryRecord) => {
    summaryMap.set(summary.slug, buildInvitationPageRegistryRecordFromClientEventSummary(summary));
  });
  return summaryMap;
}

export async function listClientEventDisplayPeriodMap() {
  const periodMap = new Map<string, ReturnType<typeof buildInvitationPageDisplayPeriodRecordFromClientEventSummary>>();
  const eventSummaries = await listClientEventSummaries();
  eventSummaries.forEach((summary: ClientEventSummaryRecord) => {
    const period = buildInvitationPageDisplayPeriodRecordFromClientEventSummary(summary);
    if (period) {
      periodMap.set(summary.slug, period);
    }
  });
  return periodMap;
}

export async function listClientEventContentMap() {
  const configMap = new Map<string, StoredInvitationPageConfigRecord>();
  const eventSummaries = await listClientEventSummaries();

  await Promise.all(
    eventSummaries.map(async (summary: ClientEventSummaryRecord) => {
      const content = await fetchClientEventContentBySlug(summary.slug);
      if (content) {
        configMap.set(summary.slug, content);
      }
    })
  );

  return configMap;
}
