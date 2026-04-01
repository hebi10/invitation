import type { InvitationPageSummary } from '@/services/invitationPageService';

const CACHE_KEY = 'admin-invitation-preview-cache-v1';

type CachedInvitationSummary = {
  slug: string;
  published: boolean;
  displayPeriodEnabled: boolean;
  displayPeriodStart: string | null;
  displayPeriodEnd: string | null;
};

type CachedInvitationSummaryMap = Record<string, CachedInvitationSummary>;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toIsoString(value: Date | null) {
  return value instanceof Date ? value.toISOString() : null;
}

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCache(): CachedInvitationSummaryMap {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as CachedInvitationSummaryMap;
  } catch {
    return {};
  }
}

export function writeAdminInvitationPreviewCache(pages: InvitationPageSummary[]) {
  if (!canUseStorage()) {
    return;
  }

  const nextCache = pages.reduce<CachedInvitationSummaryMap>((accumulator, page) => {
    accumulator[page.slug] = {
      slug: page.slug,
      published: page.published,
      displayPeriodEnabled: page.displayPeriodEnabled,
      displayPeriodStart: toIsoString(page.displayPeriodStart),
      displayPeriodEnd: toIsoString(page.displayPeriodEnd),
    };

    return accumulator;
  }, {});

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(nextCache));
}

export function clearAdminInvitationPreviewCache() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(CACHE_KEY);
}

export function getAdminInvitationPreviewSummary(pageSlug: string) {
  const summary = parseCache()[pageSlug];

  if (!summary) {
    return null;
  }

  return {
    slug: summary.slug,
    published: summary.published,
    displayPeriodEnabled: summary.displayPeriodEnabled,
    displayPeriodStart: toDate(summary.displayPeriodStart),
    displayPeriodEnd: toDate(summary.displayPeriodEnd),
  };
}
