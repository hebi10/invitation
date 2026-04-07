import type { InvitationPageVariants } from '@/types/invitationPage';

export type InvitationVariantKey = 'emotional' | 'simple';
export type InvitationVariantAvailabilityMap = Partial<
  Record<InvitationVariantKey, boolean>
>;

const variantDefinitions: Record<
  InvitationVariantKey,
  { pathSuffix: string; label: string }
> = {
  emotional: {
    pathSuffix: '',
    label: 'Emotional',
  },
  simple: {
    pathSuffix: '/simple',
    label: 'Simple',
  },
};

export const INVITATION_VARIANT_KEYS = Object.keys(
  variantDefinitions
) as InvitationVariantKey[];

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
  preferred: InvitationVariantKey = 'emotional'
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
    const definition = variantDefinitions[key];

    variants[key] = {
      available: availability[key] === true,
      path: `/${slug}${definition.pathSuffix}`,
      displayName: `${displayName} (${definition.label})`,
    };

    return variants;
  }, {});
}
