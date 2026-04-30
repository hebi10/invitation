import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import { findInvitationMusicTrackById } from '@/lib/musicLibrary';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import { isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  DEFAULT_EVENT_TYPE,
  getEventTypeMeta,
  normalizeEventTypeKey,
  type EventTypeKey,
} from '@/lib/eventTypes';
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
  | 'eventType'
  | 'theme'
  | 'slug'
  | 'basic'
  | 'schedule'
  | 'venue'
  | 'greeting'
  | 'images'
  | 'extra'
  | 'music'
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

type WizardStepTemplate = Omit<WizardStepDefinition, 'number'>;

export type SlugStepState = {
  slugInput: string;
  persistedSlug: string | null;
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
};

const THEME_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'theme',
  title: '디자인과 상품 선택',
  description: '청첩장 기본 디자인과 상품 구성을 먼저 선택합니다.',
  previewSection: 'cover',
  highlights: ['기본 디자인', '상품 등급', '사용 가능 기능 확인'],
};

const EVENT_TYPE_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'eventType',
  title: '이벤트 타입 선택',
  description: '생성할 페이지의 이벤트 타입을 먼저 선택합니다.',
  previewSection: 'metadata',
  highlights: ['이벤트 타입', '공개 페이지 renderer', 'wizard step 구성'],
};

const SLUG_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'slug',
  title: '페이지 주소 설정',
  description: '청첩장에 사용할 최종 URL 주소를 정합니다.',
  previewSection: 'cover',
  highlights: ['공개 URL', '중복 주소 자동 보정', '확인 후 청첩장 생성'],
};

const BASIC_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'basic',
  title: '기본 정보',
  description: '첫 화면에 보일 이름과 짧은 문구를 입력합니다.',
  previewSection: 'cover',
  highlights: ['신랑 이름', '신부 이름', '표지 제목과 부제'],
};

const BIRTHDAY_THEME_STEP_TEMPLATE: WizardStepTemplate = {
  ...THEME_STEP_TEMPLATE,
  description: '생일 초대장에 사용할 디자인과 서비스 구성을 선택합니다.',
  highlights: ['생일 디자인', '상품 등급', '사용 가능 기능 확인'],
};

const BIRTHDAY_BASIC_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'basic',
  title: '생일 주인공 정보',
  description: '첫 화면에 보일 생일 주인공 이름과 소개 문구를 입력합니다.',
  previewSection: 'cover',
  highlights: ['생일 주인공 이름', '표지 제목과 부제', '소개 문구'],
};

const BIRTHDAY_SCHEDULE_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'schedule',
  title: '파티 일정과 장소',
  description: '파티 날짜, 시간, 장소와 오시는 길 정보를 입력합니다.',
  previewSection: 'wedding',
  highlights: ['파티 날짜와 시간', '파티 장소', '주소와 지도'],
};

const BIRTHDAY_GREETING_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'greeting',
  title: '초대 문구',
  description: '생일 초대장에 노출할 초대 문구와 서명을 입력합니다.',
  previewSection: 'greeting',
  highlights: ['초대 문구', '초대장 서명', '참석 안내'],
};

const SCHEDULE_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'schedule',
  title: '예식 일정과 장소',
  description: '예식 날짜, 시간, 장소와 오시는 길 정보를 한 번에 입력합니다.',
  previewSection: 'wedding',
  highlights: ['예식 날짜와 시간', '본식 장소', '예식장 이름과 주소'],
};

const GREETING_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'greeting',
  title: '인사말과 가족 정보',
  description: '인사말과 양가 정보를 입력합니다.',
  previewSection: 'greeting',
  highlights: ['인사말', '신랑·신부 정보', '혼주 연락처'],
};

const IMAGES_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'images',
  title: '사진',
  description: '대표 이미지와 갤러리 이미지를 등록합니다.',
  previewSection: 'gallery',
  highlights: ['대표 이미지', '갤러리 순서', '노출 이미지'],
};

const EXTRA_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'extra',
  title: '추가 정보',
  description: '축의금, 교통 안내, 화환 안내, 배경음악을 필요한 만큼 설정합니다.',
  previewSection: 'gift',
  highlights: ['축의금 계좌', '교통·화환 안내', '배경음악'],
};

