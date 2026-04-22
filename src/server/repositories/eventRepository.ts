import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { normalizeInvitationPageSlugInput, stripUndefinedDeep } from '@/lib/invitationPagePersistence';
import { DEFAULT_INVITATION_THEME, type InvitationThemeKey } from '@/lib/invitationThemes';
import type {
  InvitationPageSeed,
} from '@/types/invitationPage';

import { getServerFirestore } from '../firebaseAdmin';
import {
  buildInvitationPageConfigRecordFromEventContent,
  buildInvitationPageDisplayPeriodRecordFromEventSummary,
  buildInvitationPageRegistryRecordFromEventSummary,
  normalizeEventSlugIndexRecord,
  normalizeEventSummaryRecord,
  type EventSlugIndexRecord,
  type EventSummaryRecord,
} from './eventReadThroughDtos';
import {
  assertEventSlugIndexOwnership,
  isReservedEventSlugIndexStatus,
  type EventSlugIndexStatus,
} from './eventSlugIndex';
import { isLegacyReadFallbackEnabled } from './eventRolloutConfig';
import { loadReadThroughValue } from './readThrough';
import { executeWriteThrough } from './writeThrough';

const DISPLAY_PERIOD_COLLECTION = 'display-periods';
const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';

export const EVENTS_COLLECTION = 'events';
export const EVENT_CONTENT_COLLECTION = 'content';
export const EVENT_CURRENT_CONTENT_DOC = 'current';
export const EVENT_SLUG_INDEX_COLLECTION = 'eventSlugIndex';
const DEFAULT_EVENT_TYPE = 'wedding';

