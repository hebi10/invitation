'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import type { Swiper as SwiperType } from 'swiper';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import {
  AccountSectionPanel,
  GuideSectionPanel,
  PersonEditorCard,
} from '@/app/page-editor/pageEditorPanels';
import PageEditorSectionPreview from '@/app/page-editor/PageEditorSectionPreview';
import {
  cloneConfig,
  createEmptyAccount,
  createEmptyGuideItem,
  keywordsToText,
  normalizeFormConfig,
  textToKeywords,
  type AccountKind,
  type GuideKind,
  type ParentRole,
  type PersonRole,
} from '@/app/page-editor/pageEditorUtils';
import { useAdmin } from '@/contexts';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { uploadPageEditorImage } from '@/services/imageService';
import {
  createInvitationPageDraftFromSeed,
  getEditableInvitationPageConfig,
  getInvitationPageSeedTemplates,
  normalizeInvitationPageSlugBase,
  saveInvitationPageConfig,
} from '@/services/invitationPageService';
import { getClientEditorTokenHash } from '@/services/passwordService';
import type {
  InvitationPageSeed,
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';

import styles from './page.module.css';
import {
  GREETING_TEMPLATES,
  GUIDE_TEMPLATES,
  PLACEHOLDER_BRIDE,
  PLACEHOLDER_GROOM,
  WIZARD_STEPS,
  applyDerivedWizardDefaults,
  buildReviewSummary,
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
  type WizardStepKey,
} from './pageWizardData';

const TOKEN_STORAGE_PREFIX = 'page-wizard-token:';
const DEFAULT_THEME: InvitationThemeKey = 'emotional';
const DEFAULT_SEED_SLUG = getInvitationPageSeedTemplates()[0]?.seedSlug ?? null;

type NoticeTone = 'success' | 'error' | 'neutral';
type NoticeState = { tone: NoticeTone; message: string } | null;
type UploadFieldKind = 'cover' | 'gallery';

const PRODUCT_TIERS: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];

interface PageWizardClientProps {
  initialSlug: string | null;
}

function getNoticeClassName(tone: NoticeTone) {
  if (tone === 'success') {
    return `${styles.notice} ${styles.noticeSuccess}`;
  }

  if (tone === 'error') {
    return `${styles.notice} ${styles.noticeError}`;
  }

  return `${styles.notice} ${styles.noticeNeutral}`;
}

function renderFieldMeta(
  label: string,
  requirement: 'required' | 'optional',
  hint?: string
) {
  return (
    <>
      <span className={styles.fieldLabelRow}>
        <span className={styles.fieldLabel}>{label}</span>
        <span
          className={
            requirement === 'required' ? styles.requiredBadge : styles.optionalBadge
          }
        >
          {requirement === 'required' ? 'Required' : 'Optional'}
        </span>
      </span>
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </>
  );
}

function getStepIndex(stepKey: WizardStepKey) {
  return WIZARD_STEPS.findIndex((step) => step.key === stepKey);
}

