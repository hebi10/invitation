import type { InvitationPageVariants } from '@/types/invitationPage';

export type InvitationVariantKey =
  | 'emotional'
  | 'simple'
  | 'minimal'
  | 'space'
  | 'blue'
  | 'classic';

const variantDefinitions: Record<
  InvitationVariantKey,
  { pathSuffix: string; label: string }
> = {
  emotional: {
    pathSuffix: '',
    label: '감성 버전',
  },
  simple: {
    pathSuffix: '-simple',
    label: '심플 버전',
  },
  minimal: {
    pathSuffix: '-minimal',
    label: '미니멀 버전',
  },
  space: {
    pathSuffix: '-space',
    label: '우주 버전',
  },
  blue: {
    pathSuffix: '-blue',
    label: '지중해 블루 버전',
  },
  classic: {
    pathSuffix: '-classic',
    label: '한지 클래식 버전',
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