export interface InvitationPageDisplayPeriodRecord {
  docId: string;
  pageSlug: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface InvitationPageRegistryRecord {
  docId: string;
  pageSlug: string;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  hasCustomConfig: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoredInvitationPageConfigRecord {
  slug: string;
  config: InvitationPageSeed;
  createdAt: Date | null;
  updatedAt: Date | null;
  seedSourceSlug: string | null;
}

export interface ResolvedEventRecord {
  requestedSlug: string;
  slugIndex: EventSlugIndexRecord | null;
  summary: EventSummaryRecord;
}

interface EnsureEventMirrorOptions {
  registry?: InvitationPageRegistryRecord | null;
  content?: StoredInvitationPageConfigRecord | null;
  displayPeriod?: InvitationPageDisplayPeriodRecord | null;
  forceCreate?: boolean;
  now?: Date;
}

export interface EventRepository {
  isAvailable(): boolean;
  isSlugTaken(pageSlug: string): Promise<boolean>;
  findRegistryBySlug(pageSlug: string): Promise<InvitationPageRegistryRecord | null>;
  findContentBySlug(pageSlug: string): Promise<StoredInvitationPageConfigRecord | null>;
  findDisplayPeriodBySlug(
    pageSlug: string
  ): Promise<InvitationPageDisplayPeriodRecord | null>;
  upsertRegistryBySlug(
    pageSlug: string,
    payload: {
      published?: boolean;
      defaultTheme?: InvitationThemeKey;
      hasCustomConfig?: boolean;
    }
  ): Promise<void>;
  upsertDisplayPeriodBySlug(
    pageSlug: string,
    payload: {
      isActive: boolean;
      startDate: Date | null;
      endDate: Date | null;
    }
  ): Promise<void>;
  saveContentBySlug(input: {
    slug: string;
    config: InvitationPageSeed;
    seedSourceSlug?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }): Promise<void>;
}

function normalizePageSlug(pageSlug: string) {
  return normalizeInvitationPageSlugInput(pageSlug);
}

export function buildInitialEventIdFromSlug(pageSlug: string) {
  return `evt_${pageSlug}`;
}

function pickDefaultThemeFromContent(
  content: StoredInvitationPageConfigRecord | null | undefined
): InvitationThemeKey | null {
  const variants = content?.config?.variants;
  if (!variants || typeof variants !== 'object') {
    return null;
  }

  const availableVariant = Object.entries(variants).find(([, value]) => {
    return typeof value === 'object' && value !== null && value.available !== false;
  });

  return (availableVariant?.[0] as InvitationThemeKey | undefined) ?? null;
}

function maxDate(...dates: Array<Date | null | undefined>) {
  const availableDates = dates.filter((entry): entry is Date => entry instanceof Date);
  if (!availableDates.length) {
    return null;
  }

  return new Date(Math.max(...availableDates.map((entry) => entry.getTime())));
}

function buildEventSummaryFromLegacyState(options: {
  pageSlug: string;
  eventId: string;
  existing?: EventSummaryRecord | null;
  registry?: InvitationPageRegistryRecord | null;
  content?: StoredInvitationPageConfigRecord | null;
  displayPeriod?: InvitationPageDisplayPeriodRecord | null;
  forceCreate?: boolean;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  const pageSlug = options.pageSlug;
  const existing = options.existing ?? null;
  const registry = options.registry ?? null;
  const content = options.content ?? null;
  const displayPeriod = options.displayPeriod ?? null;

  if (!existing && !registry && !content && !displayPeriod && !options.forceCreate) {
    return null;
  }

  return {
    eventId: options.eventId,
    slug: pageSlug,
    eventType: existing?.eventType ?? DEFAULT_EVENT_TYPE,
    displayName: content?.config.displayName ?? existing?.displayName ?? null,
    summary: content?.config.description ?? existing?.summary ?? null,
    published: registry?.published ?? existing?.published ?? true,
    defaultTheme:
      registry?.defaultTheme ??
      existing?.defaultTheme ??
      pickDefaultThemeFromContent(content) ??
      DEFAULT_INVITATION_THEME,
    featureFlags:
      (content?.config.features
        ? (stripUndefinedDeep(content.config.features) as Record<string, unknown>)
        : null) ??
      existing?.featureFlags ??
      {},
    commentCount: existing?.commentCount ?? null,
    ticketCount: existing?.ticketCount ?? null,
    displayPeriod:
      displayPeriod || existing?.displayPeriod
        ? {
            isActive: displayPeriod?.isActive ?? existing?.displayPeriod?.isActive ?? false,
            startDate: displayPeriod?.startDate ?? existing?.displayPeriod?.startDate ?? null,
            endDate: displayPeriod?.endDate ?? existing?.displayPeriod?.endDate ?? null,
          }
        : null,
    hasCustomContent:
      registry?.hasCustomConfig ?? existing?.hasCustomContent ?? Boolean(content),
    createdAt:
      existing?.createdAt ??
      registry?.createdAt ??
      content?.createdAt ??
      displayPeriod?.createdAt ??
      now,
    updatedAt:
      maxDate(
        now,
        existing?.updatedAt,
        registry?.updatedAt,
        content?.updatedAt,
        displayPeriod?.updatedAt
      ) ?? now,
    lastSavedAt: content?.updatedAt ?? existing?.lastSavedAt ?? null,
    migratedFromPageSlug: existing?.migratedFromPageSlug ?? pageSlug,
  } satisfies EventSummaryRecord;
}

async function fetchLegacySlugTaken(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return false;
  }

  const [configSnapshot, registrySnapshot] = await Promise.all([
    db.collection(PAGE_CONFIG_COLLECTION).doc(pageSlug).get(),
    db.collection(PAGE_REGISTRY_COLLECTION).doc(pageSlug).get(),
  ]);

  return configSnapshot.exists || registrySnapshot.exists;
}

async function fetchLegacyRegistryBySlug(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection(PAGE_REGISTRY_COLLECTION).doc(pageSlug).get();
  if (!snapshot.exists) {
    return null;
  }

  const { normalizeInvitationPageRegistryRecord } = await import(
    '@/lib/invitationPagePersistence'
  );
  return normalizeInvitationPageRegistryRecord(pageSlug, snapshot.data() ?? {});
}

async function fetchLegacyContentBySlug(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection(PAGE_CONFIG_COLLECTION).doc(pageSlug).get();
  if (!snapshot.exists) {
    return null;
  }

  const { getWeddingPageBySlug } = await import('@/config/weddingPages');
  const { normalizeInvitationConfigSeed } = await import('@/lib/invitationPagePersistence');
  const { toDate } = await import('@/lib/invitationPageNormalization');
  const config = normalizeInvitationConfigSeed(
    pageSlug,
    snapshot.data() ?? {},
    getWeddingPageBySlug(pageSlug) ?? undefined
  );
  if (!config) {
    return null;
  }

  const data = snapshot.data() ?? {};
  return {
    slug: config.slug,
    config,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    seedSourceSlug:
      typeof data.seedSourceSlug === 'string' && data.seedSourceSlug.trim()
        ? data.seedSourceSlug.trim()
        : null,
  } satisfies StoredInvitationPageConfigRecord;
}

async function fetchLegacyDisplayPeriodBySlug(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const { normalizeInvitationPageDisplayPeriod } = await import(
    '@/lib/invitationPagePersistence'
  );

  const directSnapshot = await db.collection(DISPLAY_PERIOD_COLLECTION).doc(pageSlug).get();
  if (directSnapshot.exists) {
    const normalized = normalizeInvitationPageDisplayPeriod(
      pageSlug,
      directSnapshot.data() ?? {}
    );
    if (normalized) {
      return normalized;
    }
  }

  const snapshot = await db
    .collection(DISPLAY_PERIOD_COLLECTION)
    .where('pageSlug', '==', pageSlug)
    .get();

  let preferred: InvitationPageDisplayPeriodRecord | null = null;
  snapshot.docs.forEach((docSnapshot) => {
    const normalized = normalizeInvitationPageDisplayPeriod(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    if (
      !preferred ||
      (normalized.docId === normalized.pageSlug && preferred.docId !== preferred.pageSlug) ||
      (normalized.updatedAt?.getTime() ?? 0) > (preferred.updatedAt?.getTime() ?? 0)
    ) {
      preferred = normalized;
    }
  });

  return preferred;
}

async function findEventSummaryById(
  eventId: string,
  fallbackSlug?: string | null
): Promise<EventSummaryRecord | null> {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection(EVENTS_COLLECTION).doc(eventId).get();
  if (!snapshot.exists) {
    return null;
  }

  return normalizeEventSummaryRecord(snapshot.id, snapshot.data() ?? {}, fallbackSlug);
}

export async function findStoredEventSummaryById(
  eventId: string,
  fallbackSlug?: string | null
) {
  return findEventSummaryById(eventId, fallbackSlug);
}

async function findEventSummaryBySlugQuery(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(EVENTS_COLLECTION)
    .where('slug', '==', pageSlug)
    .limit(1)
    .get();
  const matched = snapshot.docs[0] ?? null;
  if (!matched) {
    return null;
  }

  return normalizeEventSummaryRecord(matched.id, matched.data() ?? {}, pageSlug);
}

export async function findEventSlugIndexBySlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(EVENT_SLUG_INDEX_COLLECTION)
    .doc(normalizedPageSlug)
    .get();
  if (!snapshot.exists) {
    return null;
  }

  return normalizeEventSlugIndexRecord(snapshot.id, snapshot.data() ?? {});
}

async function findRepairableEventSummaryBySlug(pageSlug: string) {
  const summaryBySlug = await findEventSummaryBySlugQuery(pageSlug);
  if (summaryBySlug) {
    return summaryBySlug;
  }

  const derivedSummary = await findEventSummaryById(
    buildInitialEventIdFromSlug(pageSlug),
    pageSlug
  );
  if (!derivedSummary) {
    return null;
  }

  if (
    derivedSummary.slug === pageSlug ||
    derivedSummary.migratedFromPageSlug === pageSlug
  ) {
    return derivedSummary;
  }

  return null;
}

export async function syncEventSlugIndexRecord(input: {
  slug: string;
  eventId: string;
  eventType?: string | null;
  status?: EventSlugIndexStatus;
  targetSlug?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}) {
  const normalizedPageSlug = normalizePageSlug(input.slug);
  const normalizedEventId = input.eventId.trim();
  if (!normalizedPageSlug || !normalizedEventId) {
    throw new Error('Valid slug and event id are required to sync event slug index.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const existingRecord = await findEventSlugIndexBySlug(normalizedPageSlug);
  assertEventSlugIndexOwnership({
    slug: normalizedPageSlug,
    nextEventId: normalizedEventId,
    existingRecord,
  });

  const now = input.updatedAt ?? new Date();
  const nextStatus = input.status ?? existingRecord?.status ?? 'active';
  const normalizedTargetSlug = normalizePageSlug(input.targetSlug ?? '');
  if (nextStatus === 'redirect' && !normalizedTargetSlug && !existingRecord?.targetSlug) {
    throw new Error('Target slug is required for redirect slug index records.');
  }

  const nextRecord = {
    slug: normalizedPageSlug,
    eventId: normalizedEventId,
    eventType: input.eventType?.trim() || DEFAULT_EVENT_TYPE,
    status: nextStatus,
    targetSlug:
      normalizedTargetSlug ||
      (nextStatus === 'redirect' ? existingRecord?.targetSlug ?? null : null),
    createdAt: existingRecord?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  } satisfies EventSlugIndexRecord & { eventType: string };

  await db
    .collection(EVENT_SLUG_INDEX_COLLECTION)
    .doc(normalizedPageSlug)
    .set(nextRecord, { merge: true });

  return {
    slug: nextRecord.slug,
    eventId: nextRecord.eventId,
    eventType: nextRecord.eventType,
    status: nextRecord.status,
    targetSlug: nextRecord.targetSlug,
    createdAt: nextRecord.createdAt,
    updatedAt: nextRecord.updatedAt,
  } satisfies EventSlugIndexRecord;
}

async function ensureSlugIndexWriteAllowed(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('Valid page slug is required.');
  }

  const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
  const nextEventId =
    resolvedEvent?.summary.eventId ?? buildInitialEventIdFromSlug(normalizedPageSlug);
  const existingRecord =
    resolvedEvent?.slugIndex ?? (await findEventSlugIndexBySlug(normalizedPageSlug));

  assertEventSlugIndexOwnership({
    slug: normalizedPageSlug,
    nextEventId,
    existingRecord,
  });

  return {
    normalizedPageSlug,
    eventId: nextEventId,
    resolvedEvent,
  };
}

async function repairEventSlugIndexBySlug(
  pageSlug: string
): Promise<ResolvedEventRecord | null> {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const summary = await findRepairableEventSummaryBySlug(normalizedPageSlug);
  if (!summary) {
    return null;
  }

  const slugIndex = await syncEventSlugIndexRecord({
    slug: normalizedPageSlug,
    eventId: summary.eventId,
    eventType: summary.eventType,
    status: 'active',
    targetSlug: null,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  });

  return {
    requestedSlug: normalizedPageSlug,
    slugIndex,
    summary,
  };
}

async function resolveStoredEventBySlugInternal(
  pageSlug: string,
  visited: Set<string>
): Promise<ResolvedEventRecord | null> {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug || visited.has(normalizedPageSlug)) {
    return null;
  }

  visited.add(normalizedPageSlug);

  const slugIndex = await findEventSlugIndexBySlug(normalizedPageSlug);
  if (!slugIndex) {
    return repairEventSlugIndexBySlug(normalizedPageSlug);
  }

  if (
    slugIndex.status === 'redirect' &&
    slugIndex.targetSlug &&
    slugIndex.targetSlug !== normalizedPageSlug
  ) {
    return resolveStoredEventBySlugInternal(slugIndex.targetSlug, visited);
  }

  if (!isReservedEventSlugIndexStatus(slugIndex.status)) {
    return null;
  }

  const summary = await findEventSummaryById(slugIndex.eventId, slugIndex.slug);
  if (!summary) {
    return null;
  }

  return {
    requestedSlug: normalizedPageSlug,
    slugIndex,
    summary,
  };
}

export async function resolveStoredEventBySlug(pageSlug: string) {
  return resolveStoredEventBySlugInternal(pageSlug, new Set<string>());
}

export async function resolveEventIdBySlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  return resolvedEvent?.summary.eventId ?? null;
}

async function fetchEventContentBySlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(EVENT_CONTENT_COLLECTION)
    .doc(EVENT_CURRENT_CONTENT_DOC)
    .get();
  if (!snapshot.exists) {
    return null;
  }

