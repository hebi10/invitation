import 'server-only';

import type { EventTypeKey } from '@/lib/eventTypes';
import {
  buildGuestbookCommentStatusPatch,
  isGuestbookCommentPendingPurge,
  isGuestbookCommentVisibleToManager,
  readGuestbookCommentStatus,
  type GuestbookCommentStatus,
} from '@/lib/guestbookComments';
import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import { getWeddingPageBySlug } from '@/config/weddingPages';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

import { getServerEditableInvitationPageConfig } from './invitationPageServerService';
import { listStoredEventSummaries } from './repositories/eventRepository';
import { resolveStoredEventBySlug } from './repositories/eventRepository';
import { firestoreEventCommentRepository } from './repositories/eventCommentRepository';
import type { EventSummaryRecord } from './repositories/eventReadThroughDtos';

export interface CustomerOwnedEventSummary {
  eventId: string;
  slug: string;
  eventType: EventTypeKey;
  title: string | null;
  displayName: string | null;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  updatedAt: Date | null;
}

export interface CustomerEventGuestbookCommentSummary {
  id: string;
  author: string;
  message: string;
  pageSlug: string;
  status: GuestbookCommentStatus;
  createdAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
  scheduledDeleteAt: string | null;
  restoredAt: string | null;
}

export type CustomerEventOwnershipSnapshot =
  | {
      status: 'owner';
      summary: CustomerOwnedEventSummary;
    }
  | {
      status: 'claimable';
      summary: CustomerOwnedEventSummary;
    }
  | {
      status: 'different-owner';
      summary: CustomerOwnedEventSummary;
    }
  | {
      status: 'missing';
      summary: null;
    };

function toCustomerOwnedEventSummary(summary: EventSummaryRecord) {
  return {
    eventId: summary.eventId,
    slug: summary.slug,
    eventType: summary.eventType,
    title: summary.title,
    displayName: summary.displayName,
    published: summary.visibility?.published ?? summary.published,
    defaultTheme: summary.defaultTheme,
    updatedAt: summary.lastSavedAt ?? summary.updatedAt,
  } satisfies CustomerOwnedEventSummary;
}

async function findOwnedEventSummaryBySlug(ownerUid: string, pageSlug: string) {
  const normalizedOwnerUid = ownerUid.trim();
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedOwnerUid || !normalizedPageSlug) {
    return null;
  }

  const eventSummaries = await listStoredEventSummaries();
  return (
    eventSummaries.find((summary) => {
      return (
        normalizeInvitationPageSlugInput(summary.slug) === normalizedPageSlug &&
        summary.ownerUid?.trim() === normalizedOwnerUid
      );
    }) ?? null
  );
}

function buildSampleEditableConfig(summary: CustomerOwnedEventSummary) {
  const sampleConfig = getWeddingPageBySlug(summary.slug);
  if (!sampleConfig) {
    return null;
  }

  const config = sanitizeHeartIconPlaceholdersDeep(sampleConfig) as InvitationPageSeed;
  const productTier = normalizeInvitationProductTier(
    config.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );

  return {
    slug: summary.slug,
    config,
    published: summary.published,
    defaultTheme: summary.defaultTheme,
    productTier,
    features: resolveInvitationFeatures(productTier, config.features),
    hasCustomConfig: false,
    dataSource: 'sample' as const,
    lastSavedAt: summary.updatedAt,
  };
}

