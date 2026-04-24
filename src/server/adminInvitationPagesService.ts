import 'server-only';

import { createInvitationPageFromSeed } from '@/config/weddingPages';
import { DEFAULT_EVENT_TYPE, normalizeEventTypeKey } from '@/lib/eventTypes';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  INVITATION_VARIANT_KEYS,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { InvitationPage } from '@/types/invitationPage';

import {
  firestoreEventRepository,
  listStoredEventSummaries,
} from './repositories/eventRepository';
import type { EventSummaryRecord } from './repositories/eventReadThroughDtos';

function isInvitationVariantKey(value: string): value is InvitationVariantKey {
  return INVITATION_VARIANT_KEYS.includes(value as InvitationVariantKey);
}

function buildFallbackVariants(summary: EventSummaryRecord, displayName: string) {
  const availableVariants = summary.supportedVariants.filter(isInvitationVariantKey);

  return buildInvitationVariants(summary.slug, displayName, {
    availability: createInvitationVariantAvailability(availableVariants),
  });
}

function buildAdminInvitationPageSummary(
  summary: EventSummaryRecord,
  page: InvitationPage | null
): InvitationPageSummary {
  const displayName =
    page?.displayName || summary.displayName || summary.title || summary.slug;
  const productTier = normalizeInvitationProductTier(
    page?.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );

  return {
    slug: summary.slug,
    eventType: normalizeEventTypeKey(page?.eventType ?? summary.eventType, DEFAULT_EVENT_TYPE),
    displayName,
    description: page?.description || summary.summary || '',
    date: page?.date || '',
    venue: page?.venue || '',
    createdAt: summary.createdAt,
    updatedAt: summary.lastSavedAt ?? summary.updatedAt,
    published: summary.visibility?.published ?? summary.published,
    defaultTheme: summary.defaultTheme,
    productTier,
    features: resolveInvitationFeatures(productTier, page?.features ?? summary.featureFlags),
    displayPeriodEnabled: summary.displayPeriod?.isActive ?? false,
    displayPeriodStart: summary.displayPeriod?.startDate ?? null,
    displayPeriodEnd: summary.displayPeriod?.endDate ?? null,
    variants: page?.variants ?? buildFallbackVariants(summary, displayName),
    dataSource: 'firestore',
    hasCustomConfig: summary.hasCustomContent,
  };
}

export async function listAdminInvitationPageSummaries() {
  const eventSummaries = await listStoredEventSummaries();
  const pages = await Promise.all(
    eventSummaries.map(async (summary) => {
      const contentRecord = await firestoreEventRepository.findContentBySlug(summary.slug);
      const page = contentRecord
        ? createInvitationPageFromSeed(contentRecord.config, {
            published: summary.visibility?.published ?? summary.published,
          })
        : null;

      return buildAdminInvitationPageSummary(summary, page);
    })
  );

  return pages.sort((left, right) => {
    const rightTime = right.updatedAt?.getTime() ?? 0;
    const leftTime = left.updatedAt?.getTime() ?? 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.displayName.localeCompare(right.displayName, 'ko');
  });
}
