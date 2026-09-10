import { PUBLIC_SITE_URL } from './invitationMetadata';

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

function buildThemePreviewUrl(path: string) {
  return new URL(path, PUBLIC_SITE_URL).toString();
}

export const INVITATION_THEME_METADATA_REGISTRY = [
  {
    key: 'emotional',
    label: '포트레이트 레터',
    adminLabel: '포트레이트 레터',
    variantLabel: '포트레이트 레터',
    pathSuffix: '/emotional',
    wizardDescription: '세로 사진과 짧은 편지가 중심인 여백형 웨딩입니다.',
    preview: {
      description: '세로 사진과 짧은 편지가 중심인 여백형 웨딩입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/kim-taehyun-choi-yuna/emotional/'),
        deluxe: buildThemePreviewUrl('/lee-junho-park-somin/emotional/'),
        premium: buildThemePreviewUrl('/an-doyoung-yoon-jisoo/emotional/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: '',
    ariaLabelSuffix: '',
    sortOrder: 10,
  },
  {
    key: 'romantic',
    label: '가든 노트',
    adminLabel: '가든 노트',
    variantLabel: '가든 노트',
    pathSuffix: '/romantic',
    wizardDescription: '세이지 빛 글과 사진, 여백 속 편지와 가족의 마음을 담은 웨딩입니다.',
    preview: {
      description: '세이지 빛 글과 사진, 여백 속 편지와 가족의 마음을 담은 웨딩입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/kim-taehyun-choi-yuna/romantic/'),
        deluxe: buildThemePreviewUrl('/lee-junho-park-somin/romantic/'),
        premium: buildThemePreviewUrl('/an-doyoung-yoon-jisoo/romantic/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Romantic)',
    ariaLabelSuffix: ' (Romantic)',
    sortOrder: 15,
  },
  {
    key: 'gyeol',
    label: '결',
    adminLabel: '결',
    variantLabel: '결',
    pathSuffix: '/gyeol',
    wizardDescription: '사진과 작은 글, 흰 여백이 자연스럽게 이어지는 웨딩입니다.',
    preview: {
      description: '사진 중심의 표지와 한 장씩 보는 갤러리, 간결한 예식 안내를 담았습니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/kim-taehyun-choi-yuna/gyeol/'),
        deluxe: buildThemePreviewUrl('/lee-junho-park-somin/gyeol/'),
        premium: buildThemePreviewUrl('/an-doyoung-yoon-jisoo/gyeol/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (GYEOL)',
    ariaLabelSuffix: ' (결)',
    sortOrder: 18,
  },
  {
    key: 'simple',
    label: '고요한 예식',
    adminLabel: '고요한 예식',
    variantLabel: '고요한 예식',
    pathSuffix: '/simple',
    wizardDescription: '작은 이름과 일정, 사진이 흰 여백 속에 이어지는 담백한 웨딩입니다.',
    preview: {
      description: '작은 이름과 일정, 사진이 흰 여백 속에 이어지는 담백한 웨딩입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/kim-taehyun-choi-yuna/simple/'),
        deluxe: buildThemePreviewUrl('/lee-junho-park-somin/simple/'),
        premium: buildThemePreviewUrl('/an-doyoung-yoon-jisoo/simple/'),
      },
    },
    shareTitleMode: 'couple',
    documentTitleSuffix: ' (Simple)',
    ariaLabelSuffix: ' (Simple)',
    sortOrder: 20,
  },
  {
    key: 'classic-r',
    label: '레터프레스',
    adminLabel: '레터프레스',
    variantLabel: '레터프레스',
    pathSuffix: '/classic-r',
    wizardDescription: '고전 명조와 옅은 종이색, 사진의 여백을 살린 웨딩입니다.',
    preview: {
      description: '고전 명조와 옅은 종이색, 사진의 여백을 살린 웨딩입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/kim-taehyun-choi-yuna/classic-r/'),
        deluxe: buildThemePreviewUrl('/lee-junho-park-somin/classic-r/'),
        premium: buildThemePreviewUrl('/an-doyoung-yoon-jisoo/classic-r/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Classic Renewal)',
    ariaLabelSuffix: ' (Classic Renewal)',
    sortOrder: 25,
  },
  {
    key: 'first-birthday-pink',
    label: '퍼스트 챕터',
    adminLabel: '퍼스트 챕터',
    variantLabel: '퍼스트 챕터',
    pathSuffix: '/first-birthday-pink',
    wizardDescription: '아이 이름·날짜·성장 한 장면을 기록하는 첫 돌입니다.',
    preview: {
      description: '아이 이름·날짜·성장 한 장면을 기록하는 첫 돌입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/first-birthday-ian-spring/first-birthday-pink/'),
        deluxe: buildThemePreviewUrl('/first-birthday-ian-spring/first-birthday-pink/'),
        premium: buildThemePreviewUrl('/first-birthday-ian-spring/first-birthday-pink/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (First Birthday Pink)',
    ariaLabelSuffix: ' (First Birthday Pink)',
    sortOrder: 110,
  },
  {
    key: 'first-birthday-mint',
    label: '새벽 챕터',
    adminLabel: '새벽 챕터',
    variantLabel: '새벽 챕터',
    pathSuffix: '/first-birthday-mint',
    wizardDescription: '차분한 여백과 날짜 기록 중심의 첫 돌입니다.',
    preview: {
      description: '차분한 여백과 날짜 기록 중심의 첫 돌입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/first-birthday-seoah-mint/first-birthday-mint/'),
        deluxe: buildThemePreviewUrl('/first-birthday-seoah-mint/first-birthday-mint/'),
        premium: buildThemePreviewUrl('/first-birthday-seoah-mint/first-birthday-mint/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (First Birthday Mint)',
    ariaLabelSuffix: ' (First Birthday Mint)',
    sortOrder: 120,
  },
  {
    key: 'birthday-minimal',
    label: '파티 노트',
    adminLabel: '파티 노트',
    variantLabel: '파티 노트',
    pathSuffix: '/birthday-minimal',
    wizardDescription: '일정·장소·연락처를 우선하는 생일 파티 메모입니다.',
    preview: {
      description: '일정·장소·연락처를 우선하는 생일 파티 메모입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/birthday-minseo-picnic/birthday-minimal/'),
        deluxe: buildThemePreviewUrl('/birthday-minseo-picnic/birthday-minimal/'),
        premium: buildThemePreviewUrl('/birthday-minseo-picnic/birthday-minimal/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Birthday Minimal)',
    ariaLabelSuffix: ' (Birthday Minimal)',
    sortOrder: 130,
  },
  {
    key: 'birthday-floral',
    label: '생일 이야기',
    adminLabel: '생일 이야기',
    variantLabel: '생일 이야기',
    pathSuffix: '/birthday-floral',
    wizardDescription: '사진과 축하 문장을 중심으로 한 짧은 생일 기록입니다.',
    preview: {
      description: '사진과 축하 문장을 중심으로 한 짧은 생일 기록입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/birthday-jiwoo-rooftop/birthday-floral/'),
        deluxe: buildThemePreviewUrl('/birthday-jiwoo-rooftop/birthday-floral/'),
        premium: buildThemePreviewUrl('/birthday-jiwoo-rooftop/birthday-floral/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Birthday Floral)',
    ariaLabelSuffix: ' (Birthday Floral)',
    sortOrder: 140,
  },
  {
    key: 'general-event-elegant',
    label: '프로그램 에디션',
    adminLabel: '프로그램 에디션',
    variantLabel: '프로그램 에디션',
    pathSuffix: '/general-event-elegant',
    wizardDescription: '행사 정보와 세로 프로그램을 정돈한 격식 있는 에디션입니다.',
    preview: {
      description: '행사 정보와 세로 프로그램을 정돈한 격식 있는 에디션입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/general-event-brand-night/general-event-elegant/'),
        deluxe: buildThemePreviewUrl('/general-event-brand-night/general-event-elegant/'),
        premium: buildThemePreviewUrl('/general-event-brand-night/general-event-elegant/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (General Event Elegant)',
    ariaLabelSuffix: ' (General Event Elegant)',
    sortOrder: 150,
  },
  {
    key: 'general-event-vivid',
    label: '나이트 스케줄',
    adminLabel: '나이트 스케줄',
    variantLabel: '나이트 스케줄',
    pathSuffix: '/general-event-vivid',
    wizardDescription: '야간 행사명과 세로 프로그램을 선명하게 보여주는 일정 포스터입니다.',
    preview: {
      description: '야간 행사명과 세로 프로그램을 선명하게 보여주는 일정 포스터입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/general-event-summer-networking/general-event-vivid/'),
        deluxe: buildThemePreviewUrl('/general-event-summer-networking/general-event-vivid/'),
        premium: buildThemePreviewUrl('/general-event-summer-networking/general-event-vivid/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (General Event Vivid)',
    ariaLabelSuffix: ' (General Event Vivid)',
    sortOrder: 160,
  },
  {
    key: 'opening-natural',
    label: '스튜디오 오프닝',
    adminLabel: '스튜디오 오프닝',
    variantLabel: '스튜디오 오프닝',
    pathSuffix: '/opening-natural',
    wizardDescription: '브랜드 소개·서비스·혜택·방문 정보가 이어지는 소개서입니다.',
    preview: {
      description: '브랜드 소개·서비스·혜택·방문 정보가 이어지는 소개서입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/opening-bloom-cafe/opening-natural/'),
        deluxe: buildThemePreviewUrl('/opening-bloom-cafe/opening-natural/'),
        premium: buildThemePreviewUrl('/opening-bloom-cafe/opening-natural/'),
      },
    },
    shareTitleMode: 'metadata',
    documentTitleSuffix: ' (Opening Natural)',
    ariaLabelSuffix: ' (Opening Natural)',
    sortOrder: 210,
  },
  {
    key: 'opening-modern',
    label: '오프닝 포스터',
    adminLabel: '오프닝 포스터',
    variantLabel: '오프닝 포스터',
    pathSuffix: '/opening-modern',
    wizardDescription: '상호·오픈일·방문 행동을 대담하게 조판한 포스터입니다.',
    preview: {
      description: '상호·오픈일·방문 행동을 대담하게 조판한 포스터입니다.',
      sampleUrls: {
        standard: buildThemePreviewUrl('/opening-studio-nova/opening-modern/'),
        deluxe: buildThemePreviewUrl('/opening-studio-nova/opening-modern/'),
        premium: buildThemePreviewUrl('/opening-studio-nova/opening-modern/'),
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
  gyeol: {
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
  'classic-r': {
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
