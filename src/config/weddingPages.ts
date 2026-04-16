import type {
  BankAccount,
  FamilyMember,
  InvitationPage,
  InvitationPageSeed,
  InvitationThemeKey,
  PersonInfo,
  WeddingCoupleInfo,
} from '@/types/invitationPage';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  INVITATION_VARIANT_KEYS,
  resolveAvailableInvitationVariant,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import {
  DEFAULT_INVITATION_THEME,
  isInvitationThemeKey,
} from '@/lib/invitationThemes';

import { anDoyoungYoonJisooConfig } from './pages/an-doyoung-yoon-jisoo';
import { kimMinjunParkSoheeConfig } from './pages/kim-minjun-park-sohee';
import { kimTaehyunChoiYunaConfig } from './pages/kim-taehyun-choi-yuna';
import { leeJonghunChoiInConfig } from './pages/lee-jonghun-choi-in';
import { leeJunhoParkSominConfig } from './pages/lee-junho-park-somin';
import { shinMinjeKimHyunjiConfig } from './pages/kim-shinlang-na-sinbu';

export type WeddingPageConfig = InvitationPageSeed;
export type { BankAccount, FamilyMember, PersonInfo, WeddingCoupleInfo };

export const WEDDING_PAGE_SAMPLES: WeddingPageConfig[] = [
  kimMinjunParkSoheeConfig,
  shinMinjeKimHyunjiConfig,
  leeJunhoParkSominConfig,
  kimTaehyunChoiYunaConfig,
  anDoyoungYoonJisooConfig,
  leeJonghunChoiInConfig,
];

// Backward-compatible alias. These configs now act as sample/default content,
// not as the runtime source of truth for route generation.
export const WEDDING_PAGE_SEEDS = WEDDING_PAGE_SAMPLES;

export function getWeddingPageBySlug(slug: string): WeddingPageConfig | undefined {
  return WEDDING_PAGE_SAMPLES.find((page) => page.slug === slug);
}

export function getRequiredWeddingPageBySlug(slug: string): WeddingPageConfig {
  const pageConfig = getWeddingPageBySlug(slug);
  if (!pageConfig) {
    throw new Error(`Wedding page seed not found for slug: ${slug}`);
  }

  return pageConfig;
}

export function getAllWeddingPageSlugs(): string[] {
  return WEDDING_PAGE_SAMPLES.map((page) => page.slug);
}

export function getWeddingPageCount(): number {
  return WEDDING_PAGE_SAMPLES.length;
}

function normalizeSeedVariants(
  seed: WeddingPageConfig,
  fallbackTheme: InvitationThemeKey,
  options: {
    collapseLegacyAllTrue?: boolean;
  } = {}
): InvitationPageSeed['variants'] {
  const sourceVariants = seed.variants ?? {};
  const sourceAvailableVariantKeys = getAvailableInvitationVariantKeys(sourceVariants);
  const preferredTheme =
    resolveAvailableInvitationVariant(sourceVariants, fallbackTheme) ?? fallbackTheme;
  const hasFullTrueAvailability =
    sourceAvailableVariantKeys.length === INVITATION_VARIANT_KEYS.length &&
    INVITATION_VARIANT_KEYS.every((key) => sourceVariants[key]?.available === true);
  const shouldCollapseFullTrueAvailability =
    hasFullTrueAvailability && options.collapseLegacyAllTrue === true;

  const supportedVariants = buildInvitationVariants(seed.slug, seed.displayName, {
    availability: createInvitationVariantAvailability([
      preferredTheme as InvitationVariantKey,
    ]),
  });

  const normalizedVariants = INVITATION_VARIANT_KEYS.reduce<InvitationPageSeed['variants']>(
    (variants, variantKey) => {
      const builtVariant = supportedVariants[variantKey];
      if (!builtVariant) {
        return variants;
      }

      const sourceVariant = sourceVariants[variantKey];
      const available = shouldCollapseFullTrueAvailability
        ? variantKey === preferredTheme
        : sourceVariant?.available === true;

      if (!sourceVariant && !available) {
        return variants;
      }

      variants[variantKey] = {
        ...builtVariant,
        ...(sourceVariant ?? {}),
        available,
        path: builtVariant.path,
        displayName:
          typeof sourceVariant?.displayName === 'string' && sourceVariant.displayName.trim()
            ? sourceVariant.displayName
            : builtVariant.displayName,
      };

      return variants;
    },
    {}
  );

  if (getAvailableInvitationVariantKeys(normalizedVariants).length === 0) {
    const fallbackVariant = supportedVariants[preferredTheme];
    if (fallbackVariant) {
      const sourceVariant = sourceVariants[preferredTheme];
      normalizedVariants[preferredTheme] = {
        ...fallbackVariant,
        ...(sourceVariant ?? {}),
        available: true,
        path: fallbackVariant.path,
        displayName:
          typeof sourceVariant?.displayName === 'string' && sourceVariant.displayName.trim()
            ? sourceVariant.displayName
            : fallbackVariant.displayName,
      };
    }
  }

  return normalizedVariants;
}

type CreateInvitationPageOverrides = Partial<
  Pick<
    InvitationPage,
    'published' | 'displayPeriodEnabled' | 'displayPeriodStart' | 'displayPeriodEnd'
  >
> & {
  fallbackTheme?: InvitationThemeKey;
};

export function createInvitationPageFromSeed(
  seed: WeddingPageConfig,
  overrides: CreateInvitationPageOverrides = {}
): InvitationPage {
  const hasExplicitFallbackTheme = isInvitationThemeKey(overrides.fallbackTheme);
  const fallbackTheme =
    overrides.fallbackTheme ??
    resolveAvailableInvitationVariant(seed.variants, DEFAULT_INVITATION_THEME) ??
    DEFAULT_INVITATION_THEME;

  return {
    ...seed,
    variants: normalizeSeedVariants(seed, fallbackTheme, {
      collapseLegacyAllTrue: hasExplicitFallbackTheme,
    }),
    published: overrides.published ?? true,
    displayPeriodEnabled: overrides.displayPeriodEnabled ?? false,
    displayPeriodStart: overrides.displayPeriodStart ?? null,
    displayPeriodEnd: overrides.displayPeriodEnd ?? null,
  };
}

export function getAllWeddingPageSeeds(): WeddingPageConfig[] {
  return [...WEDDING_PAGE_SAMPLES];
}
