import {
  buildInvitationThemeRoutePath,
  DEFAULT_INVITATION_THEME,
  getInvitationThemeDefinition,
  INVITATION_THEME_KEYS,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import type { InvitationPageVariants } from '@/types/invitationPage';

export type InvitationVariantKey = InvitationThemeKey;
export type InvitationVariantAvailabilityMap = Partial<
  Record<InvitationVariantKey, boolean>
>;

export const INVITATION_VARIANT_KEYS = [...INVITATION_THEME_KEYS];

export function createInvitationVariantAvailability(
  enabledVariants: readonly InvitationVariantKey[]
): InvitationVariantAvailabilityMap {
  return enabledVariants.reduce<InvitationVariantAvailabilityMap>((accumulator, key) => {
    accumulator[key] = true;
    return accumulator;
  }, {});
}

export function getAvailableInvitationVariantKeys(
  variants: InvitationPageVariants | null | undefined
) {
  return INVITATION_VARIANT_KEYS.filter((key) => variants?.[key]?.available);
}

export function resolveAvailableInvitationVariant(
  variants: InvitationPageVariants | null | undefined,
  preferred: InvitationVariantKey = DEFAULT_INVITATION_THEME
): InvitationVariantKey | null {
  if (variants?.[preferred]?.available) {
    return preferred;
  }

  const fallback = INVITATION_VARIANT_KEYS.find((key) => variants?.[key]?.available);
  return fallback ?? null;
}

export function buildInvitationVariants(
  slug: string,
  displayName: string,
  options: {
    availability?: InvitationVariantAvailabilityMap;
  } = {}
): InvitationPageVariants {
  const availability = options.availability ?? {};

  return INVITATION_VARIANT_KEYS.reduce<InvitationPageVariants>((variants, key) => {
    const definition = getInvitationThemeDefinition(key);

    variants[key] = {
      available: availability[key] === true,
      path: buildInvitationThemeRoutePath(slug, key),
      displayName: `${displayName} (${definition.variantLabel})`,
    };

    return variants;
  }, {});
}