  return buildInvitationPageConfigRecordFromEventContent(
    resolvedEvent.summary,
    snapshot.data() ?? {}
  );
}

async function writeEventSummaryMirror(
  resolvedEvent: ResolvedEventRecord | null,
  summary: EventSummaryRecord,
  now: Date
) {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  await db
    .collection(EVENTS_COLLECTION)
    .doc(summary.eventId)
    .set(
      {
        eventId: summary.eventId,
        eventType: summary.eventType,
        slug: summary.slug,
        displayName: summary.displayName,
        summary: summary.summary,
        published: summary.published,
        defaultTheme: summary.defaultTheme,
        featureFlags: summary.featureFlags,
        stats: {
          commentCount: summary.commentCount,
          ticketCount: summary.ticketCount,
        },
        displayPeriod: summary.displayPeriod
          ? {
              isActive: summary.displayPeriod.isActive,
              startDate: summary.displayPeriod.startDate,
              endDate: summary.displayPeriod.endDate,
            }
          : null,
        hasCustomContent: summary.hasCustomContent,
        createdAt: summary.createdAt ?? now,
        updatedAt: summary.updatedAt ?? now,
        lastSavedAt: summary.lastSavedAt,
        migratedFromPageSlug: summary.migratedFromPageSlug ?? summary.slug,
      },
      { merge: true }
    );

  await syncEventSlugIndexRecord({
    slug: summary.slug,
    eventId: summary.eventId,
    eventType: summary.eventType,
    status: 'active',
    targetSlug: null,
    createdAt: resolvedEvent?.slugIndex?.createdAt ?? now,
    updatedAt: now,
  });
}

