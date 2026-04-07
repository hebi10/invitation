import {
  DEFAULT_INVITATION_THEME as DEFAULT_THEME_KEY,
  getInvitationThemeLabel,
  INVITATION_THEME_KEYS,
} from '@/lib/invitationThemes';
import type {
  InvitationFeatureFlags,
  InvitationProductTier,
  InvitationShareMode,
  InvitationThemeKey,
} from '@/types/invitationPage';

export const DEFAULT_INVITATION_THEME: InvitationThemeKey = DEFAULT_THEME_KEY;
export const DEFAULT_INVITATION_PRODUCT_TIER: InvitationProductTier = 'premium';

export const INVITATION_PRODUCT_FEATURES: Record<
  InvitationProductTier,
  InvitationFeatureFlags
> = {
  standard: {
    maxGalleryImages: 6,
    shareMode: 'link',
    showCountdown: false,
    showGuestbook: false,
  },
  deluxe: {
    maxGalleryImages: 12,
    shareMode: 'card',
    showCountdown: false,
    showGuestbook: false,
  },
  premium: {
    maxGalleryImages: 18,
    shareMode: 'card',
    showCountdown: true,
    showGuestbook: true,
  },
};

export interface InvitationTemplateDefinition {
  id: string;
  seedSlug: string;
  theme: InvitationThemeKey;
  productTier: InvitationProductTier;
  displayName: string;
  description: string;
  features: InvitationFeatureFlags;
}

export function normalizeInvitationProductTier(
  value: unknown,
  fallback: InvitationProductTier = DEFAULT_INVITATION_PRODUCT_TIER
): InvitationProductTier {
  return value === 'standard' || value === 'deluxe' || value === 'premium'
    ? value
    : fallback;
}

export function normalizeInvitationShareMode(
  value: unknown,
  fallback: InvitationShareMode = 'card'
): InvitationShareMode {
  return value === 'link' || value === 'card' ? value : fallback;
}

export function resolveInvitationFeatures(
  tier?: InvitationProductTier | null,
  overrides?: Partial<InvitationFeatureFlags> | null
): InvitationFeatureFlags {
  const normalizedTier = normalizeInvitationProductTier(tier);
  const base = INVITATION_PRODUCT_FEATURES[normalizedTier];

  return {
    maxGalleryImages:
      typeof overrides?.maxGalleryImages === 'number' &&
      Number.isFinite(overrides.maxGalleryImages) &&
      overrides.maxGalleryImages > 0
        ? Math.floor(overrides.maxGalleryImages)
        : base.maxGalleryImages,
    shareMode: normalizeInvitationShareMode(overrides?.shareMode, base.shareMode),
    showCountdown:
      typeof overrides?.showCountdown === 'boolean'
        ? overrides.showCountdown
        : base.showCountdown,
    showGuestbook:
      typeof overrides?.showGuestbook === 'boolean'
        ? overrides.showGuestbook
        : base.showGuestbook,
  };
}

export function buildInvitationTemplateDefinitions(seedSlug: string) {
  const tierDescriptionByProduct: Record<InvitationProductTier, string> = {
    standard: '기본 레이아웃에 STANDARD 구성을 적용한 템플릿입니다.',
    deluxe: '레이아웃에 확장 갤러리와 카드형 공유를 포함한 템플릿입니다.',
    premium: '레이아웃에 모든 PREMIUM 기능을 포함한 템플릿입니다.',
  };

  const tiers: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];

  const definitions: Array<{
    theme: InvitationThemeKey;
    productTier: InvitationProductTier;
    displayName: string;
    description: string;
  }> = INVITATION_THEME_KEYS.flatMap((theme) => {
    const themeLabel = getInvitationThemeLabel(theme);

    return tiers.map((productTier) => ({
      theme,
      productTier,
      displayName: `${themeLabel} ${productTier.toUpperCase()}`,
      description: `${themeLabel} ${tierDescriptionByProduct[productTier]}`,
    }));
  });

  return definitions.map((entry) => ({
    id: `${entry.theme}-${entry.productTier}`,
    seedSlug,
    theme: entry.theme,
    productTier: entry.productTier,
    displayName: entry.displayName,
    description: entry.description,
    features: resolveInvitationFeatures(entry.productTier),
  }));
}