const BIRTHDAY_EXTRA_STEP_TEMPLATE: WizardStepTemplate = {
  ...EXTRA_STEP_TEMPLATE,
  title: '추가 안내',
  description: '교통, 드레스코드, 준비물 같은 참석 안내를 필요한 만큼 설정합니다.',
  highlights: ['교통 안내', '참석 안내', '배경음악'],
};

const MUSIC_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'music',
  title: '배경음악',
  description: '필요한 경우에만 배경음악을 켜고 곡과 볼륨을 따로 설정합니다.',
  previewSection: 'metadata',
  highlights: ['사용 여부', '카테고리', '곡 선택과 볼륨'],
};

const FINAL_STEP_TEMPLATE: WizardStepTemplate = {
  key: 'final',
  title: '최종 확인',
  description: '공개 여부와 공유 문구를 확인하고 저장합니다.',
  previewSection: 'metadata',
  highlights: ['공개 상태', '공유 제목', '공유 설명'],
};

function withStepNumbers(steps: WizardStepTemplate[]): WizardStepDefinition[] {
  return steps.map((step, index) => ({
    ...step,
    number: String(index + 1).padStart(2, '0'),
  }));
}

const WIZARD_STEP_TEMPLATE_MAP: Record<WizardStepKey, WizardStepTemplate> = {
  eventType: EVENT_TYPE_STEP_TEMPLATE,
  theme: THEME_STEP_TEMPLATE,
  slug: SLUG_STEP_TEMPLATE,
  basic: BASIC_STEP_TEMPLATE,
  schedule: SCHEDULE_STEP_TEMPLATE,
  venue: SCHEDULE_STEP_TEMPLATE,
  greeting: GREETING_STEP_TEMPLATE,
  images: IMAGES_STEP_TEMPLATE,
  extra: EXTRA_STEP_TEMPLATE,
  music: MUSIC_STEP_TEMPLATE,
  final: FINAL_STEP_TEMPLATE,
};

const BIRTHDAY_WIZARD_STEP_TEMPLATE_MAP: Partial<
  Record<WizardStepKey, WizardStepTemplate>
> = {
  theme: BIRTHDAY_THEME_STEP_TEMPLATE,
  basic: BIRTHDAY_BASIC_STEP_TEMPLATE,
  schedule: BIRTHDAY_SCHEDULE_STEP_TEMPLATE,
  greeting: BIRTHDAY_GREETING_STEP_TEMPLATE,
  extra: BIRTHDAY_EXTRA_STEP_TEMPLATE,
};

export type WizardStepConfigKey =
  | 'wedding-page-wizard'
  | 'first-birthday-page-wizard'
  | 'birthday-page-wizard'
  | 'general-event-page-wizard'
  | 'seventieth-page-wizard'
  | 'generic-page-wizard';

type WizardStepConfigDefinition = {
  key: WizardStepConfigKey;
  eventType: EventTypeKey;
  commonSetupSteps: WizardStepKey[];
  eventSpecificSteps: WizardStepKey[];
  editSteps: WizardStepKey[];
};

const WEDDING_EVENT_STEP_KEYS: WizardStepKey[] = [
  'basic',
  'schedule',
  'greeting',
  'images',
  'music',
  'extra',
  'final',
];

const BIRTHDAY_EVENT_STEP_KEYS: WizardStepKey[] = [
  'basic',
  'schedule',
  'greeting',
  'images',
  'music',
  'extra',
  'final',
];

const FIRST_BIRTHDAY_EVENT_STEP_KEYS: WizardStepKey[] = [
  'basic',
  'schedule',
  'greeting',
  'images',
  'music',
  'extra',
  'final',
];

const GENERAL_EVENT_STEP_KEYS: WizardStepKey[] = [
  'basic',
  'schedule',
  'greeting',
  'images',
  'extra',
  'final',
];