async function writeEventContentMirror(
  eventSummary: EventSummaryRecord,
  contentRecord: StoredInvitationPageConfigRecord,
  now: Date
) {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  await db
    .collection(EVENTS_COLLECTION)
    .doc(eventSummary.eventId)
    .collection(EVENT_CONTENT_COLLECTION)
    .doc(EVENT_CURRENT_CONTENT_DOC)
    .set(
      {
        schemaVersion: 1,
        eventType: eventSummary.eventType,
        slug: eventSummary.slug,
        content: stripUndefinedDeep(contentRecord.config),
        themeState: {
          defaultTheme: eventSummary.defaultTheme,
          variants: stripUndefinedDeep(contentRecord.config.variants ?? {}),
        },
        productTier: contentRecord.config.productTier ?? null,
        featureFlags: stripUndefinedDeep(contentRecord.config.features ?? {}),
        seedSourceSlug: contentRecord.seedSourceSlug,
        createdAt: contentRecord.createdAt ?? now,
        updatedAt: contentRecord.updatedAt ?? now,
      },
      { merge: true }
    );
}

export async function ensureEventMirrorBySlug(
  pageSlug: string,
  options: EnsureEventMirrorOptions = {}
) {
  const slugGuard = await ensureSlugIndexWriteAllowed(pageSlug);
  const normalizedPageSlug = slugGuard.normalizedPageSlug;
  const existingEvent = slugGuard.resolvedEvent;
  const eventId = slugGuard.eventId;
  const now = options.now ?? new Date();

  const registry =
    options.registry !== undefined
      ? options.registry
      : await fetchLegacyRegistryBySlug(normalizedPageSlug);
  const content =
    options.content !== undefined
      ? options.content
      : await fetchLegacyContentBySlug(normalizedPageSlug);
  const displayPeriod =
    options.displayPeriod !== undefined
      ? options.displayPeriod
      : await fetchLegacyDisplayPeriodBySlug(normalizedPageSlug);

  const summary = buildEventSummaryFromLegacyState({
    pageSlug: normalizedPageSlug,
    eventId,
    existing: existingEvent?.summary ?? null,
    registry,
    content,
    displayPeriod,
    forceCreate: options.forceCreate,
    now,
  });
  if (!summary) {
    return existingEvent;
  }

  await writeEventSummaryMirror(existingEvent, summary, now);

  return {
    requestedSlug: normalizedPageSlug,
    slugIndex:
      (await findEventSlugIndexBySlug(summary.slug)) ??
      ({
        slug: summary.slug,
        eventId: summary.eventId,
        eventType: summary.eventType,
        status: 'active',
        targetSlug: null,
        createdAt: existingEvent?.slugIndex?.createdAt ?? now,
        updatedAt: now,
      } satisfies EventSlugIndexRecord),
    summary,
  } satisfies ResolvedEventRecord;
}