function toIsoString(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

function buildCustomerGuestbookCommentSummary(
  commentId: string,
  pageSlug: string,
  data: Record<string, unknown>
): CustomerEventGuestbookCommentSummary | null {
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  if (!message) {
    return null;
  }

  return {
    id: commentId,
    author:
      typeof data.author === 'string' && data.author.trim()
        ? data.author.trim()
        : '익명',
    message,
    pageSlug:
      typeof data.pageSlug === 'string' && data.pageSlug.trim()
        ? data.pageSlug.trim()
        : pageSlug,
    status: readGuestbookCommentStatus(data),
    createdAt: toIsoString(data.createdAt),
    hiddenAt: toIsoString(data.hiddenAt),
    deletedAt: toIsoString(data.deletedAt),
    scheduledDeleteAt: toIsoString(data.scheduledDeleteAt),
    restoredAt: toIsoString(data.restoredAt),
  };
}

async function requireOwnedEventSummary(ownerUid: string, pageSlug: string) {
  const ownership = await getCustomerEventOwnershipSnapshot(ownerUid, pageSlug);
  if (ownership.status !== 'owner') {
    throw new Error('로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.');
  }

  return ownership.summary;
}

export async function listCustomerOwnedEventSummaries(ownerUid: string) {
  const normalizedOwnerUid = ownerUid.trim();
  if (!normalizedOwnerUid) {
    return [];
  }

  const eventSummaries = await listStoredEventSummaries();

  return eventSummaries
    .filter((summary) => summary.ownerUid?.trim() === normalizedOwnerUid)
    .map(toCustomerOwnedEventSummary)
    .sort((left, right) => {
      const rightTime = right.updatedAt?.getTime() ?? 0;
      const leftTime = left.updatedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return (left.displayName ?? left.title ?? left.slug).localeCompare(
        right.displayName ?? right.title ?? right.slug,
        'ko'
      );
    });
}

export async function getCustomerEventOwnershipSnapshot(
  ownerUid: string,
  pageSlug: string
): Promise<CustomerEventOwnershipSnapshot> {
  const normalizedOwnerUid = ownerUid.trim();
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);

  if (!normalizedOwnerUid || !normalizedPageSlug) {
    return {
      status: 'missing',
      summary: null,
    };
  }

  const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
  const ownedSummary = await findOwnedEventSummaryBySlug(
    normalizedOwnerUid,
    normalizedPageSlug
  );
  if (!resolvedEvent) {
    if (ownedSummary) {
      return {
        status: 'owner',
        summary: toCustomerOwnedEventSummary(ownedSummary),
      };
    }

    return {
      status: 'missing',
      summary: null,
    };
  }

  const summary = toCustomerOwnedEventSummary(resolvedEvent.summary);
  const eventOwnerUid = resolvedEvent.summary.ownerUid?.trim() ?? '';

  if (ownedSummary && (!eventOwnerUid || eventOwnerUid === normalizedOwnerUid)) {
    return {
      status: 'owner',
      summary: toCustomerOwnedEventSummary(ownedSummary),
    };
  }

  if (!eventOwnerUid) {
    return {
      status: 'claimable',
      summary,
    };
  }

  if (eventOwnerUid === normalizedOwnerUid) {
    return {
      status: 'owner',
      summary,
    };
  }

  if (ownedSummary) {
    return {
      status: 'owner',
      summary: toCustomerOwnedEventSummary(ownedSummary),
    };
  }

  return {
    status: 'different-owner',
    summary,
  };
}

export async function getCustomerEditableInvitationPageSnapshot(
  ownerUid: string,
  pageSlug: string
) {
  const ownership = await getCustomerEventOwnershipSnapshot(ownerUid, pageSlug);

  if (ownership.status !== 'owner') {
    return ownership.status === 'missing'
      ? {
          status: 'missing' as const,
          summary: null,
          config: null,
        }
      : {
          status: ownership.status,
          summary: ownership.summary,
          config: null,
        };
  }

  const editableConfig = await getServerEditableInvitationPageConfig(ownership.summary.slug);
  const resolvedEditableConfig =
    editableConfig ?? buildSampleEditableConfig(ownership.summary);
  if (!resolvedEditableConfig) {
    return {
      status: 'missing' as const,
      summary: ownership.summary,
      config: null,
    };
  }

  return {
    status: 'ready' as const,
    summary: ownership.summary,
    config: {
      ...resolvedEditableConfig,
      dataSource:
        resolvedEditableConfig.dataSource === 'firestore' ? 'firestore' : 'seed',
    },
  };
}

export async function listCustomerEventGuestbookComments(
  ownerUid: string,
  pageSlug: string
) {
  const summary = await requireOwnedEventSummary(ownerUid, pageSlug);
  const now = new Date();
  const comments = await firestoreEventCommentRepository.listByPageSlug(summary.slug);

  return comments
    .filter((comment) => isGuestbookCommentVisibleToManager(comment.data, now))
    .map((comment) =>
      buildCustomerGuestbookCommentSummary(comment.id, summary.slug, comment.data)
    )
    .filter(
      (comment): comment is CustomerEventGuestbookCommentSummary => comment !== null
    )
    .sort((left, right) => {
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export async function scheduleDeleteCustomerEventGuestbookComment(
  ownerUid: string,
  pageSlug: string,
  commentId: string
) {
  const summary = await requireOwnedEventSummary(ownerUid, pageSlug);
  const normalizedCommentId = commentId.trim();
  if (!normalizedCommentId) {
    throw new Error('삭제할 방명록을 선택해 주세요.');
  }

  const comment = await firestoreEventCommentRepository.findByPageSlugAndId(
    summary.slug,
    normalizedCommentId
  );
  if (!comment || isGuestbookCommentPendingPurge(comment.data, new Date())) {
    throw new Error('삭제할 방명록을 찾을 수 없습니다.');
  }

  await firestoreEventCommentRepository.updateByPageSlugAndId(
    summary.slug,
    normalizedCommentId,
    buildGuestbookCommentStatusPatch('scheduleDelete', new Date())
  );
}
