export type InvitationThemePreviewProductTier = 'standard' | 'deluxe' | 'premium';

type InvitationThemePreviewInfo = {
  description: string;
  sampleUrls: Record<InvitationThemePreviewProductTier, string>;
};

type InvitationThemeMetadataEntry = {
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
  sortOrder: number;
};

export const INVITATION_THEME_METADATA_REGISTRY = [
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
    sortOrder: 10,
  },
  {
    key: 'romantic',
    label: '로맨틱형',
    adminLabel: 'Romantic',
    variantLabel: 'Romantic',
    pathSuffix: '/romantic',
    wizardDescription: '은은한 분홍 톤과 카드형 섹션으로 구성한 감성 로맨틱 디자인입니다.',
    preview: {
      description:
        '은은한 로맨틱 톤과 포인트 카드 배치로 초대장의 분위기를 강조한 테마입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/kim-taehyun-choi-yuna/romantic/',
        deluxe: 'https://msgnote.kr/lee-junho-park-somin/romantic/',
        premium: 'https://msgnote.kr/shin-minje-kim-hyunji/romantic/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Romantic)',
    ariaLabelSuffix: ' (Romantic)',
    sortOrder: 15,
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
    sortOrder: 20,
  },
] as const satisfies readonly InvitationThemeMetadataEntry[];

export type InvitationThemeDefinition = (typeof INVITATION_THEME_METADATA_REGISTRY)[number];
export type InvitationThemeKey = InvitationThemeDefinition['key'];

export type InvitationThemeSalesPolicy = {
  isDefault: boolean;
  canBeDefault: boolean;
  isSelectableAtCreation: boolean;
  isPurchasable: boolean;
  allowsAdditionalPurchase: boolean;
};

export const INVITATION_THEME_SALES_POLICY_REGISTRY = {
  emotional: {
    isDefault: true,
    canBeDefault: true,
    isSelectableAtCreation: true,
    isPurchasable: true,
    allowsAdditionalPurchase: true,
  },
  romantic: {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: true,
    isPurchasable: true,
    allowsAdditionalPurchase: true,
  },
  simple: {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: true,
    isPurchasable: true,
    allowsAdditionalPurchase: true,
  },
} as const satisfies Record<InvitationThemeKey, InvitationThemeSalesPolicy>;

export const INVITATION_THEME_REGISTRY = INVITATION_THEME_METADATA_REGISTRY;

const sortedInvitationThemes = [...INVITATION_THEME_METADATA_REGISTRY].sort(
  (left, right) => left.sortOrder - right.sortOrder
) as InvitationThemeDefinition[];

const invitationThemeByKey = Object.fromEntries(
  sortedInvitationThemes.map((theme) => [theme.key, theme])
) as Record<InvitationThemeKey, InvitationThemeDefinition>;

export const INVITATION_THEME_KEYS = sortedInvitationThemes.map(
  (theme) => theme.key
) as InvitationThemeKey[];

function getSortedThemeKeysByPolicy(
  predicate: (policy: InvitationThemeSalesPolicy) => boolean
) {
  return INVITATION_THEME_KEYS.filter((theme) =>
    predicate(INVITATION_THEME_SALES_POLICY_REGISTRY[theme])
  );
}

const DEFAULT_ELIGIBLE_INVITATION_THEME_KEYS = getSortedThemeKeysByPolicy(
  (policy) => policy.canBeDefault
);

export const DEFAULT_INVITATION_THEME: InvitationThemeKey =
  INVITATION_THEME_KEYS.find(
    (theme) => INVITATION_THEME_SALES_POLICY_REGISTRY[theme].isDefault
  ) ??
  DEFAULT_ELIGIBLE_INVITATION_THEME_KEYS[0] ??
  sortedInvitationThemes[0].key;

export const SELECTABLE_INVITATION_THEME_KEYS = getSortedThemeKeysByPolicy(
  (policy) => policy.isSelectableAtCreation
) as InvitationThemeKey[];

export const PURCHASABLE_INVITATION_THEME_KEYS = getSortedThemeKeysByPolicy(
  (policy) => policy.isPurchasable
) as InvitationThemeKey[];

export const ADDITIONAL_PURCHASABLE_INVITATION_THEME_KEYS = getSortedThemeKeysByPolicy(
  (policy) => policy.allowsAdditionalPurchase
) as InvitationThemeKey[];

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

export function getInvitationThemeSalesPolicy(theme: InvitationThemeKey) {
  return INVITATION_THEME_SALES_POLICY_REGISTRY[theme];
}

export function canInvitationThemeBeDefault(theme: InvitationThemeKey) {
  return getInvitationThemeSalesPolicy(theme).canBeDefault;
}

export function isInvitationThemeSelectableAtCreation(theme: InvitationThemeKey) {
  return getInvitationThemeSalesPolicy(theme).isSelectableAtCreation;
}

export function isInvitationThemePurchasable(theme: InvitationThemeKey) {
  return getInvitationThemeSalesPolicy(theme).isPurchasable;
}

export function canAdditionalPurchaseInvitationTheme(theme: InvitationThemeKey) {
  return getInvitationThemeSalesPolicy(theme).allowsAdditionalPurchase;
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

export function getSelectableInvitationThemeKeys() {
  return [...SELECTABLE_INVITATION_THEME_KEYS];
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

