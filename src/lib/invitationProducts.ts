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
    showMusic: false,
    showCountdown: false,
    showGuestbook: false,
  },
  deluxe: {
    maxGalleryImages: 12,
    shareMode: 'card',
    showMusic: true,
    showCountdown: false,
    showGuestbook: false,
  },
  premium: {
    maxGalleryImages: 18,
    shareMode: 'card',
    showMusic: true,
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
  return value === 'link' || value === 'card' || value === 'none' ? value : fallback;
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
  const tierDescriptionByProduct: Record<InvitationProductTier, string> = {
    standard:
      '맞춤 문구 제작, 갤러리 이미지 최대 6장, 카카오톡 링크 형식 공유(URL 공유)를 포함합니다.',
    deluxe:
      'STANDARD 전체 포함, 갤러리 이미지 최대 12장, 음악 포함, 카카오톡 카드 형식 공유를 포함합니다.',
    premium:
      'DELUXE 전체 포함, 갤러리 이미지 최대 18장, 캘린더 카운트다운, 방명록 기능을 포함합니다.',
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
