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

const DEFAULT_FEATURES: InvitationFeatureFlags = {
  maxGalleryImages: 18,
  shareMode: 'card',
  showMusic: true,
  showCountdown: true,
  showGuestbook: true,
};

// Keep legacy keys readable without retaining discontinued feature limits.
export const INVITATION_PRODUCT_FEATURES: Record<InvitationProductTier, InvitationFeatureFlags> = {
  standard: { ...DEFAULT_FEATURES },
  deluxe: { ...DEFAULT_FEATURES },
  premium: { ...DEFAULT_FEATURES },
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
  return value === 'link' || value === 'card' || value === 'none' ? value : fallback;
}

export function resolveInvitationFeatures(
  tier?: InvitationProductTier | null,
  overrides?: Partial<InvitationFeatureFlags> | null
): InvitationFeatureFlags {
  const normalizedTier = normalizeInvitationProductTier(tier);
  const base = INVITATION_PRODUCT_FEATURES.premium;
  // Old records persisted the former tier defaults as feature overrides.
  if (normalizedTier !== 'premium') return { ...base };

  return {
    maxGalleryImages:
      typeof overrides?.maxGalleryImages === 'number' &&
      Number.isFinite(overrides.maxGalleryImages) &&
      overrides.maxGalleryImages > 0
        ? Math.floor(overrides.maxGalleryImages)
        : base.maxGalleryImages,
    shareMode: normalizeInvitationShareMode(overrides?.shareMode, base.shareMode),
    showMusic:
      typeof overrides?.showMusic === 'boolean'
        ? overrides.showMusic
        : base.showMusic,
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
  const definitions = INVITATION_THEME_KEYS.map((theme) => ({
    theme,
    productTier: DEFAULT_INVITATION_PRODUCT_TIER,
    displayName: getInvitationThemeLabel(theme),
    description: '사진 최대 18장, 음악, 카카오톡 카드 공유, 캘린더와 방명록을 사용할 수 있습니다.',
  }));

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
