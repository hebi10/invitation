import 'server-only';

import type { EventTypeKey } from '@/lib/eventTypes';
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
