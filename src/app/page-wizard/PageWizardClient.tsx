'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';
import { searchKakaoLocalAddress } from '@/services/kakaoLocalService';
import {
  getClientEditorEditableConfig,
  getClientEditorSession,
  loginClientEditorSession,
  saveClientEditorConfig,
} from '@/services/clientEditorSession';
import {
  createInvitationPageDraftFromSeed,
  getEditableInvitationPageConfig,
  getInvitationPageSeedTemplates,
  normalizeInvitationPageSlugBase,
  saveInvitationPageConfig,
} from '@/services/invitationPageService';
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
  PLACEHOLDER_BRIDE,
  PLACEHOLDER_GROOM,
  applyDerivedWizardDefaults,
  buildStepValidation,
  buildWeddingDateObject,
  composeDescription,
  composeDisplayName,
  composeGreetingAuthor,
  createInitialWizardConfig,
  formatDateLabel,
  formatTimeLabel,
  hasText,
  prepareWizardConfigForSave,
  WIZARD_STEPS,
  type WizardStepKey,
} from './pageWizardData';
import {
  formatSavedAt,
  getNoticeClassName,
  getStepIndex,
  type ChoicePanelKey,
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
  ScheduleStep,
  SlugStep,
  ThemeStep,
  VenueStep,
} from './steps';

