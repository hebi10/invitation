import { getWeddingPageBySlug } from '@/config/weddingPages';
import {
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import {
  type EditableInvitationPageConfig,
  normalizeInvitationPageSlugBase,
} from '@/services/invitationPageService';
import type { CustomerOwnedEventSummary } from '@/services/customerEventService';

import {
  cloneConfig,
  normalizeFormConfig,
} from '@/app/page-editor/pageEditorUtils';
import { DEFAULT_GREETING_MESSAGE } from './pageWizardData';

export function deriveEnglishNamesFromSlug(slug: string | null) {
  if (!slug) {
    return {
      groomEnglishName: '',
      brideEnglishName: '',
    };
  }

  const segments = slug.split('-').filter(Boolean);
  if (segments.length <= 1) {
    return {
      groomEnglishName: slug,
      brideEnglishName: '',
    };
  }

  const pivot = Math.ceil(segments.length / 2);

  return {
    groomEnglishName: segments.slice(0, pivot).join('-'),
    brideEnglishName: segments.slice(pivot).join('-'),
  };
}

export function buildSlugFromEnglishNames(groomEnglishName: string, brideEnglishName: string) {
  return (
    normalizeInvitationPageSlugBase(
      [groomEnglishName.trim(), brideEnglishName.trim()].filter(Boolean).join('-')
    ) ?? ''
  );
}

export function shouldSyncDerivedText(currentValue: string, previousAutoValue: string) {
  const normalizedCurrent = currentValue.trim();
  const normalizedPreviousAuto = previousAutoValue.trim();

  return !normalizedCurrent || normalizedCurrent === normalizedPreviousAuto;
}

export function composeAutoGreetingMessage(_groomName: string, _brideName: string) {
  return DEFAULT_GREETING_MESSAGE;
}

export function resolveWizardDraftSlug(
  persistedSlug: string | null,
  formSlug: string | null | undefined
) {
  if (persistedSlug?.trim()) {
    return persistedSlug.trim();
  }

  const normalizedFormSlug = normalizeInvitationPageSlugBase(formSlug ?? '');
  if (!normalizedFormSlug || normalizedFormSlug === 'new-page') {
    return null;
  }

  return normalizedFormSlug;
}

export function buildOwnedEventSampleEditableConfig(
  event: CustomerOwnedEventSummary
): EditableInvitationPageConfig | null {
  const sampleConfig = getWeddingPageBySlug(event.slug);
  if (!sampleConfig) {
    return null;
  }

  const nextConfig = normalizeFormConfig(cloneConfig(sampleConfig));
  const productTier = normalizeInvitationProductTier(nextConfig.productTier);

  return {
    slug: event.slug,
    config: nextConfig,
    published: event.published,
    defaultTheme: event.defaultTheme,
    productTier,
    features: resolveInvitationFeatures(productTier, nextConfig.features),
    hasCustomConfig: false,
    dataSource: 'seed',
    lastSavedAt: event.updatedAt,
  };
}

export async function settleWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<
    | { status: 'resolved'; value: T }
    | { status: 'rejected'; error: unknown }
    | { status: 'timeout' }
  >([
    promise.then(
      (value) => ({ status: 'resolved', value }) as const,
      (error) => ({ status: 'rejected', error }) as const
    ),
    new Promise<{ status: 'timeout' }>((resolve) => {
      window.setTimeout(() => resolve({ status: 'timeout' }), timeoutMs);
    }),
  ]);
}
