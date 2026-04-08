'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Swiper as SwiperType } from 'swiper';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

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
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { setInvitationMusicLibrary } from '@/lib/musicLibrary';
import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';
import { getStorageDownloadUrl } from '@/services/imageService';
import { searchKakaoLocalAddress } from '@/services/kakaoLocalService';
import { getInvitationMusicLibraryFromStorage } from '@/services/musicService';
import { DEFAULT_INITIAL_CLIENT_PASSWORD } from '@/services/passwordService';
import {
  getClientEditorEditableConfig,
  getClientEditorSession,
  loginClientEditorSession,
} from '@/services/clientEditorSession';
import {
  getEditableInvitationPageConfig,
  getInvitationPageSeedTemplates,
  normalizeInvitationPageSlugBase,
} from '@/services/invitationPageService';
import { toDate } from '@/lib/invitationPageNormalization';
import type {
  InvitationPageSeed,
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';
import { buildKakaoMapSearchUrl } from '@/utils/kakaoMaps';

import PageWizardStepPreview from './PageWizardStepPreview';
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
}

function deriveEnglishNamesFromSlug(slug: string | null) {
  if (!slug) {
    return {
      groomEnglishName: '',
      brideEnglishName: '',
    };
  }

  const segments = slug.split('-').filter(Boolean);
  if (segments.length <= 1) {
    return {
      groomEnglishName: slug,
      brideEnglishName: '',
    };
  }

  const pivot = Math.ceil(segments.length / 2);

  return {
    groomEnglishName: segments.slice(0, pivot).join('-'),
    brideEnglishName: segments.slice(pivot).join('-'),
  };
}

function buildSlugFromEnglishNames(groomEnglishName: string, brideEnglishName: string) {
  return (
    normalizeInvitationPageSlugBase(
      [groomEnglishName.trim(), brideEnglishName.trim()].filter(Boolean).join('-')
    ) ?? ''
  );
}

function shouldSyncDerivedText(currentValue: string, previousAutoValue: string) {
  const normalizedCurrent = currentValue.trim();
  const normalizedPreviousAuto = previousAutoValue.trim();

  return !normalizedCurrent || normalizedCurrent === normalizedPreviousAuto;
}

function composeAutoGreetingMessage(groomName: string, brideName: string) {
  const groom = groomName.trim();
  const bride = brideName.trim();

  if (groom && bride) {
    return `${groom}와 ${bride}가 함께하는 소중한 날에 귀한 걸음으로 축복해 주시면 감사하겠습니다.`;
  }

  return '두 사람이 함께하는 소중한 날에 귀한 걸음으로 축복해 주시면 감사하겠습니다.';
}

function resolveWizardDraftSlug(
  persistedSlug: string | null,
  formSlug: string | null | undefined
) {
  if (persistedSlug?.trim()) {
    return persistedSlug.trim();
  }

  const normalizedFormSlug = normalizeInvitationPageSlugBase(formSlug ?? '');
  if (!normalizedFormSlug || normalizedFormSlug === 'new-page') {
    return null;
  }

  return normalizedFormSlug;
}