const WIZARD_STEP_CONFIGS: Record<WizardStepConfigKey, WizardStepConfigDefinition> = {
  'wedding-page-wizard': {
    key: 'wedding-page-wizard',
    eventType: 'wedding',
    commonSetupSteps: ['eventType', 'theme', 'slug'],
    eventSpecificSteps: WEDDING_EVENT_STEP_KEYS,
    editSteps: WEDDING_EVENT_STEP_KEYS,
  },
  'birthday-page-wizard': {
    key: 'birthday-page-wizard',
    eventType: 'birthday',
    commonSetupSteps: ['eventType', 'theme', 'slug'],
    eventSpecificSteps: BIRTHDAY_EVENT_STEP_KEYS,
    editSteps: BIRTHDAY_EVENT_STEP_KEYS,
  },
  'first-birthday-page-wizard': {
    key: 'first-birthday-page-wizard',
    eventType: 'first-birthday',
    commonSetupSteps: ['eventType', 'theme', 'slug'],
    eventSpecificSteps: FIRST_BIRTHDAY_EVENT_STEP_KEYS,
    editSteps: FIRST_BIRTHDAY_EVENT_STEP_KEYS,
  },
  'general-event-page-wizard': {
    key: 'general-event-page-wizard',
    eventType: 'general-event',
    commonSetupSteps: ['eventType', 'theme', 'slug'],
    eventSpecificSteps: GENERAL_EVENT_STEP_KEYS,
    editSteps: GENERAL_EVENT_STEP_KEYS,
  },
  'seventieth-page-wizard': {
    key: 'seventieth-page-wizard',
    eventType: 'seventieth',
    commonSetupSteps: ['eventType', 'theme', 'slug'],
    eventSpecificSteps: WEDDING_EVENT_STEP_KEYS,
    editSteps: WEDDING_EVENT_STEP_KEYS,
  },
  'generic-page-wizard': {
    key: 'generic-page-wizard',
    eventType: 'etc',
    commonSetupSteps: ['eventType', 'theme', 'slug'],
    eventSpecificSteps: WEDDING_EVENT_STEP_KEYS,
    editSteps: WEDDING_EVENT_STEP_KEYS,
  },
};

function getWizardStepTemplate(stepKey: WizardStepKey, eventType?: EventTypeKey) {
  if (eventType === 'birthday') {
    return BIRTHDAY_WIZARD_STEP_TEMPLATE_MAP[stepKey] ?? WIZARD_STEP_TEMPLATE_MAP[stepKey];
  }

  return WIZARD_STEP_TEMPLATE_MAP[stepKey];
}

function buildWizardStepsFromKeys(stepKeys: WizardStepKey[], eventType?: EventTypeKey) {
  return withStepNumbers(stepKeys.map((stepKey) => getWizardStepTemplate(stepKey, eventType)));
}

export function resolveWizardStepConfig(eventType: unknown) {
  const normalizedEventType = normalizeEventTypeKey(eventType, DEFAULT_EVENT_TYPE);
  const stepConfigKey =
    getEventTypeMeta(normalizedEventType).defaultWizardStepConfigKey as WizardStepConfigKey;

  return WIZARD_STEP_CONFIGS[stepConfigKey] ?? WIZARD_STEP_CONFIGS['wedding-page-wizard'];
}

export function getWizardSteps(options: {
  eventType?: EventTypeKey;
  includeSetupSteps: boolean;
  includeMusic?: boolean;
}) {
  const stepConfig = resolveWizardStepConfig(options.eventType);
  const baseKeys = options.includeSetupSteps
    ? [...stepConfig.commonSetupSteps, ...stepConfig.eventSpecificSteps]
    : [...stepConfig.editSteps];
  const stepKeys =
    options.includeMusic === false ? baseKeys.filter((stepKey) => stepKey !== 'music') : baseKeys;

  return buildWizardStepsFromKeys(stepKeys, stepConfig.eventType);
}

export const CREATE_WIZARD_STEPS = buildWizardStepsFromKeys([
  ...WIZARD_STEP_CONFIGS['wedding-page-wizard'].commonSetupSteps,
  ...WIZARD_STEP_CONFIGS['wedding-page-wizard'].eventSpecificSteps,
]);

export const CUSTOMER_WIZARD_STEPS = buildWizardStepsFromKeys(
  WIZARD_STEP_CONFIGS['wedding-page-wizard'].editSteps
);

export const WIZARD_STEPS = CREATE_WIZARD_STEPS;
export const DEFAULT_GREETING_MESSAGE = `두 사람이 사랑으로 하나가 되는 순간을
함께해 주시는 모든 분들께 감사드립니다.

새로운 시작을 따뜻한 마음으로
축복해 주시면 더없는 기쁨이겠습니다.`;

export const DEFAULT_BIRTHDAY_GREETING_MESSAGE = `소중한 분들과 함께
특별한 날을 나누고 싶어요.

편한 마음으로 오셔서
따뜻한 축하를 전해 주세요.`;

