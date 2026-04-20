import type {
  MobileInvitationAccountItem,
  MobileInvitationDashboard,
  MobileInvitationGiftInfo,
  MobileInvitationGuideItem,
  MobileInvitationKakaoMapData,
  MobileInvitationMetadata,
  MobileInvitationPageData,
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';
import { DEFAULT_INVITATION_THEME } from '../../lib/invitationThemes';
import { createRandomSuffix } from '../../lib/id';

export type ManageParentState = {
  relation: string;
  name: string;
  phone: string;
};

export type ManagePersonState = {
  name: string;
  order: string;
  phone: string;
  father: ManageParentState;
  mother: ManageParentState;
};

export type ManageFormState = {
  displayName: string;
  subtitle: string;
  description: string;
  groom: ManagePersonState;
  bride: ManagePersonState;
  date: string;
  venue: string;
  ceremonyTime: string;
  ceremonyLocation: string;
  receptionTime: string;
  receptionLocation: string;
  ceremonyAddress: string;
  ceremonyContact: string;
  mapDescription: string;
  mapUrl: string;
  kakaoLatitude: string;
  kakaoLongitude: string;
  kakaoLevel: string;
  kakaoMarkerTitle: string;
  greetingMessage: string;
  greetingAuthor: string;
  coverImageUrl: string;
  coverImageThumbnailUrl: string;
  galleryImages: string[];
  galleryImageThumbnailUrls: string[];
  galleryImagesText: string;
  giftMessage: string;
  groomAccountsText: string;
  brideAccountsText: string;
  venueGuideText: string;
  wreathGuideText: string;
  shareTitle: string;
  shareDescription: string;
  musicEnabled: boolean;
  musicCategoryId: string;
  musicTrackId: string;
  musicStoragePath: string;
  musicVolume: string;
  published: boolean;
  defaultTheme: MobileInvitationThemeKey;
};

export type ManageStringFieldKey = {
  [K in keyof ManageFormState]: ManageFormState[K] extends string ? K : never;
}[keyof ManageFormState];

export type GuestbookSortKey = 'latest' | 'oldest' | 'author-asc' | 'author-desc';
export type MusicDropdownPanel = 'category' | 'track' | null;
export type EditableImageAssetKind = 'cover' | 'gallery';
export type EditorStepKey =
  | 'basic'
  | 'schedule'
  | 'location'
  | 'greeting'
  | 'images'
  | 'music'
  | 'settings';

export type EditorStep = {
  key: EditorStepKey;
  title: string;
  description: string;
};

export type ManageGalleryPreviewItem = {
  id: string;
  originalUrl: string;
  previewUrl: string;
};

export const ONBOARDING_STEPS = [
  {
    key: 'cover',
    title: '1. 기본 문구와 이름',
    description: '제목, 소개 문구, 신랑과 신부 이름을 먼저 확인합니다.',
  },
  {
    key: 'schedule',
    title: '2. 예식 일정과 장소',
    description: '예식 일시와 장소, 상세 주소를 입력해 공개 페이지의 기본 정보를 채웁니다.',
  },
  {
    key: 'greeting',
    title: '3. 인사말과 공개 상태',
    description: '인사말을 입력하고, 저장 직후 공개 여부를 마지막으로 결정합니다.',
  },
] as const;

export const EDITOR_STEPS: EditorStep[] = [
  {
    key: 'basic',
    title: '기본 정보',
    description: '페이지 제목, 신랑·신부, 혼주 정보를 먼저 정리합니다.',
  },
  {
    key: 'schedule',
    title: '예식 일정',
    description: '예식 일시와 본식·피로연 장소 정보를 자세히 입력합니다.',
  },
  {
    key: 'location',
    title: '지도와 위치',
    description: '예식장 주소를 검색하고 실제 연결되는 지도를 앱 안에서 확인합니다.',
  },
  {
    key: 'greeting',
    title: '인사말과 안내',
    description: '인사말, 축의금 계좌, 교통·화환 안내 문구를 정리합니다.',
  },
  {
    key: 'images',
    title: '이미지',
    description: '대표 이미지와 갤러리를 실제 미리보기 기준으로 정렬합니다.',
  },
  {
    key: 'music',
    title: '배경음악',
    description: '배경음악 사용 여부와 곡 선택, 볼륨을 따로 관리합니다.',
  },
  {
    key: 'settings',
    title: '공유와 공개 설정',
    description: '공유 문구와 공개 상태를 마지막으로 확인합니다.',
  },
];

export const GUESTBOOK_PAGE_SIZE = 8;
export const DEFAULT_MUSIC_VOLUME = 0.35;

export const GUESTBOOK_SORT_OPTIONS: Array<{ key: GuestbookSortKey; label: string }> = [
  { key: 'latest', label: '최신순' },
  { key: 'oldest', label: '오래된순' },
  { key: 'author-asc', label: '작성자 가나다' },
  { key: 'author-desc', label: '작성자 역순' },
];

export const EMPTY_PARENT: ManageParentState = {
  relation: '',
  name: '',
  phone: '',
};

export const EMPTY_PERSON: ManagePersonState = {
  name: '',
  order: '',
  phone: '',
  father: { ...EMPTY_PARENT },
  mother: { ...EMPTY_PARENT },
};

export const EMPTY_FORM: ManageFormState = {
  displayName: '',
  subtitle: '',
  description: '',
  groom: { ...EMPTY_PERSON },
  bride: { ...EMPTY_PERSON },
  date: '',
  venue: '',
  ceremonyTime: '',
  ceremonyLocation: '',
  receptionTime: '',
  receptionLocation: '',
  ceremonyAddress: '',
  ceremonyContact: '',
  mapDescription: '',
  mapUrl: '',
  kakaoLatitude: '',
  kakaoLongitude: '',
  kakaoLevel: '',
  kakaoMarkerTitle: '',
  greetingMessage: '',
  greetingAuthor: '',
  coverImageUrl: '',
  coverImageThumbnailUrl: '',
  galleryImages: [],
  galleryImageThumbnailUrls: [],
  galleryImagesText: '',
  giftMessage: '',
  groomAccountsText: '',
  brideAccountsText: '',
  venueGuideText: '',
  wreathGuideText: '',
  shareTitle: '',
  shareDescription: '',
  musicEnabled: false,
  musicCategoryId: '',
  musicTrackId: '',
  musicStoragePath: '',
  musicVolume: '',
  published: false,
  defaultTheme: DEFAULT_INVITATION_THEME,
};

export function readRecord<T extends object>(value: unknown): Partial<T> {
  return typeof value === 'object' && value !== null
    ? (value as Partial<T>)
    : {};
}

export function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function readStringArray(value: unknown, maxCount?: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  if (typeof maxCount === 'number' && Number.isFinite(maxCount)) {
    return parsed.slice(0, Math.max(0, maxCount));
  }

  return parsed;
}

export function isTemporaryImagePreviewUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized.startsWith('file://') ||
    normalized.startsWith('content://') ||
    normalized.startsWith('ph://') ||
    normalized.startsWith('assets-library://') ||
    normalized.startsWith('blob:')
  );
}

