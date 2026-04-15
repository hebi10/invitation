import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { LoginCard } from '../../components/LoginCard';
import { InvitationEditorModalShell } from '../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { useAppState } from '../../contexts/AppStateContext';
import {
  fetchMobileInvitationMusicLibrary,
  fetchMobileKakaoAddressSearch,
  uploadMobileInvitationImage,
} from '../../lib/api';
import type {
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  MobileMusicCategory,
} from '../../types/mobileInvitation';

type ManageParentState = {
  relation: string;
  name: string;
  phone: string;
};

type ManagePersonState = {
  name: string;
  order: string;
  phone: string;
  father: ManageParentState;
  mother: ManageParentState;
};

type ManageFormState = {
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

type GuestbookSortKey = 'latest' | 'oldest' | 'author-asc' | 'author-desc';
type MusicDropdownPanel = 'category' | 'track' | null;
type EditableImageAssetKind = 'cover' | 'gallery';
type EditorStepKey =
  | 'basic'
  | 'schedule'
  | 'location'
  | 'greeting'
  | 'images'
  | 'settings';

type EditorStep = {
  key: EditorStepKey;
  title: string;
  description: string;
};

type ManageGalleryPreviewItem = {
  id: string;
  originalUrl: string;
  previewUrl: string;
};

const ONBOARDING_STEPS = [
  {
    key: 'cover',
    title: '1. 기본 문구와 이름',
    description: '대표 제목과 소개 문구, 신랑·신부 이름을 먼저 확인합니다.',
  },
  {
    key: 'schedule',
    title: '2. 예식 일정과 장소',
    description: '예식 일시와 장소, 상세 주소를 넣어 공개 페이지의 기본 정보를 채웁니다.',
  },
  {
    key: 'greeting',
    title: '3. 인사말과 공개 상태',
    description: '인사말을 입력하고, 저장 직후 공개 여부를 함께 결정합니다.',
  },
] as const;

const EDITOR_STEPS: EditorStep[] = [
  {
    key: 'basic',
    title: '기본 정보',
    description: '페이지 제목과 신랑·신부, 혼주 정보를 먼저 정리합니다.',
  },
  {
    key: 'schedule',
    title: '예식 일정',
    description: '예식 일시와 본식·피로연 장소 정보를 나눠서 입력합니다.',
  },
  {
    key: 'location',
    title: '지도와 위치',
    description: '예식장 주소를 검색하고 실제로 연결될 지도를 앱 안에서 확인합니다.',
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
    key: 'settings',
    title: '공유와 공개 설정',
    description: '공유 문구, 기본 테마, 배경음악, 공개 상태를 마지막으로 점검합니다.',
  },
];

const GUESTBOOK_PAGE_SIZE = 8;
const DEFAULT_MUSIC_VOLUME = 0.35;

const GUESTBOOK_SORT_OPTIONS: Array<{ key: GuestbookSortKey; label: string }> = [
  { key: 'latest', label: '최신순' },
  { key: 'oldest', label: '오래된순' },
  { key: 'author-asc', label: '작성자 가나다' },
  { key: 'author-desc', label: '작성자 역순' },
];

const EMPTY_PARENT: ManageParentState = {
  relation: '',
  name: '',
  phone: '',
};

const EMPTY_PERSON: ManagePersonState = {
  name: '',
  order: '',
  phone: '',
  father: { ...EMPTY_PARENT },
  mother: { ...EMPTY_PARENT },
};

const EMPTY_FORM: ManageFormState = {
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
  defaultTheme: 'emotional',
};

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(value: unknown, maxCount?: number) {
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

function formatAccountsText(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value
    .map((item) => {
      const account = readRecord(item);
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

function parseAccountsText(value: string, maxCount = 3) {
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

function formatGuidesText(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value
    .map((item) => {
      const guide = readRecord(item);
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

function parseGuidesText(value: string, maxCount = 3) {
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

function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(value: number | null, min: number, max: number, fallback: number) {
  if (value === null || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function getCommentTimestamp(createdAt: string | null) {
  if (!createdAt) {
    return 0;
  }

  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildKakaoMapSearchUrl(address: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

function buildKakaoMapPinUrl(placeName: string, latitude: number, longitude: number) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(placeName)},${latitude},${longitude}`;
}

function hasValidCoordinates(latitude: number | null, longitude: number | null) {
  return (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
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

function getUploadFileExtension(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function buildUploadFileName(assetKind: EditableImageAssetKind, mimeType: string) {
  const extension = getUploadFileExtension(mimeType);
  return `${assetKind}-${Date.now()}.${extension}`;
}

function toParentState(value: unknown): ManageParentState {
  const parent = readRecord(value);
  return {
    relation: readString(parent.relation),
    name: readString(parent.name),
    phone: readString(parent.phone),
  };
}

function toPersonState(value: unknown, fallbackName = ''): ManagePersonState {
  const person = readRecord(value);
  return {
    name: readString(person.name, fallbackName),
    order: readString(person.order),
    phone: readString(person.phone),
    father: toParentState(person.father),
    mother: toParentState(person.mother),
  };
}

function getOnboardingValidationMessage(stepIndex: number, form: ManageFormState) {
  if (stepIndex === 0) {
    if (!form.groom.name.trim()) {
      return '신랑 이름을 입력해 주세요.';
    }

    if (!form.bride.name.trim()) {
      return '신부 이름을 입력해 주세요.';
    }

    if (!form.displayName.trim()) {
      return '대표 제목을 입력해 주세요.';
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

export default function ManageScreen() {
  const {
    apiBaseUrl,
    authError,
    clearAuthError,
    clearPendingManageOnboarding,
    dashboard,
    dashboardLoading,
    deleteComment,
    isAuthenticated,
    isBootstrapping,
    login,
    pageSummary,
    palette,
    fontScale,
    pendingManageOnboarding,
    refreshDashboard,
    saveCurrentPageConfig,
    session,
    setPublishedState,
  } = useAppState();

  const [pageIdentifier, setPageIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<ManageFormState>(EMPTY_FORM);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [editorPreparingVisible, setEditorPreparingVisible] = useState(false);
  const [editorPreparingMessage, setEditorPreparingMessage] = useState('');
  const [editorStepIndex, setEditorStepIndex] = useState(0);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [uploadingImageKind, setUploadingImageKind] = useState<EditableImageAssetKind | null>(null);
  const [musicCategories, setMusicCategories] = useState<MobileMusicCategory[]>([]);
  const [musicLibraryLoading, setMusicLibraryLoading] = useState(false);
  const [openMusicDropdown, setOpenMusicDropdown] = useState<MusicDropdownPanel>(null);
  const [guestbookModalVisible, setGuestbookModalVisible] = useState(false);
  const [hasRequestedGuestbookLoad, setHasRequestedGuestbookLoad] = useState(false);
  const [guestbookSearchQuery, setGuestbookSearchQuery] = useState('');
  const [guestbookSortKey, setGuestbookSortKey] = useState<GuestbookSortKey>('latest');
  const [guestbookPage, setGuestbookPage] = useState(1);

  const onboardingValidationMessage = useMemo(
    () => getOnboardingValidationMessage(onboardingStepIndex, form),
    [form, onboardingStepIndex]
  );

  const showDashboardSyncLoading =
    (isBootstrapping || dashboardLoading) && !dashboard && !pageSummary;
  const canRequestDashboardSync = isAuthenticated && !dashboardLoading;

  const galleryPreviewItems = useMemo<ManageGalleryPreviewItem[]>(
    () =>
      form.galleryImages.map((originalUrl, index) => ({
        id: `${index}-${originalUrl}`,
        originalUrl,
        previewUrl: form.galleryImageThumbnailUrls[index]?.trim() || originalUrl,
      })),
    [form.galleryImageThumbnailUrls, form.galleryImages]
  );
  const previewGalleryImages = useMemo(
    () => galleryPreviewItems.map((image) => image.originalUrl),
    [galleryPreviewItems]
  );

  const coverPreviewUrl = form.coverImageThumbnailUrl.trim() || form.coverImageUrl.trim();
  const mapLatitude = parseOptionalNumber(form.kakaoLatitude);
  const mapLongitude = parseOptionalNumber(form.kakaoLongitude);
  const mapMarkerTitle =
    form.kakaoMarkerTitle.trim() ||
    form.venue.trim() ||
    form.ceremonyAddress.trim() ||
    '선택한 위치';
  const mapPreviewUrl = useMemo(() => {
    if (hasValidCoordinates(mapLatitude, mapLongitude)) {
      return buildKakaoMapPinUrl(mapMarkerTitle, mapLatitude ?? 0, mapLongitude ?? 0);
    }

    if (form.ceremonyAddress.trim()) {
      return buildKakaoMapSearchUrl(form.ceremonyAddress.trim());
    }

    return '';
  }, [form.ceremonyAddress, mapLatitude, mapLongitude, mapMarkerTitle]);

  const currentEditorStep = EDITOR_STEPS[editorStepIndex] ?? EDITOR_STEPS[0];
  const isFirstEditorStep = editorStepIndex === 0;
  const isLastEditorStep = editorStepIndex === EDITOR_STEPS.length - 1;

  const selectedMusicCategory = useMemo(
    () => musicCategories.find((category) => category.id === form.musicCategoryId) ?? null,
    [form.musicCategoryId, musicCategories]
  );

  const availableMusicTracks = useMemo(
    () => selectedMusicCategory?.tracks ?? [],
    [selectedMusicCategory]
  );

  const selectedMusicTrack = useMemo(
    () => availableMusicTracks.find((track) => track.id === form.musicTrackId) ?? null,
    [availableMusicTracks, form.musicTrackId]
  );

  const guestbookFilteredSortedComments = useMemo(() => {
    const source = dashboard?.comments ?? [];
    const normalizedQuery = guestbookSearchQuery.trim().toLocaleLowerCase('ko-KR');

    const filtered = normalizedQuery
      ? source.filter((comment) => {
          const author = comment.author.toLocaleLowerCase('ko-KR');
          const message = comment.message.toLocaleLowerCase('ko-KR');
          return author.includes(normalizedQuery) || message.includes(normalizedQuery);
        })
      : source;

    return [...filtered].sort((left, right) => {
      if (guestbookSortKey === 'latest') {
        return getCommentTimestamp(right.createdAt) - getCommentTimestamp(left.createdAt);
      }

      if (guestbookSortKey === 'oldest') {
        return getCommentTimestamp(left.createdAt) - getCommentTimestamp(right.createdAt);
      }

      if (guestbookSortKey === 'author-asc') {
        return left.author.localeCompare(right.author, 'ko');
      }

      return right.author.localeCompare(left.author, 'ko');
    });
  }, [dashboard?.comments, guestbookSearchQuery, guestbookSortKey]);

  const guestbookTotalPages = useMemo(
    () => Math.max(1, Math.ceil(guestbookFilteredSortedComments.length / GUESTBOOK_PAGE_SIZE)),
    [guestbookFilteredSortedComments.length]
  );

  const guestbookPageComments = useMemo(() => {
    const startIndex = (guestbookPage - 1) * GUESTBOOK_PAGE_SIZE;
    return guestbookFilteredSortedComments.slice(
      startIndex,
      startIndex + GUESTBOOK_PAGE_SIZE
    );
  }, [guestbookFilteredSortedComments, guestbookPage]);

  useEffect(() => {
    if (!dashboard) {
      setForm(EMPTY_FORM);
      return;
    }

    const config = dashboard.page.config;
    const pageData = readRecord(config.pageData);
    const ceremony = readRecord(pageData.ceremony);
    const reception = readRecord(pageData.reception);
    const kakaoMap = readRecord(pageData.kakaoMap);
    const giftInfo = readRecord(pageData.giftInfo);
    const metadata = readRecord((config as Record<string, unknown>).metadata);
    const metadataImages = readRecord(metadata.images);
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

    setForm({
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
      musicStoragePath: readString((config as Record<string, unknown>).musicStoragePath),
      musicVolume:
        typeof config.musicVolume === 'number' && Number.isFinite(config.musicVolume)
          ? String(config.musicVolume)
          : '',
      published: dashboard.page.published,
      defaultTheme: dashboard.page.defaultTheme,
    });
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard || !pendingManageOnboarding) {
      return;
    }

    if (pendingManageOnboarding.pageSlug !== dashboard.page.slug) {
      return;
    }

    setOnboardingStepIndex(0);
    setOnboardingVisible(true);
    setNotice('운영 탭에서 예식 정보를 이어서 입력해 주세요.');
  }, [dashboard, pendingManageOnboarding]);

  useEffect(() => {
    setHasRequestedGuestbookLoad(false);
  }, [dashboard?.page.slug]);

  useEffect(() => {
    if (
      !guestbookModalVisible ||
      hasRequestedGuestbookLoad ||
      !dashboard ||
      dashboardLoading ||
      dashboard.comments.length > 0
    ) {
      return;
    }

    setHasRequestedGuestbookLoad(true);
    void refreshDashboard();
  }, [
    dashboard,
    dashboardLoading,
    guestbookModalVisible,
    hasRequestedGuestbookLoad,
    refreshDashboard,
  ]);

  useEffect(() => {
    setGuestbookPage(1);
  }, [guestbookSearchQuery, guestbookSortKey, dashboard?.comments.length]);

  useEffect(() => {
    setGuestbookPage((current) => Math.min(current, guestbookTotalPages));
  }, [guestbookTotalPages]);

  useEffect(() => {
    if (!dashboard?.page.features.showMusic) {
      setMusicCategories([]);
      setMusicLibraryLoading(false);
      setOpenMusicDropdown(null);
      return;
    }

    let mounted = true;

    const loadMusicLibrary = async () => {
      setMusicLibraryLoading(true);

      try {
        const response = await fetchMobileInvitationMusicLibrary(apiBaseUrl);
        if (!mounted) {
          return;
        }

        setMusicCategories(response.categories);

        setForm((current) => {
          if (response.categories.length === 0) {
            return {
              ...current,
              musicCategoryId: '',
              musicTrackId: '',
              musicStoragePath: '',
            };
          }

          const fallbackCategory = response.categories[0];
          const nextCategory =
            response.categories.find((category) => category.id === current.musicCategoryId) ??
            fallbackCategory;
          const nextTrack =
            nextCategory.tracks.find((track) => track.id === current.musicTrackId) ??
            nextCategory.tracks[0] ??
            null;

          const nextCategoryId = nextCategory?.id ?? '';
          const nextTrackId = nextTrack?.id ?? '';
          const nextStoragePath = nextTrack?.storagePath ?? '';

          if (
            current.musicCategoryId === nextCategoryId &&
            current.musicTrackId === nextTrackId &&
            current.musicStoragePath === nextStoragePath
          ) {
            return current;
          }

          return {
            ...current,
            musicCategoryId: nextCategoryId,
            musicTrackId: nextTrackId,
            musicStoragePath: nextStoragePath,
          };
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setMusicCategories([]);
        setNotice(
          error instanceof Error
            ? error.message
            : '음악 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
      } finally {
        if (mounted) {
          setMusicLibraryLoading(false);
        }
      }
    };

    void loadMusicLibrary();

    return () => {
      mounted = false;
    };
  }, [apiBaseUrl, dashboard?.page.features.showMusic]);

  useEffect(() => {
    if (!form.musicEnabled) {
      setOpenMusicDropdown(null);
    }
  }, [form.musicEnabled]);

  const updatePersonField = (
    role: 'groom' | 'bride',
    field: 'name' | 'order' | 'phone',
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [field]: value,
      },
    }));
  };

  const updateParentField = (
    role: 'groom' | 'bride',
    parent: 'father' | 'mother',
    field: keyof ManageParentState,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [parent]: {
          ...current[role][parent],
          [field]: value,
        },
      },
    }));
  };

  const handleLogin = async () => {
    clearAuthError();
    const authenticated = await login(pageIdentifier, password);
    if (authenticated) {
      setPassword('');
      setNotice('');
    }
  };

  const handleShare = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      return;
    }

    await Share.share({
      message: publicUrl,
      url: publicUrl,
    });
  };

  const handleOpenUrl = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      return;
    }

    await Linking.openURL(publicUrl);
  };

  const handleOpenMapUrl = async () => {
    if (!mapPreviewUrl) {
      setNotice('지도 링크를 먼저 확인해 주세요.');
      return;
    }

    try {
      try {
        await WebBrowser.openBrowserAsync(mapPreviewUrl, {
          enableDefaultShareMenuItem: true,
          controlsColor: palette.accent,
          createTask: true,
        });
        return;
      } catch {
        // Fall back to the platform browser when the in-app browser is unavailable.
      }

      await Linking.openURL(mapPreviewUrl);
    } catch {
      setNotice('지도를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleSearchAddress = async () => {
    const query = form.ceremonyAddress.trim();
    if (!query) {
      setNotice('예식장 주소를 먼저 입력해 주세요.');
      return;
    }

    setIsSearchingAddress(true);

    try {
      const result = await fetchMobileKakaoAddressSearch(apiBaseUrl, query);
      setForm((current) => ({
        ...current,
        ceremonyAddress: result.addressName,
        mapUrl: buildKakaoMapSearchUrl(result.addressName),
        kakaoLatitude: String(result.latitude),
        kakaoLongitude: String(result.longitude),
        kakaoMarkerTitle:
          current.kakaoMarkerTitle.trim() || current.venue.trim() || result.addressName,
      }));
      setNotice('카카오 주소 검색으로 좌표를 자동 입력했습니다.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '주소 검색에 실패했습니다.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleUploadImage = async (assetKind: EditableImageAssetKind) => {
    if (!dashboard || !session) {
      setNotice('청첩장 연동 후 이미지를 업로드할 수 있습니다.');
      return;
    }

    if (assetKind === 'gallery') {
      const remainingSlots = Math.max(
        0,
        dashboard.page.features.maxGalleryImages - galleryPreviewItems.length
      );

      if (remainingSlots <= 0) {
        setNotice(
          `갤러리는 최대 ${dashboard.page.features.maxGalleryImages}장까지 등록할 수 있습니다.`
        );
        return;
      }
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice('이미지 업로드를 위해 사진 보관함 접근 권한이 필요합니다.');
      return;
    }

    const selectionLimit =
      assetKind === 'gallery'
        ? Math.max(1, dashboard.page.features.maxGalleryImages - galleryPreviewItems.length)
        : 1;

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: assetKind === 'gallery',
      selectionLimit,
      quality: 0.95,
    });

    if (pickerResult.canceled || pickerResult.assets.length === 0) {
      return;
    }

    const selectedAssets = pickerResult.assets.slice(0, selectionLimit);
    setUploadingImageKind(assetKind);

    try {
      const uploadedImages: Array<{ url: string; previewUrl: string }> = [];

      for (const asset of selectedAssets) {
        const mimeType =
          typeof asset.mimeType === 'string' && asset.mimeType.trim().startsWith('image/')
            ? asset.mimeType.trim()
            : 'image/jpeg';
        const fileName =
          typeof asset.fileName === 'string' && asset.fileName.trim()
            ? asset.fileName.trim()
            : buildUploadFileName(assetKind, mimeType);

        const formData = new FormData();
        formData.append('assetKind', assetKind);
        formData.append(
          'file',
          {
            uri: asset.uri,
            name: fileName,
            type: mimeType,
          } as unknown as Blob
        );

        const uploaded = await uploadMobileInvitationImage(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          formData
        );
        uploadedImages.push({
          url: uploaded.url,
          previewUrl: uploaded.thumbnailUrl.trim() || uploaded.url,
        });
      }

      const uploadedUrls = uploadedImages.map((image) => image.url);

      if (assetKind === 'cover') {
        const uploadedCoverImage = uploadedImages[0];
        if (uploadedCoverImage) {
          setForm((current) => ({
            ...current,
            coverImageUrl: uploadedCoverImage.url,
            coverImageThumbnailUrl: uploadedCoverImage.previewUrl,
          }));
          setNotice('대표 이미지를 업로드했습니다.');
        }
      } else {
        setForm((current) => {
          const maxGalleryImages = dashboard.page.features.maxGalleryImages;
          const nextGallery = [...current.galleryImages, ...uploadedImages.map((image) => image.url)].slice(
            0,
            maxGalleryImages
          );
          const nextGalleryThumbnailUrls = [
            ...current.galleryImageThumbnailUrls,
            ...uploadedImages.map((image) => image.previewUrl),
          ].slice(0, maxGalleryImages);

          return {
            ...current,
            galleryImages: nextGallery,
            galleryImageThumbnailUrls: nextGalleryThumbnailUrls,
            galleryImagesText: nextGallery.join('\n'),
          };
        });

        setNotice(`갤러리 이미지 ${uploadedUrls.length}장을 업로드했습니다.`);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setUploadingImageKind(null);
    }
  };

  const handleSelectMusicCategory = (categoryId: string) => {
    const selectedCategory = musicCategories.find((category) => category.id === categoryId);
    const firstTrack = selectedCategory?.tracks[0] ?? null;

    setForm((current) => ({
      ...current,
      musicCategoryId: categoryId,
      musicTrackId: firstTrack?.id ?? '',
      musicStoragePath: firstTrack?.storagePath ?? '',
    }));
    setOpenMusicDropdown(null);
  };

  const handleSelectMusicTrack = (trackId: string) => {
    const selectedTrack = availableMusicTracks.find((track) => track.id === trackId);

    setForm((current) => ({
      ...current,
      musicTrackId: trackId,
      musicStoragePath: selectedTrack?.storagePath ?? current.musicStoragePath,
    }));
    setOpenMusicDropdown(null);
  };

  const handleMoveGalleryImage = (index: number, direction: 'up' | 'down') => {
    setForm((current) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      return {
        ...current,
        galleryImages: moveArrayItem(current.galleryImages, index, targetIndex),
        galleryImageThumbnailUrls: moveArrayItem(
          current.galleryImageThumbnailUrls,
          index,
          targetIndex
        ),
        galleryImagesText: moveArrayItem(current.galleryImages, index, targetIndex).join('\n'),
      };
    });
  };

  const handleRemoveGalleryImage = (index: number) => {
    setForm((current) => ({
      ...current,
      galleryImages: current.galleryImages.filter((_, itemIndex) => itemIndex !== index),
      galleryImageThumbnailUrls: current.galleryImageThumbnailUrls.filter((_, itemIndex) => itemIndex !== index),
      galleryImagesText: current.galleryImages
        .filter((_, itemIndex) => itemIndex !== index)
        .join('\n'),
    }));
  };

  const requestDashboardSync = async (nextNotice?: string) => {
    if (!isAuthenticated || dashboardLoading) {
      return false;
    }

    clearAuthError();
    if (nextNotice) {
      setNotice(nextNotice);
    }

    return refreshDashboard();
  };

  const openEditorModal = async () => {
    if (!isAuthenticated || dashboardLoading || editorModalVisible) {
      return;
    }

    clearAuthError();
    setNotice('');
    setOpenMusicDropdown(null);
    setEditorPreparingMessage(
      dashboard ? '청첩장 편집 화면을 준비하고 있습니다.' : '최신 청첩장 정보를 불러오고 있습니다.'
    );
    setEditorPreparingVisible(true);

    try {
      if (!dashboard) {
      setNotice('운영 데이터를 불러온 뒤 수정 팝업을 엽니다.');
      const synced = await requestDashboardSync();
      if (!synced) {
        return;
      }
    }

      await new Promise((resolve) => setTimeout(resolve, 120));
      setEditorStepIndex(0);
      setEditorModalVisible(true);
    } finally {
      setEditorPreparingVisible(false);
    }
  };

  const closeEditorModal = () => {
    setEditorModalVisible(false);
    setOpenMusicDropdown(null);
    setEditorStepIndex(0);
  };

  const closeOnboarding = () => {
    setOnboardingVisible(false);
    setOnboardingStepIndex(0);
    clearPendingManageOnboarding();
  };

  const persistForm = async (options: { closeOnSuccess?: boolean; notice: string }) => {
    if (!dashboard) {
      return false;
    }

    const groomName = form.groom.name.trim();
    const brideName = form.bride.name.trim();

    if (!groomName || !brideName) {
      setNotice('신랑/신부 이름은 비워둘 수 없습니다.');
      return false;
    }

    const maxGalleryImages = dashboard.page.features.maxGalleryImages;
    const nextGalleryImages = form.galleryImages.slice(0, maxGalleryImages);
    const nextGalleryThumbnailUrls = nextGalleryImages.map(
      (imageUrl, index) => form.galleryImageThumbnailUrls[index]?.trim() || imageUrl
    );
    const nextGroomAccounts = parseAccountsText(form.groomAccountsText, 3);
    const nextBrideAccounts = parseAccountsText(form.brideAccountsText, 3);
    const nextVenueGuide = parseGuidesText(form.venueGuideText, 3);
    const nextWreathGuide = parseGuidesText(form.wreathGuideText, 3);

    const existingPageData = dashboard.page.config.pageData ?? {};
    const existingCeremony = readRecord(existingPageData.ceremony);
    const existingReception = readRecord(existingPageData.reception);
    const existingKakaoMap = readRecord(existingPageData.kakaoMap);
    const existingGiftInfo = readRecord(existingPageData.giftInfo);
    const existingPageDataGroom = readRecord(existingPageData.groom);
    const existingPageDataBride = readRecord(existingPageData.bride);

    const existingMetadata = readRecord(
      (dashboard.page.config as Record<string, unknown>).metadata
    );
    const existingMetadataImages = readRecord(existingMetadata.images);
    const existingOpenGraph = readRecord(existingMetadata.openGraph);
    const existingTwitter = readRecord(existingMetadata.twitter);

    const nextLatitude = parseOptionalNumber(form.kakaoLatitude) ?? 0;
    const nextLongitude = parseOptionalNumber(form.kakaoLongitude) ?? 0;
    const nextKakaoLevel = Math.max(
      1,
      Math.min(
        14,
        Math.round(
          parseOptionalNumber(form.kakaoLevel) ??
            (typeof existingKakaoMap.level === 'number' && Number.isFinite(existingKakaoMap.level)
              ? existingKakaoMap.level
              : 3)
        )
      )
    );

    const existingMusicVolume =
      typeof dashboard.page.config.musicVolume === 'number' &&
      Number.isFinite(dashboard.page.config.musicVolume)
        ? dashboard.page.config.musicVolume
        : DEFAULT_MUSIC_VOLUME;

    const normalizedMusicVolume = clampNumber(
      parseOptionalNumber(form.musicVolume),
      0,
      1,
      existingMusicVolume
    );

    const ceremonyTime = form.ceremonyTime.trim() || form.date.trim();
    const resolvedMarkerTitle =
      form.kakaoMarkerTitle.trim() || form.venue.trim() || form.ceremonyAddress.trim();
    const resolvedMapUrl = hasValidCoordinates(nextLatitude, nextLongitude)
      ? buildKakaoMapPinUrl(
          resolvedMarkerTitle || '선택한 위치',
          nextLatitude,
          nextLongitude
        )
      : form.ceremonyAddress.trim()
        ? buildKakaoMapSearchUrl(form.ceremonyAddress.trim())
        : form.mapUrl.trim();

    const nextConfig: MobileInvitationSeed = {
      ...dashboard.page.config,
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      date: form.date.trim(),
      venue: form.venue.trim(),
      groomName,
      brideName,
      musicEnabled: dashboard.page.features.showMusic ? form.musicEnabled : false,
      musicCategoryId: dashboard.page.features.showMusic ? form.musicCategoryId.trim() : '',
      musicTrackId: dashboard.page.features.showMusic ? form.musicTrackId.trim() : '',
      musicStoragePath: dashboard.page.features.showMusic
        ? form.musicStoragePath.trim()
        : '',
      musicVolume: dashboard.page.features.showMusic
        ? normalizedMusicVolume
        : existingMusicVolume,
      couple: {
        ...dashboard.page.config.couple,
        groom: {
          ...dashboard.page.config.couple.groom,
          name: groomName,
          order: form.groom.order.trim(),
          phone: form.groom.phone.trim(),
          father: {
            ...(dashboard.page.config.couple.groom.father ?? {}),
            relation: form.groom.father.relation.trim(),
            name: form.groom.father.name.trim(),
            phone: form.groom.father.phone.trim(),
          },
          mother: {
            ...(dashboard.page.config.couple.groom.mother ?? {}),
            relation: form.groom.mother.relation.trim(),
            name: form.groom.mother.name.trim(),
            phone: form.groom.mother.phone.trim(),
          },
        },
        bride: {
          ...dashboard.page.config.couple.bride,
          name: brideName,
          order: form.bride.order.trim(),
          phone: form.bride.phone.trim(),
          father: {
            ...(dashboard.page.config.couple.bride.father ?? {}),
            relation: form.bride.father.relation.trim(),
            name: form.bride.father.name.trim(),
            phone: form.bride.father.phone.trim(),
          },
          mother: {
            ...(dashboard.page.config.couple.bride.mother ?? {}),
            relation: form.bride.mother.relation.trim(),
            name: form.bride.mother.name.trim(),
            phone: form.bride.mother.phone.trim(),
          },
        },
      },
      pageData: {
        ...existingPageData,
        subtitle: form.subtitle.trim(),
        venueName: form.venue.trim(),
        ceremonyAddress: form.ceremonyAddress.trim(),
        ceremonyContact: form.ceremonyContact.trim(),
        ceremonyTime,
        ceremony: {
          ...existingCeremony,
          time: ceremonyTime,
          location: form.ceremonyLocation.trim(),
        },
        reception: {
          ...existingReception,
          time: form.receptionTime.trim(),
          location: form.receptionLocation.trim(),
        },
        mapDescription: form.mapDescription.trim(),
        mapUrl: resolvedMapUrl,
        kakaoMap: {
          ...existingKakaoMap,
          latitude: nextLatitude,
          longitude: nextLongitude,
          level: nextKakaoLevel,
          markerTitle: resolvedMarkerTitle,
        },
        greetingMessage: form.greetingMessage.trim(),
        greetingAuthor: form.greetingAuthor.trim(),
        galleryImages: nextGalleryImages,
        coverImageThumbnailUrl: form.coverImageThumbnailUrl.trim(),
        galleryImageThumbnailUrls: nextGalleryThumbnailUrls,
        venueGuide: nextVenueGuide,
        wreathGuide: nextWreathGuide,
        giftInfo: {
          ...existingGiftInfo,
          message: form.giftMessage.trim(),
          groomAccounts: nextGroomAccounts,
          brideAccounts: nextBrideAccounts,
        },
        groom: {
          ...existingPageDataGroom,
          ...dashboard.page.config.couple.groom,
          name: groomName,
          order: form.groom.order.trim(),
          phone: form.groom.phone.trim(),
        },
        bride: {
          ...existingPageDataBride,
          ...dashboard.page.config.couple.bride,
          name: brideName,
          order: form.bride.order.trim(),
          phone: form.bride.phone.trim(),
        },
      },
    };

    (nextConfig as Record<string, unknown>).metadata = {
      ...existingMetadata,
      title: form.shareTitle.trim(),
      description: form.shareDescription.trim(),
      images: {
        ...existingMetadataImages,
        wedding: form.coverImageUrl.trim(),
      },
      openGraph: {
        ...existingOpenGraph,
        title: form.shareTitle.trim(),
        description: form.shareDescription.trim(),
      },
      twitter: {
        ...existingTwitter,
        title: form.shareTitle.trim(),
        description: form.shareDescription.trim(),
      },
    };

    setIsSaving(true);

    const saved = await saveCurrentPageConfig(nextConfig, {
      published: form.published,
      defaultTheme: form.defaultTheme,
    });

    setIsSaving(false);

    if (!saved) {
      return false;
    }

    setNotice(options.notice);

    if (options.closeOnSuccess) {
      closeOnboarding();
    }

    return true;
  };

  const handleSave = async () => {
    const saved = await persistForm({
      notice: '운영 정보를 저장했습니다.',
    });

    if (saved) {
      closeEditorModal();
    }
  };

  const handleOnboardingNext = async () => {
    const validationMessage = getOnboardingValidationMessage(onboardingStepIndex, form);
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    if (onboardingStepIndex === ONBOARDING_STEPS.length - 1) {
      await persistForm({
        closeOnSuccess: true,
        notice: '기본 예식 정보를 저장했습니다.',
      });
      return;
    }

    setNotice('');
    setOnboardingStepIndex((current) => current + 1);
  };

  const handleTogglePublished = async () => {
    if (!dashboard) {
      return;
    }

    const changed = await setPublishedState(!dashboard.page.published);
    if (changed) {
      setForm((current) => ({
        ...current,
        published: !dashboard.page.published,
      }));
      setNotice(
        !dashboard.page.published
          ? '페이지를 공개 상태로 전환했습니다.'
          : '페이지를 비공개 상태로 전환했습니다.'
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const deleted = await deleteComment(commentId);
    if (deleted) {
      setNotice('방명록 댓글을 삭제했습니다.');
    }
  };

  const openGuestbookModal = () => {
    setGuestbookModalVisible(true);
    setGuestbookPage(1);
  };

  const renderPersonEditor = (role: 'groom' | 'bride', label: string) => {
    const person = form[role];

    return (
      <View
        style={[
          styles.personCard,
          { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
        ]}
      >
        <Text style={[styles.personCardTitle, { color: palette.text, fontSize: 15 * fontScale }]}> 
          {label}
        </Text>
        <TextField
          label={`${label} 이름`}
          value={person.name}
          onChangeText={(value) => updatePersonField(role, 'name', value)}
          placeholder={`예: ${role === 'groom' ? '신민제' : '김현지'}`}
        />
        <View style={styles.twoColumnRow}>
          <View style={styles.halfField}>
            <TextField
              label="서열"
              value={person.order}
              onChangeText={(value) => updatePersonField(role, 'order', value)}
              placeholder="예: 장남"
            />
          </View>
          <View style={styles.halfField}>
            <TextField
              label="연락처"
              value={person.phone}
              onChangeText={(value) => updatePersonField(role, 'phone', value)}
              placeholder="예: 010-1234-5678"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text style={[styles.personSectionLabel, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
          아버지 정보
        </Text>
        <View style={styles.twoColumnRow}>
          <View style={styles.halfField}>
            <TextField
              label="관계"
              value={person.father.relation}
              onChangeText={(value) => updateParentField(role, 'father', 'relation', value)}
              placeholder="예: 부"
            />
          </View>
          <View style={styles.halfField}>
            <TextField
              label="이름"
              value={person.father.name}
              onChangeText={(value) => updateParentField(role, 'father', 'name', value)}
              placeholder="예: 홍길동"
            />
          </View>
        </View>
        <TextField
          label="연락처"
          value={person.father.phone}
          onChangeText={(value) => updateParentField(role, 'father', 'phone', value)}
          placeholder="예: 010-1234-5678"
          autoCapitalize="none"
        />

        <Text style={[styles.personSectionLabel, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
          어머니 정보
        </Text>
        <View style={styles.twoColumnRow}>
          <View style={styles.halfField}>
            <TextField
              label="관계"
              value={person.mother.relation}
              onChangeText={(value) => updateParentField(role, 'mother', 'relation', value)}
              placeholder="예: 모"
            />
          </View>
          <View style={styles.halfField}>
            <TextField
              label="이름"
              value={person.mother.name}
              onChangeText={(value) => updateParentField(role, 'mother', 'name', value)}
              placeholder="예: 홍길순"
            />
          </View>
        </View>
        <TextField
          label="연락처"
          value={person.mother.phone}
          onChangeText={(value) => updateParentField(role, 'mother', 'phone', value)}
          placeholder="예: 010-1234-5678"
          autoCapitalize="none"
        />
      </View>
    );
  };

  const renderEditorStepContent = () => {
    switch (currentEditorStep.key) {
      case 'basic':
        return (
          <>
            <SectionCard
              title="기본 커버 정보"
              description="페이지 제목과 소개 문구를 먼저 정리합니다."
            >
              <TextField
                label="페이지 제목"
                value={form.displayName}
                onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
                placeholder="예: 박준호 · 김수민 결혼합니다"
              />
              <TextField
                label="서브 문구"
                value={form.subtitle}
                onChangeText={(value) => setForm((current) => ({ ...current, subtitle: value }))}
                placeholder="예: 소중한 날에 함께해 주세요"
              />
              <TextField
                label="소개 문구"
                value={form.description}
                onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="청첩장 첫 화면에 노출될 설명을 입력해 주세요."
                multiline
              />
            </SectionCard>

            <SectionCard
              title="신랑 · 신부 · 혼주 정보"
              description="웹 page-wizard와 같은 순서로 이름, 연락처, 혼주 정보를 관리합니다."
            >
              <View style={styles.personGrid}>
                {renderPersonEditor('groom', '신랑')}
                {renderPersonEditor('bride', '신부')}
              </View>
            </SectionCard>
          </>
        );
      case 'schedule':
        return (
          <SectionCard
            title="예식 일정 정보"
            description="예식 일시와 본식·피로연 장소를 나눠서 입력합니다."
          >
            <TextField
              label="예식 일시 문구"
              value={form.date}
              onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
              placeholder="예: 2026.07.12 오후 2시"
            />
            <TextField
              label="예식장 이름"
              value={form.venue}
              onChangeText={(value) => setForm((current) => ({ ...current, venue: value }))}
              placeholder="예: 더채플 서울"
            />
            <View style={styles.twoColumnRow}>
              <View style={styles.halfField}>
                <TextField
                  label="본식 시간"
                  value={form.ceremonyTime}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, ceremonyTime: value }))
                  }
                  placeholder="예: 오후 2시 30분"
                />
              </View>
              <View style={styles.halfField}>
                <TextField
                  label="본식 장소"
                  value={form.ceremonyLocation}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, ceremonyLocation: value }))
                  }
                  placeholder="예: 3층 그랜드홀"
                />
              </View>
            </View>
            <View style={styles.twoColumnRow}>
              <View style={styles.halfField}>
                <TextField
                  label="피로연 시간"
                  value={form.receptionTime}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, receptionTime: value }))
                  }
                  placeholder="예: 오후 4시 30분"
                />
              </View>
              <View style={styles.halfField}>
                <TextField
                  label="피로연 장소"
                  value={form.receptionLocation}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, receptionLocation: value }))
                  }
                  placeholder="예: 1층 연회장"
                />
              </View>
            </View>
          </SectionCard>
        );
      case 'location':
        return (
          <>
            <SectionCard
              title="예식장 주소와 연락처"
              description="주소 검색으로 좌표를 다시 맞추고, 지도 설명 문구를 함께 정리합니다."
            >
              <TextField
                label="상세 주소"
                value={form.ceremonyAddress}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, ceremonyAddress: value }))
                }
                placeholder="예: 서울특별시 강남구 ..."
                multiline
              />
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleSearchAddress()}
                  loading={isSearchingAddress}
                >
                  주소 검색으로 위치 다시 맞추기
                </ActionButton>
              </View>
              <TextField
                label="예식장 연락처"
                value={form.ceremonyContact}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, ceremonyContact: value }))
                }
                placeholder="예: 02-1234-5678"
                autoCapitalize="none"
              />
              <TextField
                label="지도 안내 문구"
                value={form.mapDescription}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, mapDescription: value }))
                }
                placeholder="예: 건물 앞 주차장을 이용해 주세요."
                multiline
              />
            </SectionCard>

            <SectionCard
              title="지도 미리보기"
              description="주소 문자열 대신 실제로 연결될 카카오맵 위치를 앱 안에서 바로 확인합니다."
            >
              {mapPreviewUrl ? (
                <View
                  style={[
                    styles.mapPreviewCard,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.mapPreviewTitle, { color: palette.text, fontSize: 15 * fontScale }]}>
                    {form.venue.trim() || '선택한 예식장 위치'}
                  </Text>
                  <Text
                    style={[
                      styles.mapPreviewAddress,
                      { color: palette.textMuted, fontSize: 13 * fontScale },
                    ]}
                  >
                    {form.ceremonyAddress.trim() || '주소를 입력하면 지도 위치가 준비됩니다.'}
                  </Text>
                  {hasValidCoordinates(mapLatitude, mapLongitude) ? (
                    <Text
                      style={[
                        styles.mapPreviewMeta,
                        { color: palette.textMuted, fontSize: 12 * fontScale },
                      ]}
                    >
                      좌표: {mapLatitude}, {mapLongitude}
                    </Text>
                  ) : null}
                  <ActionButton variant="secondary" onPress={() => void handleOpenMapUrl()} fullWidth>
                    앱 안에서 지도 열기
                  </ActionButton>
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyImageState,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                    아직 지도 위치가 준비되지 않았습니다. 주소를 검색하면 연결될 위치를 바로 확인할 수 있습니다.
                  </Text>
                </View>
              )}
            </SectionCard>
          </>
        );
      case 'greeting':
        return (
          <>
            <SectionCard
              title="인사말"
              description="페이지 본문에 노출되는 인사말과 작성자 문구를 정리합니다."
            >
              <TextField
                label="인사말"
                value={form.greetingMessage}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, greetingMessage: value }))
                }
                placeholder="소중한 분들을 예식에 초대하는 인사말을 입력해 주세요."
                multiline
              />
              <TextField
                label="인사말 서명"
                value={form.greetingAuthor}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, greetingAuthor: value }))
                }
                placeholder="예: 신랑 · 신부"
              />
            </SectionCard>

            <SectionCard
              title="축의금 및 방문 안내"
              description="축의금 계좌와 교통·화환 안내를 웹 page-wizard 구조처럼 함께 관리합니다."
            >
              <TextField
                label="축의금 안내 문구"
                value={form.giftMessage}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, giftMessage: value }))
                }
                placeholder="예: 계좌번호 안내가 필요하신 분들을 위해 준비했습니다."
                multiline
              />
              <TextField
                label="신랑측 계좌 (한 줄당 은행|계좌번호|예금주)"
                value={form.groomAccountsText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, groomAccountsText: value }))
                }
                placeholder={'국민은행|123-456-789|홍길동\n신한은행|111-222-333|홍길동'}
                multiline
                autoCapitalize="none"
              />
              <TextField
                label="신부측 계좌 (한 줄당 은행|계좌번호|예금주)"
                value={form.brideAccountsText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, brideAccountsText: value }))
                }
                placeholder={'우리은행|987-654-321|김수민\n하나은행|444-555-666|김수민'}
                multiline
                autoCapitalize="none"
              />
              <TextField
                label="교통 안내 (한 줄당 제목|내용)"
                value={form.venueGuideText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, venueGuideText: value }))
                }
                placeholder={'주차 안내|건물 앞 주차장을 이용해 주세요.\n대중교통|2호선 강남역 4번 출구'}
                multiline
              />
              <TextField
                label="화환 안내 (한 줄당 제목|내용)"
                value={form.wreathGuideText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, wreathGuideText: value }))
                }
                placeholder={'화환 접수|예식장 안내 데스크에 전달해 주세요.'}
                multiline
              />
            </SectionCard>
          </>
        );
      case 'images':
        return (
          <>
            <SectionCard
              title="대표 이미지"
              description="원본 대신 썸네일 우선으로 미리보기를 보여주고, 저장 시에는 원본 경로를 유지합니다."
            >
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleUploadImage('cover')}
                  loading={uploadingImageKind === 'cover'}
                >
                  대표 이미지 업로드
                </ActionButton>
              </View>
              {coverPreviewUrl ? (
                <Image
                  source={{ uri: coverPreviewUrl }}
                  alt="대표 이미지 미리보기"
                  style={styles.coverPreviewImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.emptyImageState,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                    아직 대표 이미지가 없습니다. 업로드하면 커버 미리보기로 바로 확인할 수 있습니다.
                  </Text>
                </View>
              )}
            </SectionCard>

            <SectionCard
              title={`갤러리 이미지 (${galleryPreviewItems.length}/${dashboard?.page.features.maxGalleryImages ?? 0})`}
              description="웹 page-wizard처럼 실제 노출 순서를 보면서 위아래로 정렬합니다."
            >
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleUploadImage('gallery')}
                  loading={uploadingImageKind === 'gallery'}
                  disabled={
                    galleryPreviewItems.length >= (dashboard?.page.features.maxGalleryImages ?? 0)
                  }
                >
                  갤러리 이미지 업로드
                </ActionButton>
              </View>
              {galleryPreviewItems.length ? (
                <View style={styles.galleryList}>
                  {galleryPreviewItems.map((image, index) => (
                    <View
                      key={image.id}
                      style={[
                        styles.galleryCard,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor: palette.cardBorder,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: image.previewUrl }}
                        alt={`갤러리 이미지 ${index + 1}번 미리보기`}
                        style={styles.galleryPreviewImage}
                      />
                      <View style={styles.galleryCardCopy}>
                        <Text
                          style={[
                            styles.galleryCardTitle,
                            { color: palette.text, fontSize: 14 * fontScale },
                          ]}
                        >
                          노출 순서 {index + 1}
                        </Text>
                        <Text
                          style={[
                            styles.galleryCardMeta,
                            { color: palette.textMuted, fontSize: 12 * fontScale },
                          ]}
                        >
                          저장 시 원본 이미지를 유지하고, 편집 화면은 썸네일로 불러옵니다.
                        </Text>
                      </View>
                      <View style={styles.galleryCardActions}>
                        <ActionButton
                          variant="secondary"
                          onPress={() => handleMoveGalleryImage(index, 'up')}
                          disabled={index === 0}
                        >
                          위로
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          onPress={() => handleMoveGalleryImage(index, 'down')}
                          disabled={index === galleryPreviewItems.length - 1}
                        >
                          아래로
                        </ActionButton>
                        <ActionButton
                          variant="danger"
                          onPress={() => handleRemoveGalleryImage(index)}
                        >
                          삭제
                        </ActionButton>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyImageState,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                    아직 갤러리 이미지가 없습니다. 업로드 후 순서를 바로 조정할 수 있습니다.
                  </Text>
                </View>
              )}
            </SectionCard>
          </>
        );
      case 'settings':
      default:
        return (
          <>
            <SectionCard
              title="공유 문구와 기본 테마"
              description="미리보기 제목·설명과 공개 페이지 기본 테마를 마지막으로 점검합니다."
            >
              <TextField
                label="공유 제목"
                value={form.shareTitle}
                onChangeText={(value) => setForm((current) => ({ ...current, shareTitle: value }))}
                placeholder="예: 박준호 · 김수민 결혼식에 초대합니다"
              />
              <TextField
                label="공유 설명"
                value={form.shareDescription}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, shareDescription: value }))
                }
                placeholder="미리보기 카드에서 보일 설명을 입력해 주세요."
                multiline
              />

              <Text style={[styles.helperText, { color: palette.text, fontSize: 13 * fontScale }]}>
                기본 테마
              </Text>
              <View style={styles.chipRow}>
                <ChoiceChip
                  label="감성형"
                  selected={form.defaultTheme === 'emotional'}
                  onPress={() => setForm((current) => ({ ...current, defaultTheme: 'emotional' }))}
                />
                <ChoiceChip
                  label="심플형"
                  selected={form.defaultTheme === 'simple'}
                  onPress={() => setForm((current) => ({ ...current, defaultTheme: 'simple' }))}
                />
              </View>
            </SectionCard>

            <SectionCard
              title="배경음악과 공개 설정"
              description="서비스 등급에 맞는 음악 설정과 공개 상태를 함께 저장합니다."
            >
              {dashboard?.page.features.showMusic ? (
                <>
                  <ActionButton
                    variant={form.musicEnabled ? 'primary' : 'secondary'}
                    onPress={() =>
                      setForm((current) => ({ ...current, musicEnabled: !current.musicEnabled }))
                    }
                    fullWidth
                  >
                    {form.musicEnabled ? '배경음악 사용 중' : '배경음악 사용 안 함'}
                  </ActionButton>

                  <View style={styles.dropdownField}>
                    <Text style={[styles.dropdownLabel, { color: palette.text, fontSize: 13 * fontScale }]}>
                      음악 카테고리
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!form.musicEnabled || musicLibraryLoading}
                      onPress={() =>
                        setOpenMusicDropdown((current) => (current === 'category' ? null : 'category'))
                      }
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor:
                            openMusicDropdown === 'category' ? palette.accent : palette.cardBorder,
                          opacity: !form.musicEnabled || musicLibraryLoading ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          { color: palette.text, fontSize: 14 * fontScale },
                        ]}
                      >
                        {selectedMusicCategory?.label ?? '선택'}
                      </Text>
                      <Text style={[styles.dropdownArrow, { color: palette.textMuted, fontSize: 12 * fontScale }]}>
                        {openMusicDropdown === 'category' ? '▲' : '▼'}
                      </Text>
                    </Pressable>

                    {openMusicDropdown === 'category' ? (
                      <View
                        style={[
                          styles.dropdownList,
                          { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                        ]}
                      >
                        {musicCategories.length ? (
                          musicCategories.map((category) => {
                            const selected = category.id === form.musicCategoryId;

                            return (
                              <Pressable
                                key={`music-category-${category.id}`}
                                accessibilityRole="button"
                                onPress={() => handleSelectMusicCategory(category.id)}
                                style={[
                                  styles.dropdownOption,
                                  {
                                    borderColor: selected ? palette.accent : palette.cardBorder,
                                    backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
                                  },
                                ]}
                              >
                                <View style={styles.dropdownOptionCopy}>
                                  <Text
                                    style={[
                                      styles.dropdownOptionTitle,
                                      { color: palette.text, fontSize: 14 * fontScale },
                                    ]}
                                  >
                                    {category.label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.dropdownOptionMeta,
                                      { color: palette.textMuted, fontSize: 12 * fontScale },
                                    ]}
                                  >
                                    {category.tracks.length}곡
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}>
                            등록된 카테고리가 없습니다.
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.dropdownField}>
                    <Text style={[styles.dropdownLabel, { color: palette.text, fontSize: 13 * fontScale }]}>
                      곡 선택
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!form.musicEnabled || musicLibraryLoading || availableMusicTracks.length === 0}
                      onPress={() =>
                        setOpenMusicDropdown((current) => (current === 'track' ? null : 'track'))
                      }
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor:
                            openMusicDropdown === 'track' ? palette.accent : palette.cardBorder,
                          opacity:
                            !form.musicEnabled || musicLibraryLoading || availableMusicTracks.length === 0
                              ? 0.5
                              : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          { color: palette.text, fontSize: 14 * fontScale },
                        ]}
                      >
                        {selectedMusicTrack
                          ? `${selectedMusicTrack.title} · ${selectedMusicTrack.artist}`
                          : form.musicCategoryId
                            ? '선택'
                            : '먼저 카테고리를 선택해 주세요.'}
                      </Text>
                      <Text style={[styles.dropdownArrow, { color: palette.textMuted, fontSize: 12 * fontScale }]}>
                        {openMusicDropdown === 'track' ? '▲' : '▼'}
                      </Text>
                    </Pressable>

                    {openMusicDropdown === 'track' ? (
                      <View
                        style={[
                          styles.dropdownList,
                          { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                        ]}
                      >
                        {availableMusicTracks.length ? (
                          availableMusicTracks.map((track) => {
                            const selected = track.id === form.musicTrackId;

                            return (
                              <Pressable
                                key={`music-track-${track.id}`}
                                accessibilityRole="button"
                                onPress={() => handleSelectMusicTrack(track.id)}
                                style={[
                                  styles.dropdownOption,
                                  {
                                    borderColor: selected ? palette.accent : palette.cardBorder,
                                    backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
                                  },
                                ]}
                              >
                                <View style={styles.dropdownOptionCopy}>
                                  <Text
                                    style={[
                                      styles.dropdownOptionTitle,
                                      { color: palette.text, fontSize: 14 * fontScale },
                                    ]}
                                  >
                                    {track.title}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.dropdownOptionMeta,
                                      { color: palette.textMuted, fontSize: 12 * fontScale },
                                    ]}
                                  >
                                    {track.artist}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}>
                            등록된 곡이 없습니다.
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>

                  <TextField
                    label="볼륨 (0 ~ 1)"
                    value={form.musicVolume}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, musicVolume: value }))
                    }
                    placeholder="예: 0.35"
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                  현재 서비스 등급에서는 배경음악을 제공하지 않습니다.
                </Text>
              )}

              <ActionButton
                variant={form.published ? 'primary' : 'secondary'}
                onPress={() =>
                  setForm((current) => ({ ...current, published: !current.published }))
                }
                fullWidth
              >
                {form.published ? '저장 후 공개 상태 유지' : '저장 후 비공개 상태 유지'}
              </ActionButton>
            </SectionCard>
          </>
        );
    }
  };

  const renderOnboardingStep = () => {
    switch (onboardingStepIndex) {
      case 0:
        return (
          <>
            <TextField
              label="대표 제목"
              value={form.displayName}
              onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
              placeholder="예: 신민제 · 김현지 결혼합니다"
            />
            <TextField
              label="소개 문구"
              value={form.description}
              onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
              placeholder="청첩장 첫 화면에 노출할 문구"
              multiline
            />
            <TextField
              label="신랑 이름"
              value={form.groom.name}
              onChangeText={(value) => updatePersonField('groom', 'name', value)}
              placeholder="예: 신민제"
            />
            <TextField
              label="신부 이름"
              value={form.bride.name}
              onChangeText={(value) => updatePersonField('bride', 'name', value)}
              placeholder="예: 김현지"
            />
          </>
        );
      case 1:
        return (
          <>
            <TextField
              label="예식 일시"
              value={form.date}
              onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
              placeholder="예: 2026.07.12 오후 2시"
            />
            <TextField
              label="예식 장소"
              value={form.venue}
              onChangeText={(value) => setForm((current) => ({ ...current, venue: value }))}
              placeholder="예: 더컨벤션 서울"
            />
            <TextField
              label="상세 주소"
              value={form.ceremonyAddress}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, ceremonyAddress: value }))
              }
              placeholder="예: 서울시 강남구 ..."
              multiline
            />
            <TextField
              label="예식장 연락처"
              value={form.ceremonyContact}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, ceremonyContact: value }))
              }
              placeholder="예: 02-1234-5678"
              autoCapitalize="none"
            />
          </>
        );
      default:
        return (
          <>
            <TextField
              label="인사말"
              value={form.greetingMessage}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, greetingMessage: value }))
              }
              placeholder="전하고 싶은 인사말을 입력하세요."
              multiline
            />
            <ActionButton
              variant={form.published ? 'primary' : 'secondary'}
              onPress={() =>
                setForm((current) => ({ ...current, published: !current.published }))
              }
              fullWidth
            >
              {form.published ? '저장 후 공개' : '저장 후 비공개 유지'}
            </ActionButton>
          </>
        );
    }
  };

  return (
    <>
      <AppScreen
        title="운영"
        subtitle="연동한 페이지의 공개 상태, 문구, 링크, 편집 항목, 방명록을 모바일에서 바로 관리합니다."
      >
        {!isAuthenticated ? (
          <LoginCard
            pageIdentifier={pageIdentifier}
            password={password}
            onChangePageIdentifier={setPageIdentifier}
            onChangePassword={setPassword}
            onSubmit={handleLogin}
          />
        ) : null}

        {showDashboardSyncLoading ? (
          <SectionCard
            onPress={canRequestDashboardSync ? () => void openEditorModal() : undefined}
            title="운영 데이터 불러오는 중"
            description="페이지 설정과 방명록, 공개 링크를 서버에서 확인하고 있습니다."
          >
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loadingText, { color: palette.textMuted, fontSize: 14 * fontScale }]}> 
                운영 데이터를 동기화하는 중입니다.
              </Text>
            </View>
          </SectionCard>
        ) : null}

        {pageSummary ? (
          <SectionCard
            onPress={canRequestDashboardSync ? () => void openEditorModal() : undefined}
            title={pageSummary.displayName?.trim() || '연동된 청첩장'}
            description="현재 연결된 페이지의 서비스와 공개 상태입니다."
            badge={pageSummary.published ? '공개 중' : '비공개'}
          >
            <BulletList
              items={[
                `슬러그: ${pageSummary.slug}`,
                `서비스: ${pageSummary.productTier.toUpperCase()}`,
                `기본 테마: ${pageSummary.defaultTheme === 'emotional' ? '감성형' : '심플형'}`,
                `배경음악: ${pageSummary.features.showMusic ? '사용 가능' : '미제공'}`,
                `방명록: ${pageSummary.features.showGuestbook ? '제공' : '미제공'}`,
              ]}
            />
            <View
                style={[
                  styles.selectedInvitationCard,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.selectedInvitationTitle, { color: palette.text, fontSize: 14 * fontScale }]}> 
                  {pageSummary.displayName?.trim() || '연동된 청첩장'}
                </Text>
                <Text style={[styles.selectedInvitationHint, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                  이 청첩장을 탭해서 수정 팝업 열기
                </Text>
              </View>
          </SectionCard>
        ) : null}

        {dashboard ? (
          <>
            <SectionCard
              title="공유와 공개 링크"
              description="실제 고객에게 공유되는 웹 링크 기준입니다."
            >
              <Text style={[styles.linkText, { color: palette.textMuted, fontSize: 13 * fontScale }]}> 
                {dashboard.links.publicUrl}
              </Text>
              <View style={styles.actionRow}>
                <ActionButton onPress={handleShare}>링크 공유</ActionButton>
                <ActionButton variant="secondary" onPress={handleOpenUrl}>
                  링크 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => void requestDashboardSync()}
                  disabled={!canRequestDashboardSync}
                >
                  새로고침
                </ActionButton>
                <ActionButton
                  variant={dashboard.page.published ? 'danger' : 'primary'}
                  onPress={handleTogglePublished}
                >
                  {dashboard.page.published ? '비공개 전환' : '공개 전환'}
                </ActionButton>
              </View>
            </SectionCard>

            <SectionCard
              title="청첩장 편집"
              description="선택한 청첩장을 탭하면 입력 팝업이 열리고, 그 안에서만 수정할 수 있습니다."
            >
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void openEditorModal()}
                  disabled={!canRequestDashboardSync}
                >
                  선택한 청첩장 수정하기
                </ActionButton>
              </View>
            </SectionCard>

            <Modal
              visible={editorPreparingVisible}
              animationType="fade"
              transparent
              statusBarTranslucent
              presentationStyle="overFullScreen"
              onRequestClose={() => setEditorPreparingVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBackdrop} />
                <View
                  style={[
                    styles.modalCard,
                    styles.editorPreparingCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ActivityIndicator color={palette.accent} />
                  <Text style={[styles.modalTitle, { color: palette.text, fontSize: 20 * fontScale }]}>
                    청첩장 정보 수정 준비 중
                  </Text>
                  <Text
                    style={[
                      styles.modalDescription,
                      { color: palette.textMuted, fontSize: 14 * fontScale },
                    ]}
                  >
                    {editorPreparingMessage || '최신 청첩장 정보를 불러오고 있습니다.'}
                  </Text>
                </View>
              </View>
            </Modal>

            <InvitationEditorModalShell
              visible={editorModalVisible}
              onClose={closeEditorModal}
              title="청첩장 정보 수정"
              description="페이지 내 인라인 입력 대신 팝업에서 예식 정보, 이미지, 음악을 수정합니다."
              palette={palette}
              fontScale={fontScale}
            >
              <View style={styles.editorStepHeader}>
                <Text style={[styles.editorStepTitle, { color: palette.text, fontSize: 18 * fontScale }]}>
                  {currentEditorStep.title}
                </Text>
                <Text
                  style={[
                    styles.editorStepCounter,
                    { color: palette.textMuted, fontSize: 12 * fontScale },
                  ]}
                >
                  {editorStepIndex + 1} / {EDITOR_STEPS.length}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.editorStepChipRow}
              >
                {EDITOR_STEPS.map((step, index) => (
                  <ChoiceChip
                    key={step.key}
                    label={step.title}
                    selected={index === editorStepIndex}
                    onPress={() => setEditorStepIndex(index)}
                  />
                ))}
              </ScrollView>

              {renderEditorStepContent()}

              {notice ? (
                <Text style={[styles.noticeText, { color: palette.accent, fontSize: 13 * fontScale }]}>
                  {notice}
                </Text>
              ) : null}
              {authError ? (
                <Text style={[styles.noticeText, { color: palette.danger, fontSize: 13 * fontScale }]}>
                  {authError}
                </Text>
              ) : null}

              <View style={styles.editorStepActions}>
                <ActionButton
                  variant="secondary"
                  onPress={() => setEditorStepIndex((current) => Math.max(0, current - 1))}
                  disabled={isFirstEditorStep}
                >
                  이전
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() =>
                    setEditorStepIndex((current) =>
                      Math.min(EDITOR_STEPS.length - 1, current + 1)
                    )
                  }
                  disabled={isLastEditorStep}
                >
                  다음
                </ActionButton>
              </View>

              <ActionButton onPress={() => void handleSave()} loading={isSaving} fullWidth>
                이 단계까지 저장
              </ActionButton>

              {false ? (
                <>
            <SectionCard
              title="기본 커버 정보"
              description="웹 page-wizard 기본 단계와 동일하게 대표 정보와 표지 문구를 관리합니다."
            >
              <TextField
                label="대표 제목"
                value={form.displayName}
                onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
                placeholder="예: 신민제 · 김현지 결혼합니다"
              />
              <TextField
                label="표지 부제"
                value={form.subtitle}
                onChangeText={(value) => setForm((current) => ({ ...current, subtitle: value }))}
                placeholder="예: 두 사람이 사랑으로 하나가 되는 날"
              />
              <TextField
                label="소개 문구"
                value={form.description}
                onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="청첩장 소개 문구"
                multiline
              />
            </SectionCard>

            <SectionCard
              title="신랑 · 신부 · 혼주 정보"
              description="웹 page-wizard의 인사말/인물 카드 수준으로 이름, 연락처, 부모 정보를 관리합니다."
            >
              <View style={styles.personGrid}>
                {renderPersonEditor('groom', '신랑')}
                {renderPersonEditor('bride', '신부')}
              </View>
            </SectionCard>

            <SectionCard
              title="예식 일정 정보"
              description="본식/피로연 시간과 장소를 분리해 저장합니다."
            >
              <TextField
                label="예식 일시 문구"
                value={form.date}
                onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
                placeholder="예: 2026.07.12 오후 2시"
              />
              <TextField
                label="예식장 이름"
                value={form.venue}
                onChangeText={(value) => setForm((current) => ({ ...current, venue: value }))}
                placeholder="예: 더컨벤션 서울"
              />
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <TextField
                    label="본식 시간"
                    value={form.ceremonyTime}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, ceremonyTime: value }))
                    }
                    placeholder="예: 오후 2시 30분"
                  />
                </View>
                <View style={styles.halfField}>
                  <TextField
                    label="본식 장소"
                    value={form.ceremonyLocation}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, ceremonyLocation: value }))
                    }
                    placeholder="예: 3층 그랜드홀"
                  />
                </View>
              </View>
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <TextField
                    label="피로연 시간"
                    value={form.receptionTime}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, receptionTime: value }))
                    }
                    placeholder="예: 오후 4시 30분"
                  />
                </View>
                <View style={styles.halfField}>
                  <TextField
                    label="피로연 장소"
                    value={form.receptionLocation}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, receptionLocation: value }))
                    }
                    placeholder="예: 1층 연회장"
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard
              title="장소 · 지도 정보"
              description="주소, 지도 안내, 카카오 좌표 정보까지 함께 수정합니다."
            >
              <TextField
                label="상세 주소"
                value={form.ceremonyAddress}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, ceremonyAddress: value }))
                }
                placeholder="예: 서울시 강남구 ..."
                multiline
              />
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleSearchAddress()}
                  loading={isSearchingAddress}
                >
                  카카오 주소 검색으로 좌표 자동 입력
                </ActionButton>
              </View>
              <TextField
                label="예식장 연락처"
                value={form.ceremonyContact}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, ceremonyContact: value }))
                }
                placeholder="예: 02-1234-5678"
                autoCapitalize="none"
              />
              <TextField
                label="지도 링크"
                value={form.mapUrl}
                onChangeText={(value) => setForm((current) => ({ ...current, mapUrl: value }))}
                placeholder="예: https://map.kakao.com/..."
                autoCapitalize="none"
              />
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleOpenMapUrl()}
                  disabled={!form.mapUrl.trim()}
                >
                  지도 링크 열기
                </ActionButton>
              </View>
              <TextField
                label="지도 안내 문구"
                value={form.mapDescription}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, mapDescription: value }))
                }
                placeholder="예: 건물 뒤 주차장을 이용해 주세요."
                multiline
              />
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <TextField
                    label="위도"
                    value={form.kakaoLatitude}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, kakaoLatitude: value }))
                    }
                    placeholder="예: 37.4981"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.halfField}>
                  <TextField
                    label="경도"
                    value={form.kakaoLongitude}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, kakaoLongitude: value }))
                    }
                    placeholder="예: 127.0276"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <TextField
                    label="지도 레벨"
                    value={form.kakaoLevel}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, kakaoLevel: value }))
                    }
                    placeholder="예: 3"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.halfField}>
                  <TextField
                    label="마커 제목"
                    value={form.kakaoMarkerTitle}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, kakaoMarkerTitle: value }))
                    }
                    placeholder="예: 더컨벤션 서울"
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard
              title="인사말"
              description="인사말과 서명 문구를 웹과 동일하게 관리합니다."
            >
              <TextField
                label="인사말"
                value={form.greetingMessage}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, greetingMessage: value }))
                }
                placeholder="전하고 싶은 인사말을 입력하세요."
                multiline
              />
              <TextField
                label="인사말 서명"
                value={form.greetingAuthor}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, greetingAuthor: value }))
                }
                placeholder="예: 신랑 · 신부"
              />
            </SectionCard>

            <SectionCard
              title="이미지"
              description="웹과 동일한 이미지 업로드 API 경로로 대표/갤러리 이미지를 바로 업로드할 수 있습니다."
            >
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleUploadImage('cover')}
                  loading={uploadingImageKind === 'cover'}
                >
                  대표 이미지 업로드
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleUploadImage('gallery')}
                  loading={uploadingImageKind === 'gallery'}
                >
                  갤러리 이미지 업로드
                </ActionButton>
              </View>
              <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                업로드 경로: /api/mobile/client-editor/pages/[slug]/images
              </Text>
              <TextField
                label="대표 이미지 주소"
                value={form.coverImageUrl}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, coverImageUrl: value }))
                }
                placeholder="https://.../cover.jpg"
                autoCapitalize="none"
              />
              <TextField
                label={`갤러리 이미지 주소 목록 (한 줄당 1개, 최대 ${dashboard.page.features.maxGalleryImages}장)`}
                value={form.galleryImagesText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, galleryImagesText: value }))
                }
                placeholder={'https://.../gallery-1.jpg\nhttps://.../gallery-2.jpg'}
                multiline
                autoCapitalize="none"
              />
              <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                현재 입력된 갤러리: {previewGalleryImages.length}장
              </Text>
            </SectionCard>

            <SectionCard
              title="축의금 · 방문 안내"
              description="축의금 계좌와 교통/화환 안내를 웹 page-wizard 구조에 맞춰 저장합니다."
            >
              <TextField
                label="축의금 안내 문구"
                value={form.giftMessage}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, giftMessage: value }))
                }
                placeholder="참석이 어려우신 분들을 위해 계좌번호를 안내드립니다."
                multiline
              />
              <TextField
                label="신랑측 계좌 목록 (한 줄: 은행|계좌번호|예금주)"
                value={form.groomAccountsText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, groomAccountsText: value }))
                }
                placeholder={'국민은행|123-456-789|홍길동\n신한은행|111-222-333|홍길동'}
                multiline
                autoCapitalize="none"
              />
              <TextField
                label="신부측 계좌 목록 (한 줄: 은행|계좌번호|예금주)"
                value={form.brideAccountsText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, brideAccountsText: value }))
                }
                placeholder={'우리은행|987-654-321|김현지\n하나은행|444-555-666|김현지'}
                multiline
                autoCapitalize="none"
              />
              <TextField
                label="교통 · 방문 안내 (한 줄: 제목|내용)"
                value={form.venueGuideText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, venueGuideText: value }))
                }
                placeholder={'주차 안내|건물 지하 주차장을 이용해 주세요.\n대중교통|2호선 강남역 4번 출구'}
                multiline
              />
              <TextField
                label="화환 안내 (한 줄: 제목|내용)"
                value={form.wreathGuideText}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, wreathGuideText: value }))
                }
                placeholder={'화환 접수|예식장 안내 데스크에 전달해 주세요.'}
                multiline
              />
            </SectionCard>

            <SectionCard
              title="공유 메타 · 테마 · 음악"
              description="공유 제목/설명, 기본 테마, 음악 사용 상태를 함께 관리합니다."
            >
              <TextField
                label="공유 제목"
                value={form.shareTitle}
                onChangeText={(value) => setForm((current) => ({ ...current, shareTitle: value }))}
                placeholder="예: 신민제 · 김현지 결혼식에 초대합니다"
              />
              <TextField
                label="공유 설명"
                value={form.shareDescription}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, shareDescription: value }))
                }
                placeholder="링크 미리보기 설명"
                multiline
              />

              <Text style={[styles.helperText, { color: palette.text, fontSize: 13 * fontScale }]}> 
                기본 테마
              </Text>
              <View style={styles.chipRow}>
                <ChoiceChip
                  label="감성형"
                  selected={form.defaultTheme === 'emotional'}
                  onPress={() =>
                    setForm((current) => ({ ...current, defaultTheme: 'emotional' }))
                  }
                />
                <ChoiceChip
                  label="심플형"
                  selected={form.defaultTheme === 'simple'}
                  onPress={() => setForm((current) => ({ ...current, defaultTheme: 'simple' }))}
                />
              </View>

              {dashboard.page.features.showMusic ? (
                <>
                  <ActionButton
                    variant={form.musicEnabled ? 'primary' : 'secondary'}
                    onPress={() =>
                      setForm((current) => ({ ...current, musicEnabled: !current.musicEnabled }))
                    }
                    fullWidth
                  >
                    {form.musicEnabled ? '배경음악 사용 중' : '배경음악 사용 안 함'}
                  </ActionButton>

                  <View style={styles.dropdownField}>
                    <Text style={[styles.dropdownLabel, { color: palette.text, fontSize: 13 * fontScale }]}> 
                      음악 카테고리
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!form.musicEnabled || musicLibraryLoading}
                      onPress={() =>
                        setOpenMusicDropdown((current) =>
                          current === 'category' ? null : 'category'
                        )
                      }
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor:
                            openMusicDropdown === 'category' ? palette.accent : palette.cardBorder,
                          opacity: !form.musicEnabled || musicLibraryLoading ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          { color: palette.text, fontSize: 14 * fontScale },
                        ]}
                      >
                        {selectedMusicCategory?.label ?? '선택'}
                      </Text>
                      <Text style={[styles.dropdownArrow, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                        {openMusicDropdown === 'category' ? '▲' : '▼'}
                      </Text>
                    </Pressable>

                    {openMusicDropdown === 'category' ? (
                      <View style={[styles.dropdownList, { borderColor: palette.cardBorder, backgroundColor: palette.surface }]}> 
                        {musicCategories.length ? (
                          musicCategories.map((category) => {
                            const selected = category.id === form.musicCategoryId;

                            return (
                              <Pressable
                                key={`music-category-${category.id}`}
                                accessibilityRole="button"
                                onPress={() => handleSelectMusicCategory(category.id)}
                                style={[
                                  styles.dropdownOption,
                                  {
                                    borderColor: selected ? palette.accent : palette.cardBorder,
                                    backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
                                  },
                                ]}
                              >
                                <View style={styles.dropdownOptionCopy}>
                                  <Text
                                    style={[
                                      styles.dropdownOptionTitle,
                                      { color: palette.text, fontSize: 14 * fontScale },
                                    ]}
                                  >
                                    {category.label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.dropdownOptionMeta,
                                      { color: palette.textMuted, fontSize: 12 * fontScale },
                                    ]}
                                  >
                                    {category.tracks.length}곡
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                            등록된 카테고리가 없습니다.
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.dropdownField}>
                    <Text style={[styles.dropdownLabel, { color: palette.text, fontSize: 13 * fontScale }]}> 
                      곡 선택
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!form.musicEnabled || musicLibraryLoading || availableMusicTracks.length === 0}
                      onPress={() =>
                        setOpenMusicDropdown((current) => (current === 'track' ? null : 'track'))
                      }
                      style={[
                        styles.dropdownButton,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor:
                            openMusicDropdown === 'track' ? palette.accent : palette.cardBorder,
                          opacity:
                            !form.musicEnabled || musicLibraryLoading || availableMusicTracks.length === 0
                              ? 0.5
                              : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          { color: palette.text, fontSize: 14 * fontScale },
                        ]}
                      >
                        {selectedMusicTrack
                          ? `${selectedMusicTrack.title} · ${selectedMusicTrack.artist}`
                          : form.musicCategoryId
                            ? '선택'
                            : '먼저 카테고리를 선택해 주세요.'}
                      </Text>
                      <Text style={[styles.dropdownArrow, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                        {openMusicDropdown === 'track' ? '▲' : '▼'}
                      </Text>
                    </Pressable>

                    {openMusicDropdown === 'track' ? (
                      <View style={[styles.dropdownList, { borderColor: palette.cardBorder, backgroundColor: palette.surface }]}> 
                        {availableMusicTracks.length ? (
                          availableMusicTracks.map((track) => {
                            const selected = track.id === form.musicTrackId;

                            return (
                              <Pressable
                                key={`music-track-${track.id}`}
                                accessibilityRole="button"
                                onPress={() => handleSelectMusicTrack(track.id)}
                                style={[
                                  styles.dropdownOption,
                                  {
                                    borderColor: selected ? palette.accent : palette.cardBorder,
                                    backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
                                  },
                                ]}
                              >
                                <View style={styles.dropdownOptionCopy}>
                                  <Text
                                    style={[
                                      styles.dropdownOptionTitle,
                                      { color: palette.text, fontSize: 14 * fontScale },
                                    ]}
                                  >
                                    {track.title}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.dropdownOptionMeta,
                                      { color: palette.textMuted, fontSize: 12 * fontScale },
                                    ]}
                                  >
                                    {track.artist}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                            등록된 곡이 없습니다.
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>

                  <TextField
                    label="음량 (0 ~ 1)"
                    value={form.musicVolume}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, musicVolume: value }))
                    }
                    placeholder="예: 0.35"
                    autoCapitalize="none"
                  />
                  {musicLibraryLoading ? (
                    <Text style={[styles.helperText, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                      음악 목록을 불러오는 중입니다.
                    </Text>
                  ) : null}
                </>
              ) : null}

              <ActionButton
                variant={form.published ? 'primary' : 'secondary'}
                onPress={() =>
                  setForm((current) => ({ ...current, published: !current.published }))
                }
                fullWidth
              >
                {form.published ? '저장 시 공개 유지' : '저장 시 비공개 유지'}
              </ActionButton>

              {notice ? (
                <Text style={[styles.noticeText, { color: palette.accent, fontSize: 13 * fontScale }]}> 
                  {notice}
                </Text>
              ) : null}
              {authError ? (
                <Text style={[styles.noticeText, { color: palette.danger, fontSize: 13 * fontScale }]}> 
                  {authError}
                </Text>
              ) : null}

              <ActionButton onPress={() => void handleSave()} loading={isSaving} fullWidth>
                운영 정보 저장
              </ActionButton>
            </SectionCard>

                </>
              ) : null}
            </InvitationEditorModalShell>

            <SectionCard
              title="방명록 관리"
              description="방명록 목록은 팝업에서 정렬/검색/페이지네이션으로 관리할 수 있습니다."
              badge={`${dashboard.comments.length}개`}
            >
              <Text style={[styles.loadingText, { color: palette.textMuted, fontSize: 14 * fontScale }]}> 
                {dashboard.comments.length === 0
                  ? '아직 등록된 방명록 댓글이 없습니다.'
                  : `${dashboard.comments.length}개의 방명록이 등록되어 있습니다.`}
              </Text>
              <View style={styles.actionRow}>
                <ActionButton variant="secondary" onPress={openGuestbookModal}>
                  방명록 팝업 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => void requestDashboardSync()}
                  disabled={!canRequestDashboardSync}
                >
                  목록 새로고침
                </ActionButton>
              </View>
            </SectionCard>
          </>
        ) : null}
      </AppScreen>

      <Modal
        visible={guestbookModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGuestbookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setGuestbookModalVisible(false)}
          />
          <View
            style={[
              styles.modalCard,
              styles.guestbookModalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalEyebrow, { color: palette.accent, fontSize: 12 * fontScale }]}> 
                  방명록 관리
                </Text>
                <Text style={[styles.modalTitle, { color: palette.text, fontSize: 22 * fontScale }]}> 
                  연동된 페이지 방명록
                </Text>
                <Text
                  style={[
                    styles.modalDescription,
                    { color: palette.textMuted, fontSize: 14 * fontScale },
                  ]}
                >
                  정렬/검색/페이지네이션 기준으로 댓글을 확인하고 필요 시 삭제할 수 있습니다.
                </Text>
              </View>
              <View style={[styles.modalBadge, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.modalBadgeText, { color: palette.accent, fontSize: 12 * fontScale }]}> 
                  {guestbookFilteredSortedComments.length}/{dashboard?.comments.length ?? 0}
                </Text>
              </View>
            </View>

            <TextField
              label="검색 (작성자/내용)"
              value={guestbookSearchQuery}
              onChangeText={setGuestbookSearchQuery}
              placeholder="예: 축하, 신랑측, 현지"
            />

            <View style={styles.chipRow}>
              {GUESTBOOK_SORT_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.key}
                  label={option.label}
                  selected={guestbookSortKey === option.key}
                  onPress={() => setGuestbookSortKey(option.key)}
                />
              ))}
            </View>

            <Text style={[styles.searchSummaryText, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
              검색 결과 {guestbookFilteredSortedComments.length}개 · 페이지 {guestbookPage}/{guestbookTotalPages}
            </Text>

            {guestbookPageComments.length ? (
              <ScrollView style={styles.guestbookList} contentContainerStyle={styles.guestbookListContent}>
                {guestbookPageComments.map((comment) => (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentCard,
                      { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
                    ]}
                  >
                    <View style={styles.commentCopy}>
                      <Text style={[styles.commentAuthor, { color: palette.text, fontSize: 15 * fontScale }]}> 
                        {comment.author}
                      </Text>
                      <Text style={[styles.commentMessage, { color: palette.textMuted, fontSize: 14 * fontScale }]}> 
                        {comment.message}
                      </Text>
                      <Text style={[styles.commentMeta, { color: palette.textMuted, fontSize: 12 * fontScale }]}> 
                        {comment.createdAt
                          ? new Date(comment.createdAt).toLocaleString('ko-KR')
                          : '작성 시각 없음'}
                      </Text>
                    </View>
                    <ActionButton
                      variant="danger"
                      onPress={() => void handleDeleteComment(comment.id)}
                    >
                      삭제
                    </ActionButton>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.loadingText, { color: palette.textMuted, fontSize: 14 * fontScale }]}> 
                검색 조건에 맞는 방명록이 없습니다.
              </Text>
            )}

            <View style={styles.paginationRow}>
              <ActionButton
                variant="secondary"
                onPress={() => setGuestbookPage((current) => Math.max(1, current - 1))}
                disabled={guestbookPage <= 1}
              >
                이전
              </ActionButton>
              <Text style={[styles.paginationText, { color: palette.text, fontSize: 13 * fontScale }]}> 
                {guestbookPage} / {guestbookTotalPages}
              </Text>
              <ActionButton
                variant="secondary"
                onPress={() =>
                  setGuestbookPage((current) => Math.min(guestbookTotalPages, current + 1))
                }
                disabled={guestbookPage >= guestbookTotalPages}
              >
                다음
              </ActionButton>
            </View>

            <View style={styles.modalActions}>
              <ActionButton
                variant="secondary"
                onPress={() => setGuestbookModalVisible(false)}
              >
                닫기
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => void requestDashboardSync()}
                disabled={!canRequestDashboardSync}
              >
                목록 새로고침
              </ActionButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={onboardingVisible}
        animationType="slide"
        transparent
        onRequestClose={closeOnboarding}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeOnboarding} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalEyebrow, { color: palette.accent, fontSize: 12 * fontScale }]}> 
                  운영 탭 온보딩
                </Text>
                <Text style={[styles.modalTitle, { color: palette.text, fontSize: 22 * fontScale }]}> 
                  {ONBOARDING_STEPS[onboardingStepIndex].title}
                </Text>
                <Text
                  style={[
                    styles.modalDescription,
                    { color: palette.textMuted, fontSize: 14 * fontScale },
                  ]}
                >
                  {ONBOARDING_STEPS[onboardingStepIndex].description}
                </Text>
              </View>
              <View style={[styles.modalBadge, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.modalBadgeText, { color: palette.accent, fontSize: 12 * fontScale }]}> 
                  {onboardingStepIndex + 1} / {ONBOARDING_STEPS.length}
                </Text>
              </View>
            </View>

            {renderOnboardingStep()}

            {onboardingValidationMessage ? (
              <Text style={[styles.modalErrorText, { color: palette.danger, fontSize: 13 * fontScale }]}> 
                {onboardingValidationMessage}
              </Text>
            ) : null}
            {authError ? (
              <Text style={[styles.modalErrorText, { color: palette.danger, fontSize: 13 * fontScale }]}> 
                {authError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <ActionButton variant="secondary" onPress={closeOnboarding}>
                나중에 입력
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => setOnboardingStepIndex((current) => Math.max(0, current - 1))}
                disabled={onboardingStepIndex === 0}
              >
                이전
              </ActionButton>
              <ActionButton
                onPress={() => void handleOnboardingNext()}
                loading={isSaving}
              >
                {onboardingStepIndex === ONBOARDING_STEPS.length - 1 ? '저장 후 시작' : '다음'}
              </ActionButton>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  editorPreparingCard: {
    alignItems: 'center',
  },
  editorStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editorStepTitle: {
    fontWeight: '800',
  },
  editorStepCounter: {
    fontWeight: '700',
  },
  editorStepChipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  editorStepActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    lineHeight: 20,
  },
  linkText: {
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeText: {
    lineHeight: 20,
  },
  helperText: {
    lineHeight: 18,
  },
  coverPreviewImage: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: 18,
  },
  emptyImageState: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  galleryList: {
    gap: 10,
  },
  galleryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  galleryPreviewImage: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 16,
    backgroundColor: '#f3efe8',
  },
  galleryCardCopy: {
    gap: 4,
  },
  galleryCardTitle: {
    fontWeight: '800',
  },
  galleryCardMeta: {
    lineHeight: 18,
  },
  galleryCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapPreviewCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  mapPreviewTitle: {
    fontWeight: '800',
  },
  mapPreviewAddress: {
    lineHeight: 19,
  },
  mapPreviewMeta: {
    lineHeight: 18,
  },
  selectedInvitationCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  selectedInvitationTitle: {
    fontWeight: '800',
  },
  selectedInvitationHint: {
    lineHeight: 18,
  },
  personGrid: {
    gap: 10,
  },
  personCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  personCardTitle: {
    fontWeight: '800',
  },
  personSectionLabel: {
    fontWeight: '700',
    marginTop: 2,
  },
  twoColumnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  halfField: {
    flexGrow: 1,
    flexBasis: '48%',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownField: {
    gap: 8,
  },
  dropdownLabel: {
    fontWeight: '700',
  },
  dropdownButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownButtonText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontWeight: '700',
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  dropdownOption: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionCopy: {
    gap: 2,
  },
  dropdownOptionTitle: {
    fontWeight: '700',
  },
  dropdownOptionMeta: {
    lineHeight: 18,
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  commentCopy: {
    gap: 4,
  },
  commentAuthor: {
    fontWeight: '700',
  },
  commentMessage: {
    lineHeight: 20,
  },
  commentMeta: {
    lineHeight: 18,
  },
  guestbookModalCard: {
    maxHeight: '85%',
  },
  searchSummaryText: {
    lineHeight: 18,
    fontWeight: '600',
  },
  guestbookList: {
    maxHeight: 340,
  },
  guestbookListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paginationText: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 12, 10, 0.58)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  modalEyebrow: {
    fontWeight: '800',
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalDescription: {
    lineHeight: 21,
  },
  modalBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalBadgeText: {
    fontWeight: '800',
  },
  modalErrorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
});
