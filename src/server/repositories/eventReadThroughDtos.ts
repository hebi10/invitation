import { getWeddingPageBySlug } from '@/config/weddingPages';
import { DEFAULT_EVENT_TYPE, normalizeEventTypeKey, type EventTypeKey } from '@/lib/eventTypes';
import {
  normalizeGuestbookCommentStatus,
  readGuestbookCommentDate,
} from '@/lib/guestbookComments';
import { normalizeInvitationTheme, toDate } from '@/lib/invitationPageNormalization';
import {
  normalizeInvitationConfigSeed,
  type InvitationPageDisplayPeriodRecord,
  type InvitationPageRegistryRecord,
} from '@/lib/invitationPagePersistence';
import type {
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';

import {
  normalizeEventSlugIndexStatus,
  type EventSlugIndexStatus,
} from './eventSlugIndex';

export interface EventSlugIndexRecord {
  slug: string;
  eventId: string;
  eventType: EventTypeKey | null;
  status: EventSlugIndexStatus;
  targetSlug: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface EventSummaryRecord {
  eventId: string;
  slug: string;
  eventType: EventTypeKey;
  status: string | null;
  ownerUid: string | null;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
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
  security: {
    hasPassword: boolean;
    passwordVersion: number | null;
    requiresReset: boolean;
    passwordUpdatedAt: Date | null;
  } | null;
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

export interface EventContentRecordDto {
  slug: string;
  config: InvitationPageSeed;
  createdAt: Date | null;
  updatedAt: Date | null;
  seedSourceSlug: string | null;
}

export interface EventSecretRecordDto {
  pageSlug: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number | null;
  passwordVersion: number;
  legacyPassword: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface EventCommentRecordDto {
  id: string;
  pageSlug: string;
  eventId: string | null;
  data: Record<string, unknown>;
}

export type MobileClientEditorLinkTokenPurpose = 'mobile-login';

export interface EventLinkTokenRecordDto {
  id: string;
  pageSlug: string;
  eventId: string | null;
  tokenHash: string;
  purpose: MobileClientEditorLinkTokenPurpose;
  passwordVersion: number;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  lastValidatedAt: Date | null;
  issuedBy: string | null;
  issuedByType: string | null;
}

export interface EventAuditLogRecordDto {
  id: string;
  pageSlug: string;
  eventId: string | null;
  action: string;
  result: 'success' | 'failure';
  sessionPageSlug: string | null;
  reason: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: Date | null;
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMetadataRecord(value: unknown) {
  if (!isRecord(value)) {
    return {} satisfies Record<string, string | number | boolean | null>;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      if (
        typeof entryValue === 'string' ||
        typeof entryValue === 'number' ||
        typeof entryValue === 'boolean' ||
        entryValue === null
      ) {
        return [[key, entryValue]];
      }

      return [];
    })
  ) satisfies Record<string, string | number | boolean | null>;
}

export function normalizeEventSlugIndexRecord(
  docId: string,
  data: Record<string, unknown>
): EventSlugIndexRecord | null {
  const slug = readNonEmptyString(data.slug) ?? readNonEmptyString(docId);
  const eventId = readNonEmptyString(data.eventId);
  const status = normalizeEventSlugIndexStatus(data.status);

  if (!slug || !eventId) {
    return null;
  }

  return {
    slug,
    eventId,
    eventType: readNonEmptyString(data.eventType)
      ? normalizeEventTypeKey(data.eventType, DEFAULT_EVENT_TYPE)
      : null,
    status,
    targetSlug: readNonEmptyString(data.targetSlug),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function normalizeEventSummaryRecord(
  eventId: string,
  data: Record<string, unknown>,
  fallbackSlug?: string | null
): EventSummaryRecord | null {
  const slug =
    readNonEmptyString(data.slug) ??
    readNonEmptyString(data.migratedFromPageSlug) ??
    readNonEmptyString(fallbackSlug) ??
    readNonEmptyString(eventId);

  if (!slug) {
    return null;
  }

  const displayPeriodInput = isRecord(data.displayPeriod) ? data.displayPeriod : null;
  const statsInput = isRecord(data.stats) ? data.stats : null;
  const securityInput = isRecord(data.security) ? data.security : null;
  const visibilityInput = isRecord(data.visibility) ? data.visibility : null;
  const visibilityPublished =
    typeof visibilityInput?.published === 'boolean'
      ? visibilityInput.published
      : data.published !== false;
  const visibilityDisplayStartAt = toDate(visibilityInput?.displayStartAt);
  const visibilityDisplayEndAt = toDate(visibilityInput?.displayEndAt);
  const hasExplicitDisplayPeriodActive =
    displayPeriodInput !== null && typeof displayPeriodInput.isActive === 'boolean';
  const displayPeriodIsActive = hasExplicitDisplayPeriodActive
    ? displayPeriodInput.isActive === true
    : Boolean(visibilityDisplayStartAt && visibilityDisplayEndAt);
  const supportedVariants = Array.isArray(data.supportedVariants)
    ? data.supportedVariants.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
    : [];
  const hasSecuritySummary =
    securityInput !== null &&
    (typeof securityInput.hasPassword === 'boolean' ||
      securityInput.passwordUpdatedAt != null ||
      securityInput.passwordVersion != null ||
      securityInput.requiresReset != null);

  return {
    eventId: readNonEmptyString(data.eventId) ?? eventId,
    slug,
    eventType: normalizeEventTypeKey(data.eventType, DEFAULT_EVENT_TYPE),
    status: readNonEmptyString(data.status),
    ownerUid: readNonEmptyString(data.ownerUid),
    ownerEmail: readNonEmptyString(data.ownerEmail),
    ownerDisplayName: readNonEmptyString(data.ownerDisplayName),
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
    security:
      hasSecuritySummary
        ? {
            hasPassword: securityInput?.hasPassword === true,
            passwordVersion: readFiniteNumber(securityInput?.passwordVersion ?? null),
            requiresReset: securityInput?.requiresReset === true,
            passwordUpdatedAt: toDate(securityInput?.passwordUpdatedAt),
          }
        : null,
    visibility: {
      published: visibilityPublished,
      displayStartAt: visibilityDisplayStartAt,
      displayEndAt: visibilityDisplayEndAt,
    },
    displayPeriod:
      displayPeriodInput || visibilityDisplayStartAt || visibilityDisplayEndAt
      ? {
          isActive: displayPeriodIsActive,
          startDate: toDate(displayPeriodInput?.startDate) ?? visibilityDisplayStartAt,
          endDate: toDate(displayPeriodInput?.endDate) ?? visibilityDisplayEndAt,
        }
      : null,
    hasCustomContent: data.hasCustomContent === true || data.hasCustomConfig === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastSavedAt: toDate(data.lastSavedAt),
    version: readFiniteNumber(data.version),
    migratedFromPageSlug: readNonEmptyString(data.migratedFromPageSlug),
  };
}

export function buildInvitationPageRegistryRecordFromEventSummary(
  record: EventSummaryRecord
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

export function buildInvitationPageDisplayPeriodRecordFromEventSummary(
  record: EventSummaryRecord
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

export function buildInvitationPageConfigRecordFromEventContent(
  eventSummary: EventSummaryRecord,
  data: Record<string, unknown>
): EventContentRecordDto | null {
  const contentInput = isRecord(data.content) ? data.content : data;
  const themeStateInput = isRecord(data.themeState) ? data.themeState : null;
  const contentCandidate = {
    ...contentInput,
    eventType:
      readNonEmptyString(contentInput.eventType) ??
      readNonEmptyString(data.eventType) ??
      eventSummary.eventType,
    slug:
      readNonEmptyString(contentInput.slug) ??
      readNonEmptyString(data.slug) ??
      eventSummary.slug,
    defaultTheme:
      readNonEmptyString(themeStateInput?.defaultTheme) ??
      readNonEmptyString(data.defaultTheme) ??
      eventSummary.defaultTheme,
    variants: isRecord(themeStateInput?.variants)
      ? themeStateInput?.variants
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
    createdAt: toDate(data.createdAt) ?? eventSummary.createdAt,
    updatedAt: toDate(data.updatedAt) ?? eventSummary.lastSavedAt ?? eventSummary.updatedAt,
    seedSourceSlug: readNonEmptyString(data.seedSourceSlug) ?? eventSummary.migratedFromPageSlug,
  };
}

export function buildEventSecretRecordFromEventDoc(
  eventSummary: EventSummaryRecord,
  data: Record<string, unknown>
): EventSecretRecordDto | null {
  const passwordHash = readNonEmptyString(data.passwordHash);
  const passwordSalt = readNonEmptyString(data.passwordSalt);
  const passwordIterations = readFiniteNumber(data.passwordIterations);
  const legacyPassword = readNonEmptyString(data.password);

  if (!legacyPassword && !(passwordHash && passwordSalt && passwordIterations)) {
    return null;
  }

  return {
    pageSlug: readNonEmptyString(data.slug) ?? eventSummary.slug,
    passwordHash,
    passwordSalt,
    passwordIterations,
    passwordVersion: readFiniteNumber(data.passwordVersion) ?? 1,
    legacyPassword,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function buildEventCommentRecordFromEventDoc(
  eventSummary: EventSummaryRecord,
  commentId: string,
  data: Record<string, unknown>
): EventCommentRecordDto {
  const pageSlug = readNonEmptyString(data.slug) ?? readNonEmptyString(data.pageSlug) ?? eventSummary.slug;
  const status = normalizeGuestbookCommentStatus(data.status, data.deleted);

  return {
    id: commentId,
    pageSlug,
    eventId: eventSummary.eventId,
    data: {
      ...data,
      pageSlug,
      slug: pageSlug,
      status,
      deleted: status === 'pending_delete',
      hiddenAt: readGuestbookCommentDate(data.hiddenAt),
      deletedAt: readGuestbookCommentDate(data.deletedAt),
      scheduledDeleteAt: readGuestbookCommentDate(data.scheduledDeleteAt),
      restoredAt: readGuestbookCommentDate(data.restoredAt),
      createdAt: readGuestbookCommentDate(data.createdAt),
    },
  };
}

export function buildEventLinkTokenRecordFromEventDoc(
  eventSummary: EventSummaryRecord,
  tokenId: string,
  data: Record<string, unknown>
): EventLinkTokenRecordDto | null {
  const tokenHash = readNonEmptyString(data.tokenHash);
  const createdAt = toDate(data.createdAt);
  const expiresAt = toDate(data.expiresAt);
  const purpose = data.purpose === 'mobile-login' ? data.purpose : null;
  const passwordVersion = readFiniteNumber(data.passwordVersion);

  if (!tokenHash || !createdAt || !expiresAt || !purpose || passwordVersion == null) {
    return null;
  }

  return {
    id: tokenId,
    pageSlug: readNonEmptyString(data.slug) ?? readNonEmptyString(data.pageSlug) ?? eventSummary.slug,
    eventId: eventSummary.eventId,
    tokenHash,
    purpose,
    passwordVersion,
    createdAt,
    expiresAt,
    usedAt: toDate(data.usedAt),
    revokedAt: toDate(data.revokedAt),
    lastValidatedAt: toDate(data.lastValidatedAt),
    issuedBy: readNonEmptyString(data.issuedBy),
    issuedByType: readNonEmptyString(data.issuedByType),
  };
}

export function buildEventAuditLogRecordFromEventDoc(
  eventSummary: EventSummaryRecord,
  logId: string,
  data: Record<string, unknown>
): EventAuditLogRecordDto | null {
  const action = readNonEmptyString(data.action);
  const result = data.result === 'success' || data.result === 'failure' ? data.result : null;
  if (!action || !result) {
    return null;
  }

  const actorInput = isRecord(data.actor) ? data.actor : null;
  return {
    id: logId,
    pageSlug: readNonEmptyString(data.slug) ?? readNonEmptyString(data.pageSlug) ?? eventSummary.slug,
    eventId: eventSummary.eventId,
    action,
    result,
    sessionPageSlug:
      readNonEmptyString(actorInput?.sessionEventId) ??
      readNonEmptyString(data.sessionPageSlug),
    reason: readNonEmptyString(data.reason),
    metadata: normalizeMetadataRecord(data.metadata),
    createdAt: toDate(data.createdAt),
  };
}