export const GREETING_TEMPLATES = [
  {
    label: '격식형',
    value:
      `두 사람이 사랑으로 하나가 되는 순간을
함께해 주시는 모든 분들께 감사드립니다.

새로운 시작을 따뜻한 마음으로
축복해 주시면 더없는 기쁨이겠습니다.`,
  },
  {
    label: '따뜻한형',
    value:
      `서로의 마음을 모아 하나가 되는 날,
소중한 분들과 이 기쁨을 함께 나누고 싶습니다.

귀한 걸음으로 오셔서
따뜻한 축복 보내주시면 감사하겠습니다.`,
  },
  {
    label: '담백형',
    value:
      `두 사람의 새로운 시작에
함께해 주시면 큰 기쁨이겠습니다.

편한 마음으로 오셔서
축복해 주세요.`,
  },
];

export const BIRTHDAY_GREETING_TEMPLATES = [
  {
    label: '따뜻한 초대',
    value: DEFAULT_BIRTHDAY_GREETING_MESSAGE,
  },
  {
    label: '담백한 초대',
    value:
      `작지만 소중한 생일 자리를 마련했습니다.

함께 웃고 이야기 나누며
즐거운 시간을 보내면 좋겠습니다.`,
  },
  {
    label: '파티형',
    value:
      `생일을 핑계 삼아
좋아하는 사람들과 즐거운 시간을 보내려 합니다.

가벼운 마음으로 함께해 주세요.`,
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

export function composeBirthdayDisplayName(name: string) {
  return name.trim() || '생일 주인공';
}

export function composeBirthdayDescription(name: string) {
  const birthdayName = name.trim() || '소중한 분';
  return `${birthdayName}님의 생일 자리에 초대합니다.`;
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
  const normalizedEventType = normalizeEventTypeKey(nextConfig.eventType, DEFAULT_EVENT_TYPE);
  const isBirthday = normalizedEventType === 'birthday';
  const isGeneralEvent = nextConfig.eventType === 'general-event';
  const isFirstBirthday = nextConfig.eventType === 'first-birthday';
  const groomName = nextConfig.couple.groom.name.trim();
  const brideName = nextConfig.couple.bride.name.trim();
  const babyName =
    nextConfig.displayName.trim() || nextConfig.metadata.title.trim() || nextConfig.groomName.trim();
  const weddingDate = buildWeddingDateObject(nextConfig);

  nextConfig.groomName = groomName;
  nextConfig.brideName = isBirthday ? '' : brideName;
  nextConfig.displayName =
    nextConfig.displayName.trim() ||
    (isBirthday
      ? composeBirthdayDisplayName(groomName)
      : isFirstBirthday
      ? babyName || '아기 이름'
      : isGeneralEvent
        ? groomName || '일반 행사'
        : composeDisplayName(groomName, brideName));
  nextConfig.description =
    nextConfig.description.trim() ||
    (isBirthday
      ? composeBirthdayDescription(groomName)
      : isFirstBirthday
      ? `${nextConfig.displayName}의 첫 번째 생일잔치에 초대합니다.`
      : isGeneralEvent
        ? `${nextConfig.displayName}에 초대합니다.`
        : composeDescription(groomName, brideName));
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
  nextConfig.metadata.images.social =
    nextConfig.metadata.images.social?.trim() || '';
  nextConfig.metadata.images.kakaoCard =
    nextConfig.metadata.images.kakaoCard?.trim() || '';

  if (weddingDate) {
    nextConfig.date = formatDateLabel(weddingDate);
    if (nextConfig.pageData) {
      nextConfig.pageData.ceremonyTime = formatTimeLabel(weddingDate);
      nextConfig.pageData.ceremony = {
        ...nextConfig.pageData.ceremony,
        time: formatTimeLabel(weddingDate),
      };
    }
  }

  if (nextConfig.pageData) {
    nextConfig.pageData.venueName =
      nextConfig.pageData.venueName?.trim() || nextConfig.venue;
    nextConfig.pageData.greetingAuthor =
      nextConfig.pageData.greetingAuthor?.trim() ||
      (isBirthday
        ? composeBirthdayDisplayName(groomName)
        : isFirstBirthday
        ? `${groomName || '아빠'} · ${brideName || '엄마'}`
        : isGeneralEvent
          ? '주최자'
          : composeGreetingAuthor(groomName, brideName));
    nextConfig.pageData.groom = cloneConfig(nextConfig.couple.groom);
    nextConfig.pageData.bride = cloneConfig(nextConfig.couple.bride);
  }

  return nextConfig;
}

export function createInitialWizardConfig(eventType: EventTypeKey = DEFAULT_EVENT_TYPE) {
  const seed = getAllWeddingPageSeeds()[0];
  if (!seed) {
    throw new Error('청첩장 기본 템플릿을 찾을 수 없습니다.');
  }

  const nextConfig = normalizeFormConfig(cloneConfig(seed));

  nextConfig.eventType = normalizeEventTypeKey(eventType, DEFAULT_EVENT_TYPE);
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
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
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
  nextConfig.metadata.images.social = '';
  nextConfig.metadata.images.kakaoCard = '';
  nextConfig.productTier = DEFAULT_INVITATION_PRODUCT_TIER;
  nextConfig.features = resolveInvitationFeatures(DEFAULT_INVITATION_PRODUCT_TIER);
  nextConfig.musicEnabled = false;
  nextConfig.musicCategoryId = '';
  nextConfig.musicTrackId = '';
  nextConfig.musicStoragePath = '';
  nextConfig.musicUrl = '';
  nextConfig.pageData = {
    ...nextConfig.pageData,
    subtitle: '',
    ceremonyTime: '',
    ceremonyAddress: '',
    ceremonyContact: '',
    ceremony: {
      time: '',
      location: '',
    },
    reception: {
      time: '',
      location: '',
    },
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

  if (nextConfig.eventType === 'general-event') {
    nextConfig.description = '소중한 자리에 초대합니다.';
    nextConfig.pageData.subtitle = 'General Event';
    nextConfig.pageData.greetingMessage = `소중한 분들을 모시고 뜻깊은 시간을 함께 나누고자 합니다.

편한 마음으로 참석하셔서 자리를 빛내 주세요.`;
    nextConfig.pageData.greetingAuthor = '주최자';
  }

  if (nextConfig.eventType === 'birthday') {
    nextConfig.description = '소중한 생일 자리에 초대합니다.';
    nextConfig.pageData.subtitle = '소중한 분들과 함께하는 특별한 하루';
    nextConfig.pageData.greetingMessage = DEFAULT_BIRTHDAY_GREETING_MESSAGE;
    nextConfig.pageData.greetingAuthor = '';
  }

  if (nextConfig.eventType === 'first-birthday') {
    nextConfig.description = '첫 번째 생일잔치에 초대합니다.';
    nextConfig.pageData.subtitle = '첫 번째 생일잔치에 초대합니다';
    nextConfig.pageData.greetingMessage = `어느새 첫 번째 생일을 맞이한 우리 아이의 특별한 날에
소중한 분들을 모시고 감사한 마음을 나누고자 합니다.

따뜻한 축하로 함께해 주시면 큰 기쁨이겠습니다.`;
    nextConfig.pageData.greetingAuthor = '아빠 · 엄마';
  }

  return nextConfig;
}

export function prepareWizardConfigForSave(config: InvitationPageSeed, slug: string) {
  const withDefaults = applyDerivedWizardDefaults(config);
  const prepared = prepareConfigForSave(
    {
      ...withDefaults,
      eventType: normalizeEventTypeKey(withDefaults.eventType, DEFAULT_EVENT_TYPE),
      slug,
    },
    slug
  );
  const features = resolveInvitationFeatures(prepared.productTier, prepared.features);
  prepared.features = features;

  if (prepared.pageData?.galleryImages) {
    prepared.pageData.galleryImages = prepared.pageData.galleryImages
      .map((imageUrl) => imageUrl.trim())
      .filter(Boolean)
      .slice(0, features.maxGalleryImages);
  }

  const weddingDate = buildWeddingDateObject(prepared);
  if (weddingDate) {
    prepared.date = formatDateLabel(weddingDate);
    if (prepared.pageData) {
      prepared.pageData.ceremonyTime = formatTimeLabel(weddingDate);
      prepared.pageData.ceremony = {
        ...prepared.pageData.ceremony,
        time: formatTimeLabel(weddingDate),
      };
    }
  }

  prepared.metadata.images.favicon =
    prepared.metadata.images.favicon.trim() || '/favicon.ico';
  prepared.metadata.images.social =
    prepared.metadata.images.social?.trim() || '';
  prepared.metadata.images.kakaoCard =
    prepared.metadata.images.kakaoCard?.trim() || '';

  return prepared;
}

export function buildStepValidation(
  stepKey: WizardStepKey,
  theme: InvitationThemeKey | null,
  formState: InvitationPageSeed | null,
  slugState: SlugStepState
): StepValidation {
  if (!formState && stepKey !== 'theme' && stepKey !== 'slug') {
    return { valid: false, messages: ['페이지 데이터를 먼저 불러와 주세요.'] };
  }

  switch (stepKey) {
    case 'eventType': {
      const selectedEventType = normalizeEventTypeKey(formState?.eventType, DEFAULT_EVENT_TYPE);
      const eventTypeMeta = getEventTypeMeta(selectedEventType);
      const messages: string[] = [];

      if (!eventTypeMeta.enabled) {
        messages.push('현재 선택한 이벤트 타입은 아직 생성에 사용할 수 없습니다.');
      }

      return { valid: messages.length === 0, messages };
    }
    case 'theme': {
      const hasValidTheme = isInvitationThemeKey(theme);
      const hasValidTier =
        formState?.productTier === 'standard' ||
        formState?.productTier === 'deluxe' ||
        formState?.productTier === 'premium';

      return {
        valid: hasValidTheme && hasValidTier,
        messages: hasValidTheme && hasValidTier ? [] : ['디자인과 상품 구성을 먼저 선택해 주세요.'],
      };
    }
    case 'slug': {
      const messages: string[] = [];
      const isGeneralEvent = formState?.eventType === 'general-event';
      const isFirstBirthday = formState?.eventType === 'first-birthday';
      const isBirthday = formState?.eventType === 'birthday';

      if (!hasText(slugState.groomKoreanName)) {
        messages.push(
          isBirthday
            ? '생일 주인공 이름을 입력해 주세요.'
            : isFirstBirthday
            ? '아기 이름을 입력해 주세요.'
            : isGeneralEvent
              ? '행사명을 입력해 주세요.'
              : '예비 신랑 한글 이름을 입력해 주세요.'
        );
      }
      if (!isGeneralEvent && !isFirstBirthday && !isBirthday && !hasText(slugState.brideKoreanName)) {
        messages.push('예비 신부 한글 이름을 입력해 주세요.');
      }
      if (!slugState.persistedSlug && !hasText(slugState.groomEnglishName)) {
        messages.push(
          isBirthday
            ? '생일 주인공 영문 표기를 입력해 주세요.'
            : isFirstBirthday
            ? '아기 이름 영문 표기를 입력해 주세요.'
            : isGeneralEvent
              ? '주소 영문 키워드를 입력해 주세요.'
              : '예비 신랑 영문 이름을 입력해 주세요.'
        );
      }
      if (
        !isGeneralEvent &&
        !isFirstBirthday &&
        !isBirthday &&
        !slugState.persistedSlug &&
        !hasText(slugState.brideEnglishName)
      ) {
        messages.push('예비 신부 영문 이름을 입력해 주세요.');
      }
      const rawSlug = slugState.slugInput.trim();
      if (!rawSlug) {
        messages.push('페이지 주소를 입력해 주세요.');
        return { valid: false, messages };
      }

      const normalizedSlug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!normalizedSlug || normalizedSlug !== rawSlug.toLowerCase()) {
        messages.push('영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
      }

      return { valid: messages.length === 0, messages };
    }
    case 'basic': {
      const messages: string[] = [];
      if (formState?.eventType === 'first-birthday') {
        if (!hasText(formState?.displayName)) {
          messages.push('아기 이름을 입력해 주세요.');
        }
        if (!hasText(formState?.couple.groom.name)) {
          messages.push('아빠 이름을 입력해 주세요.');
        }
        if (!hasText(formState?.couple.bride.name)) {
          messages.push('엄마 이름을 입력해 주세요.');
        }
        return { valid: messages.length === 0, messages };
      }

      if (formState?.eventType === 'general-event') {
        if (!hasText(formState?.displayName)) {
          messages.push('행사명을 입력해 주세요.');
        }
        return { valid: messages.length === 0, messages };
      }

      if (formState?.eventType === 'birthday') {
        if (!hasText(formState?.couple.groom.name)) {
          messages.push('생일 주인공 이름을 입력해 주세요.');
        }
        return { valid: messages.length === 0, messages };
      }

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
        messages.push(
          formState?.eventType === 'birthday'
            ? '올바른 파티 날짜와 시간을 입력해 주세요.'
            : formState?.eventType === 'first-birthday'
            ? '올바른 돌잔치 날짜와 시간을 입력해 주세요.'
            : '올바른 예식 날짜와 시간을 입력해 주세요.'
        );
      }
      if (!hasText(formState?.venue)) {
        messages.push(
          formState?.eventType === 'birthday'
            ? '파티 장소명을 입력해 주세요.'
            : formState?.eventType === 'first-birthday'
            ? '돌잔치 장소명을 입력해 주세요.'
            : '예식장 이름을 입력해 주세요.'
        );
      }
      if (!hasText(formState?.pageData?.ceremonyAddress)) {
        messages.push(
          formState?.eventType === 'birthday'
            ? '파티 장소 주소를 입력해 주세요.'
            : formState?.eventType === 'first-birthday'
            ? '돌잔치 장소 주소를 입력해 주세요.'
            : '예식장 주소를 입력해 주세요.'
        );
      }
      if (
        !formState?.pageData?.kakaoMap ||
        !Number.isFinite(formState.pageData.kakaoMap.latitude) ||
        !Number.isFinite(formState.pageData.kakaoMap.longitude) ||
        formState.pageData.kakaoMap.latitude === 0 ||
        formState.pageData.kakaoMap.longitude === 0
      ) {
        messages.push('주소 검색으로 지도 좌표를 확인해 주세요.');
      }
      if (!isValidUrl(formState?.pageData?.mapUrl)) {
        messages.push('지도 링크는 http 또는 https로 시작해야 합니다.');
      }
      if (!isValidPhone(formState?.pageData?.ceremonyContact)) {
        messages.push(
          formState?.eventType === 'birthday'
            ? '파티 장소 연락처 형식을 확인해 주세요.'
            : '예식장 연락처 형식을 확인해 주세요.'
        );
      }
      return { valid: messages.length === 0, messages };
    }
    case 'venue':
      return buildStepValidation('schedule', theme, formState, slugState);
    case 'greeting': {
      const messages: string[] = [];
      if (!hasText(formState?.pageData?.greetingMessage)) {
        messages.push(
          formState?.eventType === 'birthday'
            ? '초대 문구를 입력해 주세요.'
            : '인사말을 입력해 주세요.'
        );
      }
      return { valid: messages.length === 0, messages };
    }
    case 'images': {
      const messages: string[] = [];
      if (!hasText(formState?.metadata.images.wedding)) {
        messages.push('대표 이미지를 업로드해 주세요.');
      }
      if (
        hasText(formState?.metadata.images.wedding) &&
        !isValidUrl(formState?.metadata.images.wedding)
      ) {
        messages.push('대표 이미지를 다시 업로드해 주세요.');
      }
      if ((formState?.pageData?.galleryImages ?? []).some((value) => !isValidUrl(value))) {
        messages.push('갤러리 이미지를 다시 업로드해 주세요.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'extra': {
      const messages: string[] = [];
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

      if (hasPartialAccount) {
        messages.push('계좌를 입력했다면 은행명, 계좌번호, 예금주를 모두 입력해 주세요.');
      }

      return { valid: messages.length === 0, messages };
    }
    case 'music': {
      const messages: string[] = [];
      const musicEnabled = Boolean(formState?.musicEnabled);

      if (musicEnabled && !hasText(formState?.musicStoragePath) && !hasText(formState?.musicUrl)) {
        messages.push('배경음악을 켠 경우 사용할 곡을 먼저 선택해 주세요.');
      }

      if (
        musicEnabled &&
        hasText(formState?.musicTrackId) &&
        !findInvitationMusicTrackById(formState?.musicTrackId)
      ) {
        messages.push('선택한 배경음악이 라이브러리에 없습니다. 곡을 다시 선택해 주세요.');
      }

      if (
        typeof formState?.musicVolume === 'number' &&
        (formState.musicVolume < 0 || formState.musicVolume > 1)
      ) {
        messages.push('배경음악 볼륨은 0에서 1 사이 값으로 저장됩니다.');
      }

      return { valid: messages.length === 0, messages };
    }
    case 'final':
    default:
      return { valid: true, messages: [] };
  }
}

export function buildReviewSummary(
  steps: WizardStepDefinition[],
  theme: InvitationThemeKey | null,
  formState: InvitationPageSeed | null,
  slugState: SlugStepState
) {
  return steps.map((step) => ({
    step,
    validation: buildStepValidation(step.key, theme, formState, slugState),
  }));
}
