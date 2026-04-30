'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import type { Swiper as SwiperType } from 'swiper';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import {
  DEFAULT_BIRTHDAY_THEME,
  isBirthdayThemeKey,
} from '@/app/_components/birthday/birthdayThemes';
import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import {
  DEFAULT_FIRST_BIRTHDAY_THEME,
  isFirstBirthdayThemeKey,
} from '@/app/_components/firstBirthday/firstBirthdayThemes';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  isGeneralEventThemeKey,
} from '@/app/_components/generalEvent/generalEventThemes';
import {
  DEFAULT_OPENING_THEME,
  isOpeningThemeKey,
} from '@/app/_components/opening/openingThemes';
import {
  cloneConfig,
  createEmptyAccount,
  createEmptyGuideItem,
  normalizeFormConfig,
  type AccountKind,
  type GuideKind,
  type ParentRole,
  type PersonRole,
} from '@/app/page-editor/pageEditorUtils';
import { useAdmin } from '@/contexts';
import {
  appQueryKeys,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';
import {
  DEFAULT_EVENT_TYPE,
  normalizeEventTypeKey,
  type EventTypeKey,
} from '@/lib/eventTypes';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import {
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import { setInvitationMusicLibrary } from '@/lib/musicLibrary';
import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';
import { getStorageDownloadUrl } from '@/services/imageService';
import { searchKakaoLocalAddress } from '@/services/kakaoLocalService';
import { getInvitationMusicLibraryFromStorage } from '@/services/musicService';
import {
  getCustomerEditableInvitationPageState,
  listOwnedCustomerEvents,
  type CustomerOwnedEventSummary,
} from '@/services/customerEventService';
import {
  type EditableInvitationPageConfig,
  getEditableInvitationPageConfig,
  getInvitationPageSeedTemplates,
  normalizeInvitationPageSlugBase,
  saveInvitationPageConfig,
} from '@/services/invitationPageService';
import { toDate } from '@/lib/invitationPageNormalization';
import type {
  InvitationPageSeed,
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';
import { buildKakaoMapSearchUrl } from '@/utils/kakaoMaps';

import PageWizardStepPreview from './PageWizardStepPreview';
import { applyWizardStorageImageFallback } from './pageWizardImageFallback';
import { useImageUpload } from './hooks/useImageUpload';
import { useWizardDerivedState } from './hooks/useWizardDerivedState';
import { useWizardNavigation } from './hooks/useWizardNavigation';
import { useWizardPersistence } from './hooks/useWizardPersistence';
import { useWizardPreviewState } from './hooks/useWizardPreviewState';
import { useWizardValidation } from './hooks/useWizardValidation';
import { useWizardVisibilityState } from './hooks/useWizardVisibilityState';
import styles from './page.module.css';
import {
  composeDescription,
  composeDisplayName,
  composeGreetingAuthor,
  createInitialWizardConfig,
  hasText,
  type WizardStepKey,
} from './pageWizardData';
import {
  buildOwnedEventSampleEditableConfig,
  buildSlugFromEnglishNames,
  composeAutoGreetingMessage,
  deriveEnglishNamesFromSlug,
  shouldSyncDerivedText,
} from './pageWizardClientUtils';
import { getPageWizardPresentation } from './pageWizardPresentation';
import {
  getNoticeClassName,
  getStepIndex,
  type MusicPreviewState,
  type NoticeState,
  type UploadFieldKind,
} from './pageWizardShared';
import {
  BasicStep,
  BirthdayBasicStep,
  BirthdayGreetingStep,
  BirthdayScheduleStep,
  BirthdayThemeStep,
  ExtraStep,
  FinalStep,
  GreetingStep,
  ImagesStep,
  MusicStep,
  EventTypeStep,
  ScheduleStep,
  SlugStep,
  ThemeStep,
  VenueStep,
} from './steps';

const DEFAULT_THEME: InvitationThemeKey = DEFAULT_INVITATION_THEME;
const DEFAULT_SEED_SLUG = getInvitationPageSeedTemplates()[0]?.seedSlug ?? null;
const IS_DEV_NOTICE_MODE = process.env.NODE_ENV !== 'production';

interface PageWizardClientProps {
  initialSlug: string | null;
  forcedEventType?: EventTypeKey;
}

type ExistingWizardLoadState =
  | {
      status: 'ready';
      editableConfig: EditableInvitationPageConfig;
    }
  | {
      status: 'claim';
    }
  | {
      status: 'blocked';
      message: string;
    };

function getWizardCopy(eventType: EventTypeKey) {
  if (eventType === 'general-event') {
    return {
      itemLabel: '행사 초대장',
      loadingTitle: '행사 초대장 편집 화면을 준비하고 있습니다.',
      createLoginTitle: '행사 초대장 만들기는 관리자만 이용 가능합니다',
      editLoginTitle: '행사 초대장 편집을 위해 로그인해 주세요',
      createLoginDescription:
        '관리자 계정으로 로그인한 뒤 새 행사 초대장 생성 화면을 이용해 주세요.',
      editLoginDescription:
        '행사 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
      createLoginHelper: '행사 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
      editLoginHelper:
        '아직 계정에 연결되지 않은 행사 초대장은 관리자에게 계정 연결을 요청해 주세요.',
      claimTitle: '관리자에게 행사 초대장 연결을 요청해 주세요',
      claimDescription:
        '이 행사 초대장은 아직 현재 로그인 계정과 연결되어 있지 않습니다. 고객 계정에 연결된 행사 초대장만 편집할 수 있습니다.',
      blockedTitle: '이 행사 초대장은 현재 계정으로 관리할 수 없습니다.',
      listButton: '내 행사 초대장으로 이동',
      emptyTitle: '행사 초대장 정보를 아직 불러오지 못했습니다.',
      emptyDescription:
        '잠시 후 다시 시도하거나 로그인 상태와 행사 초대장 연결 여부를 확인해 주세요.',
      loadError: '행사 초대장 설정을 불러오지 못했습니다.',
      addressRequired: '행사 장소 주소를 먼저 입력해 주세요.',
    };
  }

  if (eventType === 'opening') {
    return {
      itemLabel: '개업 초대장',
      loadingTitle: '개업 초대장 편집 화면을 준비하고 있습니다.',
      createLoginTitle: '개업 초대장 만들기는 관리자만 이용 가능합니다',
      editLoginTitle: '개업 초대장 편집을 위해 로그인해 주세요',
      createLoginDescription: '관리자 계정으로 로그인한 뒤 새 개업 초대장 생성 화면을 이용해 주세요.',
      editLoginDescription: '개업 초대장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
      createLoginHelper: '개업 초대장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
      editLoginHelper: '아직 계정에 연결되지 않은 개업 초대장은 관리자에게 계정 연결을 요청해 주세요.',
      claimTitle: '관리자에게 개업 초대장 연결을 요청해 주세요',
      claimDescription:
        '이 개업 초대장은 아직 현재 로그인 계정과 연결되어 있지 않습니다. 고객 계정에 연결된 개업 초대장만 편집할 수 있습니다.',
      blockedTitle: '이 개업 초대장은 현재 계정으로 관리할 수 없습니다.',
      listButton: '내 개업 초대장으로 이동',
      emptyTitle: '개업 초대장 정보를 아직 불러오지 못했습니다.',
      emptyDescription:
        '잠시 후 다시 시도하거나 로그인 상태와 개업 초대장 연결 여부를 확인해 주세요.',
      loadError: '개업 초대장 설정을 불러오지 못했습니다.',
      addressRequired: '매장 주소를 먼저 입력해 주세요.',
    };
  }

  return {
    itemLabel: '청첩장',
    loadingTitle: '청첩장 편집 화면을 준비하고 있습니다.',
    createLoginTitle: '청첩장 만들기는 관리자만 이용 가능합니다',
    editLoginTitle: '청첩장 편집을 위해 로그인해 주세요',
    createLoginDescription: '관리자 계정으로 로그인한 뒤 새 청첩장 생성 화면을 이용해 주세요.',
    editLoginDescription:
      '청첩장에 연결된 고객 계정으로 로그인하면 편집 화면을 이용할 수 있습니다.',
    createLoginHelper: '청첩장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.',
    editLoginHelper: '아직 계정에 연결되지 않은 청첩장은 관리자에게 계정 연결을 요청해 주세요.',
    claimTitle: '관리자에게 청첩장 연결을 요청해 주세요',
    claimDescription:
      '이 청첩장은 아직 현재 로그인 계정과 연결되어 있지 않습니다. 고객 계정에 연결된 청첩장만 편집할 수 있습니다.',
    blockedTitle: '이 청첩장은 현재 계정으로 관리할 수 없습니다.',
    listButton: '내 청첩장으로 이동',
    emptyTitle: '청첩장 정보를 아직 불러오지 못했습니다.',
    emptyDescription:
      '잠시 후 다시 시도하거나 로그인 상태와 청첩장 연결 여부를 확인해 주세요.',
    loadError: '청첩장 설정을 불러오지 못했습니다.',
    addressRequired: '예식장 주소를 먼저 입력해 주세요.',
  };
}

export default function PageWizardClient({
  initialSlug,
  forcedEventType,
}: PageWizardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedEventType = normalizeEventTypeKey(
    forcedEventType ?? searchParams?.get('eventType'),
    DEFAULT_EVENT_TYPE
  );
  const isEventTypeFixed = Boolean(forcedEventType);
  const queryClient = useQueryClient();
  const { authUser, isAdminLoading, isAdminLoggedIn, isLoggedIn } = useAdmin();

  const [formState, setFormState] = useState<InvitationPageSeed | null>(null);
  const [eventType, setEventType] = useState<EventTypeKey>(requestedEventType);
  const [defaultTheme, setDefaultTheme] = useState<InvitationThemeKey>(DEFAULT_THEME);
  const {
    published,
    setPublished,
    applyPublishedState,
    resetPublishedState,
  } = useWizardVisibilityState(false);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(initialSlug?.trim())
  );
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingVenueAddress, setIsSearchingVenueAddress] = useState(false);
  const [uploadingField, setUploadingField] = useState<UploadFieldKind | null>(null);
  const [requiresOwnershipClaim, setRequiresOwnershipClaim] = useState(false);
  const [accessErrorMessage, setAccessErrorMessage] = useState<string | null>(null);
  const [activeStepKey, setActiveStepKey] = useState<WizardStepKey>(
    initialSlug ? 'basic' : isEventTypeFixed ? 'theme' : 'eventType'
  );
  const {
    openChoicePanel,
    setOpenChoicePanel,
    getStepViewMode,
    setStepViewMode,
    toggleChoicePanel,
  } = useWizardPreviewState();
  const [musicPreviewState, setMusicPreviewState] = useState<MusicPreviewState>('idle');
  const wizardCopy = getWizardCopy(eventType);

  const swiperRef = useRef<SwiperType | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sharePreviewUploadInputRef = useRef<HTMLInputElement | null>(null);
  const kakaoCardUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateNew = isAdminLoggedIn;
  const canOpenExistingWizard = Boolean(initialSlug && isLoggedIn);
  const canUploadImages = isAdminLoggedIn || Boolean(initialSlug && isLoggedIn);
  const wizardPresentation = getPageWizardPresentation(eventType);
  const pageClassName =
    wizardPresentation.pageClassName === 'birthday'
      ? `${styles.page} ${styles.pageBirthday}`
      : wizardPresentation.pageClassName === 'firstBirthday'
        ? `${styles.page} ${styles.pageFirstBirthday}`
        : wizardPresentation.pageClassName === 'generalEvent'
          ? `${styles.page} ${styles.pageGeneralEvent}`
          : wizardPresentation.pageClassName === 'opening'
            ? `${styles.page} ${styles.pageOpening}`
          : styles.page;
  const ownedEventsQuery = useQuery<CustomerOwnedEventSummary[]>({
    queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
    enabled:
      Boolean(initialSlug) &&
      !isAdminLoading &&
      isLoggedIn &&
      !isAdminLoggedIn &&
      Boolean(authUser?.uid),
    queryFn: async () => listOwnedCustomerEvents(authUser?.uid ?? ''),
    staleTime: 0,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  const ownedEventForInitialSlug = useMemo(() => {
    const normalizedInitialSlug = initialSlug
      ? normalizeInvitationPageSlugBase(initialSlug)
      : '';
    if (!normalizedInitialSlug) {
      return null;
    }

    return (
      (ownedEventsQuery.data ?? []).find((event) => {
        return normalizeInvitationPageSlugBase(event.slug) === normalizedInitialSlug;
      }) ?? null
    );
  }, [initialSlug, ownedEventsQuery.data]);
  const ownedEventFallbackEditableConfig = useMemo(
    () =>
      ownedEventForInitialSlug
        ? buildOwnedEventSampleEditableConfig(ownedEventForInitialSlug)
        : null,
    [ownedEventForInitialSlug]
  );
  const isOwnedEventsCheckPendingForInitialSlug = Boolean(
    initialSlug &&
      !isAdminLoading &&
      !isAdminLoggedIn &&
      isLoggedIn &&
      authUser?.uid &&
      !ownedEventForInitialSlug &&
      !ownedEventsQuery.isError &&
      (ownedEventsQuery.isPending || ownedEventsQuery.isFetching)
  );
  const wizardLoadQuery = useQuery<ExistingWizardLoadState>({
    queryKey: [
      'page-wizard-existing',
      initialSlug,
      authUser?.uid ?? null,
      isAdminLoggedIn,
      isLoggedIn,
    ],
    enabled:
      Boolean(initialSlug) &&
      !isAdminLoading &&
      (isAdminLoggedIn || isLoggedIn),
    queryFn: async () => {
      if (!initialSlug) {
        throw new Error('기존 청첩장 slug가 없습니다.');
      }

      let rawEditableConfig: EditableInvitationPageConfig | null = null;
      if (isAdminLoggedIn) {
        rawEditableConfig = await getEditableInvitationPageConfig(initialSlug);
      } else {
        const loadOwnedEventFallback = async () => {
          if (!authUser?.uid) {
            return null;
          }

          const ownedEvents = await listOwnedCustomerEvents(authUser.uid);
          const normalizedInitialSlug = normalizeInvitationPageSlugBase(initialSlug);
          const ownedEvent = ownedEvents.find((event) => {
            return normalizeInvitationPageSlugBase(event.slug) === normalizedInitialSlug;
          });

          return ownedEvent ? buildOwnedEventSampleEditableConfig(ownedEvent) : null;
        };
        const customerState = await getCustomerEditableInvitationPageState(initialSlug);
        if (customerState.status === 'blocked') {
          return {
            status: 'blocked',
            message: customerState.message,
          } satisfies ExistingWizardLoadState;
        }

        if (customerState.status !== 'ready') {
          const sampleEditableConfig = await loadOwnedEventFallback();
          if (sampleEditableConfig) {
            rawEditableConfig = sampleEditableConfig;
          } else {
            return { status: 'claim' } satisfies ExistingWizardLoadState;
          }
        } else {
          rawEditableConfig = customerState.editableConfig;
        }

        if (!rawEditableConfig) {
          const sampleEditableConfig = await loadOwnedEventFallback();
          if (sampleEditableConfig) {
            rawEditableConfig = sampleEditableConfig;
          }
        }

        if (!rawEditableConfig) {
          return { status: 'claim' } satisfies ExistingWizardLoadState;
        }
      }

      const editableConfig =
        rawEditableConfig && isAdminLoggedIn
          ? await applyWizardStorageImageFallback(rawEditableConfig)
          : rawEditableConfig;

      if (!editableConfig) {
        return { status: 'claim' } satisfies ExistingWizardLoadState;
      }

      const coverImageChanged =
        rawEditableConfig?.config.metadata.images.wedding !==
        editableConfig.config.metadata.images.wedding;
      const socialImageChanged =
        rawEditableConfig?.config.metadata.images.social !==
        editableConfig.config.metadata.images.social;
      const kakaoCardImageChanged =
        rawEditableConfig?.config.metadata.images.kakaoCard !==
        editableConfig.config.metadata.images.kakaoCard;
      const galleryImagesChanged =
        JSON.stringify(rawEditableConfig?.config.pageData?.galleryImages ?? []) !==
        JSON.stringify(editableConfig.config.pageData?.galleryImages ?? []);

      if (
        isAdminLoggedIn &&
        rawEditableConfig &&
        (coverImageChanged ||
          socialImageChanged ||
          kakaoCardImageChanged ||
          galleryImagesChanged)
      ) {
        try {
          await saveInvitationPageConfig(editableConfig.config, {
            published: editableConfig.published,
            defaultTheme: editableConfig.defaultTheme,
          });
        } catch (syncError) {
          console.warn('[page-wizard] failed to sync cleaned image references', syncError);
        }
      }

      return {
        status: 'ready',
        editableConfig,
      } satisfies ExistingWizardLoadState;
    },
    staleTime: 0,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  const {
    wizardSteps,
    previewFormState,
    autoGeneratedSlug,
    normalizedSlugInput,
    resolvedPersistedSlug,
    previewSlug,
    maxGalleryImages,
    slugStepState,
    currentWeddingSummary,
  } = useWizardDerivedState({
    activeEventType: eventType,
    brideEnglishName,
    formState,
    groomEnglishName,
    includeEventTypeStep: !isEventTypeFixed,
    initialSlug,
    persistedSlug,
    slugInput,
  });
  const { getValidationForStep, finalReviewSummary } = useWizardValidation({
    activeStepKey,
    defaultTheme,
    previewFormState,
    slugStepState,
    steps: wizardSteps,
  });

  const resolveErrorNoticeMessage = useCallback(
    (error: unknown, fallback?: string) => {
      const userFacingMessage = toUserFacingKoreanErrorMessage(error, fallback);

      if (!IS_DEV_NOTICE_MODE) {
        return userFacingMessage;
      }

      const rawMessage =
        error instanceof Error
          ? error.message.trim()
          : typeof error === 'string'
            ? error.trim()
            : '';

      if (!rawMessage || rawMessage === userFacingMessage) {
        return userFacingMessage;
      }

      return `${userFacingMessage} (원본: ${rawMessage})`;
    },
    []
  );

  const showNotice = useCallback((tone: 'success' | 'error' | 'neutral', message: string) => {
    const nextMessage =
      tone === 'error' ? resolveErrorNoticeMessage(message) : message;

    setNotice({ tone, message: nextMessage });
  }, [resolveErrorNoticeMessage]);

  const showErrorNotice = useCallback(
    (error: unknown, fallback?: string) => {
      setNotice({
        tone: 'error',
        message: resolveErrorNoticeMessage(error, fallback),
      });
    },
    [resolveErrorNoticeMessage]
  );

  const applyLoadedEditableConfig = useCallback(
    (editableConfig: EditableInvitationPageConfig) => {
      const nextConfig = normalizeFormConfig(editableConfig.config);
      const nextEventType = normalizeEventTypeKey(
        editableConfig.config.eventType,
        DEFAULT_EVENT_TYPE
      );

      setFormState(nextConfig);
      setEventType(nextEventType);
      setPersistedSlug(initialSlug);
      setSlugInput(initialSlug ?? editableConfig.slug);
      setHasManualSlugOverride(true);
      applyPublishedState(editableConfig.published);
      setDefaultTheme(editableConfig.defaultTheme ?? DEFAULT_THEME);
      setLastSavedAt(toDate(editableConfig.lastSavedAt));
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
    },
    [applyPublishedState, initialSlug]
  );

  useEffect(() => {
    if (
      !initialSlug ||
      !ownedEventFallbackEditableConfig ||
      isAdminLoading ||
      !isLoggedIn
    ) {
      return;
    }

    if (formState && !requiresOwnershipClaim) {
      return;
    }

    queryClient.setQueryData(
      [
        'page-wizard-existing',
        initialSlug,
        authUser?.uid ?? null,
        isAdminLoggedIn,
        isLoggedIn,
      ],
      {
        status: 'ready',
        editableConfig: ownedEventFallbackEditableConfig,
      } satisfies ExistingWizardLoadState
    );
    applyLoadedEditableConfig(ownedEventFallbackEditableConfig);
    setIsLoading(false);
    setRequiresOwnershipClaim(false);
    setAccessErrorMessage(null);
  }, [
    applyLoadedEditableConfig,
    authUser?.uid,
    formState,
    initialSlug,
    isAdminLoading,
    isAdminLoggedIn,
    isLoggedIn,
    ownedEventFallbackEditableConfig,
    queryClient,
    requiresOwnershipClaim,
  ]);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const updateSwiperLayout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const swiper = swiperRef.current;
        if (!swiper || swiper.destroyed) {
          return;
        }

        swiper.updateAutoHeight(0);
        swiper.update();
      });
    });
  }, []);

  /* State updaters */

  const updateForm = useCallback((updater: (draft: InvitationPageSeed) => void) => {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const next = cloneConfig(current);
      updater(next);
      return next;
    });
  }, []);

  const handleProductTierChange = useCallback((tier: InvitationProductTier) => {
    updateForm((draft) => {
      const nextFeatures = resolveInvitationFeatures(tier);

      draft.productTier = tier;
      draft.features = nextFeatures;

      if (draft.pageData?.galleryImages) {
        draft.pageData.galleryImages = draft.pageData.galleryImages
          .slice(0, nextFeatures.maxGalleryImages);
      }

      if (!nextFeatures.showMusic) {
        draft.musicEnabled = false;
        draft.musicCategoryId = '';
        draft.musicTrackId = '';
        draft.musicStoragePath = '';
        draft.musicUrl = '';
      }
    });
  }, [updateForm]);

  const slideToStep = useCallback((stepKey: WizardStepKey) => {
    const index = getStepIndex(stepKey, wizardSteps);
    if (index < 0) {
      return;
    }

    swiperRef.current?.slideTo(index);
    setActiveStepKey(stepKey);
  }, [wizardSteps]);

  const handleGroomEnglishNameChange = useCallback(
    (value: string) => {
      setGroomEnglishName(value);

      if (resolvedPersistedSlug || hasManualSlugOverride) {
        return;
      }

      setSlugInput(buildSlugFromEnglishNames(value, brideEnglishName));
    },
    [brideEnglishName, hasManualSlugOverride, resolvedPersistedSlug]
  );

  const handleBrideEnglishNameChange = useCallback(
    (value: string) => {
      setBrideEnglishName(value);

      if (resolvedPersistedSlug || hasManualSlugOverride) {
        return;
      }

      setSlugInput(buildSlugFromEnglishNames(groomEnglishName, value));
    },
    [groomEnglishName, hasManualSlugOverride, resolvedPersistedSlug]
  );

  const handleSlugInputChange = useCallback(
    (value: string) => {
      setSlugInput(value);

      if (resolvedPersistedSlug) {
        return;
      }

      const trimmedValue = value.trim();
      if (!trimmedValue) {
        setHasManualSlugOverride(false);
        return;
      }

      const normalizedValue = normalizeInvitationPageSlugBase(value);
      setHasManualSlugOverride(normalizedValue !== autoGeneratedSlug);
    },
    [autoGeneratedSlug, resolvedPersistedSlug]
  );

  /* Effects */

  useEffect(() => {
    const derivedNames = deriveEnglishNamesFromSlug(initialSlug);
    setGroomEnglishName(derivedNames.groomEnglishName);
    setBrideEnglishName(derivedNames.brideEnglishName);
    setHasManualSlugOverride(Boolean(initialSlug?.trim()));
  }, [initialSlug]);

  useEffect(() => {
    let cancelled = false;

    const loadMusicLibrary = async () => {
      const storageLibrary = await getInvitationMusicLibraryFromStorage();

      if (cancelled || storageLibrary.length === 0) {
        return;
      }

      const applied = setInvitationMusicLibrary(storageLibrary);
      if (!applied || cancelled) {
        return;
      }

      setFormState((current) => (current ? { ...current } : current));
    };

    void loadMusicLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resolvedPersistedSlug || hasManualSlugOverride) {
      return;
    }

    setSlugInput(autoGeneratedSlug);
  }, [autoGeneratedSlug, hasManualSlugOverride, resolvedPersistedSlug]);

  useEffect(() => {
    if (wizardSteps.some((step) => step.key === activeStepKey)) {
      return;
    }

    setActiveStepKey(wizardSteps[0]?.key ?? 'basic');
  }, [activeStepKey, wizardSteps]);

  useEffect(() => {
    setFormState((current) => {
      if (!current?.pageData) {
        return current;
      }

      if (current.eventType === 'general-event') {
        return current;
      }

      const groomName = current.couple.groom.name;
      const brideName = current.couple.bride.name;
      const autoGreetingMessage = composeAutoGreetingMessage(groomName, brideName);
      const autoGreetingAuthor = composeGreetingAuthor(groomName, brideName);
      let changed = false;
      const next = cloneConfig(current);
      const nextPageData = next.pageData;

      if (!nextPageData) {
        return current;
      }

      if (!nextPageData.greetingMessage?.trim()) {
        nextPageData.greetingMessage = autoGreetingMessage;
        changed = true;
      }

      if (!nextPageData.greetingAuthor?.trim()) {
        nextPageData.greetingAuthor = autoGreetingAuthor;
        changed = true;
      }

      if (nextPageData.groom?.name !== next.couple.groom.name) {
        nextPageData.groom = cloneConfig(next.couple.groom);
        changed = true;
      }

      if (nextPageData.bride?.name !== next.couple.bride.name) {
        nextPageData.bride = cloneConfig(next.couple.bride);
        changed = true;
      }

      return changed ? next : current;
    });
  }, [formState?.couple.bride.name, formState?.couple.groom.name]);

  useEffect(() => {
    updateSwiperLayout();
  }, [activeStepKey, notice, openChoicePanel, updateSwiperLayout]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const swiper = swiperRef.current;
    const activeSlide = swiper?.slides?.[swiper.activeIndex] as HTMLElement | undefined;

    if (!swiper || !activeSlide) {
      return;
    }

    updateSwiperLayout();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateSwiperLayout();
    });

    resizeObserver.observe(activeSlide);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeStepKey, updateSwiperLayout]);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    if (!isAdminLoggedIn && (!initialSlug || !isLoggedIn)) {
      setFormState(null);
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (!initialSlug) {
      const nextConfig = createInitialWizardConfig(requestedEventType);

      setFormState(nextConfig);
      setEventType(normalizeEventTypeKey(nextConfig.eventType, DEFAULT_EVENT_TYPE));
      setPersistedSlug(null);
      setSlugInput('');
      setHasManualSlugOverride(false);
      setGroomEnglishName('');
      setBrideEnglishName('');
      resetPublishedState();
      setDefaultTheme(DEFAULT_THEME);
      setLastSavedAt(null);
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (
      wizardLoadQuery.isPending ||
      (wizardLoadQuery.isFetching && wizardLoadQuery.data?.status === 'claim')
    ) {
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
      setIsLoading(true);
      return;
    }

    if (wizardLoadQuery.data?.status === 'claim') {
      if (ownedEventFallbackEditableConfig) {
        queryClient.setQueryData(
          [
            'page-wizard-existing',
            initialSlug,
            authUser?.uid ?? null,
            isAdminLoggedIn,
            isLoggedIn,
          ],
          {
            status: 'ready',
            editableConfig: ownedEventFallbackEditableConfig,
          } satisfies ExistingWizardLoadState
        );
        applyLoadedEditableConfig(ownedEventFallbackEditableConfig);
        setIsLoading(false);
        return;
      }

      if (isOwnedEventsCheckPendingForInitialSlug) {
        setRequiresOwnershipClaim(false);
        setAccessErrorMessage(null);
        setIsLoading(true);
        return;
      }

      setFormState(null);
      setRequiresOwnershipClaim(true);
      setAccessErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (wizardLoadQuery.data?.status === 'blocked') {
      setFormState(null);
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(wizardLoadQuery.data.message);
      setIsLoading(false);
      return;
    }

    if (wizardLoadQuery.data?.status === 'ready') {
      applyLoadedEditableConfig(wizardLoadQuery.data.editableConfig);
      setIsLoading(false);
      return;
    }

    if (wizardLoadQuery.error) {
      if (ownedEventFallbackEditableConfig) {
        applyLoadedEditableConfig(ownedEventFallbackEditableConfig);
        setIsLoading(false);
        return;
      }

      if (isOwnedEventsCheckPendingForInitialSlug) {
        setRequiresOwnershipClaim(false);
        setAccessErrorMessage(null);
        setIsLoading(true);
        return;
      }

      showErrorNotice(wizardLoadQuery.error, wizardPresentation.loadErrorMessage);
      setIsLoading(false);
    }
  }, [
    applyLoadedEditableConfig,
    authUser?.uid,
    initialSlug,
    isAdminLoading,
    isAdminLoggedIn,
    isLoggedIn,
    isOwnedEventsCheckPendingForInitialSlug,
    ownedEventFallbackEditableConfig,
    queryClient,
    requestedEventType,
    resetPublishedState,
    showErrorNotice,
    wizardPresentation.loadErrorMessage,
    wizardLoadQuery.data,
    wizardLoadQuery.error,
    wizardLoadQuery.isFetching,
    wizardLoadQuery.isPending,
  ]);

  useEffect(() => {
    if (initialSlug) {
      return;
    }

    setFormState((current) => {
      if (!current) {
        return current;
      }

      const nextEventType = normalizeEventTypeKey(current.eventType, eventType);
      if (nextEventType === current.eventType) {
        return current;
      }

      return {
        ...current,
        eventType,
      };
    });
  }, [eventType, initialSlug]);

  useEffect(() => {
    if (initialSlug) {
      return;
    }

    if (eventType === 'first-birthday') {
      setDefaultTheme((current) =>
        isFirstBirthdayThemeKey(current) ? current : DEFAULT_FIRST_BIRTHDAY_THEME
      );
      return;
    }

    if (eventType === 'birthday') {
      setDefaultTheme((current) =>
        isBirthdayThemeKey(current) ? current : DEFAULT_BIRTHDAY_THEME
      );
      return;
    }

    if (eventType === 'general-event') {
      setDefaultTheme((current) =>
        isGeneralEventThemeKey(current) ? current : GENERAL_EVENT_DEFAULT_THEME
      );
      return;
    }

    if (eventType === 'opening') {
      setDefaultTheme((current) =>
        isOpeningThemeKey(current) ? current : DEFAULT_OPENING_THEME
      );
      return;
    }

    setDefaultTheme((current) =>
      isFirstBirthdayThemeKey(current) ||
      isBirthdayThemeKey(current) ||
      isGeneralEventThemeKey(current) ||
      isOpeningThemeKey(current)
        ? DEFAULT_THEME
        : current
    );
  }, [eventType, initialSlug]);

  useEffect(() => {
    if (!formState?.musicEnabled) {
      setMusicPreviewState('idle');
      return;
    }

    if (formState.musicUrl?.trim()) {
      setMusicPreviewState('ready');
      return;
    }

    const musicStoragePath = formState.musicStoragePath?.trim();
    if (!musicStoragePath) {
      setMusicPreviewState('error');
      return;
    }

    let cancelled = false;
    setMusicPreviewState('loading');

    const resolveMusicUrl = async () => {
      const downloadUrl = await getStorageDownloadUrl(musicStoragePath);
      if (cancelled) {
        return;
      }

      if (!downloadUrl) {
        setMusicPreviewState('error');
        return;
      }

      setFormState((current) => {
        if (!current || current.musicStoragePath?.trim() !== musicStoragePath) {
          return current;
        }

        if (current.musicUrl?.trim()) {
          return current;
        }

        return {
          ...current,
          musicUrl: downloadUrl,
        };
      });

      setMusicPreviewState('ready');
    };

    void resolveMusicUrl();

    return () => {
      cancelled = true;
    };
  }, [formState?.musicEnabled, formState?.musicStoragePath, formState?.musicUrl]);

  /* Handlers: Person fields */

  const handlePersonNameChange = (role: PersonRole, value: string) => {
    updateForm((draft) => {
      const previousGroomName = draft.couple.groom.name;
      const previousBrideName = draft.couple.bride.name;
      const previousDisplayName = composeDisplayName(previousGroomName, previousBrideName);
      const previousDescription = composeDescription(previousGroomName, previousBrideName);
      const previousGreetingMessage = composeAutoGreetingMessage(
        previousGroomName,
        previousBrideName
      );
      const previousGreetingAuthor = composeGreetingAuthor(
        previousGroomName,
        previousBrideName
      );

      draft.couple[role].name = value;

      if (role === 'groom') {
        draft.groomName = value;
      } else {
        draft.brideName = value;
      }

      const nextGroomName = role === 'groom' ? value : previousGroomName;
      const nextBrideName = role === 'bride' ? value : previousBrideName;

      if (shouldSyncDerivedText(draft.displayName, previousDisplayName)) {
        draft.displayName = composeDisplayName(nextGroomName, nextBrideName);
      }

      if (shouldSyncDerivedText(draft.description, previousDescription)) {
        draft.description = composeDescription(nextGroomName, nextBrideName);
      }

      if (draft.pageData) {
        if (
          shouldSyncDerivedText(
            draft.pageData.greetingMessage ?? '',
            previousGreetingMessage
          )
        ) {
          draft.pageData.greetingMessage = composeAutoGreetingMessage(
            nextGroomName,
            nextBrideName
          );
        }

        if (
          shouldSyncDerivedText(
            draft.pageData.greetingAuthor ?? '',
            previousGreetingAuthor
          )
        ) {
          draft.pageData.greetingAuthor = composeGreetingAuthor(
            nextGroomName,
            nextBrideName
          );
        }
      }
    });
  };

  const handleVenueAddressSearch = async () => {
    const query = formState?.pageData?.ceremonyAddress?.trim() ?? '';
    if (!query) {
      showErrorNotice(
        eventType === 'general-event'
          ? wizardCopy.addressRequired
          : eventType === 'birthday'
            ? '파티 장소 주소를 먼저 입력해 주세요.'
          : eventType === 'first-birthday'
            ? '돌잔치 장소 주소를 먼저 입력해 주세요.'
            : '예식장 주소를 먼저 입력해 주세요.'
      );
      return;
    }

    setIsSearchingVenueAddress(true);

    try {
      const result = await searchKakaoLocalAddress(query);

      updateForm((draft) => {
        if (!draft.pageData) {
          return;
        }

        draft.pageData.ceremonyAddress = result.addressName;
        draft.pageData.mapUrl = buildKakaoMapSearchUrl(result.addressName);
        draft.pageData.kakaoMap = {
          latitude: result.latitude,
          longitude: result.longitude,
          level: draft.pageData.kakaoMap?.level ?? 3,
          markerTitle:
            draft.pageData.kakaoMap?.markerTitle?.trim() ||
            draft.pageData.venueName?.trim() ||
            draft.venue.trim() ||
            result.addressName,
        };
      });

    } catch (error) {
      showErrorNotice(error, '주소 검색에 실패했습니다.');
    } finally {
      setIsSearchingVenueAddress(false);
    }
  };

  const handlePersonFieldChange = (
    role: PersonRole,
    field: 'name' | 'order' | 'phone',
    value: string
  ) => {
    if (field === 'name') {
      handlePersonNameChange(role, value);
      return;
    }

    updateForm((draft) => {
      draft.couple[role][field] = value;
      if (draft.pageData?.[role]) {
        draft.pageData[role][field] = value;
      }
    });
  };

  const handleSlugPrimaryKoreanNameChange = (value: string) => {
      if (eventType === 'first-birthday') {
        updateForm((draft) => {
          draft.displayName = value;
          draft.groomName = '';
          draft.brideName = '';
          draft.metadata.title = value;
          draft.description =
            draft.description.trim() || `${value.trim() || '아기'}의 첫 번째 생일잔치에 초대합니다.`;
          draft.metadata.description =
            draft.metadata.description.trim() || draft.description;
          draft.metadata.openGraph.title = value;
          draft.metadata.openGraph.description =
            draft.metadata.openGraph.description.trim() || draft.description;
          draft.metadata.twitter.title = value;
          draft.metadata.twitter.description =
            draft.metadata.twitter.description.trim() || draft.description;
          if (draft.pageData) {
            draft.pageData.greetingAuthor = '아빠 · 엄마';
          }
        });
        return;
      }

      if (eventType !== 'general-event') {
        if (eventType === 'opening') {
          updateForm((draft) => {
            draft.groomName = value;
            draft.couple.groom.name = value;
            draft.displayName = value;
            draft.description =
              draft.description.trim() || `${value.trim() || '새 매장'} 개업 소식에 초대합니다.`;
            draft.metadata.title = value;
            draft.metadata.description =
              draft.metadata.description.trim() || draft.description;
            draft.metadata.openGraph.title = value;
            draft.metadata.openGraph.description =
              draft.metadata.openGraph.description.trim() || draft.description;
            draft.metadata.twitter.title = value;
            draft.metadata.twitter.description =
              draft.metadata.twitter.description.trim() || draft.description;
            if (draft.pageData) {
              draft.pageData.greetingAuthor = value;
              draft.pageData.venueName = value;
            }
          });
          return;
        }

        handlePersonFieldChange('groom', 'name', value);
        if (eventType === 'birthday') {
          updateForm((draft) => {
            draft.groomName = value;
            draft.brideName = '';
            draft.couple.bride.name = '';
            draft.displayName = value;
            draft.description =
              draft.description.trim() || `${value.trim() || '생일 주인공'}님의 생일 자리에 초대합니다.`;
            draft.metadata.title = value;
            draft.metadata.description =
              draft.metadata.description.trim() || draft.description;
            draft.metadata.openGraph.title = value;
            draft.metadata.openGraph.description =
              draft.metadata.openGraph.description.trim() || draft.description;
            draft.metadata.twitter.title = value;
            draft.metadata.twitter.description =
              draft.metadata.twitter.description.trim() || draft.description;
            if (draft.pageData) {
              draft.pageData.greetingAuthor = value;
            }
          });
        }
        return;
      }

    updateForm((draft) => {
      draft.groomName = value;
      draft.couple.groom.name = value;
      draft.displayName = value;
      draft.description =
        draft.description.trim() || `${value.trim() || '행사'}에 초대합니다.`;
      draft.metadata.title = value;
      draft.metadata.description =
        draft.metadata.description.trim() || draft.description;
      draft.metadata.openGraph.title = value;
      draft.metadata.openGraph.description =
        draft.metadata.openGraph.description.trim() || draft.description;
      draft.metadata.twitter.title = value;
      draft.metadata.twitter.description =
        draft.metadata.twitter.description.trim() || draft.description;
    });
  };

  const handleParentFieldChange = (
    role: PersonRole,
    parentRole: ParentRole,
    field: 'relation' | 'name' | 'phone',
    value: string
  ) => {
    updateForm((draft) => {
      const parent = draft.couple[role][parentRole];
      if (!parent) {
        return;
      }

      parent[field] = value;
      if (draft.pageData?.[role]?.[parentRole]) {
        draft.pageData[role][parentRole][field] = value;
      }
    });
  };

  /* Handlers: Date/Time */

  const handleDateInputChange = (value: string) => {
    if (!value) {
      return;
    }

    const [year, month, day] = value.split('-').map((item) => Number(item));
    updateForm((draft) => {
      draft.weddingDateTime.year = year;
      draft.weddingDateTime.month = month - 1;
      draft.weddingDateTime.day = day;
    });
  };

  const handleTimeInputChange = (value: string) => {
    if (!value) {
      return;
    }

    const [hour, minute] = value.split(':').map((item) => Number(item));
    updateForm((draft) => {
      draft.weddingDateTime.hour = hour;
      draft.weddingDateTime.minute = minute;
    });
  };

  /* Handlers: Guide/Account */

  const handleGuideAdd = (kind: GuideKind) => {
    updateForm((draft) => {
      const items = draft.pageData?.[kind];
      if (!items || items.length >= 3) {
        return;
      }

      items.push(createEmptyGuideItem());
    });
  };

  const handleGuideRemove = (kind: GuideKind, index: number) => {
    updateForm((draft) => {
      draft.pageData?.[kind]?.splice(index, 1);
    });
  };

  const handleGuideChange = (
    kind: GuideKind,
    index: number,
    field: 'title' | 'content',
    value: string
  ) => {
    updateForm((draft) => {
      const item = draft.pageData?.[kind]?.[index];
      if (!item) {
        return;
      }

      item[field] = value;
    });
  };

  const handleGuideTemplateApply = (kind: GuideKind, label: string, content: string) => {
    updateForm((draft) => {
      const items = draft.pageData?.[kind];
      if (!items) {
        return;
      }

      const emptyIndex = items.findIndex(
        (item) => !hasText(item.title) && !hasText(item.content)
      );
      const targetIndex = emptyIndex >= 0 ? emptyIndex : items.length;

      if (targetIndex >= 3) {
        return;
      }

      if (!items[targetIndex]) {
        items.push(createEmptyGuideItem());
      }

      items[targetIndex].title = label;
      items[targetIndex].content = content;
    });
  };

  const handleAccountAdd = (kind: AccountKind) => {
    updateForm((draft) => {
      const accounts = draft.pageData?.giftInfo?.[kind];
      if (!accounts || accounts.length >= 3) {
        return;
      }

      accounts.push(createEmptyAccount());
    });
  };

  const handleAccountRemove = (kind: AccountKind, index: number) => {
    updateForm((draft) => {
      draft.pageData?.giftInfo?.[kind]?.splice(index, 1);
    });
  };

  const handleAccountChange = (
    kind: AccountKind,
    index: number,
    field: 'bank' | 'accountNumber' | 'accountHolder',
    value: string
  ) => {
    updateForm((draft) => {
      const account = draft.pageData?.giftInfo?.[kind]?.[index];
      if (!account) {
        return;
      }

      account[field] = value;
    });
  };

  const { ensureDraftCreated, persistDraft } = useWizardPersistence({
    formState,
    previewFormState,
    eventType,
    defaultTheme,
    published,
    resolvedPersistedSlug,
    slugInput,
    defaultSeedSlug: DEFAULT_SEED_SLUG,
    isAdminLoggedIn,
    setPersistedSlug,
    setSlugInput,
    setFormState,
    setPublished,
    setLastSavedAt,
    setIsSaving,
    normalizeFormState: normalizeFormConfig,
    showNotice,
    showErrorNotice,
    onPersisted: async ({ slug, config, published: nextPublished }) => {
      const nextProductTier = normalizeInvitationProductTier(config.productTier);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: appQueryKeys.editableInvitationPage(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
        }),
        queryClient.invalidateQueries({
          queryKey: appQueryKeys.customerEventOwnership(slug, authUser?.uid ?? null),
        }),
        queryClient.invalidateQueries({
          queryKey: ['page-wizard-existing', slug],
        }),
      ]);

      queryClient.setQueryData(appQueryKeys.editableInvitationPage(slug), {
        slug,
        config,
        published: nextPublished,
        defaultTheme,
        productTier: nextProductTier,
        features: resolveInvitationFeatures(nextProductTier, config.features),
        hasCustomConfig: true,
        dataSource: 'firestore',
        lastSavedAt: new Date(),
      } satisfies EditableInvitationPageConfig);
    },
  });

  const {
    handleTriggerPicker,
    handleCoverUpload,
    handleSharePreviewUpload,
    handleKakaoCardUpload,
    handleGalleryUpload,
    handleCoverImageRemove,
    handleSharePreviewImageRemove,
    handleKakaoCardImageRemove,
    handleGalleryImageRemove,
    handleGalleryImageMove,
  } = useImageUpload({
    canUploadImages,
    uploadRole: isAdminLoggedIn ? 'admin' : 'owner',
    formState,
    maxGalleryImages,
    coverUploadInputRef,
    sharePreviewUploadInputRef,
    kakaoCardUploadInputRef,
    galleryUploadInputRef,
    ensureDraftCreated,
    updateForm,
    setUploadingField,
    showNotice,
    showErrorNotice,
  });

  const {
    activeStep,
    activeStepIndex,
    handleMoveNext,
    handleMovePrevious,
    handleFinalConfirm,
  } = useWizardNavigation({
    activeStepKey,
    defaultTheme,
    previewFormState,
    slugStepState,
    published,
    resolvedPersistedSlug,
    steps: wizardSteps,
    getValidationForStep,
    persistDraft,
    slideToStep,
    clearNotice,
    showErrorNotice,
    onComplete: (savedSlug) => {
      router.push(`/page-wizard/${encodeURIComponent(savedSlug)}/result`, {
        scroll: false,
      });
    },
  });

  /* Step content renderer */

  const renderStepContent = (stepKey: WizardStepKey) => {
    if (!formState || !previewFormState) {
      return null;
    }

    const sharedProps = { formState, previewFormState, updateForm };

    switch (stepKey) {
      case 'theme':
        if (eventType === 'birthday') {
          return (
            <BirthdayThemeStep
              {...sharedProps}
              eventType={eventType}
              defaultTheme={defaultTheme}
              setDefaultTheme={setDefaultTheme}
              openChoicePanel={openChoicePanel}
              toggleChoicePanel={toggleChoicePanel}
              onProductTierChange={handleProductTierChange}
              setOpenChoicePanel={setOpenChoicePanel}
              isSelectionLocked={Boolean(resolvedPersistedSlug)}
            />
          );
        }

        return (
          <ThemeStep
            {...sharedProps}
            eventType={eventType}
            defaultTheme={defaultTheme}
            setDefaultTheme={setDefaultTheme}
            openChoicePanel={openChoicePanel}
            toggleChoicePanel={toggleChoicePanel}
            onProductTierChange={handleProductTierChange}
            setOpenChoicePanel={setOpenChoicePanel}
            isSelectionLocked={Boolean(resolvedPersistedSlug)}
          />
        );
      case 'eventType':
        return (
          <EventTypeStep
            {...sharedProps}
            eventType={eventType}
            setEventType={setEventType}
          />
        );
      case 'slug':
        return (
          <SlugStep
            eventType={eventType}
            groomKoreanName={
              eventType === 'first-birthday'
                ? formState.displayName
                : formState.couple.groom.name
            }
            brideKoreanName={formState.couple.bride.name}
            groomEnglishName={groomEnglishName}
            brideEnglishName={brideEnglishName}
            onGroomKoreanNameChange={handleSlugPrimaryKoreanNameChange}
            onBrideKoreanNameChange={(value) =>
              handlePersonFieldChange('bride', 'name', value)
            }
            onGroomEnglishNameChange={handleGroomEnglishNameChange}
            onBrideEnglishNameChange={handleBrideEnglishNameChange}
            slugInput={slugInput}
            onSlugInputChange={handleSlugInputChange}
            autoGeneratedSlug={autoGeneratedSlug}
            normalizedSlugInput={normalizedSlugInput}
            persistedSlug={resolvedPersistedSlug}
            previewSlug={previewSlug}
          />
        );
      case 'basic':
        if (eventType === 'birthday') {
          return (
            <BirthdayBasicStep
              {...sharedProps}
              onPersonFieldChange={handlePersonFieldChange}
            />
          );
        }
        return (
          <BasicStep
            {...sharedProps}
            onPersonFieldChange={handlePersonFieldChange}
          />
        );
      case 'schedule':
        if (eventType === 'birthday' || eventType === 'first-birthday') {
          return (
            <>
              <BirthdayScheduleStep
                {...sharedProps}
                currentWeddingSummary={currentWeddingSummary}
                onDateInputChange={handleDateInputChange}
                onTimeInputChange={handleTimeInputChange}
              />
              <VenueStep
                {...sharedProps}
                isSearchingAddress={isSearchingVenueAddress}
                onSearchAddress={() => void handleVenueAddressSearch()}
              />
            </>
          );
        }
        return (
          <>
            <ScheduleStep
              {...sharedProps}
              currentWeddingSummary={currentWeddingSummary}
              onDateInputChange={handleDateInputChange}
              onTimeInputChange={handleTimeInputChange}
            />
            <VenueStep
              {...sharedProps}
              isSearchingAddress={isSearchingVenueAddress}
              onSearchAddress={() => void handleVenueAddressSearch()}
            />
          </>
        );
      case 'greeting':
        if (eventType === 'birthday') {
          return (
            <BirthdayGreetingStep
              {...sharedProps}
              onPersonFieldChange={handlePersonFieldChange}
              onParentFieldChange={handleParentFieldChange}
            />
          );
        }
        return (
          <GreetingStep
            {...sharedProps}
            onPersonFieldChange={handlePersonFieldChange}
            onParentFieldChange={handleParentFieldChange}
          />
        );
      case 'images':
        return (
          <ImagesStep
            {...sharedProps}
            canUploadImages={canUploadImages}
            maxGalleryImages={maxGalleryImages}
            uploadingField={uploadingField}
            coverUploadInputRef={coverUploadInputRef}
            sharePreviewUploadInputRef={sharePreviewUploadInputRef}
            kakaoCardUploadInputRef={kakaoCardUploadInputRef}
            galleryUploadInputRef={galleryUploadInputRef}
            onTriggerPicker={handleTriggerPicker}
            onCoverUpload={handleCoverUpload}
            onSharePreviewUpload={handleSharePreviewUpload}
            onKakaoCardUpload={handleKakaoCardUpload}
            onGalleryUpload={handleGalleryUpload}
            onCoverImageRemove={handleCoverImageRemove}
            onSharePreviewImageRemove={handleSharePreviewImageRemove}
            onKakaoCardImageRemove={handleKakaoCardImageRemove}
            onGalleryImageRemove={handleGalleryImageRemove}
            onGalleryImageMove={handleGalleryImageMove}
          />
        );
      case 'extra':
        return (
          <ExtraStep
            {...sharedProps}
            onAccountAdd={handleAccountAdd}
            onAccountRemove={handleAccountRemove}
            onAccountChange={handleAccountChange}
            onGuideAdd={handleGuideAdd}
            onGuideRemove={handleGuideRemove}
            onGuideChange={handleGuideChange}
            onGuideTemplateApply={handleGuideTemplateApply}
          />
        );
      case 'music':
        return (
          <MusicStep {...sharedProps} musicPreviewState={musicPreviewState} />
        );
      case 'final':
        return (
          <FinalStep
            {...sharedProps}
            published={published}
            setPublished={setPublished}
          />
        );
      default:
        return null;
    }
  };

  /* Render helpers */

  const renderNotice = () => {
    if (!notice) {
      return null;
    }

    return <div className={getNoticeClassName(notice.tone)}>{notice.message}</div>;
  };
  const isExistingWizardRefreshable = Boolean(
    initialSlug && (isAdminLoggedIn || isLoggedIn)
  );
  const isWizardRefreshing = wizardLoadQuery.isRefetching;
  const isCheckingOwnedEventsBeforeClaim = Boolean(
    initialSlug &&
      requiresOwnershipClaim &&
      isOwnedEventsCheckPendingForInitialSlug &&
      !ownedEventForInitialSlug
  );

  /* ── Loading state ── */

  if (isLoading || isAdminLoading || isCheckingOwnedEventsBeforeClaim) {
    return (
      <main className={pageClassName}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          <section className={`${styles.centerCard} ${styles.gateCard} ${styles.loadingGateCard}`}>
            <div className={styles.gateLoader} aria-hidden />
            <p className={styles.eyebrow}>불러오는 중</p>
            <h1 className={styles.centerTitle}>{wizardPresentation.loadingTitle}</h1>
            <p className={styles.centerText}>{wizardPresentation.loadingDescription}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAdminLoggedIn && (!initialSlug || !isLoggedIn)) {
    return (
      <main className={pageClassName}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <FirebaseAuthLoginCard
              title={
                initialSlug
                  ? wizardPresentation.editLoginTitle
                  : wizardPresentation.createLoginTitle
              }
              description={
                initialSlug
                  ? wizardPresentation.editLoginDescription
                  : wizardPresentation.createLoginDescription
              }
              helperText={
                initialSlug
                  ? wizardPresentation.editLoginHelper
                  : wizardPresentation.createLoginHelper
              }
              requireAdmin={!initialSlug}
              allowSignUp={Boolean(initialSlug)}
            />
          </section>
        </div>
      </main>
    );
  }

  if (initialSlug && requiresOwnershipClaim) {
    return (
      <main className={pageClassName}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          {renderNotice()}
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <p className={styles.eyebrow}>계정 연결 필요</p>
            <h1 className={styles.centerTitle}>{wizardPresentation.ownershipTitle}</h1>
            <p className={styles.centerText}>{wizardPresentation.ownershipDescription}</p>
            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void wizardLoadQuery.refetch()}
                disabled={isWizardRefreshing}
              >
                {isWizardRefreshing ? '다시 불러오는 중...' : '다시 불러오기'}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void router.push('/my-invitations', { scroll: false })}
              >
                {wizardPresentation.myPagesLabel}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (initialSlug && accessErrorMessage) {
    return (
      <main className={pageClassName}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <p className={styles.eyebrow}>접근 제한</p>
            <h1 className={styles.centerTitle}>{wizardPresentation.accessTitle}</h1>
            <p className={styles.centerText}>{accessErrorMessage}</p>
            <div className={styles.inlineActions}>
              {isExistingWizardRefreshable ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void wizardLoadQuery.refetch()}
                  disabled={isWizardRefreshing}
                >
                  {isWizardRefreshing ? '다시 불러오는 중...' : '다시 불러오기'}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void router.push('/my-invitations', { scroll: false })}
              >
                {wizardPresentation.myPagesLabel}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!formState || !previewFormState || !(canCreateNew || canOpenExistingWizard)) {
    return (
      <main className={pageClassName}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          {renderNotice()}
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <p className={styles.eyebrow}>상태 확인</p>
            <h1 className={styles.centerTitle}>{wizardPresentation.fallbackTitle}</h1>
            <p className={styles.centerText}>{wizardPresentation.fallbackDescription}</p>
            {isExistingWizardRefreshable ? (
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void wizardLoadQuery.refetch()}
                  disabled={isWizardRefreshing}
                >
                  {isWizardRefreshing ? '다시 불러오는 중...' : '다시 불러오기'}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  /* ── Main wizard ── */

  return (
    <main className={pageClassName}>
      <div className={styles.shell}>
        <div className={styles.progressBar}>
          <div className={styles.progressLabels}>
            <span className={styles.progressCurrent}>
              {activeStep.number} / {String(wizardSteps.length).padStart(2, '0')}
            </span>
            <span className={styles.progressTitle}>{activeStep.title}</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width: `${((activeStepIndex + 1) / wizardSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {renderNotice()}
        {isExistingWizardRefreshable ? (
          <div className={styles.inlineActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void wizardLoadQuery.refetch()}
              disabled={isWizardRefreshing}
            >
              {isWizardRefreshing ? '다시 불러오는 중...' : '다시 불러오기'}
            </button>
          </div>
        ) : null}

        <section className={styles.swiperCard}>
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            spaceBetween={24}
            autoHeight
            observer
            observeParents
            observeSlideChildren
            allowTouchMove={false}
            onSwiper={(instance) => {
              swiperRef.current = instance;
              updateSwiperLayout();
            }}
            onSlideChange={(instance) => {
              const nextStep = wizardSteps[instance.activeIndex];
              if (nextStep) {
                setActiveStepKey(nextStep.key);
              }

              updateSwiperLayout();
            }}
          >
            {wizardSteps.map((step, index) => {
              const validation = getValidationForStep(step.key);
              const currentViewMode = getStepViewMode(step.key);
              const shouldRenderBody = Math.abs(index - activeStepIndex) <= 1;

              return (
                <SwiperSlide key={step.key}>
                  <div className={styles.slideInner}>
                    <div className={styles.stepHeader}>
                      <div className={styles.stepHeaderTop}>
                        <div className={styles.stepNumber}>{step.number}</div>
                        <div className={styles.stepMetaRow}>
                          <span
                            className={
                              validation.valid ? styles.stateSuccess : styles.stateError
                            }
                          >
                            {validation.valid ? '입력 완료' : '입력 필요'}
                          </span>
                        </div>
                      </div>
                      <div className={styles.stepHeaderText}>
                        <h2 className={styles.stepTitle}>{step.title}</h2>
                        <p className={styles.stepDescription}>{step.description}</p>
                      </div>
                    </div>

                    {!validation.valid ? (
                      <div className={getNoticeClassName('error')}>
                        {validation.messages[0] ?? '현재 단계 입력값을 먼저 확인해 주세요.'}
                      </div>
                    ) : null}

                    <div className={styles.viewTabs} role="tablist" aria-label={`${step.title} 보기 전환`}>
                      <button
                        type="button"
                        className={`${styles.viewTab} ${
                          currentViewMode === 'input' ? styles.viewTabActive : ''
                        }`}
                        onClick={() => setStepViewMode(step.key, 'input')}
                      >
                        입력
                      </button>
                      <button
                        type="button"
                        className={`${styles.viewTab} ${
                          currentViewMode === 'preview' ? styles.viewTabActive : ''
                        }`}
                        onClick={() => setStepViewMode(step.key, 'preview')}
                        disabled={!step.previewSection}
                      >
                        미리보기
                      </button>
                    </div>

                    <div className={styles.slideBody}>
                      {!shouldRenderBody ? (
                        <section className={styles.slideIdleCard}>
                          <p className={styles.slideIdleText}>
                            이 단계로 이동하면 입력 화면이 열립니다.
                          </p>
                        </section>
                      ) : currentViewMode === 'input' ? (
                        <section className={styles.formCard}>{renderStepContent(step.key)}</section>
                      ) : (
                        <div className={styles.previewPane}>
                          <PageWizardStepPreview
                            stepKey={step.key}
                            theme={defaultTheme}
                            slug={previewSlug}
                            formState={previewFormState}
                            published={published}
                            reviewSummary={step.key === 'final' ? finalReviewSummary : undefined}
                          />
                        </div>
                      )}
                    </div>

                    <div className={styles.slideFooter}>
                      <div className={styles.footerLeft}>
                        <span className={styles.footerStepBadge}>
                          {step.number} / {String(wizardSteps.length).padStart(2, '0')}
                        </span>
                        {!validation.valid ? (
                          <p className={styles.footerText}>
                            {validation.messages[0] ?? '필수 입력을 먼저 완료해 주세요.'}
                          </p>
                        ) : null}
                      </div>
                      <div className={styles.footerRight}>
                        <button
                          type="button"
                          className={styles.ghostButton}
                          onClick={handleMovePrevious}
                          disabled={index === 0 || isSaving}
                        >
                          이전
                        </button>
                        {step.key === 'final' ? (
                          <button
                            type="button"
                            className={styles.publishButton}
                            onClick={() => void handleFinalConfirm()}
                            disabled={isSaving}
                          >
                            {published ? '저장 후 공개' : '초안 저장'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => void handleMoveNext()}
                            disabled={isSaving}
                          >
                            {isSaving ? '저장 중' : '다음으로'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      </div>
    </main>
  );
}
