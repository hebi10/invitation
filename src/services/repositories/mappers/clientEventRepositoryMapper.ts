import { getWeddingPageBySlug } from '@/config/weddingPages';
import { normalizeInvitationTheme } from '@/lib/invitationPageNormalization';
import { normalizeInvitationConfigSeed } from '@/lib/invitationPagePersistence';
import type {
  InvitationPageDisplayPeriodRecord,
  InvitationPageRegistryRecord,
} from '@/lib/invitationPagePersistence';
import type { InvitationThemeKey } from '@/types/invitationPage';

import { toClientRepositoryDate } from '../clientFirestoreRepositoryCore';
import type { StoredInvitationPageConfigRecord } from './invitationPageRepositoryMapper';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface ClientEventSlugIndexRecord {
  slug: string;
  eventId: string;
  eventType: string | null;
  status: string;
  targetSlug: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ClientEventSummaryRecord {
  eventId: string;
  slug: string;
  eventType: string;
  status: string | null;
  title: string | null;
  displayName: string | null;
  summary: string | null;
  supportedVariants: string[];
  published: boolean;
  defaultTheme: InvitationThemeKey;
  featureFlags: Record<string, unknown>;
  commentCount: number | null;
  ticketCount: number | null;
  ticketBalance: number | null;
  visibility: {
    published: boolean;
    displayStartAt: Date | null;
    displayEndAt: Date | null;
  } | null;
  displayPeriod: {
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
  } | null;
  hasCustomContent: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastSavedAt: Date | null;
  version: number | null;
  migratedFromPageSlug: string | null;
}

export function normalizeClientEventSlugIndexRecord(
  docId: string,
  data: Record<string, unknown>
): ClientEventSlugIndexRecord | null {
  const slug = readNonEmptyString(data.slug) ?? readNonEmptyString(docId);
  const eventId = readNonEmptyString(data.eventId);

  if (!slug || !eventId) {
    return null;
  }

  return {
    slug,
    eventId,
    eventType: readNonEmptyString(data.eventType),
    status: readNonEmptyString(data.status) ?? 'active',
    targetSlug: readNonEmptyString(data.targetSlug),
    createdAt: toClientRepositoryDate(data.createdAt, new Date()),
    updatedAt: toClientRepositoryDate(data.updatedAt, new Date()),
  };
}

export function normalizeClientEventSummaryRecord(
  eventId: string,
  data: Record<string, unknown>,
  fallbackSlug?: string | null
): ClientEventSummaryRecord | null {
  const slug =
    readNonEmptyString(data.slug) ??
    readNonEmptyString(data.migratedFromPageSlug) ??
    readNonEmptyString(fallbackSlug) ??
    readNonEmptyString(eventId);

  if (!slug) {
    return null;
  }

  const visibilityInput = isRecord(data.visibility) ? data.visibility : null;
  const displayPeriodInput = isRecord(data.displayPeriod) ? data.displayPeriod : null;
  const statsInput = isRecord(data.stats) ? data.stats : null;
  const visibilityPublished =
    typeof visibilityInput?.published === 'boolean'
      ? visibilityInput.published
      : data.published !== false;
  const displayStartAt =
    toClientRepositoryDate(visibilityInput?.displayStartAt, new Date(0)).getTime() === 0
      ? null
      : toClientRepositoryDate(visibilityInput?.displayStartAt, new Date());
  const displayEndAt =
    toClientRepositoryDate(visibilityInput?.displayEndAt, new Date(0)).getTime() === 0
      ? null
      : toClientRepositoryDate(visibilityInput?.displayEndAt, new Date());
  const supportedVariants = Array.isArray(data.supportedVariants)
    ? data.supportedVariants.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
    : [];

  return {
    eventId: readNonEmptyString(data.eventId) ?? eventId,
    slug,
    eventType: readNonEmptyString(data.eventType) ?? 'wedding',
    status: readNonEmptyString(data.status),
    title: readNonEmptyString(data.title),
    displayName: readNonEmptyString(data.displayName),
    summary: readNonEmptyString(data.summary),
    supportedVariants,
    published: visibilityPublished,
    defaultTheme: normalizeInvitationTheme(data.defaultTheme),
    featureFlags: isRecord(data.featureFlags) ? data.featureFlags : {},
    commentCount: readFiniteNumber(statsInput?.commentCount ?? null),
    ticketCount: readFiniteNumber(statsInput?.ticketCount ?? null),
    ticketBalance: readFiniteNumber(statsInput?.ticketBalance ?? statsInput?.ticketCount ?? null),
    visibility: {
      published: visibilityPublished,
      displayStartAt,
      displayEndAt,
    },
    displayPeriod:
      displayPeriodInput || displayStartAt || displayEndAt
        ? {
            isActive:
              displayPeriodInput?.isActive === true ||
              Boolean(displayStartAt && displayEndAt),
            startDate:
              (displayPeriodInput?.startDate
                ? toClientRepositoryDate(displayPeriodInput.startDate, new Date())
                : null) ?? displayStartAt,
            endDate:
              (displayPeriodInput?.endDate
                ? toClientRepositoryDate(displayPeriodInput.endDate, new Date())
                : null) ?? displayEndAt,
          }
        : null,
    hasCustomContent: data.hasCustomContent === true || data.hasCustomConfig === true,
    createdAt:
      data.createdAt != null ? toClientRepositoryDate(data.createdAt, new Date()) : null,
    updatedAt:
      data.updatedAt != null ? toClientRepositoryDate(data.updatedAt, new Date()) : null,
    lastSavedAt:
      data.lastSavedAt != null ? toClientRepositoryDate(data.lastSavedAt, new Date()) : null,
    version: readFiniteNumber(data.version),
    migratedFromPageSlug: readNonEmptyString(data.migratedFromPageSlug),
  };
}

export function buildInvitationPageRegistryRecordFromClientEventSummary(
  record: ClientEventSummaryRecord
): InvitationPageRegistryRecord {
  return {
    docId: record.eventId,
    pageSlug: record.slug,
    published: record.published,
    defaultTheme: record.defaultTheme,
    hasCustomConfig: record.hasCustomContent,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function buildInvitationPageDisplayPeriodRecordFromClientEventSummary(
  record: ClientEventSummaryRecord
): InvitationPageDisplayPeriodRecord | null {
  if (!record.displayPeriod) {
    return null;
  }

  return {
    docId: record.eventId,
    pageSlug: record.slug,
    isActive: record.displayPeriod.isActive,
    startDate: record.displayPeriod.startDate,
    endDate: record.displayPeriod.endDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function buildInvitationPageConfigRecordFromClientEventContent(
  eventSummary: ClientEventSummaryRecord,
  data: Record<string, unknown>
): StoredInvitationPageConfigRecord | null {
  const contentInput = isRecord(data.content) ? data.content : data;
  const themeStateInput = isRecord(data.themeState) ? data.themeState : null;
  const contentCandidate = {
    ...contentInput,
    slug:
      readNonEmptyString(contentInput.slug) ??
      readNonEmptyString(data.slug) ??
      eventSummary.slug,
    defaultTheme:
      readNonEmptyString(themeStateInput?.defaultTheme) ??
      readNonEmptyString(data.defaultTheme) ??
      eventSummary.defaultTheme,
    variants: isRecord(themeStateInput?.variants)
      ? themeStateInput.variants
      : contentInput.variants,
    productTier:
      readNonEmptyString(data.productTier) ?? readNonEmptyString(contentInput.productTier),
    features: isRecord(data.featureFlags)
      ? data.featureFlags
      : isRecord(contentInput.features)
        ? contentInput.features
        : undefined,
  } satisfies Record<string, unknown>;

  const config = normalizeInvitationConfigSeed(
    eventSummary.slug,
    contentCandidate,
    getWeddingPageBySlug(eventSummary.slug) ?? undefined
  );
  if (!config) {
    return null;
  }

  return {
    slug: config.slug,
    config,
    createdAt:
      data.createdAt != null
        ? toClientRepositoryDate(data.createdAt, new Date())
        : eventSummary.createdAt,
    updatedAt:
      data.updatedAt != null
        ? toClientRepositoryDate(data.updatedAt, new Date())
        : eventSummary.lastSavedAt ?? eventSummary.updatedAt,
    seedSourceSlug: readNonEmptyString(data.seedSourceSlug) ?? eventSummary.migratedFromPageSlug,
  };
}
