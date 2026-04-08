import { useCallback } from 'react';

import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';

import {
  createInvitationPageDraftFromSeed,
  normalizeInvitationPageSlugBase,
  saveInvitationPageConfig,
} from '@/services/invitationPageService';
import { saveClientEditorConfig } from '@/services/clientEditorSession';
import type {
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';

import {
  PLACEHOLDER_BRIDE,
  PLACEHOLDER_GROOM,
  prepareWizardConfigForSave,
} from '../pageWizardData';

export type WizardDraftCreationState = {
  slug: string;
  createdFresh: boolean;
  config?: InvitationPageSeed;
};

export type WizardPersistDraftOptions = {
  publish?: boolean;
  successMessage?: string;
  silent?: boolean;
};

export function useWizardPersistence({
  formState,
  previewFormState,
  defaultTheme,
  published,
  resolvedPersistedSlug,
  slugInput,
  defaultSeedSlug,
  isAdminLoggedIn,
  setPersistedSlug,
  setSlugInput,
  setFormState,
  setPublished,
  setLastSavedAt,
  setIsSaving,
  normalizeFormState,
  showNotice,
  showErrorNotice,
}: {
  formState: InvitationPageSeed | null;
  previewFormState: InvitationPageSeed | null;
  defaultTheme: InvitationThemeKey;
  published: boolean;
  resolvedPersistedSlug: string | null;
  slugInput: string;
  defaultSeedSlug: string | null;
  isAdminLoggedIn: boolean;
  setPersistedSlug: (value: string | null) => void;
  setSlugInput: (value: string) => void;
  setFormState: (value: InvitationPageSeed) => void;
  setPublished: (value: boolean) => void;
  setLastSavedAt: (value: Date | null) => void;
  setIsSaving: (value: boolean) => void;
  normalizeFormState: (config: InvitationPageSeed) => InvitationPageSeed;
  showNotice: (tone: 'success' | 'error' | 'neutral', message: string) => void;
  showErrorNotice: (error: unknown, fallback?: string) => void;
}) {
  const ensureDraftCreated = useCallback(async (): Promise<WizardDraftCreationState> => {
    if (resolvedPersistedSlug) {
      return {
        slug: resolvedPersistedSlug,
        createdFresh: false,
      };
    }

    if (!defaultSeedSlug) {
      throw new Error('기본 템플릿을 찾을 수 없습니다.');
    }

    const normalizedSlug = normalizeInvitationPageSlugBase(slugInput);
    if (!normalizedSlug) {
      throw new Error('올바른 페이지 주소를 먼저 입력해 주세요.');
    }

    const created = await createInvitationPageDraftFromSeed({
      seedSlug: defaultSeedSlug,
      slugBase: normalizedSlug,
      groomName: previewFormState?.couple.groom.name || PLACEHOLDER_GROOM,
      brideName: previewFormState?.couple.bride.name || PLACEHOLDER_BRIDE,
      published: false,
      defaultTheme,
      productTier: previewFormState?.productTier,
    });
    const normalizedCreatedConfig = normalizeFormState(created.config);

    setPersistedSlug(created.slug);
    setSlugInput(created.slug);
    setFormState(normalizedCreatedConfig);
    setPublished(false);
    setLastSavedAt(new Date());

    if (created.slug !== normalizedSlug) {
      showNotice(
        'neutral',
        `입력한 주소가 이미 사용 중이어서 ${created.slug}로 자동 조정했습니다.`
      );
    }

    return {
      slug: created.slug,
      createdFresh: true,
      config: normalizedCreatedConfig,
    };
  }, [
    defaultSeedSlug,
    defaultTheme,
    normalizeFormState,
    previewFormState,
    resolvedPersistedSlug,
    setFormState,
    setLastSavedAt,
    setPersistedSlug,
    setPublished,
    setSlugInput,
    showNotice,
    slugInput,
  ]);

  const persistDraft = useCallback(
    async (options?: WizardPersistDraftOptions): Promise<string | null> => {
      if (!formState) {
        return null;
      }

      setIsSaving(true);

      try {
        const draftState = await ensureDraftCreated();
        const nextSlug = draftState.slug;

        if (draftState.createdFresh && options?.publish !== true) {
          if (!options?.silent) {
            showNotice('success', options?.successMessage ?? '청첩장을 저장했습니다.');
          }

          return nextSlug;
        }

        const sourceConfig = draftState.config ?? formState;
        const prepared = prepareWizardConfigForSave(sourceConfig, nextSlug);
        prepared.variants = buildInvitationVariants(nextSlug, prepared.displayName, {
          availability: createInvitationVariantAvailability([
            defaultTheme as InvitationVariantKey,
          ]),
        });
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

        const normalized = normalizeFormState(prepared);
        setFormState(normalized);
        setPublished(nextPublished);
        setLastSavedAt(new Date());

        if (!options?.silent) {
          showNotice(
            'success',
            options?.successMessage ??
              (nextPublished
                ? '페이지를 공개했습니다.'
                : '청첩장을 저장했습니다.')
          );
        }

        return nextSlug;
      } catch (error) {
        showErrorNotice(error, '청첩장 청첩장을 저장하지 못했습니다.');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [
      defaultTheme,
      ensureDraftCreated,
      formState,
      isAdminLoggedIn,
      normalizeFormState,
      published,
      setFormState,
      setIsSaving,
      setLastSavedAt,
      setPublished,
      showErrorNotice,
      showNotice,
    ]
  );

  return {
    ensureDraftCreated,
    persistDraft,
  };
}
