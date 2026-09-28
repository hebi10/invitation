import 'server-only';

import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
import { resolveStoredEventBySlug } from './repositories/eventRepository';

export async function getPublicEventSummary(
  slug: string,
  dependencies = { resolveEventBySlug: resolveStoredEventBySlug }
) {
  const event = await dependencies.resolveEventBySlug(slug);
  if (!event) return null;

  const { summary } = event;
  const access = getInvitationPublicAccessState({
    published: summary.visibility?.published ?? summary.published,
    displayPeriodEnabled: summary.displayPeriod?.isActive ?? false,
    displayPeriodStart: summary.displayPeriod?.startDate ?? null,
    displayPeriodEnd: summary.displayPeriod?.endDate ?? null,
    deletion: summary.deletion,
  });
  if (!access.isPublic) return null;

  // Keep account, billing, security, and operational fields on the private root.
  // Do not spread the stored summary into this public projection.
  return {
    eventId: summary.eventId,
    slug: summary.slug,
    eventType: summary.eventType,
    title: summary.title,
    displayName: summary.displayName,
    summary: summary.summary,
    published: summary.published,
    defaultTheme: summary.defaultTheme,
    supportedVariants: summary.supportedVariants,
    featureFlags: summary.featureFlags,
    visibility: summary.visibility,
    displayPeriod: summary.displayPeriod,
    hasCustomContent: summary.hasCustomContent,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    lastSavedAt: summary.lastSavedAt,
  };
}
