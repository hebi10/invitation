import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

import {
  cloneConfig,
  normalizeFormConfig,
  normalizePerson,
  prepareConfigForSave,
} from '../page-editor/pageEditorUtils';

export const MAX_GALLERY_IMAGES = resolveInvitationFeatures(
  DEFAULT_INVITATION_PRODUCT_TIER
).maxGalleryImages;
export const MAX_REPEATABLE_ITEMS = 3;
export const PLACEHOLDER_GROOM = '신랑';
export const PLACEHOLDER_BRIDE = '신부';

export type WizardStepKey =
  | 'theme'
  | 'slug'
  | 'basic'
  | 'schedule'
  | 'venue'
  | 'greeting'
  | 'images'
  | 'extra'
  | 'final';

export type StepValidation = {
  valid: boolean;
  messages: string[];
};

export type WizardStepDefinition = {
  key: WizardStepKey;
  number: string;
  title: string;
  description: string;
  previewSection?: 'cover' | 'wedding' | 'greeting' | 'gallery' | 'gift' | 'metadata';
  highlights: string[];
};

export const WIZARD_STEPS: WizardStepDefinition[] = [
  {
    key: 'theme',
    number: '01',
    title: '디자인과 상품 선택',
    description: '청첩장 기본 디자인과 상품 구성을 먼저 선택합니다.',
    previewSection: 'cover',
    highlights: ['기본 디자인', '상품 등급', '사용 가능 기능 확인'],
  },
  {
    key: 'slug',
    number: '02',
    title: '페이지 주소 설정',
    description: '청첩장에 사용할 최종 URL 주소를 정합니다.',
    previewSection: 'cover',
    highlights: ['공개 URL', '중복 주소 자동 보정', '확인 후 초안 생성'],
  },
  {
    key: 'basic',
    number: '03',
    title: '기본 정보',
    description: '첫 화면에 보일 이름과 짧은 문구를 입력합니다.',
    previewSection: 'cover',
    highlights: ['신랑 이름', '신부 이름', '표지 부제'],
  },
  {
    key: 'schedule',
    number: '04',
    title: '예식 일정',
    description: '예식 날짜와 시간을 입력합니다.',
    previewSection: 'wedding',
    highlights: ['예식 날짜', '예식 시간', '달력과 일정 카드'],
  },
  {
    key: 'venue',
    number: '05',
    title: '예식장과 오시는 길',
    description: '예식장 이름, 주소, 지도 안내를 입력합니다.',
    previewSection: 'wedding',
    highlights: ['예식장 이름', '주소', '지도 링크와 안내 문구'],
  },
  {
    key: 'greeting',
    number: '06',
    title: '인사말과 가족 정보',
    description: '인사말과 양가 정보를 입력합니다.',
    previewSection: 'greeting',
    highlights: ['인사말', '신랑·신부 정보', '혼주 연락처'],
  },
  {
    key: 'images',
    number: '07',
    title: '사진',
    description: '대표 이미지와 갤러리 이미지를 등록합니다.',
    previewSection: 'gallery',
    highlights: ['대표 이미지', '갤러리 순서', '노출 이미지'],
  },
  {
    key: 'extra',
    number: '08',
    title: '축의금과 추가 안내',
    description: '계좌와 추가 안내 문구를 필요한 만큼 입력합니다.',
    previewSection: 'gift',
    highlights: ['축의금 계좌', '예식장 안내', '화환 안내'],
  },
  {
    key: 'final',
    number: '09',
    title: '공유 정보와 최종 확인',
    description: '공유 문구를 확인하고 페이지 공개 여부를 정합니다.',
    previewSection: 'metadata',
    highlights: ['브라우저 제목', '공유 설명', '공개 상태'],
  },
];

