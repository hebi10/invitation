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
  {
    key: 'first-birthday-pink',
    label: '핑크 봄날',
    adminLabel: 'First Birthday Pink',
    variantLabel: '핑크 봄날',
    pathSuffix: '/first-birthday-pink',
    wizardDescription: '부드러운 핑크와 봄날 장식을 중심으로 구성한 돌잔치 디자인입니다.',
    preview: {
      description: '커튼형 인트로와 성장 갤러리를 강조하는 핑크 톤 돌잔치 디자인입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/first-birthday-sample/first-birthday-pink/',
        deluxe: 'https://msgnote.kr/first-birthday-sample/first-birthday-pink/',
        premium: 'https://msgnote.kr/first-birthday-sample/first-birthday-pink/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (First Birthday Pink)',
    ariaLabelSuffix: ' (First Birthday Pink)',
    sortOrder: 110,
  },
  {
    key: 'first-birthday-mint',
    label: '민트 새벽',
    adminLabel: 'First Birthday Mint',
    variantLabel: '민트 새벽',
    pathSuffix: '/first-birthday-mint',
    wizardDescription: '차분한 민트와 새벽빛 포인트를 적용한 돌잔치 디자인입니다.',
    preview: {
      description: '민트와 블루 포인트로 아기의 첫 생일을 맑게 보여주는 디자인입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/first-birthday-sample/first-birthday-mint/',
        deluxe: 'https://msgnote.kr/first-birthday-sample/first-birthday-mint/',
        premium: 'https://msgnote.kr/first-birthday-sample/first-birthday-mint/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (First Birthday Mint)',
    ariaLabelSuffix: ' (First Birthday Mint)',
    sortOrder: 120,
  },
  {
    key: 'birthday-minimal',
    label: '생일 미니멀',
    adminLabel: 'Birthday Minimal',
    variantLabel: 'Birthday Minimal',
    pathSuffix: '/birthday-minimal',
    wizardDescription: '모던한 타이포그래피와 차분한 정보 구조로 생일 초대장을 구성합니다.',
    preview: {
      description: '깔끔한 레이아웃과 절제된 컬러로 생일 파티 정보를 정리합니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/birthday-sample/birthday-minimal/',
        deluxe: 'https://msgnote.kr/birthday-sample/birthday-minimal/',
        premium: 'https://msgnote.kr/birthday-sample/birthday-minimal/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Birthday Minimal)',
    ariaLabelSuffix: ' (Birthday Minimal)',
    sortOrder: 130,
  },
  {
    key: 'birthday-floral',
    label: '생일 플로럴',
    adminLabel: 'Birthday Floral',
    variantLabel: 'Birthday Floral',
    pathSuffix: '/birthday-floral',
    wizardDescription: '부드러운 플로럴 톤과 장식 요소로 생일 초대장 분위기를 만듭니다.',
    preview: {
      description: '꽃 장식과 따뜻한 컬러로 생일 파티의 축하 분위기를 강조합니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/birthday-sample/birthday-floral/',
        deluxe: 'https://msgnote.kr/birthday-sample/birthday-floral/',
        premium: 'https://msgnote.kr/birthday-sample/birthday-floral/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Birthday Floral)',
    ariaLabelSuffix: ' (Birthday Floral)',
    sortOrder: 140,
  },
  {
    key: 'general-event-elegant',
    label: '행사 엘레강스',
    adminLabel: 'General Event Elegant',
    variantLabel: 'General Event Elegant',
    pathSuffix: '/general-event-elegant',
    wizardDescription: '어두운 배경과 골드 포인트로 격식 있는 행사 초대장을 구성합니다.',
    preview: {
      description: '기념식, 공식 행사, 리셉션에 어울리는 차분한 행사 초대장 디자인입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/general-event-sample/general-event-elegant/',
        deluxe: 'https://msgnote.kr/general-event-sample/general-event-elegant/',
        premium: 'https://msgnote.kr/general-event-sample/general-event-elegant/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (General Event Elegant)',
    ariaLabelSuffix: ' (General Event Elegant)',
    sortOrder: 150,
  },
  {
    key: 'general-event-vivid',
    label: '행사 비비드',
    adminLabel: 'General Event Vivid',
    variantLabel: 'General Event Vivid',
    pathSuffix: '/general-event-vivid',
    wizardDescription: '강한 컬러와 파티 무드로 활기 있는 행사 초대장을 구성합니다.',
    preview: {
      description: '파티, 쇼케이스, 브랜드 이벤트에 어울리는 비비드 행사 초대장 디자인입니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/general-event-sample/general-event-vivid/',
        deluxe: 'https://msgnote.kr/general-event-sample/general-event-vivid/',
        premium: 'https://msgnote.kr/general-event-sample/general-event-vivid/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (General Event Vivid)',
    ariaLabelSuffix: ' (General Event Vivid)',
    sortOrder: 160,
  },
  {
    key: 'opening-natural',
    label: '개업 내추럴',
    adminLabel: 'Opening Natural',
    variantLabel: 'Opening Natural',
    pathSuffix: '/opening-natural',
    wizardDescription: '따뜻한 색감과 안정적인 정보 구조로 개업 소식을 전하는 디자인입니다.',
    preview: {
      description: '브랜드 소개, 오픈 혜택, 오시는 길을 내추럴 톤으로 정리합니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/opening-sample/opening-natural/',
        deluxe: 'https://msgnote.kr/opening-sample/opening-natural/',
        premium: 'https://msgnote.kr/opening-sample/opening-natural/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Opening Natural)',
    ariaLabelSuffix: ' (Opening Natural)',
    sortOrder: 210,
  },
  {
    key: 'opening-modern',
    label: '개업 모던',
    adminLabel: 'Opening Modern',
    variantLabel: 'Opening Modern',
    pathSuffix: '/opening-modern',
    wizardDescription: '강한 대비와 브랜디드 톤으로 개업 정보를 선명하게 보여주는 디자인입니다.',
    preview: {
      description: 'Grand Opening 인상을 강조하고 핵심 방문 정보를 빠르게 전달합니다.',
      sampleUrls: {
        standard: 'https://msgnote.kr/opening-sample/opening-modern/',
        deluxe: 'https://msgnote.kr/opening-sample/opening-modern/',
        premium: 'https://msgnote.kr/opening-sample/opening-modern/',
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Opening Modern)',
    ariaLabelSuffix: ' (Opening Modern)',
    sortOrder: 220,
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
  'first-birthday-pink': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'first-birthday-mint': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'birthday-minimal': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'birthday-floral': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'general-event-elegant': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'general-event-vivid': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'opening-natural': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  },
  'opening-modern': {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
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

