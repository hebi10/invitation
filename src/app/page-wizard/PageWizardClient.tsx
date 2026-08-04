'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

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
} from '@/app/page-wizard/pageWizardEditorUtils';
import { useAdmin } from '@/contexts';
import { buildAppRoutes, type AppRoutes } from '@/lib/demoExperienceRoutes';
import {
  appQueryKeys,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';
import {
  DEFAULT_EVENT_TYPE,
  getEventTypeMeta,
  normalizeEventTypeKey,
  type EventTypeKey,
} from '@/lib/eventTypes';
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
  claimCustomerEventForCurrentAccount,
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
import PageWizardWorkspace from './PageWizardWorkspace';
import { revealWizardStep } from './pageWizardFocus';
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
  applyWizardDateInputToConfig,
  applyWizardTimeInputToConfig,
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
import { getWizardCopy } from './pageWizardCopy';
import {
  getDefaultThemeForEventType,
  isThemeSelectableForEventType,
} from './pageWizardEventConfig';
import { getPageWizardPresentation } from './pageWizardPresentation';
import {
  buildWizardSections,
  getWizardSectionValidation,
} from './pageWizardSections';
import {
  resolveWizardSaveStatus,
} from './pageWizardWorkspaceState';
import {
  demoExperienceWizardPersistenceGateway,
  productionWizardPersistenceGateway,
  type WizardPersistenceGateway,
} from './wizardPersistenceGateway';
import {
  getNoticeClassName,
  type MusicPreviewState,
  type NoticeState,
  type NoticeSource,
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

const DEFAULT_SEED_SLUG = getInvitationPageSeedTemplates()[0]?.seedSlug ?? null;
const IS_DEV_NOTICE_MODE = process.env.NODE_ENV !== 'production';

interface PageWizardClientProps {
  initialSlug: string | null;
  forcedEventType?: EventTypeKey;
  gateway?: WizardPersistenceGateway;
  routes?: AppRoutes;
  experience?: boolean;
}

type ExistingWizardLoadState =
  | {
      status: 'ready';
      editableConfig: EditableInvitationPageConfig;
      version: number | null;
    }
  | {
      status: 'claim';
    }
  | {
      status: 'blocked';
      message: string;
    };

export default function PageWizardClient({
  initialSlug,
  forcedEventType,
  gateway: gatewayOverride,
  routes: routesOverride,
  experience = false,
}: PageWizardClientProps) {
  const gateway = gatewayOverride ??
    (experience
      ? demoExperienceWizardPersistenceGateway
      : productionWizardPersistenceGateway);
  const routes = routesOverride ?? buildAppRoutes(experience ? 'experience' : 'production');
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
  const [defaultTheme, setDefaultTheme] = useState<InvitationThemeKey>(
    getDefaultThemeForEventType(requestedEventType)
  );
  const {
    published,
    setPublished,
    applyPublishedState,
    resetPublishedState,
  } = useWizardVisibilityState(false);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(initialSlug);
  const [persistedVersion, setPersistedVersion] = useState<number | null>(null);
  const [hasVersionConflict, setHasVersionConflict] = useState(false);
  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(initialSlug?.trim())
  );
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClaimingOwnership, setIsClaimingOwnership] = useState(false);
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
    toggleChoicePanel,
  } = useWizardPreviewState();
  const [previewStepKey, setPreviewStepKey] = useState<WizardStepKey | null>(null);
  const [musicPreviewState, setMusicPreviewState] = useState<MusicPreviewState>('idle');
  const wizardCopy = getWizardCopy(eventType);

  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const sharePreviewUploadInputRef = useRef<HTMLInputElement | null>(null);
  const kakaoCardUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateNew = isAdminLoggedIn;
  const canOpenExistingWizard = Boolean(initialSlug && isLoggedIn);
  const canUploadImages =
    !experience && (isAdminLoggedIn || Boolean(initialSlug && isLoggedIn));
  const wizardPresentation = getPageWizardPresentation(eventType);
  const pageClassName = styles.page;
  const ownedEventsQuery = useQuery<CustomerOwnedEventSummary[]>({
    queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
    enabled:
      Boolean(initialSlug) &&
      !isAdminLoading &&
      isLoggedIn &&
      !isAdminLoggedIn &&
      !experience &&
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

      if (experience) {
        const editable = await gateway.loadEditable(initialSlug, isAdminLoggedIn);
        return {
          status: 'ready',
          editableConfig: editable,
          version: editable.version,
        } satisfies ExistingWizardLoadState;
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
        version: null,
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
  const wizardSections = useMemo(
    () => buildWizardSections(wizardSteps),
    [wizardSteps]
  );
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

  const showNotice = useCallback((
    tone: 'success' | 'error' | 'neutral',
    message: string,
    source: NoticeSource = 'general'
  ) => {
    const nextMessage =
      tone === 'error' ? resolveErrorNoticeMessage(message) : message;

    setNotice({ tone, message: nextMessage, source });
  }, [resolveErrorNoticeMessage]);

  const showErrorNotice = useCallback(
    (
      error: unknown,
      fallback?: string,
      source: NoticeSource = 'general'
    ) => {
      setNotice({
        tone: 'error',
        message: resolveErrorNoticeMessage(error, fallback),
        source,
      });
    },
    [resolveErrorNoticeMessage]
  );

  const applyLoadedEditableConfig = useCallback(
    (editableConfig: EditableInvitationPageConfig, version: number | null = null) => {
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
      const nextDefaultTheme =
        editableConfig.defaultTheme ?? getDefaultThemeForEventType(nextEventType);
      setDefaultTheme(
        isThemeSelectableForEventType(nextEventType, nextDefaultTheme)
          ? nextDefaultTheme
          : getDefaultThemeForEventType(nextEventType)
      );
      setLastSavedAt(toDate(editableConfig.lastSavedAt));
      setHasUnsavedChanges(false);
      setPersistedVersion(version);
      setHasVersionConflict(false);
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
        version: null,
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

  const handleClaimOwnership = useCallback(async () => {
    if (!initialSlug || isClaimingOwnership) {
      return;
    }

    setIsClaimingOwnership(true);
    clearNotice();
    try {
      const editableConfig = await claimCustomerEventForCurrentAccount(initialSlug);
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
          editableConfig,
          version: null,
        } satisfies ExistingWizardLoadState
      );
      await queryClient.invalidateQueries({
        queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
      });
      applyLoadedEditableConfig(editableConfig);
      showNotice('success', '현재 계정에 연결했습니다. 이제 내용을 편집할 수 있습니다.');
    } catch (error) {
      showErrorNotice(error, '청첩장을 현재 계정에 연결하지 못했습니다.');
    } finally {
      setIsClaimingOwnership(false);
    }
  }, [
    applyLoadedEditableConfig,
    authUser?.uid,
    clearNotice,
    initialSlug,
    isAdminLoggedIn,
    isClaimingOwnership,
    isLoggedIn,
    queryClient,
    showErrorNotice,
    showNotice,
  ]);

  /* State updaters */

  const updateForm = useCallback((updater: (draft: InvitationPageSeed) => void) => {
    setHasUnsavedChanges(true);
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

  const moveToStep = useCallback((stepKey: WizardStepKey) => {
    if (!wizardSteps.some((step) => step.key === stepKey)) {
      return;
    }

    setActiveStepKey(stepKey);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        revealWizardStep(stepKey);
      });
    }
  }, [wizardSteps]);

  const handleGroomEnglishNameChange = useCallback(
    (value: string) => {
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
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
      if (experience) {
        return;
      }
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
  }, [experience]);

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
      setDefaultTheme(getDefaultThemeForEventType(requestedEventType));
      setLastSavedAt(null);
      setHasUnsavedChanges(false);
      setPersistedVersion(null);
      setHasVersionConflict(false);
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
            version: null,
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
      applyLoadedEditableConfig(
        wizardLoadQuery.data.editableConfig,
        wizardLoadQuery.data.version
      );
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

    setDefaultTheme((current) =>
      isThemeSelectableForEventType(eventType, current)
        ? current
        : getDefaultThemeForEventType(eventType)
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
    updateForm((draft) => {
      applyWizardDateInputToConfig(draft, value);
    });
  };

  const handleTimeInputChange = (value: string) => {
    updateForm((draft) => {
      applyWizardTimeInputToConfig(draft, value);
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
    gateway,
    persistedVersion,
    setPersistedVersion,
    onVersionConflict: () => setHasVersionConflict(true),
    onPersisted: async ({ slug, config, published: nextPublished }) => {
      setHasUnsavedChanges(false);
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
    activeSection,
    handleMoveNext,
    handleMovePrevious,
    handleSelectSection,
    handleFinalConfirm,
  } = useWizardNavigation({
    activeStepKey,
    defaultTheme,
    previewFormState,
    slugStepState,
    published,
    resolvedPersistedSlug,
    steps: wizardSteps,
    sections: wizardSections,
    getValidationForStep,
    persistDraft,
    getEditPath: routes.wizardEdit,
    slideToStep: moveToStep,
    clearNotice,
    showErrorNotice,
    onComplete: (savedSlug) => {
      router.push(routes.wizardResult(savedSlug), {
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
    const setDirtyEventType = (nextEventType: EventTypeKey) => {
      setHasUnsavedChanges(true);
      setEventType(nextEventType);
    };
    const setDirtyDefaultTheme = (nextTheme: InvitationThemeKey) => {
      setHasUnsavedChanges(true);
      setDefaultTheme(nextTheme);
    };
    const setDirtyPublished = (nextPublished: boolean) => {
      setHasUnsavedChanges(true);
      setPublished(nextPublished);
    };

    switch (stepKey) {
      case 'theme':
        if (eventType === 'birthday') {
          return (
            <BirthdayThemeStep
              {...sharedProps}
              eventType={eventType}
              defaultTheme={defaultTheme}
              setDefaultTheme={setDirtyDefaultTheme}
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
            setDefaultTheme={setDirtyDefaultTheme}
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
            setEventType={setDirtyEventType}
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
            experience={experience}
            onDemoImageSelect={(imageUrl) => {
              updateForm((draft) => {
                draft.metadata.images.wedding = imageUrl;
                draft.metadata.images.social = imageUrl;
                draft.metadata.images.kakaoCard = imageUrl;
                if (draft.pageData) {
                  draft.pageData.galleryImages = [imageUrl];
                }
              });
            }}
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
            setPublished={setDirtyPublished}
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

    return (
      <div className={getNoticeClassName(notice.tone)}>
        {notice.message}
        {hasVersionConflict && initialSlug ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void wizardLoadQuery.refetch()}
          >
            최신 내용 불러오기
          </button>
        ) : null}
      </div>
    );
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
                className={styles.primaryButton}
                onClick={() => void handleClaimOwnership()}
                disabled={isClaimingOwnership}
              >
                {isClaimingOwnership ? '계정에 연결하는 중...' : '이 계정으로 편집 시작'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void wizardLoadQuery.refetch()}
                disabled={isWizardRefreshing || isClaimingOwnership}
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
                onClick={() =>
                  void router.push(routes.customerDashboard(), { scroll: false })
                }
              >
                {wizardPresentation.myPagesLabel}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (
    !formState ||
    !previewFormState ||
    !activeSection ||
    !(canCreateNew || canOpenExistingWizard)
  ) {
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

  const eventTypeMeta = getEventTypeMeta(eventType);
  const saveStatus = resolveWizardSaveStatus({
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    notice,
  });

  return (
    <PageWizardWorkspace
      title={eventTypeMeta.label}
      subtitle={resolvedPersistedSlug ? `/${resolvedPersistedSlug}` : '새 페이지 만들기'}
      sections={wizardSections}
      activeSection={activeSection}
      activeStepKey={activeStep.key}
      getSectionValidation={(section) =>
        getWizardSectionValidation(section, getValidationForStep)
      }
      getStepValidation={getValidationForStep}
      saveStatus={saveStatus}
      notice={
        <>
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
        </>
      }
      isSaving={isSaving}
      published={published}
      previewStepKey={previewStepKey}
      renderStepContent={renderStepContent}
      renderStepPreview={(stepKey) => (
        <PageWizardStepPreview
          stepKey={stepKey}
          theme={defaultTheme}
          slug={previewSlug}
          formState={previewFormState}
          published={published}
          reviewSummary={stepKey === 'final' ? finalReviewSummary : undefined}
        />
      )}
      onSelectSection={handleSelectSection}
      onOpenPreview={setPreviewStepKey}
      onClosePreview={() => setPreviewStepKey(null)}
      onPrevious={handleMovePrevious}
      onNext={() => void handleMoveNext()}
      onFinalConfirm={() => void handleFinalConfirm()}
    />
  );
}