export const GREETING_TEMPLATES = [
  {
    label: '격식형',
    value:
      '저희 두 사람이 사랑과 믿음으로 한 가정을 이루게 되었습니다. 소중한 걸음으로 함께하시어 축복해 주시면 감사하겠습니다.',
  },
  {
    label: '따뜻한형',
    value:
      '서로의 마음을 모아 하나가 되는 날, 소중한 분들과 함께 기쁨을 나누고 싶습니다. 귀한 걸음으로 축복해 주세요.',
  },
  {
    label: '담백형',
    value:
      '저희의 새로운 시작을 함께 축하해 주시면 더없이 큰 기쁨이겠습니다. 편한 마음으로 자리해 주세요.',
  },
];

export const GUIDE_TEMPLATES = [
  {
    label: '주차 안내',
    value: '예식장 건물 내 주차장을 이용하실 수 있습니다.',
  },
  {
    label: '대중교통',
    value: '대중교통 이용 시 도보 이동이 편리한 위치에 있습니다.',
  },
  {
    label: '화환 안내',
    value: '축하 화환은 예식장 안내에 따라 전달 부탁드립니다.',
  },
];

export function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

export function composeDisplayName(groomName: string, brideName: string) {
  const groom = groomName.trim() || PLACEHOLDER_GROOM;
  const bride = brideName.trim() || PLACEHOLDER_BRIDE;
  return `${groom} ♥ ${bride}`;
}

export function composeDescription(groomName: string, brideName: string) {
  if (hasText(groomName) && hasText(brideName)) {
    return `${groomName.trim()}님과 ${brideName.trim()}님의 소중한 날에 초대합니다.`;
  }

  return '소중한 예식에 초대합니다.';
}

export function composeGreetingAuthor(groomName: string, brideName: string) {
  const groom = groomName.trim() || PLACEHOLDER_GROOM;
  const bride = brideName.trim() || PLACEHOLDER_BRIDE;
  return `${groom} · ${bride}`;
}

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