const DEFAULT_THEME: InvitationThemeKey = 'emotional';
const DEFAULT_SEED_SLUG = getInvitationPageSeedTemplates()[0]?.seedSlug ?? null;

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
  const [notice, setNotice] = useState<NoticeState>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingVenueAddress, setIsSearchingVenueAddress] = useState(false);
  const [uploadingField, setUploadingField] = useState<UploadFieldKind | null>(null);
  const [activeStepKey, setActiveStepKey] = useState<WizardStepKey>('theme');
  const [viewModeByStep, setViewModeByStep] = useState<
    Partial<Record<WizardStepKey, SlideViewMode>>
  >({});
  const [openChoicePanel, setOpenChoicePanel] = useState<ChoicePanelKey>(null);

  const swiperRef = useRef<SwiperType | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateNew = initialSlug ? true : isAdminLoggedIn;
  const canEdit = initialSlug ? isAdminLoggedIn || hasClientSession : isAdminLoggedIn;
  const canUploadImages = isAdminLoggedIn || hasClientSession;
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

  const showNotice = useCallback((tone: 'success' | 'error' | 'neutral', message: string) => {
    const nextMessage =
      tone === 'error' ? toUserFacingKoreanErrorMessage(message) : message;

    setNotice({ tone, message: nextMessage });
  }, []);

  const showErrorNotice = useCallback(
    (message: string) => {
      showNotice('error', message);
    },
    [showNotice]
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
      draft.productTier = tier;
      draft.features = resolveInvitationFeatures(tier);
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
    const index = getStepIndex(stepKey);
    if (index < 0) {
      return;
    }

    swiperRef.current?.slideTo(index);
    setActiveStepKey(stepKey);
  }, []);

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
    if (resolvedPersistedSlug) {
      return;
    }

    setSlugInput((current) => (current === autoGeneratedSlug ? current : autoGeneratedSlug));
  }, [autoGeneratedSlug, resolvedPersistedSlug]);

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
        setLastSavedAt(editableConfig.lastSavedAt);
      } catch {
        if (!cancelled) {
          showErrorNotice('청첩장 설정을 불러오지 못했습니다.');
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

  /* ── Persistence ── */

  const legacyEnsureDraftCreated = async () => {
    if (resolvedPersistedSlug) {
      return {
        slug: resolvedPersistedSlug,
        createdFresh: false,
      };
    }

    if (!DEFAULT_SEED_SLUG) {
      throw new Error('기본 템플릿을 찾을 수 없습니다.');
    }

    const normalizedSlug = normalizeInvitationPageSlugBase(slugInput);
    if (!normalizedSlug) {
      throw new Error('올바른 페이지 주소를 먼저 입력해 주세요.');
    }

    const created = await createInvitationPageDraftFromSeed({
      seedSlug: DEFAULT_SEED_SLUG,
      slugBase: normalizedSlug,
      groomName: previewFormState?.couple.groom.name || PLACEHOLDER_GROOM,
      brideName: previewFormState?.couple.bride.name || PLACEHOLDER_BRIDE,
      published: false,
      defaultTheme,
      productTier: previewFormState?.productTier,
    });
    const normalizedCreatedConfig = normalizeFormConfig(created.config);

    setPersistedSlug(created.slug);
    setSlugInput(created.slug);
    setFormState(normalizedCreatedConfig);
    setPublished(false);
    setLastSavedAt(new Date());

    if (created.slug !== normalizedSlug) {
      showNotice('neutral', `입력한 주소가 이미 사용 중이라 ${created.slug}로 자동 조정되었습니다.`);
    }

    return {
      slug: created.slug,
      createdFresh: true,
      config: normalizedCreatedConfig,
    };
  };

  const legacyPersistDraft = async (options?: {
    publish?: boolean;
    successMessage?: string;
    silent?: boolean;
  }) => {
    if (!formState) {
      return null;
    }

    setIsSaving(true);

    try {
      const draftState = await legacyEnsureDraftCreated();
      const nextSlug = draftState.slug;

      if (draftState.createdFresh && options?.publish !== true) {
        if (!options?.silent) {
          showNotice(
            'success',
            options?.successMessage ?? '초안을 저장했습니다.'
          );
        }

        return nextSlug;
      }

      const sourceConfig = draftState.config ?? formState;
      const prepared = prepareWizardConfigForSave(sourceConfig, nextSlug);
      const nextPublished = options?.publish ?? published;

      if (isAdminLoggedIn) {
        await saveInvitationPageConfig(prepared, {
          published: nextPublished,
          defaultTheme,
        });
      } else {
        await saveClientEditorConfig(nextSlug, prepared, {
          published: nextPublished,
          defaultTheme,
        });
      }

      const normalized = normalizeFormConfig(prepared);
      setFormState(normalized);
      setPublished(nextPublished);
      setLastSavedAt(new Date());

      if (!options?.silent) {
        showNotice(
          'success',
          options?.successMessage ?? (nextPublished ? '저장 후 공개되었습니다.' : '초안을 저장했습니다.')
        );
      }

      return nextSlug;
    } catch (error) {
      showErrorNotice(
        toUserFacingKoreanErrorMessage(error, '청첩장 초안을 저장하지 못했습니다.')
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

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
      showNotice('success', '편집 권한이 확인되었습니다.');
    } catch {
      showErrorNotice('페이지 비밀번호를 확인하지 못했습니다.');
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
        if (!draft.pageData.ceremony?.location?.trim()) {
          draft.pageData.ceremony = {
            ...draft.pageData.ceremony,
            location: result.addressName,
          };
        }
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

      showNotice('success', '주소 검색 결과로 지도 좌표를 반영했습니다.');
    } catch (error) {
      showErrorNotice(
        toUserFacingKoreanErrorMessage(error, '주소 검색에 실패했습니다.')
      );
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

  /* ── Handlers: Navigation ── */

  const legacyHandleMoveNext = async () => {
    const validation = buildStepValidation(
      activeStep.key,
      defaultTheme,
      previewFormState,
      slugStepState
    );

    if (!validation.valid) {
      showErrorNotice(validation.messages[0] ?? '현재 단계 입력값을 먼저 확인해 주세요.');
      return;
    }

    if (activeStep.key === 'slug') {
      const savedSlug = await legacyPersistDraft({
        publish: false,
        successMessage: '초안을 만들었습니다. 다음 단계로 이동합니다.',
      });

      if (!savedSlug) {
        return;
      }
    } else if (activeStep.key !== 'theme' && activeStep.key !== 'final') {
      const savedSlug = await legacyPersistDraft({ publish: false, silent: true });
      if (!savedSlug && !resolvedPersistedSlug) {
        return;
      }
    }

    const nextStep = WIZARD_STEPS[getStepIndex(activeStep.key) + 1];
    if (!nextStep) {
      return;
    }

    slideToStep(nextStep.key);
    showNotice('neutral', `${nextStep.number}단계로 이동했습니다.`);
  };

  const legacyHandleMovePrevious = () => {
    const previousStep = WIZARD_STEPS[getStepIndex(activeStep.key) - 1];
    if (!previousStep) {
      return;
    }

    slideToStep(previousStep.key);
    setNotice(null);
  };

  const legacyHandleFinalConfirm = async () => {
    const reviewSummary = WIZARD_STEPS.map((step) => ({
      step,
      validation: getValidationForStep(step.key),
    }));
    const invalidStep = reviewSummary.find((item) => !item.validation.valid);

    if (invalidStep) {
      slideToStep(invalidStep.step.key);
      showErrorNotice(
        invalidStep.validation.messages[0] ?? `${invalidStep.step.number}단계를 먼저 확인해 주세요.`
      );
      return;
    }

    await legacyPersistDraft({
      publish: published,
      successMessage: published ? '저장 후 공개되었습니다.' : '초안을 저장했습니다.',
    });
  };

  const legacyHandleSaveCurrent = async () => {
    await legacyPersistDraft({
      publish: published,
      successMessage: '현재 단계 내용을 저장했습니다.',
    });
  };

  void legacyHandleMoveNext;
  void legacyHandleMovePrevious;
  void legacyHandleFinalConfirm;
  void legacyHandleSaveCurrent;

  const { ensureDraftCreated, persistDraft } = useWizardPersistence({
    formState,
    previewFormState,
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
    getValidationForStep,
    persistDraft,
    slideToStep,
    clearNotice,
    showNotice,
    showErrorNotice,
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
          <ScheduleStep
            {...sharedProps}
            currentWeddingSummary={currentWeddingSummary}
            onDateInputChange={handleDateInputChange}
            onTimeInputChange={handleTimeInputChange}
          />
        );
      case 'venue':
        return (
          <VenueStep
            {...sharedProps}
            isSearchingAddress={isSearchingVenueAddress}
            onSearchAddress={() => void handleVenueAddressSearch()}
          />
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
        <div className={styles.shell}>
          <section className={styles.centerCard}>
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

  /* ── Auth/lock state ── */

  if (!formState || !previewFormState || !canCreateNew || !canEdit) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          {renderNotice()}
          <section className={styles.centerCard}>
            {initialSlug ? (
              <>
                <p className={styles.eyebrow}>편집 잠금 해제</p>
                <h1 className={styles.centerTitle}>페이지 비밀번호를 입력해 주세요.</h1>
                <p className={styles.centerText}>
                  기존 고객 페이지는 비밀번호를 확인한 뒤에만 수정할 수 있습니다.
                </p>
                <div className={styles.lockRow}>
                  <input
                    className={styles.input}
                    type="password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    placeholder="페이지 비밀번호"
                  />
                  <button
                    type="button"
                    className={styles.primaryButton}
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
              {activeStep.number} / {String(WIZARD_STEPS.length).padStart(2, '0')}
            </span>
            <span className={styles.progressTitle}>{activeStep.title}</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width: `${((activeStepIndex + 1) / WIZARD_STEPS.length) * 100}%`,
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
              const nextStep = WIZARD_STEPS[instance.activeIndex];
              if (nextStep) {
                setActiveStepKey(nextStep.key);
              }

              updateSwiperLayout();
            }}
          >
            {WIZARD_STEPS.map((step, index) => {
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

                    <div className={getNoticeClassName(validation.valid ? 'neutral' : 'error')}>
                      {validation.valid
                        ? '이 단계에서 수정한 내용은 저장과 미리보기에 바로 반영됩니다.'
                        : validation.messages[0] ?? '현재 단계 입력값을 먼저 확인해 주세요.'}
                    </div>

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
                          {step.number} / {String(WIZARD_STEPS.length).padStart(2, '0')}
                        </span>
                        <p className={styles.footerText}>
                          {validation.valid
                            ? `최근 저장: ${formatSavedAt(lastSavedAt)}`
                            : validation.messages[0] ?? '필수 입력을 먼저 완료해 주세요.'}
                        </p>
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
                            {step.key === 'slug' ? '주소 확인' : '다음'}
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