function formatSavedAt(date: Date | null) {
  if (!date) {
    return 'No saved record yet.';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getProductTierLabel(tier: InvitationProductTier) {
  return tier.toUpperCase();
}

export default function PageWizardClient({ initialSlug }: PageWizardClientProps) {
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();

  const [formState, setFormState] = useState<InvitationPageSeed | null>(null);
  const [defaultTheme, setDefaultTheme] = useState<InvitationThemeKey>(DEFAULT_THEME);
  const [published, setPublished] = useState(false);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [editorTokenHash, setEditorTokenHash] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState(
    initialSlug ? 'Loading current config' : 'Creating new draft'
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<UploadFieldKind | null>(null);
  const [activeStepKey, setActiveStepKey] = useState<WizardStepKey>('theme');

  const swiperRef = useRef<SwiperType | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateNew = initialSlug ? true : isAdminLoggedIn;
  const canEdit = initialSlug ? isAdminLoggedIn || Boolean(editorTokenHash) : isAdminLoggedIn;
  const normalizedSlugInput = useMemo(
    () => normalizeInvitationPageSlugBase(slugInput),
    [slugInput]
  );
  const previewSlug = persistedSlug ?? normalizedSlugInput ?? 'new-page';
  const previewFormState = useMemo(
    () => (formState ? applyDerivedWizardDefaults(formState) : null),
    [formState]
  );
  const reviewSummary = useMemo(
    () => buildReviewSummary(defaultTheme, previewFormState, slugInput, persistedSlug),
    [defaultTheme, persistedSlug, previewFormState, slugInput]
  );
  const invitationFeatures = useMemo(
    () => resolveInvitationFeatures(formState?.productTier, formState?.features),
    [formState?.features, formState?.productTier]
  );
  const maxGalleryImages = invitationFeatures.maxGalleryImages;
  const completedRequiredSteps = useMemo(
    () =>
      reviewSummary.filter(
        (item) => item.step.key !== 'final' && item.validation.valid
      ).length,
    [reviewSummary]
  );
  const activeStep = WIZARD_STEPS[getStepIndex(activeStepKey)] ?? WIZARD_STEPS[0];
  const activeValidation =
    reviewSummary.find((item) => item.step.key === activeStep.key)?.validation ?? {
      valid: false,
      messages: [],
    };
  const title = useMemo(() => {
    if (!previewFormState) {
      return 'Invitation Wizard';
    }

    return composeDisplayName(
      previewFormState.couple.groom.name,
      previewFormState.couple.bride.name
    );
  }, [previewFormState]);

  const currentWeddingSummary = useMemo(() => {
    if (!previewFormState) {
      return 'Date not set';
    }

    const weddingDate = buildWeddingDateObject(previewFormState);
    if (!weddingDate) {
      return 'Date not set';
    }

    return `${formatDateLabel(weddingDate)} ${formatTimeLabel(weddingDate)}`;
  }, [previewFormState]);

  const updateForm = (updater: (draft: InvitationPageSeed) => void) => {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const next = cloneConfig(current);
      updater(next);
      return next;
    });
  };

  const handleProductTierChange = (tier: InvitationProductTier) => {
    updateForm((draft) => {
      draft.productTier = tier;
      draft.features = resolveInvitationFeatures(tier);
    });
  };

  const slideToStep = (stepKey: WizardStepKey) => {
    const index = getStepIndex(stepKey);
    if (index < 0) {
      return;
    }

    swiperRef.current?.slideTo(index);
    setActiveStepKey(stepKey);
  };

  useEffect(() => {
    if (!initialSlug || typeof window === 'undefined') {
      return;
    }

    const storedToken = window.localStorage.getItem(
      `${TOKEN_STORAGE_PREFIX}${initialSlug}`
    );

    if (storedToken) {
      setEditorTokenHash(storedToken);
    }
  }, [initialSlug]);

  useEffect(() => {
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
        setPublished(false);
        setDefaultTheme(DEFAULT_THEME);
        setDataSourceLabel('Creating new draft');
        setLastSavedAt(null);
        setIsLoading(false);
        return;
      }

      try {
        const editableConfig = await getEditableInvitationPageConfig(initialSlug);
        if (cancelled) {
          return;
        }

        if (!editableConfig) {
          setNotice({ tone: 'error', message: 'Invitation config was not found.' });
          setIsLoading(false);
          return;
        }

        const nextConfig = normalizeFormConfig(editableConfig.config);
        setFormState(nextConfig);
        setPersistedSlug(initialSlug);
        setSlugInput(initialSlug);
        setPublished(editableConfig.published);
        setDefaultTheme(editableConfig.defaultTheme ?? DEFAULT_THEME);
        setDataSourceLabel(
          editableConfig.dataSource === 'firestore'
            ? 'Firestore custom data'
            : 'Seed default data'
        );
        setLastSavedAt(editableConfig.lastSavedAt);
      } catch (error) {
        console.error('[pageWizard] failed to load config', error);
        if (!cancelled) {
          setNotice({ tone: 'error', message: 'Failed to load invitation config.' });
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
  }, [initialSlug]);

  const ensureDraftCreated = async () => {
    if (persistedSlug) {
      return persistedSlug;
    }

    if (!DEFAULT_SEED_SLUG) {
      throw new Error('Default template was not found.');
    }

    const normalizedSlug = normalizeInvitationPageSlugBase(slugInput);
    if (!normalizedSlug) {
      throw new Error('Enter a valid page slug first.');
    }

    const created = await createInvitationPageDraftFromSeed({
      seedSlug: DEFAULT_SEED_SLUG,
      slugBase: normalizedSlug,
      groomName: previewFormState?.couple.groom.name || PLACEHOLDER_GROOM,
      brideName: previewFormState?.couple.bride.name || PLACEHOLDER_BRIDE,
      published: false,
      defaultTheme,
      productTier: previewFormState?.productTier,
      editorTokenHash,
    });

    setPersistedSlug(created.slug);
    setSlugInput(created.slug);
    setDataSourceLabel('Firestore custom data');

    if (created.slug !== normalizedSlug) {
      setNotice({
        tone: 'neutral',
        message: `Slug was adjusted to ${created.slug} because the original one was already taken.`,
      });
    }

    return created.slug;
  };

  const persistDraft = async (options?: {
    publish?: boolean;
    successMessage?: string;
    silent?: boolean;
  }) => {
    if (!formState) {
      return null;
    }

    setIsSaving(true);

    try {
      const nextSlug = await ensureDraftCreated();
      const prepared = prepareWizardConfigForSave(formState, nextSlug);
      const nextPublished = options?.publish ?? published;

      await saveInvitationPageConfig(prepared, {
        published: nextPublished,
        defaultTheme,
        editorTokenHash,
      });

      const normalized = normalizeFormConfig(prepared);
      setFormState(normalized);
      setPublished(nextPublished);
      setLastSavedAt(new Date());
      setDataSourceLabel('Firestore custom data');

      if (!options?.silent) {
        setNotice({
          tone: 'success',
          message:
            options?.successMessage ??
            (nextPublished ? 'Saved and published.' : 'Draft saved.'),
        });
      }

      return nextSlug;
    } catch (error) {
      console.error('[pageWizard] failed to save draft', error);
      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to save invitation draft.',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!initialSlug) {
      return;
    }

    if (!passwordInput.trim()) {
      setNotice({ tone: 'error', message: 'Enter the page password first.' });
      return;
    }

    setIsUnlocking(true);

    try {
      const token = await getClientEditorTokenHash(initialSlug, passwordInput);

      if (!token) {
        setNotice({ tone: 'error', message: 'Password does not match.' });
        return;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`${TOKEN_STORAGE_PREFIX}${initialSlug}`, token);
      }

      setEditorTokenHash(token);
      setPasswordInput('');
      setNotice({ tone: 'success', message: 'Editor access unlocked.' });
    } catch (error) {
      console.error('[pageWizard] failed to verify password', error);
      setNotice({ tone: 'error', message: 'Failed to verify the page password.' });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handlePersonNameChange = (role: PersonRole, value: string) => {
    updateForm((draft) => {
      draft.couple[role].name = value;

      if (role === 'groom') {
        draft.groomName = value;
      } else {
        draft.brideName = value;
      }

      if (draft.pageData?.[role]) {
        draft.pageData[role].name = value;
      }

      if (!hasText(draft.displayName)) {
        draft.displayName = composeDisplayName(
          role === 'groom' ? value : draft.couple.groom.name,
          role === 'bride' ? value : draft.couple.bride.name
        );
      }

      if (!hasText(draft.description)) {
        draft.description = composeDescription(
          role === 'groom' ? value : draft.couple.groom.name,
          role === 'bride' ? value : draft.couple.bride.name
        );
      }

      if (draft.pageData && !hasText(draft.pageData.greetingAuthor)) {
        draft.pageData.greetingAuthor = composeGreetingAuthor(
          role === 'groom' ? value : draft.couple.groom.name,
          role === 'bride' ? value : draft.couple.bride.name
        );
      }
    });
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

  const handleTriggerPicker = (kind: UploadFieldKind) => {
    if (kind === 'cover') {
      coverUploadInputRef.current?.click();
      return;
    }

    galleryUploadInputRef.current?.click();
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = '';
    setUploadingField('cover');

    try {
      const slug = await ensureDraftCreated();
      const uploaded = await uploadPageEditorImage(file, slug, 'cover', editorTokenHash);

      updateForm((draft) => {
        draft.metadata.images.wedding = uploaded.url;
      });

      setNotice({ tone: 'success', message: 'Cover image uploaded.' });
    } catch (error) {
      console.error('[pageWizard] failed to upload cover image', error);
      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to upload the cover image.',
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    event.target.value = '';
    setUploadingField('gallery');

    try {
      const slug = await ensureDraftCreated();
      const currentCount = formState?.pageData?.galleryImages?.length ?? 0;
      const filesToUpload = files.slice(0, Math.max(maxGalleryImages - currentCount, 0));
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        const uploaded = await uploadPageEditorImage(file, slug, 'gallery', editorTokenHash);
        uploadedUrls.push(uploaded.url);
      }

      updateForm((draft) => {
        if (!draft.pageData?.galleryImages) {
          return;
        }

        draft.pageData.galleryImages.push(...uploadedUrls);
      });

      setNotice({ tone: 'success', message: 'Gallery images uploaded.' });
    } catch (error) {
      console.error('[pageWizard] failed to upload gallery images', error);
      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to upload gallery images.',
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleMoveNext = async () => {
    const validation = buildStepValidation(
      activeStep.key,
      defaultTheme,
      previewFormState,
      slugInput,
      persistedSlug
    );

    if (!validation.valid) {
      setNotice({
        tone: 'error',
        message: validation.messages[0] ?? 'Check the current step first.',
      });
      return;
    }

    if (activeStep.key === 'slug') {
      const savedSlug = await persistDraft({
        publish: false,
        successMessage: 'Draft created. Moving to the next step.',
      });

      if (!savedSlug) {
        return;
      }
    } else if (activeStep.key !== 'theme' && activeStep.key !== 'final') {
      const savedSlug = await persistDraft({ publish: false, silent: true });
      if (!savedSlug && !persistedSlug) {
        return;
      }
    }

    const nextStep = WIZARD_STEPS[getStepIndex(activeStep.key) + 1];
    if (!nextStep) {
      return;
    }

    slideToStep(nextStep.key);
    setNotice({ tone: 'neutral', message: `Moved to step ${nextStep.number}.` });
  };

  const handleMovePrevious = () => {
    const previousStep = WIZARD_STEPS[getStepIndex(activeStep.key) - 1];
    if (!previousStep) {
      return;
    }

    slideToStep(previousStep.key);
    setNotice(null);
  };

  const handleFinalConfirm = async () => {
    const invalidStep = reviewSummary.find((item) => !item.validation.valid);

    if (invalidStep) {
      slideToStep(invalidStep.step.key);
      setNotice({
        tone: 'error',
        message:
          invalidStep.validation.messages[0] ??
          `Check step ${invalidStep.step.number} first.`,
      });
      return;
    }

    await persistDraft({
      publish: published,
      successMessage: published ? 'Saved and published.' : 'Draft saved.',
    });
  };

  const handleSaveCurrent = async () => {
    await persistDraft({
      publish: published,
      successMessage: 'Current progress saved.',
    });
  };

  const renderNotice = () => {
    if (!notice) {
      return null;
    }

    return <div className={getNoticeClassName(notice.tone)}>{notice.message}</div>;
  };

  const renderStepContent = (stepKey: WizardStepKey) => {
    if (!formState || !previewFormState) {
      return null;
    }

    if (stepKey === 'theme') {
      return (
        <div className={styles.fieldGrid}>
          <div className={styles.choiceGrid}>
            {(['emotional', 'simple'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={`${styles.choiceCard} ${
                  defaultTheme === theme ? styles.choiceCardActive : ''
                }`}
                onClick={() => setDefaultTheme(theme)}
              >
                <span className={styles.choiceTag}>{theme}</span>
                <h3 className={styles.choiceTitle}>
                  {theme === 'emotional' ? 'Emotional' : 'Simple'}
                </h3>
                <p className={styles.choiceText}>
                  {theme === 'emotional'
                    ? 'Warm photo-first layout for the main page.'
                    : 'Clean information-first layout for the main page.'}
                </p>
              </button>
            ))}
          </div>

          <div className={styles.choiceGrid}>
            {PRODUCT_TIERS.map((tier) => {
              const tierFeatures = resolveInvitationFeatures(tier);
              const isActive = formState.productTier === tier;

              return (
                <button
                  key={tier}
                  type="button"
                  className={`${styles.choiceCard} ${
                    isActive ? styles.choiceCardActive : ''
                  }`}
                  onClick={() => handleProductTierChange(tier)}
                >
                  <span className={styles.choiceTag}>{getProductTierLabel(tier)}</span>
                  <h3 className={styles.choiceTitle}>{getProductTierLabel(tier)}</h3>
                  <p className={styles.choiceText}>
                    Gallery up to {tierFeatures.maxGalleryImages}, Kakao{' '}
                    {tierFeatures.shareMode === 'card' ? 'card' : 'link'} share,
                    {tierFeatures.showCountdown ? ' countdown' : ' no countdown'},
                    {tierFeatures.showGuestbook ? ' guestbook' : ' no guestbook'}.
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (stepKey === 'slug') {
      return (
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {renderFieldMeta(
              'Page slug',
              'required',
              'Lowercase letters, numbers, and hyphens only.'
            )}
            <input
              className={styles.input}
              value={slugInput}
              placeholder="shin-minje-kim-hyunji"
              onChange={(event) => setSlugInput(event.target.value)}
              onBlur={() => {
                if (!persistedSlug && normalizedSlugInput) {
                  setSlugInput(normalizedSlugInput);
                }
              }}
              disabled={Boolean(persistedSlug)}
            />
          </label>

          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>URL preview</span>
            <strong className={styles.summaryValue}>/{previewSlug}</strong>
            <p className={styles.sectionText}>
              The draft is created when you confirm this step.
            </p>
          </div>
        </div>
      );
    }

    if (stepKey === 'basic') {
      return (
        <div className={styles.fieldGrid}>
          <div className={styles.twoColumnGrid}>
            <label className={styles.field}>
              {renderFieldMeta('Groom name', 'required')}
              <input
                className={styles.input}
                value={formState.couple.groom.name}
                placeholder="Groom name"
                onChange={(event) =>
                  handlePersonFieldChange('groom', 'name', event.target.value)
                }
              />
            </label>
            <label className={styles.field}>
              {renderFieldMeta('Bride name', 'required')}
              <input
                className={styles.input}
                value={formState.couple.bride.name}
                placeholder="Bride name"
                onChange={(event) =>
                  handlePersonFieldChange('bride', 'name', event.target.value)
                }
              />
            </label>
          </div>

          <label className={styles.field}>
            {renderFieldMeta('Cover subtitle', 'optional')}
            <input
              className={styles.input}
              value={formState.pageData?.subtitle ?? ''}
              placeholder="A day when two hearts become one"
              onChange={(event) =>
                updateForm((draft) => {
                  if (draft.pageData) {
                    draft.pageData.subtitle = event.target.value;
                  }
                })
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta('Cover title', 'optional')}
            <input
              className={styles.input}
              value={formState.displayName}
              placeholder={composeDisplayName(
                previewFormState.couple.groom.name,
                previewFormState.couple.bride.name
              )}
              onChange={(event) =>
                updateForm((draft) => {
                  draft.displayName = event.target.value;
                })
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta('Short description', 'optional')}
            <textarea
              className={styles.textarea}
              value={formState.description}
              placeholder={composeDescription(
                previewFormState.couple.groom.name,
                previewFormState.couple.bride.name
              )}
              onChange={(event) =>
                updateForm((draft) => {
                  draft.description = event.target.value;
                })
              }
            />
          </label>
        </div>
      );
    }

    if (stepKey === 'schedule') {
      const weddingDate = buildWeddingDateObject(previewFormState);

      return (
        <div className={styles.fieldGrid}>
          <div className={styles.twoColumnGrid}>
            <label className={styles.field}>
              {renderFieldMeta('Wedding date', 'required')}
              <input
                className={styles.input}
                type="date"
                value={
                  weddingDate
                    ? `${weddingDate.getFullYear()}-${String(
                        weddingDate.getMonth() + 1
                      ).padStart(2, '0')}-${String(weddingDate.getDate()).padStart(
                        2,
                        '0'
                      )}`
                    : ''
                }
                onChange={(event) => handleDateInputChange(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              {renderFieldMeta('Wedding time', 'required')}
              <input
                className={styles.input}
                type="time"
                value={
                  weddingDate
                    ? `${String(weddingDate.getHours()).padStart(2, '0')}:${String(
                        weddingDate.getMinutes()
                      ).padStart(2, '0')}`
                    : ''
                }
                onChange={(event) => handleTimeInputChange(event.target.value)}
              />
            </label>
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Sentence preview</span>
            <strong className={styles.summaryValue}>{currentWeddingSummary}</strong>
          </div>
        </div>
      );
    }

    if (stepKey === 'venue') {
      return (
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {renderFieldMeta('Venue name', 'required')}
            <input
              className={styles.input}
              value={formState.venue}
              placeholder="The K Wedding Hall"
              onChange={(event) =>
                updateForm((draft) => {
                  draft.venue = event.target.value;
                  if (draft.pageData) {
                    draft.pageData.venueName = event.target.value;
                  }
                })
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta('Address', 'required')}
            <input
              className={styles.input}
              value={formState.pageData?.ceremonyAddress ?? ''}
              placeholder="Seoul ..."
              onChange={(event) =>
                updateForm((draft) => {
                  if (draft.pageData) {
                    draft.pageData.ceremonyAddress = event.target.value;
                  }
                })
              }
            />
          </label>
          <div className={styles.twoColumnGrid}>
            <label className={styles.field}>
              {renderFieldMeta('Venue contact', 'optional')}
              <input
                className={styles.input}
                value={formState.pageData?.ceremonyContact ?? ''}
                placeholder="02-1234-5678"
                onChange={(event) =>
                  updateForm((draft) => {
                    if (draft.pageData) {
                      draft.pageData.ceremonyContact = event.target.value;
                    }
                  })
                }
              />
            </label>
            <label className={styles.field}>
              {renderFieldMeta('Map URL', 'optional')}
              <input
                className={styles.input}
                value={formState.pageData?.mapUrl ?? ''}
                placeholder="https://map.kakao.com/..."
                onChange={(event) =>
                  updateForm((draft) => {
                    if (draft.pageData) {
                      draft.pageData.mapUrl = event.target.value;
                    }
                  })
                }
              />
            </label>
          </div>

          <label className={styles.field}>
            {renderFieldMeta('Guide text', 'optional')}
            <textarea
              className={styles.textarea}
              value={formState.pageData?.mapDescription ?? ''}
              placeholder="Parking is available in the building."
              onChange={(event) =>
                updateForm((draft) => {
                  if (draft.pageData) {
                    draft.pageData.mapDescription = event.target.value;
                  }
                })
              }
            />
          </label>
        </div>
      );
    }

    if (stepKey === 'greeting') {
      return (
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {renderFieldMeta('Greeting message', 'required')}
            <textarea
              className={styles.textarea}
              value={formState.pageData?.greetingMessage ?? ''}
              placeholder="We would love to celebrate with you."
              onChange={(event) =>
                updateForm((draft) => {
                  if (draft.pageData) {
                    draft.pageData.greetingMessage = event.target.value;
                  }
                })
              }
            />
          </label>

          <div className={styles.templateRow}>
            {GREETING_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className={styles.templateButton}
                onClick={() =>
                  updateForm((draft) => {
                    if (draft.pageData) {
                      draft.pageData.greetingMessage = template.value;
                    }
                  })
                }
              >
                {template.label}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            {renderFieldMeta('Greeting author', 'optional')}
            <input
              className={styles.input}
              value={formState.pageData?.greetingAuthor ?? ''}
              placeholder={composeGreetingAuthor(
                previewFormState.couple.groom.name,
                previewFormState.couple.bride.name
              )}
              onChange={(event) =>
                updateForm((draft) => {
                  if (draft.pageData) {
                    draft.pageData.greetingAuthor = event.target.value;
                  }
                })
              }
            />
          </label>

          <div className={styles.twoColumnGrid}>
            <PersonEditorCard
              role="groom"
              label="Groom"
              person={formState.couple.groom}
              disabled={false}
              onPersonFieldChange={handlePersonFieldChange}
              onParentFieldChange={handleParentFieldChange}
            />
            <PersonEditorCard
              role="bride"
              label="Bride"
              person={formState.couple.bride}
              disabled={false}
              onPersonFieldChange={handlePersonFieldChange}
              onParentFieldChange={handleParentFieldChange}
            />
          </div>
        </div>
      );
    }

    if (stepKey === 'images') {
      const galleryImages = formState.pageData?.galleryImages ?? [];

      return (
        <div className={styles.fieldGrid}>
          <section className={styles.uploadCard}>
            <div className={styles.uploadHeader}>
              <div>
                <h3 className={styles.cardTitle}>Cover image</h3>
                <p className={styles.cardText}>Main image for the cover and share card.</p>
              </div>
              <div className={styles.inlineActions}>
                <input
                  ref={coverUploadInputRef}
                  className={styles.hiddenInput}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleCoverUpload(event)}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleTriggerPicker('cover')}
                  disabled={!canEdit || uploadingField === 'cover'}
                >
                  {uploadingField === 'cover' ? 'Uploading' : 'Upload cover'}
                </button>
              </div>
            </div>

            <div className={styles.assetPreview}>
              {previewFormState.metadata.images.wedding ? (
                <img
                  className={styles.assetPreviewImage}
                  src={previewFormState.metadata.images.wedding}
                  alt="Cover preview"
                />
              ) : (
                <div className={styles.assetPlaceholder}>Cover preview</div>
              )}
            </div>

            <label className={styles.field}>
              {renderFieldMeta('Cover image URL', 'optional')}
              <input
                className={styles.input}
                value={formState.metadata.images.wedding}
                placeholder="https://.../cover.jpg"
                onChange={(event) =>
                  updateForm((draft) => {
                    draft.metadata.images.wedding = event.target.value;
                  })
                }
              />
            </label>
          </section>

          <section className={styles.uploadCard}>
            <div className={styles.uploadHeader}>
              <div>
                <h3 className={styles.cardTitle}>Gallery images</h3>
                <p className={styles.cardText}>Up to {maxGalleryImages} images.</p>
              </div>
              <div className={styles.inlineActions}>
                <input
                  ref={galleryUploadInputRef}
                  className={styles.hiddenInput}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => void handleGalleryUpload(event)}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleTriggerPicker('gallery')}
                  disabled={
                    !canEdit ||
                    uploadingField === 'gallery' ||
                    galleryImages.length >= maxGalleryImages
                  }
                >
                  {uploadingField === 'gallery' ? 'Uploading' : 'Upload gallery'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleGalleryImageAdd}
                  disabled={galleryImages.length >= maxGalleryImages}
                >
                  Add URL
                </button>
              </div>
            </div>
            {galleryImages.length > 0 ? (
              <div className={styles.assetList}>
                {galleryImages.map((imageUrl, index) => (
                  <article key={`gallery-${index}`} className={styles.assetItem}>
                    {imageUrl ? (
                      <img
                        className={styles.assetItemImage}
                        src={imageUrl}
                        alt={`Gallery ${index + 1}`}
                      />
                    ) : (
                      <div className={styles.assetPlaceholder}>Image {index + 1}</div>
                    )}
                    <div className={styles.assetItemBody}>
                      <div className={styles.assetItemHeader}>
                        <strong className={styles.assetItemTitle}>
                          Gallery image {index + 1}
                        </strong>
                        <div className={styles.assetActionRow}>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => handleGalleryImageMove(index, 'up')}
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => handleGalleryImageMove(index, 'down')}
                            disabled={index === galleryImages.length - 1}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => handleGalleryImageRemove(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <label className={styles.field}>
                        {renderFieldMeta('Image URL', 'optional')}
                        <input
                          className={styles.input}
                          value={imageUrl}
                          placeholder="https://.../gallery-01.jpg"
                          onChange={(event) =>
                            handleGalleryImageChange(index, event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.assetPlaceholder}>No gallery image yet.</div>
            )}
          </section>
        </div>
      );
    }

    if (stepKey === 'extra') {
      return (
        <div className={styles.fieldGrid}>
          <section className={styles.formCard}>
            <label className={styles.field}>
              {renderFieldMeta('Gift message', 'optional')}
              <textarea
                className={styles.textarea}
                value={formState.pageData?.giftInfo?.message ?? ''}
                placeholder="Optional account guide message"
                onChange={(event) =>
                  updateForm((draft) => {
                    if (draft.pageData?.giftInfo) {
                      draft.pageData.giftInfo.message = event.target.value;
                    }
                  })
                }
              />
            </label>
          </section>

          <div className={styles.twoColumnGrid}>
            <AccountSectionPanel
              kind="groomAccounts"
              title="Groom accounts"
              description="Up to 3 accounts"
              accounts={formState.pageData?.giftInfo?.groomAccounts ?? []}
              disabled={false}
              onAdd={handleAccountAdd}
              onRemove={handleAccountRemove}
              onChange={handleAccountChange}
            />
            <AccountSectionPanel
              kind="brideAccounts"
              title="Bride accounts"
              description="Up to 3 accounts"
              accounts={formState.pageData?.giftInfo?.brideAccounts ?? []}
              disabled={false}
              onAdd={handleAccountAdd}
              onRemove={handleAccountRemove}
              onChange={handleAccountChange}
            />
          </div>

          <section className={styles.formCard}>
            <div className={styles.templateRow}>
              {GUIDE_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  className={styles.templateButton}
                  onClick={() =>
                    handleGuideTemplateApply('venueGuide', template.label, template.value)
                  }
                >
                  Add {template.label}
                </button>
              ))}
            </div>
            <GuideSectionPanel
              kind="venueGuide"
              title="Venue guide"
              description="Optional guide items below the schedule."
              items={formState.pageData?.venueGuide ?? []}
              disabled={false}
              onAdd={handleGuideAdd}
              onRemove={handleGuideRemove}
              onChange={handleGuideChange}
            />
            <GuideSectionPanel
              kind="wreathGuide"
              title="Wreath guide"
              description="Optional wreath delivery guide."
              items={formState.pageData?.wreathGuide ?? []}
              disabled={false}
              onAdd={handleGuideAdd}
              onRemove={handleGuideRemove}
              onChange={handleGuideChange}
            />
          </section>
        </div>
      );
    }

    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta('Browser title', 'optional')}
          <input
            className={styles.input}
            value={formState.metadata.title}
            placeholder={previewFormState.metadata.title}
            onChange={(event) =>
              updateForm((draft) => {
                draft.metadata.title = event.target.value;
              })
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('Browser description', 'optional')}
          <textarea
            className={styles.textarea}
            value={formState.metadata.description}
            placeholder={previewFormState.metadata.description}
            onChange={(event) =>
              updateForm((draft) => {
                draft.metadata.description = event.target.value;
              })
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('Keywords', 'optional', 'Comma separated')}
          <input
            className={styles.input}
            value={keywordsToText(formState.metadata.keywords)}
            placeholder="wedding, invitation"
            onChange={(event) =>
              updateForm((draft) => {
                draft.metadata.keywords = textToKeywords(event.target.value);
              })
            }
          />
        </label>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          Publish after saving
        </label>
      </div>
    );
  };

  if (isLoading || isAdminLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.centerCard}>
            <p className={styles.eyebrow}>Loading</p>
            <h1 className={styles.centerTitle}>Preparing the invitation wizard.</h1>
            <p className={styles.centerText}>
              The current config and publish status are being checked.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!formState || !previewFormState || !canCreateNew || !canEdit) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          {renderNotice()}
          <section className={styles.centerCard}>
            {initialSlug ? (
              <>
                <p className={styles.eyebrow}>Unlock Editor</p>
                <h1 className={styles.centerTitle}>Enter the page password.</h1>
                <p className={styles.centerText}>
                  Existing customer pages can be edited after password verification.
                </p>
                <div className={styles.lockRow}>
                  <input
                    className={styles.input}
                    type="password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    placeholder="Page password"
                  />
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleUnlock()}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? 'Checking' : 'Unlock'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.eyebrow}>Admin Only</p>
                <h1 className={styles.centerTitle}>New page creation requires admin access.</h1>
                <p className={styles.centerText}>
                  Existing pages can use customer passwords, but creating a new page is
                  an admin-only action.
                </p>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.topCard}>
          <div className={styles.topHeader}>
            <div className={styles.topMeta}>
              <p className={styles.eyebrow}>Mobile Invitation Wizard</p>
              <h1 className={styles.pageTitle}>{title}</h1>
              <p className={styles.pageDescription}>
                Swipe through the steps, confirm each section, and save into the same
                Firestore config used by the existing editor.
              </p>
            </div>
            <div className={styles.topMeta}>
              <span className={styles.metaChip}>Step {activeStep.number}</span>
              <span className={styles.metaChip}>Theme {defaultTheme}</span>
              <span className={styles.metaChip}>
                Package {getProductTierLabel(formState.productTier ?? 'premium')}
              </span>
              <span className={published ? styles.stateSuccess : styles.metaChip}>
                {published ? 'Publish on save' : 'Draft on save'}
              </span>
            </div>
          </div>

          <div className={styles.progressBlock}>
            <div className={styles.progressLabels}>
              <strong>Required progress</strong>
              <span>
                {completedRequiredSteps} / {WIZARD_STEPS.length - 1} ready
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.round(
                    (completedRequiredSteps / (WIZARD_STEPS.length - 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className={styles.statusGrid}>
            <section className={styles.summaryCard}>
              <span className={styles.summaryLabel}>URL</span>
              <strong className={styles.summaryValue}>/{previewSlug}</strong>
            </section>
            <section className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Wedding date</span>
              <strong className={styles.summaryValue}>{currentWeddingSummary}</strong>
            </section>
            <section className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Data source</span>
              <strong className={styles.summaryValue}>{dataSourceLabel}</strong>
            </section>
            <section className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Last saved</span>
              <strong className={styles.summaryValue}>{formatSavedAt(lastSavedAt)}</strong>
            </section>
          </div>

          <div className={styles.stepNav}>
            {WIZARD_STEPS.map((step) => {
              const validation =
                reviewSummary.find((item) => item.step.key === step.key)?.validation ?? {
                  valid: false,
                  messages: [],
                };

              return (
                <button
                  key={step.key}
                  type="button"
                  className={`${styles.stepNavButton} ${
                    activeStep.key === step.key ? styles.stepNavButtonActive : ''
                  }`}
                  onClick={() => slideToStep(step.key)}
                >
                  <span className={styles.stepNavNumber}>{step.number}</span>
                  <span className={styles.stepNavTitle}>{step.title}</span>
                  <span
                    className={validation.valid ? styles.stateSuccess : styles.stateError}
                  >
                    {validation.valid ? 'Ready' : 'Check'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {renderNotice()}

        <section className={styles.swiperCard}>
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            spaceBetween={24}
            autoHeight
            onSwiper={(instance) => {
              swiperRef.current = instance;
            }}
            onSlideChange={(instance) => {
              const nextStep = WIZARD_STEPS[instance.activeIndex];
              if (nextStep) {
                setActiveStepKey(nextStep.key);
              }
            }}
          >
            {WIZARD_STEPS.map((step) => {
              const validation =
                reviewSummary.find((item) => item.step.key === step.key)?.validation ?? {
                  valid: false,
                  messages: [],
                };

              return (
                <SwiperSlide key={step.key}>
                  <div className={styles.slideInner}>
                    <div className={styles.stepHeader}>
                      <div className={styles.stepNumber}>{step.number}</div>
                      <div className={styles.stepHeaderText}>
                        <div className={styles.stepMetaRow}>
                          <span className={styles.metaChip}>{step.title}</span>
                          <span
                            className={
                              validation.valid ? styles.stateSuccess : styles.stateError
                            }
                          >
                            {validation.valid ? 'Ready' : 'Need input'}
                          </span>
                        </div>
                        <h2 className={styles.stepTitle}>{step.title}</h2>
                        <p className={styles.stepDescription}>{step.description}</p>
                        <ul className={styles.highlightList}>
                          {step.highlights.map((highlight) => (
                            <li key={`${step.key}-${highlight}`}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className={getNoticeClassName(validation.valid ? 'neutral' : 'error')}>
                      {validation.valid
                        ? 'Changes in this slide are reflected in the preview immediately.'
                        : validation.messages[0] ?? 'Check the current step values.'}
                    </div>

                    <div className={styles.stepGrid}>
                      <section className={styles.formCard}>{renderStepContent(step.key)}</section>
                      {step.previewSection ? (
                        <div className={styles.previewPane}>
                          <PageEditorSectionPreview
                            section={step.previewSection}
                            theme={defaultTheme}
                            slug={previewSlug}
                            formState={previewFormState}
                            published={published}
                            highlighted={step.key === activeStep.key}
                            onRequestEdit={() => slideToStep(step.key)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>

        <section className={styles.footerBar}>
          <div className={styles.footerLeft}>
            <strong>{activeStep.title}</strong>
            <p className={styles.footerText}>
              {activeValidation.valid
                ? 'Confirm this step to move forward.'
                : activeValidation.messages[0] ?? 'Complete this step first.'}
            </p>
          </div>
          <div className={styles.footerRight}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={handleMovePrevious}
              disabled={getStepIndex(activeStep.key) === 0 || isSaving}
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleSaveCurrent()}
              disabled={isSaving}
            >
              {isSaving ? 'Saving' : 'Save now'}
            </button>
            {activeStep.key === 'final' ? (
              <button
                type="button"
                className={styles.publishButton}
                onClick={() => void handleFinalConfirm()}
                disabled={isSaving}
              >
                {published ? 'Save and publish' : 'Save draft'}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleMoveNext()}
                disabled={isSaving}
              >
                {activeStep.key === 'slug' ? 'Confirm slug' : 'Confirm and next'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