export function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function buildWeddingDateObject(formState: InvitationPageSeed) {
  const { year, month, day, hour, minute } = formState.weddingDateTime;

  if (
    year < 1900 ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const nextDate = new Date(year, month, day, hour, minute);

  if (
    nextDate.getFullYear() !== year ||
    nextDate.getMonth() !== month ||
    nextDate.getDate() !== day ||
    nextDate.getHours() !== hour ||
    nextDate.getMinutes() !== minute
  ) {
    return null;
  }

  return nextDate;
}

export function isValidUrl(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  try {
    const parsed = new URL(value!);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidPhone(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  const digits = value!.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

export function applyDerivedWizardDefaults(config: InvitationPageSeed) {
  const nextConfig = normalizeFormConfig(cloneConfig(config));
  const groomName = nextConfig.couple.groom.name.trim();
  const brideName = nextConfig.couple.bride.name.trim();
  const weddingDate = buildWeddingDateObject(nextConfig);

  nextConfig.groomName = groomName;
  nextConfig.brideName = brideName;
  nextConfig.displayName =
    nextConfig.displayName.trim() || composeDisplayName(groomName, brideName);
  nextConfig.description =
    nextConfig.description.trim() || composeDescription(groomName, brideName);
  nextConfig.metadata.title =
    nextConfig.metadata.title.trim() || nextConfig.displayName;
  nextConfig.metadata.description =
    nextConfig.metadata.description.trim() || nextConfig.description;
  nextConfig.metadata.openGraph.title =
    nextConfig.metadata.openGraph.title.trim() || nextConfig.metadata.title;
  nextConfig.metadata.openGraph.description =
    nextConfig.metadata.openGraph.description.trim() ||
    nextConfig.metadata.description;
  nextConfig.metadata.twitter.title =
    nextConfig.metadata.twitter.title.trim() || nextConfig.metadata.title;
  nextConfig.metadata.twitter.description =
    nextConfig.metadata.twitter.description.trim() ||
    nextConfig.metadata.description;
  nextConfig.metadata.images.favicon =
    nextConfig.metadata.images.favicon.trim() || '/favicon.ico';

  if (weddingDate) {
    nextConfig.date = formatDateLabel(weddingDate);
    if (nextConfig.pageData) {
      nextConfig.pageData.ceremonyTime = formatTimeLabel(weddingDate);
    }
  }

  if (nextConfig.pageData) {
    nextConfig.pageData.venueName =
      nextConfig.pageData.venueName?.trim() || nextConfig.venue;
    nextConfig.pageData.greetingAuthor =
      nextConfig.pageData.greetingAuthor?.trim() ||
      composeGreetingAuthor(groomName, brideName);
    nextConfig.pageData.groom = cloneConfig(nextConfig.couple.groom);
    nextConfig.pageData.bride = cloneConfig(nextConfig.couple.bride);
  }

  return nextConfig;
}

export function createInitialWizardConfig() {
  const seed = getAllWeddingPageSeeds()[0];
  if (!seed) {
    throw new Error('Invitation page seed was not found.');
  }

  const now = new Date();
  const nextConfig = normalizeFormConfig(cloneConfig(seed));

  nextConfig.slug = 'new-page';
  nextConfig.displayName = '';
  nextConfig.description = '';
  nextConfig.groomName = '';
  nextConfig.brideName = '';
  nextConfig.date = '';
  nextConfig.venue = '';
  nextConfig.couple = {
    groom: normalizePerson(undefined),
    bride: normalizePerson(undefined),
  };
  nextConfig.weddingDateTime = {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    hour: 12,
    minute: 0,
  };
  nextConfig.metadata.title = '';
  nextConfig.metadata.description = '';
  nextConfig.metadata.openGraph.title = '';
  nextConfig.metadata.openGraph.description = '';
  nextConfig.metadata.twitter.title = '';
  nextConfig.metadata.twitter.description = '';
  nextConfig.metadata.keywords = [];
  nextConfig.metadata.images.wedding = '';
  nextConfig.metadata.images.favicon = '/favicon.ico';
  nextConfig.productTier = DEFAULT_INVITATION_PRODUCT_TIER;
  nextConfig.features = resolveInvitationFeatures(DEFAULT_INVITATION_PRODUCT_TIER);
  nextConfig.pageData = {
    ...nextConfig.pageData,
    subtitle: '',
    ceremonyTime: '',
    ceremonyAddress: '',
    ceremonyContact: '',
    galleryImages: [],
    greetingMessage: '',
    greetingAuthor: '',
    mapUrl: '',
    mapDescription: '',
    venueName: '',
    groom: normalizePerson(undefined),
    bride: normalizePerson(undefined),
    kakaoMap: undefined,
    venueGuide: [],
    wreathGuide: [],
    giftInfo: {
      groomAccounts: [],
      brideAccounts: [],
      message: '',
    },
  };

  return nextConfig;
}

export function prepareWizardConfigForSave(config: InvitationPageSeed, slug: string) {
  const withDefaults = applyDerivedWizardDefaults(config);
  const prepared = prepareConfigForSave(
    {
      ...withDefaults,
      slug,
    },
    slug
  );

  const weddingDate = buildWeddingDateObject(prepared);
  if (weddingDate) {
    prepared.date = formatDateLabel(weddingDate);
    if (prepared.pageData) {
      prepared.pageData.ceremonyTime = formatTimeLabel(weddingDate);
    }
  }

  prepared.metadata.images.favicon =
    prepared.metadata.images.favicon.trim() || '/favicon.ico';

  return prepared;
}

export function buildStepValidation(
  stepKey: WizardStepKey,
  theme: InvitationThemeKey | null,
  formState: InvitationPageSeed | null,
  slugInput: string,
  persistedSlug: string | null
): StepValidation {
  if (!formState && stepKey !== 'theme' && stepKey !== 'slug') {
    return { valid: false, messages: ['페이지 데이터를 먼저 불러와 주세요.'] };
  }

  switch (stepKey) {
    case 'theme':
      return {
        valid:
          (theme === 'emotional' || theme === 'simple') &&
          (formState?.productTier === 'standard' ||
            formState?.productTier === 'deluxe' ||
            formState?.productTier === 'premium'),
        messages:
          (theme === 'emotional' || theme === 'simple') &&
          (formState?.productTier === 'standard' ||
            formState?.productTier === 'deluxe' ||
            formState?.productTier === 'premium')
            ? []
            : ['디자인과 상품 구성을 먼저 선택해 주세요.'],
      };
    case 'slug': {
      if (persistedSlug) {
        return { valid: true, messages: [] };
      }

      const rawSlug = slugInput.trim();
      if (!rawSlug) {
        return { valid: false, messages: ['페이지 주소를 입력해 주세요.'] };
      }

      const normalizedSlug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!normalizedSlug || normalizedSlug !== rawSlug.toLowerCase()) {
        return {
          valid: false,
          messages: ['영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.'],
        };
      }

      return { valid: true, messages: [] };
    }
    case 'basic': {
      const messages: string[] = [];
      if (!hasText(formState?.couple.groom.name)) {
        messages.push('신랑 이름을 입력해 주세요.');
      }
      if (!hasText(formState?.couple.bride.name)) {
        messages.push('신부 이름을 입력해 주세요.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'schedule': {
      const messages: string[] = [];
      if (!formState || !buildWeddingDateObject(formState)) {
        messages.push('올바른 예식 날짜와 시간을 입력해 주세요.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'venue': {
      const messages: string[] = [];
      if (!hasText(formState?.venue)) {
        messages.push('예식장 이름을 입력해 주세요.');
      }
      if (!hasText(formState?.pageData?.ceremonyAddress)) {
        messages.push('예식장 주소를 입력해 주세요.');
      }
      if (!isValidUrl(formState?.pageData?.mapUrl)) {
        messages.push('지도 링크는 http 또는 https로 시작해야 합니다.');
      }
      if (!isValidPhone(formState?.pageData?.ceremonyContact)) {
        messages.push('예식장 연락처 형식을 확인해 주세요.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'greeting': {
      const messages: string[] = [];
      if (!hasText(formState?.pageData?.greetingMessage)) {
        messages.push('인사말을 입력해 주세요.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'images': {
      const messages: string[] = [];
      if (!hasText(formState?.metadata.images.wedding)) {
        messages.push('대표 이미지를 등록해 주세요.');
      }
      if (!isValidUrl(formState?.metadata.images.wedding)) {
        messages.push('대표 이미지 주소를 확인해 주세요.');
      }
      if ((formState?.pageData?.galleryImages ?? []).some((value) => !isValidUrl(value))) {
        messages.push('갤러리 이미지 주소를 확인해 주세요.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'extra': {
      const accounts = [
        ...(formState?.pageData?.giftInfo?.groomAccounts ?? []),
        ...(formState?.pageData?.giftInfo?.brideAccounts ?? []),
      ];

      const hasPartialAccount = accounts.some((account) => {
        const filledCount = [
          hasText(account.bank),
          hasText(account.accountNumber),
          hasText(account.accountHolder),
        ].filter(Boolean).length;

        return filledCount > 0 && filledCount < 3;
      });

      return {
        valid: !hasPartialAccount,
        messages: hasPartialAccount
          ? ['계좌를 입력했다면 은행명, 계좌번호, 예금주를 모두 입력해 주세요.']
          : [],
      };
    }
    case 'final':
    default:
      return { valid: true, messages: [] };
  }
}

export function buildReviewSummary(
  theme: InvitationThemeKey | null,
  formState: InvitationPageSeed | null,
  slugInput: string,
  persistedSlug: string | null
) {
  return WIZARD_STEPS.map((step) => ({
    step,
    validation: buildStepValidation(step.key, theme, formState, slugInput, persistedSlug),
  }));
}
