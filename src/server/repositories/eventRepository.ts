import 'server-only';

import { DEFAULT_EVENT_TYPE, normalizeEventTypeKey } from '@/lib/eventTypes';
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

export const EVENTS_COLLECTION = 'events';
export const EVENT_CONTENT_COLLECTION = 'content';
export const EVENT_CURRENT_CONTENT_DOC = 'current';
export const EVENT_SLUG_INDEX_COLLECTION = 'eventSlugIndex';

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
  listSummaries(): Promise<EventSummaryRecord[]>;
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
  assignOwnerBySlug(input: {
    pageSlug: string;
    ownerUid: string;
    ownerEmail?: string | null;
    ownerDisplayName?: string | null;
  }): Promise<ResolvedEventRecord>;
  clearOwnerBySlug(pageSlug: string): Promise<ResolvedEventRecord>;
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

function buildEventSummaryFromRepositoryState(options: {
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
    eventType: normalizeEventTypeKey(
      content?.config.eventType,
      existing?.eventType ?? DEFAULT_EVENT_TYPE
    ),
    status: existing?.status ?? 'active',
    ownerUid: existing?.ownerUid ?? null,
    ownerEmail: existing?.ownerEmail ?? null,
    ownerDisplayName: existing?.ownerDisplayName ?? null,
    title: content?.config.displayName ?? existing?.title ?? null,
    displayName: content?.config.displayName ?? existing?.displayName ?? null,
    summary: content?.config.description ?? existing?.summary ?? null,
    supportedVariants:
      Object.keys(content?.config.variants ?? {}).filter((entry) => entry.trim().length > 0)
        .length > 0
        ? Object.keys(content?.config.variants ?? {}).filter((entry) => entry.trim().length > 0)
        : existing?.supportedVariants ?? [],
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
    ticketBalance: existing?.ticketBalance ?? existing?.ticketCount ?? null,
    visibility: {
      published: registry?.published ?? existing?.visibility?.published ?? existing?.published ?? true,
      displayStartAt:
        displayPeriod?.startDate ??
        existing?.visibility?.displayStartAt ??
        existing?.displayPeriod?.startDate ??
        null,
      displayEndAt:
        displayPeriod?.endDate ??
        existing?.visibility?.displayEndAt ??
        existing?.displayPeriod?.endDate ??
        null,
    },
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
    version: (existing?.version ?? 0) + 1,
    migratedFromPageSlug: existing?.migratedFromPageSlug ?? pageSlug,
  } satisfies EventSummaryRecord;
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

export async function listStoredEventSummaries() {
  const db = getServerFirestore();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection(EVENTS_COLLECTION).get();
  return snapshot.docs
    .map((docSnapshot) =>
      normalizeEventSummaryRecord(docSnapshot.id, docSnapshot.data() ?? {})
    )
    .filter((record): record is EventSummaryRecord => Boolean(record?.slug))
    .sort((left, right) => {
      const rightTime = right.updatedAt?.getTime() ?? 0;
      const leftTime = left.updatedAt?.getTime() ?? 0;
      return rightTime - leftTime;
    });
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
    eventType: normalizeEventTypeKey(input.eventType, DEFAULT_EVENT_TYPE),
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

async function fetchEventRegistryBySlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  return resolvedEvent
    ? buildInvitationPageRegistryRecordFromEventSummary(resolvedEvent.summary)
    : null;
}

async function fetchEventDisplayPeriodBySlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  return resolvedEvent
    ? buildInvitationPageDisplayPeriodRecordFromEventSummary(resolvedEvent.summary)
    : null;
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
        status: summary.status ?? 'active',
        ownerUid: summary.ownerUid,
        ownerEmail: summary.ownerEmail,
        ownerDisplayName: summary.ownerDisplayName,
        title: summary.title,
        displayName: summary.displayName,
        summary: summary.summary,
        published: summary.published,
        defaultTheme: summary.defaultTheme,
        supportedVariants: summary.supportedVariants,
        featureFlags: summary.featureFlags,
        stats: {
          commentCount: summary.commentCount,
          ticketCount: summary.ticketCount,
          ticketBalance: summary.ticketBalance ?? summary.ticketCount,
        },
        visibility: {
          published: summary.visibility?.published ?? summary.published,
          displayStartAt:
            summary.visibility?.displayStartAt ?? summary.displayPeriod?.startDate ?? null,
          displayEndAt:
            summary.visibility?.displayEndAt ?? summary.displayPeriod?.endDate ?? null,
        },
        displayPeriod: summary.displayPeriod
          ? {
              isActive: summary.displayPeriod.isActive,
              startDate: summary.displayPeriod.startDate,
              endDate: summary.displayPeriod.endDate,
            }
          : null,
        hasCustomConfig: summary.hasCustomContent,
        hasCustomContent: summary.hasCustomContent,
        createdAt: summary.createdAt ?? now,
        updatedAt: summary.updatedAt ?? now,
        lastSavedAt: summary.lastSavedAt,
        version: summary.version ?? 1,
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
      : await fetchEventRegistryBySlug(normalizedPageSlug);
  const content =
    options.content !== undefined
      ? options.content
      : await fetchEventContentBySlug(normalizedPageSlug);
  const displayPeriod =
    options.displayPeriod !== undefined
      ? options.displayPeriod
      : await fetchEventDisplayPeriodBySlug(normalizedPageSlug);

  const summary = buildEventSummaryFromRepositoryState({
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

export async function assignEventOwnerBySlug(input: {
  pageSlug: string;
  ownerUid: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
}) {
  const normalizedPageSlug = normalizePageSlug(input.pageSlug);
  const normalizedOwnerUid = input.ownerUid.trim();
  if (!normalizedPageSlug || !normalizedOwnerUid) {
    throw new Error('Valid page slug and owner uid are required.');
  }

  const mirroredEvent = await ensureEventMirrorBySlug(normalizedPageSlug, {
    forceCreate: true,
    now: new Date(),
  });
  if (!mirroredEvent) {
    throw new Error('Failed to resolve the event for owner assignment.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const now = new Date();
  await db
    .collection(EVENTS_COLLECTION)
    .doc(mirroredEvent.summary.eventId)
    .set(
      {
        ownerUid: normalizedOwnerUid,
        ownerEmail: input.ownerEmail?.trim() || null,
        ownerDisplayName: input.ownerDisplayName?.trim() || null,
        updatedAt: now,
      },
      { merge: true }
    );

  const updatedSummary = await findStoredEventSummaryById(
    mirroredEvent.summary.eventId,
    mirroredEvent.summary.slug
  );
  if (!updatedSummary) {
    throw new Error('Failed to reload the event after owner assignment.');
  }

  return {
    requestedSlug: mirroredEvent.requestedSlug,
    slugIndex: mirroredEvent.slugIndex,
    summary: updatedSummary,
  } satisfies ResolvedEventRecord;
}

export async function clearEventOwnerBySlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('Valid page slug is required.');
  }

  const mirroredEvent = await ensureEventMirrorBySlug(normalizedPageSlug, {
    forceCreate: true,
    now: new Date(),
  });
  if (!mirroredEvent) {
    throw new Error('Failed to resolve the event for owner removal.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const now = new Date();
  await db
    .collection(EVENTS_COLLECTION)
    .doc(mirroredEvent.summary.eventId)
    .set(
      {
        ownerUid: null,
        ownerEmail: null,
        ownerDisplayName: null,
        updatedAt: now,
      },
      { merge: true }
    );

  const updatedSummary = await findStoredEventSummaryById(
    mirroredEvent.summary.eventId,
    mirroredEvent.summary.slug
  );
  if (!updatedSummary) {
    throw new Error('Failed to reload the event after owner removal.');
  }

  return {
    requestedSlug: mirroredEvent.requestedSlug,
    slugIndex: mirroredEvent.slugIndex,
    summary: updatedSummary,
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

    return Boolean(await resolveStoredEventBySlug(normalizedPageSlug));
  },

  async listSummaries() {
    return listStoredEventSummaries();
  },

  async findRegistryBySlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return null;
    }

    return fetchEventRegistryBySlug(normalizedPageSlug);
  },

  async findContentBySlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return null;
    }

    return fetchEventContentBySlug(normalizedPageSlug);
  },

  async findDisplayPeriodBySlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return null;
    }

    return fetchEventDisplayPeriodBySlug(normalizedPageSlug);
  },

  async upsertRegistryBySlug(pageSlug, payload) {
    const slugGuard = await ensureSlugIndexWriteAllowed(pageSlug);
    const normalizedPageSlug = slugGuard.normalizedPageSlug;
    if (!getServerFirestore()) {
      throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const existing = await fetchEventRegistryBySlug(normalizedPageSlug);
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
    await ensureEventMirrorBySlug(normalizedPageSlug, {
      registry: nextRegistry,
      forceCreate: true,
      now,
    });
  },

  async upsertDisplayPeriodBySlug(pageSlug, payload) {
    const slugGuard = await ensureSlugIndexWriteAllowed(pageSlug);
    const normalizedPageSlug = slugGuard.normalizedPageSlug;
    if (payload.isActive && (!payload.startDate || !payload.endDate)) {
      throw new Error('Display period dates are required.');
    }

    if (!getServerFirestore()) {
      throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const existing = await fetchEventDisplayPeriodBySlug(normalizedPageSlug);
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
    await ensureEventMirrorBySlug(normalizedPageSlug, {
      displayPeriod: nextDisplayPeriod,
      forceCreate: true,
      now,
    });
  },

  async saveContentBySlug(input) {
    const slugGuard = await ensureSlugIndexWriteAllowed(input.slug);
    const normalizedPageSlug = slugGuard.normalizedPageSlug;
    if (!getServerFirestore()) {
      throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const existing = await fetchEventContentBySlug(normalizedPageSlug);
    const now = input.updatedAt ?? new Date();
    const nextContentRecord: StoredInvitationPageConfigRecord = {
      slug: normalizedPageSlug,
      config: input.config,
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
      seedSourceSlug: input.seedSourceSlug?.trim() || null,
    };
    const mirroredEvent = await ensureEventMirrorBySlug(normalizedPageSlug, {
      content: nextContentRecord,
      forceCreate: true,
      now,
    });
    if (!mirroredEvent) {
      throw new Error('Failed to mirror event summary for content write.');
    }

    await writeEventContentMirror(mirroredEvent.summary, nextContentRecord, now);
  },

  async assignOwnerBySlug(input) {
    return assignEventOwnerBySlug(input);
  },

  async clearOwnerBySlug(pageSlug) {
    return clearEventOwnerBySlug(pageSlug);
  },
};