export default function PageWizardClient({ initialSlug }: PageWizardClientProps) {
  const router = useRouter();
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();

  const [formState, setFormState] = useState<InvitationPageSeed | null>(null);
  const [defaultTheme, setDefaultTheme] = useState<InvitationThemeKey>(DEFAULT_THEME);
  const [published, setPublished] = useState(false);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [hasClientSession, setHasClientSession] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [clientPasswordInput, setClientPasswordInput] = useState(
    DEFAULT_INITIAL_CLIENT_PASSWORD
  );
  const [notice, setNotice] = useState<NoticeState>(null);
  const [, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingVenueAddress, setIsSearchingVenueAddress] = useState(false);
  const [uploadingField, setUploadingField] = useState<UploadFieldKind | null>(null);
  const [activeStepKey, setActiveStepKey] = useState<WizardStepKey>(
    initialSlug ? 'basic' : 'theme'
  );
  const [viewModeByStep, setViewModeByStep] = useState<
    Partial<Record<WizardStepKey, SlideViewMode>>
  >({});
  const [openChoicePanel, setOpenChoicePanel] = useState<ChoicePanelKey>(null);
  const [musicPreviewState, setMusicPreviewState] = useState<MusicPreviewState>('idle');

  const swiperRef = useRef<SwiperType | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateNew = initialSlug ? true : isAdminLoggedIn;
  const canEdit = initialSlug ? isAdminLoggedIn || hasClientSession : isAdminLoggedIn;
  const canUploadImages = isAdminLoggedIn || hasClientSession;
  const wizardSteps = useMemo(() => getWizardSteps(!initialSlug), [initialSlug]);
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
  const previewFormState = useMemo(
    () => (formState ? applyDerivedWizardDefaults(formState) : null),
    [formState]
  );
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
    }),
    [
      brideEnglishName,
      groomEnglishName,
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

  /* ── State updaters ── */

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

  /* ── Effects ── */

  useEffect(() => {
    const derivedNames = deriveEnglishNamesFromSlug(initialSlug);
    setGroomEnglishName(derivedNames.groomEnglishName);
    setBrideEnglishName(derivedNames.brideEnglishName);
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
    if (resolvedPersistedSlug) {
      return;
    }

    setSlugInput((current) => (current === autoGeneratedSlug ? current : autoGeneratedSlug));
  }, [autoGeneratedSlug, resolvedPersistedSlug]);

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
    if (!initialSlug) {
      return;
    }

    if (isAdminLoggedIn) {
      setHasClientSession(false);
      return;
    }

    let cancelled = false;

    const loadClientSession = async () => {
      try {
        const session = await getClientEditorSession(initialSlug);
        if (!cancelled) {
          setHasClientSession(session.authenticated);
        }
      } catch {
        if (!cancelled) {
          setHasClientSession(false);
        }
      }
    };

    void loadClientSession();

    return () => {
      cancelled = true;
    };
  }, [initialSlug, isAdminLoggedIn]);

  useEffect(() => {
    if (initialSlug || isAdminLoading || isAdminLoggedIn) {
      return;
    }

    router.replace('/admin', { scroll: false });
  }, [initialSlug, isAdminLoading, isAdminLoggedIn, router]);

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

    let cancelled = false;

    const loadWizardConfig = async () => {
      if (!initialSlug) {
        const nextConfig = createInitialWizardConfig();
        if (cancelled) {
          return;
        }

        setFormState(nextConfig);
        setPersistedSlug(null);
        setSlugInput('');
        setGroomEnglishName('');
        setBrideEnglishName('');
        setPublished(false);
        setDefaultTheme(DEFAULT_THEME);
        setLastSavedAt(null);
        setIsLoading(false);
        return;
      }

      if (!canEdit) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const editableConfig = isAdminLoggedIn
          ? await getEditableInvitationPageConfig(initialSlug)
          : await getClientEditorEditableConfig(initialSlug);
        if (cancelled) {
          return;
        }

        if (!editableConfig) {
          showErrorNotice('청첩장 설정을 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        const nextConfig = normalizeFormConfig(editableConfig.config);
        setFormState(nextConfig);
        setPersistedSlug(initialSlug);
        setSlugInput(initialSlug);
        setPublished(editableConfig.published);
        setDefaultTheme(editableConfig.defaultTheme ?? DEFAULT_THEME);
        setLastSavedAt(toDate(editableConfig.lastSavedAt));
      } catch (error) {
        if (!cancelled) {
          showErrorNotice(error, '청첩장 설정을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadWizardConfig();

    return () => {
      cancelled = true;
    };
  }, [
    canEdit,
    initialSlug,
    isAdminLoading,
    isAdminLoggedIn,
    showErrorNotice,
  ]);

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

  /* ── Handlers: Auth ── */

  const handleUnlock = async () => {
    if (!initialSlug) {
      return;
    }

    if (!passwordInput.trim()) {
      showErrorNotice('페이지 비밀번호를 먼저 입력해 주세요.');
      return;
    }

    setIsUnlocking(true);

    try {
      const session = await loginClientEditorSession(initialSlug, passwordInput);

      if (!session.authenticated) {
        showErrorNotice('비밀번호가 일치하지 않습니다.');
        return;
      }

      setHasClientSession(true);
      setPasswordInput('');
    } catch (error) {
      showErrorNotice(error, '페이지 비밀번호를 확인하지 못했습니다.');
    } finally {
      setIsUnlocking(false);
    }
  };

  /* ── Handlers: Person fields ── */

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
      const previousGreetingAuthor = composeGreetingAuthor(previousGroomName, previousBrideName);

      draft.couple[role].name = value;

      if (role === 'groom') {
        draft.groomName = value;
      } else {
        draft.brideName = value;
      }

      if (draft.pageData?.[role]) {
        draft.pageData[role].name = value;
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

        if (shouldSyncDerivedText(draft.pageData.greetingAuthor ?? '', previousGreetingAuthor)) {
          draft.pageData.greetingAuthor = composeGreetingAuthor(nextGroomName, nextBrideName);
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

  /* ── Handlers: Date/Time ── */

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

  /* ── Handlers: Guide/Account ── */

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

  /* ── Handlers: Images ── */

  const handleGalleryImageChange = (index: number, value: string) => {
    updateForm((draft) => {
      if (!draft.pageData?.galleryImages) {
        return;
      }

      draft.pageData.galleryImages[index] = value;
    });
  };

  const handleGalleryImageAdd = () => {
    updateForm((draft) => {
      if (!draft.pageData?.galleryImages) {
        return;
      }

      if (draft.pageData.galleryImages.length >= maxGalleryImages) {
        return;
      }

      draft.pageData.galleryImages.push('');
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
    defaultTheme,
    published,
    resolvedPersistedSlug,
    slugInput,
    defaultSeedSlug: DEFAULT_SEED_SLUG,
    isAdminLoggedIn,
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
  });

  const { handleTriggerPicker, handleCoverUpload, handleGalleryUpload } = useImageUpload({
    canUploadImages,
    uploadRole: isAdminLoggedIn ? 'admin' : 'client',
    formState,
    maxGalleryImages,
    coverUploadInputRef,
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

  /* ── Step content renderer ── */

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
      case 'slug':
        return (
          <SlugStep
            groomKoreanName={formState.couple.groom.name}
            brideKoreanName={formState.couple.bride.name}
            groomEnglishName={groomEnglishName}
            brideEnglishName={brideEnglishName}
            setGroomKoreanName={(value) => handlePersonNameChange('groom', value)}
            setBrideKoreanName={(value) => handlePersonNameChange('bride', value)}
            setGroomEnglishName={setGroomEnglishName}
            setBrideEnglishName={setBrideEnglishName}
            slugInput={slugInput}
            setSlugInput={setSlugInput}
            autoGeneratedSlug={autoGeneratedSlug}
            normalizedSlugInput={normalizedSlugInput}
            persistedSlug={resolvedPersistedSlug}
            previewSlug={previewSlug}
            showClientPasswordField={!initialSlug}
            clientPassword={clientPasswordInput}
            setClientPassword={setClientPasswordInput}
            defaultClientPassword={DEFAULT_INITIAL_CLIENT_PASSWORD}
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
            galleryUploadInputRef={galleryUploadInputRef}
            onTriggerPicker={handleTriggerPicker}
            onCoverUpload={handleCoverUpload}
            onGalleryUpload={handleGalleryUpload}
            onGalleryImageChange={handleGalleryImageChange}
            onGalleryImageAdd={handleGalleryImageAdd}
            onGalleryImageRemove={handleGalleryImageRemove}
            onGalleryImageMove={handleGalleryImageMove}
          />
        );
      case 'extra':
        return (
          <>
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
            <MusicStep {...sharedProps} musicPreviewState={musicPreviewState} />
          </>
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

  /* ── Render helpers ── */

  const renderNotice = () => {
    if (!notice) {
      return null;
    }

    return <div className={getNoticeClassName(notice.tone)}>{notice.message}</div>;
  };

  /* ── Loading state ── */

  if (isLoading || isAdminLoading) {
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

  if (!initialSlug && !isAdminLoggedIn) {
    return null;
  }

  /* ── Auth/lock state ── */

  if (!formState || !previewFormState || !canCreateNew || !canEdit) {
    return (
      <main className={styles.page}>
        <div className={`${styles.shell} ${styles.gateShell}`}>
          {renderNotice()}
          <section className={`${styles.centerCard} ${styles.gateCard}`}>
            {initialSlug ? (
              <>
                <p className={styles.eyebrow}>편집 잠금 해제</p>
                <h1 className={styles.centerTitle}>페이지 비밀번호를 입력해 주세요.</h1>
                <p className={styles.centerText}>
                  기존 고객 페이지는 비밀번호를 확인한 뒤에만 수정할 수 있습니다.
                </p>
                <div className={`${styles.lockRow} ${styles.gateLockRow}`}>
                  <input
                    className={`${styles.input} ${styles.gateInput}`}
                    type="password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    placeholder="페이지 비밀번호"
                  />
                  <button
                    type="button"
                    className={`${styles.primaryButton} ${styles.gatePrimaryButton}`}
                    onClick={() => void handleUnlock()}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? '확인 중' : '잠금 해제'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.eyebrow}>관리자 전용</p>
                <h1 className={styles.centerTitle}>새 페이지 생성은 관리자만 사용할 수 있습니다.</h1>
                <p className={styles.centerText}>
                  기존 페이지는 고객 비밀번호로 수정할 수 있지만, 새 페이지 생성은 관리자 전용입니다.
                </p>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  /* ── Main wizard ── */

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* Progress indicator */}
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
