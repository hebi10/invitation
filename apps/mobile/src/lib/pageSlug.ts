import {
  INVITATION_PAGE_RESERVED_SLUGS,
  INVITATION_PAGE_SLUG_MAX_LENGTH,
  INVITATION_PAGE_SLUG_MIN_LENGTH,
  normalizeInvitationPageSlugBase,
  validateInvitationPageSlugBase,
  type InvitationPageSlugAvailabilityReason,
  type InvitationPageSlugValidationReason,
} from '../../../../src/lib/invitationPageSlug';

const RESERVED_ROUTE_SEGMENTS = new Set<string>(INVITATION_PAGE_RESERVED_SLUGS);

function normalizeSlug(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

function pickSlugFromSegments(segments: string[]) {
  if (segments.length === 0) {
    return '';
  }

  if (RESERVED_ROUTE_SEGMENTS.has(segments[0])) {
    return normalizeSlug(segments[1] ?? '');
  }

  return normalizeSlug(segments[0]);
}

export const PAGE_SLUG_BASE_MIN_LENGTH = INVITATION_PAGE_SLUG_MIN_LENGTH;
export const PAGE_SLUG_BASE_MAX_LENGTH = INVITATION_PAGE_SLUG_MAX_LENGTH;
export type PageSlugBaseValidationReason = InvitationPageSlugValidationReason;
export type PageSlugAvailabilityReason = InvitationPageSlugAvailabilityReason;
export const normalizePageSlugBase = normalizeInvitationPageSlugBase;
export const validatePageSlugBase = validateInvitationPageSlugBase;

export function extractPageSlugFromIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (!trimmed.includes('/')) {
    return normalizeSlug(trimmed);
  }

  try {
    const candidateUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(`https://mobile-invitation.local/${trimmed.replace(/^\/+/, '')}`);

    const segments = candidateUrl.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    return pickSlugFromSegments(segments);
  } catch {
    const segments = trimmed
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    return pickSlugFromSegments(segments);
  }
}