export function formatAccountsText(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value
    .map((item) => {
      const account = readRecord<MobileInvitationAccountItem>(item);
      const bank = readString(account.bank).trim();
      const accountNumber = readString(account.accountNumber).trim();
      const accountHolder = readString(account.accountHolder).trim();

      if (!bank && !accountNumber && !accountHolder) {
        return '';
      }

      return `${bank}|${accountNumber}|${accountHolder}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function parseAccountsText(value: string, maxCount = 3) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [bank = '', accountNumber = '', accountHolder = ''] = line
        .split('|')
        .map((token) => token.trim());

      return {
        bank,
        accountNumber,
        accountHolder,
      };
    })
    .filter(
      (account) =>
        account.bank.length > 0 ||
        account.accountNumber.length > 0 ||
        account.accountHolder.length > 0
    )
    .slice(0, Math.max(0, maxCount));
}

export function formatGuidesText(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value
    .map((item) => {
      const guide = readRecord<MobileInvitationGuideItem>(item);
      const title = readString(guide.title).trim();
      const content = readString(guide.content).trim();

      if (!title && !content) {
        return '';
      }

      return `${title}|${content}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function parseGuidesText(value: string, maxCount = 3) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tokens = line.split('|').map((token) => token.trim());
      const title = tokens[0] ?? '';
      const content = tokens.slice(1).join('|').trim();

      return {
        title,
        content,
      };
    })
    .filter((guide) => guide.title.length > 0 || guide.content.length > 0)
    .slice(0, Math.max(0, maxCount));
}

