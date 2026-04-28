'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Swiper as SwiperType } from 'swiper';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import CustomerEventClaimCard from '@/app/_components/CustomerEventClaimCard';
import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
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
  type ClaimOwnedCustomerEventResult,
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
import { useWizardNavigation } from './hooks/useWizardNavigation';
import { useWizardPersistence } from './hooks/useWizardPersistence';
import { useWizardValidation } from './hooks/useWizardValidation';
import styles from './page.module.css';
import {
  applyDerivedWizardDefaults,
  buildWeddingDateObject,
  composeDescription,
  composeDisplayName,
  composeGreetingAuthor,
  createInitialWizardConfig,
  formatDateLabel,
  formatTimeLabel,
  getWizardSteps,
  hasText,
  type WizardStepKey,
} from './pageWizardData';
import {
  buildOwnedEventSampleEditableConfig,
  buildSlugFromEnglishNames,
  composeAutoGreetingMessage,
  deriveEnglishNamesFromSlug,
  resolveWizardDraftSlug,
  settleWithTimeout,
  shouldSyncDerivedText,
} from './pageWizardClientUtils';
import {
  getNoticeClassName,
  getStepIndex,
  type ChoicePanelKey,
  type MusicPreviewState,
  type NoticeState,
  type SlideViewMode,
  type UploadFieldKind,
} from './pageWizardShared';
import {
  BasicStep,
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
const CLAIMED_WIZARD_REFRESH_TIMEOUT_MS = 10000;

interface PageWizardClientProps {
  initialSlug: string | null;
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

export default function PageWizardClient({ initialSlug }: PageWizardClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authUser, isAdminLoading, isAdminLoggedIn, isLoggedIn } = useAdmin();

  const [formState, setFormState] = useState<InvitationPageSeed | null>(null);
  const [eventType, setEventType] = useState<EventTypeKey>(DEFAULT_EVENT_TYPE);
  const [defaultTheme, setDefaultTheme] = useState<InvitationThemeKey>(DEFAULT_THEME);
  const [published, setPublished] = useState(false);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(initialSlug?.trim())
  );
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [clientPasswordInput, setClientPasswordInput] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingVenueAddress, setIsSearchingVenueAddress] = useState(false);
  const [uploadingField, setUploadingField] = useState<UploadFieldKind | null>(null);
  const [requiresOwnershipClaim, setRequiresOwnershipClaim] = useState(false);
  const [accessErrorMessage, setAccessErrorMessage] = useState<string | null>(null);
  const [activeStepKey, setActiveStepKey] = useState<WizardStepKey>(
    initialSlug ? 'basic' : 'eventType'
  );
  const [viewModeByStep, setViewModeByStep] = useState<
    Partial<Record<WizardStepKey, SlideViewMode>>
  >({});
  const [openChoicePanel, setOpenChoicePanel] = useState<ChoicePanelKey>(null);
  const [musicPreviewState, setMusicPreviewState] = useState<MusicPreviewState>('idle');

  const swiperRef = useRef<SwiperType | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sharePreviewUploadInputRef = useRef<HTMLInputElement | null>(null);
  const kakaoCardUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateNew = isAdminLoggedIn;
  const canUploadImages = isAdminLoggedIn;
  const ownedEventsQuery = useQuery<CustomerOwnedEventSummary[]>({
    queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
    enabled: false,
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
    enabled: Boolean(initialSlug) && !isAdminLoading && isAdminLoggedIn,
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
  const wizardSteps = useMemo(
    () =>
      getWizardSteps({
        eventType,
        includeSetupSteps: !initialSlug,
        includeMusic: resolveInvitationFeatures(
          formState?.productTier,
          formState?.features
        ).showMusic,
      }),
    [eventType, formState?.features, formState?.productTier, initialSlug]
  );
  const previewFormState = useMemo(
    () => (formState ? applyDerivedWizardDefaults(formState) : null),
    [formState]
  );
  const autoGeneratedSlug = useMemo(
    () => buildSlugFromEnglishNames(groomEnglishName, brideEnglishName),
    [brideEnglishName, groomEnglishName]
  );
  const normalizedSlugInput = useMemo(
    () => normalizeInvitationPageSlugBase(slugInput),
    [slugInput]
  );
  const resolvedPersistedSlug = useMemo(
    () => resolveWizardDraftSlug(persistedSlug, formState?.slug),
    [formState?.slug, persistedSlug]
  );
  const previewSlug = resolvedPersistedSlug ?? normalizedSlugInput ?? 'new-page';
  const invitationFeatures = useMemo(
    () => resolveInvitationFeatures(formState?.productTier, formState?.features),
    [formState?.features, formState?.productTier]
  );
  const slugStepState = useMemo(
    () => ({
      slugInput,
      persistedSlug: resolvedPersistedSlug,
      groomKoreanName: previewFormState?.couple.groom.name ?? '',
      brideKoreanName: previewFormState?.couple.bride.name ?? '',
      groomEnglishName,
      brideEnglishName,
      clientPassword: clientPasswordInput,
      showClientPasswordField: !initialSlug,
    }),
    [
      brideEnglishName,
      clientPasswordInput,
      groomEnglishName,
      initialSlug,
      resolvedPersistedSlug,
      previewFormState,
      slugInput,
    ]
  );
  const maxGalleryImages = invitationFeatures.maxGalleryImages;
  const { getValidationForStep, finalReviewSummary } = useWizardValidation({
    activeStepKey,
    defaultTheme,
    previewFormState,
    slugStepState,
    steps: wizardSteps,
  });

  const currentWeddingSummary = useMemo(() => {
    if (!previewFormState) {
      return '예식 날짜를 아직 입력하지 않았습니다.';
    }

    const weddingDate = buildWeddingDateObject(previewFormState);
    if (!weddingDate) {
      return '예식 날짜를 아직 입력하지 않았습니다.';
    }

    return `${formatDateLabel(weddingDate)} ${formatTimeLabel(weddingDate)}`;
  }, [previewFormState]);

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
      setPublished(editableConfig.published);
      setDefaultTheme(editableConfig.defaultTheme ?? DEFAULT_THEME);
      setLastSavedAt(toDate(editableConfig.lastSavedAt));
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
    },
    [initialSlug]
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

  const handleExistingWizardClaimed = useCallback(
    async (
      claimedSlug: string,
      claimResult?: ClaimOwnedCustomerEventResult
    ) => {
      const normalizedClaimedSlug =
        normalizeInvitationPageSlugBase(claimedSlug) ?? initialSlug ?? claimedSlug.trim();

      setNotice({
        tone: 'success',
        message: '비밀번호가 확인되었습니다. 청첩장을 현재 계정에 연결했습니다.',
      });
      setAccessErrorMessage(null);

      if (normalizedClaimedSlug) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['page-wizard-existing', normalizedClaimedSlug],
          }),
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.editableInvitationPage(normalizedClaimedSlug),
          }),
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.customerEventOwnership(
              normalizedClaimedSlug,
              authUser?.uid ?? null
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
          }),
        ]);
      }

      if (normalizedClaimedSlug && normalizedClaimedSlug !== initialSlug) {
        router.replace(`/page-wizard/${encodeURIComponent(normalizedClaimedSlug)}`, {
          scroll: false,
        });
        return;
      }

      if (claimResult?.editableConfig) {
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
            editableConfig: claimResult.editableConfig,
          } satisfies ExistingWizardLoadState
        );
        applyLoadedEditableConfig(claimResult.editableConfig);
        setIsLoading(false);
        return;
      }

      const refreshed = await settleWithTimeout(
        wizardLoadQuery.refetch(),
        CLAIMED_WIZARD_REFRESH_TIMEOUT_MS
      );

      if (refreshed.status === 'timeout') {
        setRequiresOwnershipClaim(true);
        setIsLoading(false);
        setNotice({
          tone: 'neutral',
          message:
            '비밀번호는 맞습니다. 연결은 완료됐지만 편집 정보를 불러오는 데 시간이 걸리고 있습니다. 잠시 후 다시 시도해 주세요.',
        });
        return;
      }

      if (refreshed.status === 'rejected') {
        setRequiresOwnershipClaim(true);
        setIsLoading(false);
        showErrorNotice(
          refreshed.error,
          '비밀번호는 맞지만 편집 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
        return;
      }

      if (refreshed.value.error) {
        setRequiresOwnershipClaim(true);
        setIsLoading(false);
        showErrorNotice(
          refreshed.value.error,
          '비밀번호는 맞지만 편집 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
        return;
      }

      const refreshedState = refreshed.value.data;
      if (refreshedState?.status === 'ready') {
        applyLoadedEditableConfig(refreshedState.editableConfig);
        setIsLoading(false);
        return;
      }

      if (refreshedState?.status === 'blocked') {
        setRequiresOwnershipClaim(false);
        setAccessErrorMessage(refreshedState.message);
        setIsLoading(false);
        setNotice({
          tone: 'error',
          message: refreshedState.message,
        });
        return;
      }

      setRequiresOwnershipClaim(true);
      setIsLoading(false);
      setNotice({
        tone: 'neutral',
        message:
          '비밀번호는 맞습니다. 연결은 완료됐지만 편집 화면 반영이 아직 끝나지 않았습니다. 다시 불러오기를 눌러 주세요.',
      });
    },
    [
      applyLoadedEditableConfig,
      authUser?.uid,
      initialSlug,
      isAdminLoggedIn,
      isLoggedIn,
      queryClient,
      router,
      showErrorNotice,
      wizardLoadQuery,
    ]
  );
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

  const getStepViewMode = useCallback(
    (stepKey: WizardStepKey): SlideViewMode => viewModeByStep[stepKey] ?? 'input',
    [viewModeByStep]
  );

  const setStepViewMode = useCallback((stepKey: WizardStepKey, mode: SlideViewMode) => {
    setViewModeByStep((current) => {
      if (current[stepKey] === mode) {
        return current;
      }

      return {
        ...current,
        [stepKey]: mode,
      };
    });
  }, []);

  const slideToStep = useCallback((stepKey: WizardStepKey) => {
    const index = getStepIndex(stepKey, wizardSteps);
    if (index < 0) {
      return;
    }

    swiperRef.current?.slideTo(index);
    setActiveStepKey(stepKey);
  }, [wizardSteps]);

  const toggleChoicePanel = useCallback((panel: Exclude<ChoicePanelKey, null>) => {
    setOpenChoicePanel((current) => (current === panel ? null : panel));
  }, []);

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

    if (!isAdminLoggedIn) {
      setFormState(null);
      setClientPasswordInput('');
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (!initialSlug) {
      const nextConfig = createInitialWizardConfig();

      setFormState(nextConfig);
      setEventType(normalizeEventTypeKey(nextConfig.eventType, DEFAULT_EVENT_TYPE));
      setPersistedSlug(null);
      setSlugInput('');
      setHasManualSlugOverride(false);
      setGroomEnglishName('');
      setBrideEnglishName('');
      setClientPasswordInput('');
      setPublished(false);
      setDefaultTheme(DEFAULT_THEME);
      setLastSavedAt(null);
      setRequiresOwnershipClaim(false);
      setAccessErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setClientPasswordInput('');

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

      showErrorNotice(wizardLoadQuery.error, '청첩장 설정을 불러오지 못했습니다.');
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
    showErrorNotice,
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
      showErrorNotice('예식장 주소를 먼저 입력해 주세요.');
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

  /* Handlers: Images */

  const handleCoverImageRemove = () => {
    updateForm((draft) => {
      draft.metadata.images.wedding = '';
    });
  };

  const handleSharePreviewImageRemove = () => {
    updateForm((draft) => {
      draft.metadata.images.social = '';
    });
  };

  const handleKakaoCardImageRemove = () => {
    updateForm((draft) => {
      draft.metadata.images.kakaoCard = '';
    });
  };

  const handleGalleryImageRemove = (index: number) => {
    updateForm((draft) => {
      draft.pageData?.galleryImages?.splice(index, 1);
    });
  };

  const handleGalleryImageMove = (index: number, direction: 'up' | 'down') => {
    updateForm((draft) => {
      const images = draft.pageData?.galleryImages;
      if (!images) {
        return;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= images.length) {
        return;
      }

      [images[index], images[targetIndex]] = [images[targetIndex], images[index]];
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
    isLoggedIn,
    clientPassword: clientPasswordInput,
    allowClientPasswordSetup: !initialSlug,
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
  } = useImageUpload({
    canUploadImages,
    uploadRole: isAdminLoggedIn ? 'admin' : 'client',
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
    handleSaveCurrent,
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
        return (
          <ThemeStep
            {...sharedProps}
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
            groomKoreanName={formState.couple.groom.name}
            brideKoreanName={formState.couple.bride.name}
            groomEnglishName={groomEnglishName}
            brideEnglishName={brideEnglishName}
            onGroomKoreanNameChange={(value) =>
              handlePersonFieldChange('groom', 'name', value)
            }
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
            showClientPasswordField={!initialSlug}
            clientPassword={clientPasswordInput}
            setClientPassword={setClientPasswordInput}
          />
        );
      case 'basic':
        return (
          <BasicStep
            {...sharedProps}
            onPersonFieldChange={handlePersonFieldChange}
          />
        );
      case 'schedule':
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
  const isExistingWizardRefreshable = Boolean(initialSlug && isAdminLoggedIn);
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
      <main className={styles.page}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          <section className={`${styles.centerCard} ${styles.gateCard} ${styles.loadingGateCard}`}>
            <div className={styles.gateLoader} aria-hidden />
            <p className={styles.eyebrow}>불러오는 중</p>
            <h1 className={styles.centerTitle}>청첩장 편집 화면을 준비하고 있습니다.</h1>
            <p className={styles.centerText}>
              현재 설정과 공개 상태를 확인하고 있습니다.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <main className={styles.page}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <FirebaseAuthLoginCard
              title={
                initialSlug
                  ? '청첩장 편집은 관리자만 이용 가능합니다'
                  : '청첩장 만들기는 관리자만 이용 가능합니다'
              }
              description={
                initialSlug
                  ? '관리자 계정으로 로그인한 뒤 청첩장 편집 화면에 다시 접속해 주세요.'
                  : '관리자 계정으로 로그인한 뒤 새 청첩장 생성 화면을 이용해 주세요.'
              }
              helperText={
                initialSlug
                  ? '고객 계정 연결이나 비밀번호 확인 흐름은 이 화면에서 제공하지 않습니다.'
                  : '청첩장 생성은 관리자 권한이 확인된 계정에서만 가능합니다.'
              }
              requireAdmin
              allowSignUp={false}
            />
          </section>
        </div>
      </main>
    );
  }

  if (initialSlug && requiresOwnershipClaim) {
    return (
      <main className={styles.page}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          {renderNotice()}
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <CustomerEventClaimCard
              pageSlug={initialSlug}
              title="기존 청첩장을 현재 계정에 연결해 주세요"
              description="아직 현재 로그인한 UID와 연결되지 않은 청첩장입니다. 기존 페이지 비밀번호를 확인하면 내 계정 청첩장으로 등록됩니다."
              helperText="한 번 연결한 뒤에는 페이지 비밀번호 대신 계정 로그인만으로 관리할 수 있습니다."
              onClaimed={handleExistingWizardClaimed}
            />
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
          </section>
        </div>
      </main>
    );
  }

  if (initialSlug && accessErrorMessage) {
    return (
      <main className={styles.page}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <p className={styles.eyebrow}>접근 제한</p>
            <h1 className={styles.centerTitle}>이 청첩장은 현재 계정으로 관리할 수 없습니다.</h1>
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
                내 청첩장으로 이동
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!formState || !previewFormState || !canCreateNew) {
    return (
      <main className={styles.page}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          {renderNotice()}
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            <p className={styles.eyebrow}>상태 확인</p>
            <h1 className={styles.centerTitle}>청첩장 정보를 아직 불러오지 못했습니다.</h1>
            <p className={styles.centerText}>
              잠시 후 다시 시도하거나 로그인 상태와 청첩장 연결 여부를 확인해 주세요.
            </p>
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
    <main className={styles.page}>
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
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => void handleSaveCurrent()}
                          disabled={isSaving}
                        >
                          {isSaving ? '저장 중' : '저장'}
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
                            {step.key === 'slug'
                              ? resolvedPersistedSlug
                                ? '다음 단계로'
                                : '페이지 생성'
                              : '다음'}
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
