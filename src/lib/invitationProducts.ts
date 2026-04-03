import type {
  InvitationFeatureFlags,
  InvitationProductTier,
  InvitationShareMode,
  InvitationThemeKey,
} from '@/types/invitationPage';

export const DEFAULT_INVITATION_THEME: InvitationThemeKey = 'emotional';
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
  const definitions: Array<{
    theme: InvitationThemeKey;
    productTier: InvitationProductTier;
    displayName: string;
    description: string;
  }> = [
    {
      theme: 'emotional',
      productTier: 'standard',
      displayName: 'Emotional Standard',
      description: 'Emotional base layout with the standard feature set.',
    },
    {
      theme: 'emotional',
      productTier: 'deluxe',
      displayName: 'Emotional Deluxe',
      description: 'Emotional layout with extended gallery and card sharing.',
    },
    {
      theme: 'emotional',
      productTier: 'premium',
      displayName: 'Emotional Premium',
      description: 'Emotional layout with full premium features enabled.',
    },
    {
      theme: 'simple',
      productTier: 'standard',
      displayName: 'Simple Standard',
      description: 'Clean simple layout with the standard feature set.',
    },
    {
      theme: 'simple',
      productTier: 'deluxe',
      displayName: 'Simple Deluxe',
      description: 'Simple layout with extended gallery and card sharing.',
    },
    {
      theme: 'simple',
      productTier: 'premium',
      displayName: 'Simple Premium',
      description: 'Simple layout with full premium features enabled.',
    },
  ];

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