export function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampNumber(value: number | null, min: number, max: number, fallback: number) {
  if (value === null || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

export function getCommentTimestamp(createdAt: string | null) {
  if (!createdAt) {
    return 0;
  }

  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildKakaoMapSearchUrl(address: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

export function buildKakaoMapPinUrl(placeName: string, latitude: number, longitude: number) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(placeName)},${latitude},${longitude}`;
}

export function hasValidCoordinates(latitude: number | null, longitude: number | null) {
  return (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [target] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, target);
  return nextItems;
}

export function getUploadFileExtension(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

export function buildUploadFileName(assetKind: EditableImageAssetKind, mimeType: string) {
  const extension = getUploadFileExtension(mimeType);
  return `${assetKind}-${Date.now()}-${createRandomSuffix()}.${extension}`;
}

export function toParentState(value: unknown): ManageParentState {
  const parent = readRecord<ManageParentState>(value);
  return {
    relation: readString(parent.relation),
    name: readString(parent.name),
    phone: readString(parent.phone),
  };
}

export function toPersonState(value: unknown, fallbackName = ''): ManagePersonState {
  const person = readRecord<ManagePersonState>(value);
  return {
    name: readString(person.name, fallbackName),
    order: readString(person.order),
    phone: readString(person.phone),
    father: toParentState(person.father),
    mother: toParentState(person.mother),
  };
}

export function getOnboardingValidationMessage(stepIndex: number, form: ManageFormState) {
  if (stepIndex === 0) {
    if (!form.groom.name.trim()) {
      return '신랑 이름을 입력해 주세요.';
    }

    if (!form.bride.name.trim()) {
      return '신부 이름을 입력해 주세요.';
    }

    if (!form.displayName.trim()) {
      return '페이지 제목을 입력해 주세요.';
    }
  }

  if (stepIndex === 1) {
    if (!form.date.trim()) {
      return '예식 일시를 입력해 주세요.';
    }

    if (!form.venue.trim()) {
      return '예식 장소를 입력해 주세요.';
    }

    if (!form.ceremonyAddress.trim()) {
      return '예식장 상세 주소를 입력해 주세요.';
    }
  }

  if (stepIndex === 2 && !form.greetingMessage.trim()) {
    return '인사말을 입력해 주세요.';
  }

  return null;
}

export function buildManageFormFromDashboard(
  dashboard: MobileInvitationDashboard
): ManageFormState {
  const config = dashboard.page.config;
  const pageData = readRecord<MobileInvitationPageData>(config.pageData);
  const ceremony = readRecord<NonNullable<MobileInvitationPageData['ceremony']>>(pageData.ceremony);
  const reception = readRecord<NonNullable<MobileInvitationPageData['reception']>>(pageData.reception);
  const kakaoMap = readRecord<MobileInvitationKakaoMapData>(pageData.kakaoMap);
  const giftInfo = readRecord<MobileInvitationGiftInfo>(pageData.giftInfo);
  const metadata = readRecord<MobileInvitationMetadata>(config.metadata);
  const metadataImages = readRecord<NonNullable<MobileInvitationMetadata['images']>>(metadata.images);
  const galleryThumbnailCandidates = readStringArray(pageData.galleryImageThumbnailUrls);
  const galleryImages = readStringArray(
    pageData.galleryImages,
    dashboard.page.features.maxGalleryImages
  );
  const galleryImageThumbnailUrls = galleryImages.map(
    (imageUrl, index) => galleryThumbnailCandidates[index]?.trim() || imageUrl
  );
  const coverImageUrl = readString(metadataImages.wedding);
  const coverImageThumbnailUrl =
    readString(pageData.coverImageThumbnailUrl).trim() || coverImageUrl;

  return {
    displayName: readString(config.displayName),
    subtitle: readString(pageData.subtitle),
    description: readString(config.description),
    groom: toPersonState(config.couple?.groom, config.groomName),
    bride: toPersonState(config.couple?.bride, config.brideName),
    date: readString(config.date),
    venue: readString(config.venue),
    ceremonyTime: readString(ceremony.time, readString(pageData.ceremonyTime)),
    ceremonyLocation: readString(ceremony.location),
    receptionTime: readString(reception.time),
    receptionLocation: readString(reception.location),
    ceremonyAddress: readString(pageData.ceremonyAddress),
    ceremonyContact: readString(pageData.ceremonyContact),
    mapDescription: readString(pageData.mapDescription),
    mapUrl: readString(pageData.mapUrl),
    kakaoLatitude:
      typeof kakaoMap.latitude === 'number' && Number.isFinite(kakaoMap.latitude)
        ? String(kakaoMap.latitude)
        : '',
    kakaoLongitude:
      typeof kakaoMap.longitude === 'number' && Number.isFinite(kakaoMap.longitude)
        ? String(kakaoMap.longitude)
        : '',
    kakaoLevel:
      typeof kakaoMap.level === 'number' && Number.isFinite(kakaoMap.level)
        ? String(kakaoMap.level)
        : '',
    kakaoMarkerTitle: readString(kakaoMap.markerTitle),
    greetingMessage: readString(pageData.greetingMessage),
    greetingAuthor: readString(pageData.greetingAuthor),
    coverImageUrl,
    coverImageThumbnailUrl,
    galleryImages,
    galleryImageThumbnailUrls,
    galleryImagesText: galleryImages.join('\n'),
    giftMessage: readString(giftInfo.message),
    groomAccountsText: formatAccountsText(giftInfo.groomAccounts),
    brideAccountsText: formatAccountsText(giftInfo.brideAccounts),
    venueGuideText: formatGuidesText(pageData.venueGuide),
    wreathGuideText: formatGuidesText(pageData.wreathGuide),
    shareTitle: readString(metadata.title),
    shareDescription: readString(metadata.description),
    musicEnabled: dashboard.page.features.showMusic ? config.musicEnabled === true : false,
    musicCategoryId: readString(config.musicCategoryId),
    musicTrackId: readString(config.musicTrackId),
    musicStoragePath: readString(config.musicStoragePath),
    musicVolume:
      typeof config.musicVolume === 'number' && Number.isFinite(config.musicVolume)
        ? String(config.musicVolume)
        : '',
    published: dashboard.page.published,
    defaultTheme: dashboard.page.defaultTheme,
  };
}
