export type InvitationThemePreviewProductTier = 'standard' | 'deluxe' | 'premium';

type InvitationThemePreviewInfo = {
  description: string;
  sampleUrls: Record<InvitationThemePreviewProductTier, string>;
};

type InvitationThemeRegistryEntry = {
  key: string;
  label: string;
  adminLabel: string;
  variantLabel: string;
  pathSuffix: string;
  wizardDescription: string;
  preview: InvitationThemePreviewInfo;
  shareTitleMode: 'metadata' | 'couple';
  documentTitleSuffix: string;
  ariaLabelSuffix: string;
  isDefault: boolean;
  isPurchasable: boolean;
  allowsAdditionalPurchase: boolean;
  sortOrder: number;
};

export const INVITATION_THEME_REGISTRY = [
  {
    key: 'emotional',
    label: '감성형',
    adminLabel: 'Emotional',
    variantLabel: 'Emotional',
    pathSuffix: '/emotional',
    wizardDescription: '사진과 분위기를 중심으로 보여주는 감성형 디자인입니다.',
    preview: {
      description: '사진과 분위기를 중심으로 보여주는 감성형 디자인입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/kim-taehyun-choi-yuna/emotional/',
        deluxe: 'https://msgnote.kr/lee-junho-park-somin/emotional/',
        premium: 'https://msgnote.kr/shin-minje-kim-hyunji/emotional/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: '',
    ariaLabelSuffix: '',
    isDefault: true,
    isPurchasable: true,
    allowsAdditionalPurchase: true,
    sortOrder: 10,
  },
  {
    key: 'simple',
    label: '심플형',
    adminLabel: 'Simple',
    variantLabel: 'Simple',
    pathSuffix: '/simple',
    wizardDescription: '정보를 깔끔하게 정리해 보여주는 심플형 디자인입니다.',
    preview: {
      description: '정보를 깔끔하게 정리해 보여주는 심플형 디자인입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/kim-taehyun-choi-yuna/simple/',
        deluxe: 'https://msgnote.kr/lee-junho-park-somin/simple/',
        premium: 'https://msgnote.kr/shin-minje-kim-hyunji/simple/',
      },
    },
    shareTitleMode: 'couple',
    documentTitleSuffix: ' (Simple)',
    ariaLabelSuffix: ' (Simple)',
    isDefault: false,
    isPurchasable: true,
    allowsAdditionalPurchase: true,
    sortOrder: 20,
  },
] as const satisfies readonly InvitationThemeRegistryEntry[];

export type InvitationThemeDefinition = (typeof INVITATION_THEME_REGISTRY)[number];
export type InvitationThemeKey = InvitationThemeDefinition['key'];

const sortedInvitationThemes = [...INVITATION_THEME_REGISTRY].sort(
  (left, right) => left.sortOrder - right.sortOrder
) as InvitationThemeDefinition[];

const invitationThemeByKey = Object.fromEntries(
  sortedInvitationThemes.map((theme) => [theme.key, theme])
) as Record<InvitationThemeKey, InvitationThemeDefinition>;

export const INVITATION_THEME_KEYS = sortedInvitationThemes.map(
  (theme) => theme.key
) as InvitationThemeKey[];

export const DEFAULT_INVITATION_THEME: InvitationThemeKey =
  sortedInvitationThemes.find((theme) => theme.isDefault)?.key ??
  sortedInvitationThemes[0].key;

export const PURCHASABLE_INVITATION_THEME_KEYS = sortedInvitationThemes
  .filter((theme) => theme.isPurchasable)
  .map((theme) => theme.key) as InvitationThemeKey[];

export const ADDITIONAL_PURCHASABLE_INVITATION_THEME_KEYS = sortedInvitationThemes
  .filter((theme) => theme.allowsAdditionalPurchase)
  .map((theme) => theme.key) as InvitationThemeKey[];

export function isInvitationThemeKey(value: unknown): value is InvitationThemeKey {
  return (
    typeof value === 'string' &&
    INVITATION_THEME_KEYS.includes(value as InvitationThemeKey)
  );
}

export function normalizeInvitationThemeKey(
  value: unknown,
  fallback: InvitationThemeKey = DEFAULT_INVITATION_THEME
): InvitationThemeKey {
  return isInvitationThemeKey(value) ? value : fallback;
}

export function getInvitationThemeDefinition(theme: InvitationThemeKey) {
  return invitationThemeByKey[theme];
}

export function getInvitationThemeLabel(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).label;
}

export function getInvitationThemeAdminLabel(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).adminLabel;
}

export function getInvitationThemeWizardDescription(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).wizardDescription;
}

export function getInvitationThemePreviewDescription(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).preview.description;
}

export function getInvitationThemePreviewSampleUrl(
  theme: InvitationThemeKey,
  productTier: InvitationThemePreviewProductTier
) {
  return getInvitationThemeDefinition(theme).preview.sampleUrls[productTier] ?? null;
}

export function getInvitationThemePathSuffix(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).pathSuffix;
}

export function buildInvitationThemeRoutePath(slug: string, theme: InvitationThemeKey) {
  const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, '');
  return `/${normalizedSlug}${getInvitationThemePathSuffix(theme)}`;
}

export function getPurchasableInvitationThemeKeys() {
  return [...PURCHASABLE_INVITATION_THEME_KEYS];
}

export function getAdditionalPurchasableInvitationThemeKeys(
  excludedTheme?: InvitationThemeKey | null
) {
  return ADDITIONAL_PURCHASABLE_INVITATION_THEME_KEYS.filter(
    (theme) => theme !== excludedTheme
  );
}
