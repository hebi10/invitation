import type { InvitationPageVariants } from '@/types/invitationPage';

export type InvitationVariantKey = 'emotional' | 'simple';

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

export function buildInvitationVariants(
  slug: string,
  displayName: string
): InvitationPageVariants {
  return INVITATION_VARIANT_KEYS.reduce<InvitationPageVariants>((variants, key) => {
    const definition = variantDefinitions[key];

    variants[key] = {
      available: true,
      path: `/${slug}${definition.pathSuffix}`,
      displayName: `${displayName} (${definition.label})`,
    };

    return variants;
  }, {});
}