export const firestoreEventRepository: EventRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async isSlugTaken(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return false;
    }

    const preferred = await resolveStoredEventBySlug(normalizedPageSlug);
    if (preferred) {
      return true;
    }

    if (!isLegacyReadFallbackEnabled()) {
      return false;
    }

    return fetchLegacySlugTaken(normalizedPageSlug);
  },

  async findRegistryBySlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return null;
    }

    return loadReadThroughValue({
      preferred: async () => {
        const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
        return resolvedEvent
          ? buildInvitationPageRegistryRecordFromEventSummary(resolvedEvent.summary)
          : null;
      },
      fallback: () => fetchLegacyRegistryBySlug(normalizedPageSlug),
    });
  },

  async findContentBySlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return null;
    }

    return loadReadThroughValue({
      preferred: () => fetchEventContentBySlug(normalizedPageSlug),
      fallback: () => fetchLegacyContentBySlug(normalizedPageSlug),
    });
  },

  async findDisplayPeriodBySlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return null;
    }

    return loadReadThroughValue({
      preferred: async () => {
        const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
        return resolvedEvent
          ? buildInvitationPageDisplayPeriodRecordFromEventSummary(resolvedEvent.summary)
          : null;
      },
      fallback: () => fetchLegacyDisplayPeriodBySlug(normalizedPageSlug),
    });
  },

  async upsertRegistryBySlug(pageSlug, payload) {
    const slugGuard = await ensureSlugIndexWriteAllowed(pageSlug);
    const normalizedPageSlug = slugGuard.normalizedPageSlug;
    const db = getServerFirestore();
    if (!db) {
      throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const existing = await fetchLegacyRegistryBySlug(normalizedPageSlug);
    const now = new Date();
    const nextRegistry: InvitationPageRegistryRecord = {
      docId: normalizedPageSlug,
      pageSlug: normalizedPageSlug,
      published: payload.published ?? existing?.published ?? true,
      defaultTheme: payload.defaultTheme ?? existing?.defaultTheme ?? DEFAULT_INVITATION_THEME,
      hasCustomConfig: payload.hasCustomConfig ?? existing?.hasCustomConfig ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const docRef = db.collection(PAGE_REGISTRY_COLLECTION).doc(normalizedPageSlug);

    await executeWriteThrough({
      operation: 'upsertEventRegistry',
      pageSlug: normalizedPageSlug,
      eventId: slugGuard.eventId,
      legacyCollection: PAGE_REGISTRY_COLLECTION,
      eventCollection: EVENTS_COLLECTION,
      payload: {
        published: nextRegistry.published,
        defaultTheme: nextRegistry.defaultTheme,
        hasCustomConfig: nextRegistry.hasCustomConfig,
      },
      legacyWrite: async () => {
        await docRef.set(
          {
            pageSlug: normalizedPageSlug,
            published: nextRegistry.published,
            defaultTheme: nextRegistry.defaultTheme,
            hasCustomConfig: nextRegistry.hasCustomConfig,
            createdAt: nextRegistry.createdAt ?? now,
            updatedAt: now,
            editorTokenHash: FieldValue.delete(),
          },
          { merge: true }
        );

        return undefined;
      },
      eventWrite: async () => {
        await ensureEventMirrorBySlug(normalizedPageSlug, {
          registry: nextRegistry,
          forceCreate: true,
          now,
        });

        return undefined;
      },
    });
  },

  async upsertDisplayPeriodBySlug(pageSlug, payload) {
    const slugGuard = await ensureSlugIndexWriteAllowed(pageSlug);
    const normalizedPageSlug = slugGuard.normalizedPageSlug;
    if (payload.isActive && (!payload.startDate || !payload.endDate)) {
      throw new Error('Display period dates are required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const existing = await fetchLegacyDisplayPeriodBySlug(normalizedPageSlug);
    const now = new Date();
    const nextDisplayPeriod: InvitationPageDisplayPeriodRecord = {
      docId: normalizedPageSlug,
      pageSlug: normalizedPageSlug,
      isActive: payload.isActive,
      startDate: payload.isActive ? payload.startDate : null,
      endDate: payload.isActive ? payload.endDate : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const docRef = db.collection(DISPLAY_PERIOD_COLLECTION).doc(normalizedPageSlug);

    await executeWriteThrough({
      operation: 'upsertEventDisplayPeriod',
      pageSlug: normalizedPageSlug,
      eventId: slugGuard.eventId,
      legacyCollection: DISPLAY_PERIOD_COLLECTION,
      eventCollection: EVENTS_COLLECTION,
      payload: {
        isActive: nextDisplayPeriod.isActive,
        startDate: nextDisplayPeriod.startDate,
        endDate: nextDisplayPeriod.endDate,
      },
      legacyWrite: async () => {
        await docRef.set(
          {
            pageSlug: normalizedPageSlug,
            isActive: nextDisplayPeriod.isActive,
            startDate: nextDisplayPeriod.startDate,
            endDate: nextDisplayPeriod.endDate,
            createdAt: nextDisplayPeriod.createdAt ?? now,
            updatedAt: now,
          },
          { merge: true }
        );

        return undefined;
      },
      eventWrite: async () => {
        await ensureEventMirrorBySlug(normalizedPageSlug, {
          displayPeriod: nextDisplayPeriod,
          forceCreate: true,
          now,
        });

        return undefined;
      },
    });
  },

  async saveContentBySlug(input) {
    const slugGuard = await ensureSlugIndexWriteAllowed(input.slug);
    const normalizedPageSlug = slugGuard.normalizedPageSlug;
    const db = getServerFirestore();
    if (!db) {
      throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const existing = await fetchLegacyContentBySlug(normalizedPageSlug);
    const now = input.updatedAt ?? new Date();
    const nextContentRecord: StoredInvitationPageConfigRecord = {
      slug: normalizedPageSlug,
      config: input.config,
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
      seedSourceSlug: input.seedSourceSlug?.trim() || null,
    };
    const payload = stripUndefinedDeep(input.config);

    await executeWriteThrough({
      operation: 'saveEventContent',
      pageSlug: normalizedPageSlug,
      eventId: slugGuard.eventId,
      legacyCollection: PAGE_CONFIG_COLLECTION,
      eventCollection: `${EVENTS_COLLECTION}/${EVENT_CONTENT_COLLECTION}`,
      payload: {
        slug: normalizedPageSlug,
        seedSourceSlug: nextContentRecord.seedSourceSlug,
        productTier: input.config.productTier ?? null,
      },
      legacyWrite: async () => {
        await db
          .collection(PAGE_CONFIG_COLLECTION)
          .doc(normalizedPageSlug)
          .set(
            {
              ...payload,
              ...(nextContentRecord.seedSourceSlug !== null
                ? { seedSourceSlug: nextContentRecord.seedSourceSlug }
                : { seedSourceSlug: FieldValue.delete() }),
              createdAt: nextContentRecord.createdAt ?? now,
              updatedAt: now,
              editorTokenHash: FieldValue.delete(),
            },
            { merge: true }
          );

        return undefined;
      },
      eventWrite: async () => {
        const mirroredEvent = await ensureEventMirrorBySlug(normalizedPageSlug, {
          content: nextContentRecord,
          forceCreate: true,
          now,
        });
        if (!mirroredEvent) {
          throw new Error('Failed to mirror event summary for content write.');
        }

        await writeEventContentMirror(mirroredEvent.summary, nextContentRecord, now);

        return undefined;
      },
    });
  },
};
