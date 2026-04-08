import { useCallback, type ChangeEvent, type RefObject } from 'react';

import {
  type EditableImageUploadRole,
  getEditableImageUploadHint,
  uploadEditablePageImage,
  validateEditableImageBatch,
} from '@/services/imageService';
import type { InvitationPageSeed } from '@/types/invitationPage';

import type { UploadFieldKind } from '../pageWizardShared';
import type { WizardDraftCreationState } from './useWizardPersistence';

export function useImageUpload({
  canUploadImages,
  uploadRole,
  formState,
  maxGalleryImages,
  coverUploadInputRef,
  galleryUploadInputRef,
  ensureDraftCreated,
  updateForm,
  setUploadingField,
  showNotice,
  showErrorNotice,
}: {
  canUploadImages: boolean;
  uploadRole: EditableImageUploadRole;
  formState: InvitationPageSeed | null;
  maxGalleryImages: number;
  coverUploadInputRef: RefObject<HTMLInputElement | null>;
  galleryUploadInputRef: RefObject<HTMLInputElement | null>;
  ensureDraftCreated: () => Promise<WizardDraftCreationState>;
  updateForm: (updater: (draft: InvitationPageSeed) => void) => void;
  setUploadingField: (value: UploadFieldKind | null) => void;
  showNotice: (tone: 'success' | 'error' | 'neutral', message: string) => void;
  showErrorNotice: (error: unknown, fallback?: string) => void;
}) {
  const handleTriggerPicker = useCallback(
    (kind: UploadFieldKind) => {
      if (!canUploadImages) {
        showErrorNotice(
          '이미지 업로드는 관리자 또는 고객 편집 로그인 후 사용할 수 있습니다.'
        );
        return;
      }

      if (kind === 'cover') {
        coverUploadInputRef.current?.click();
        return;
      }

      galleryUploadInputRef.current?.click();
    },
    [canUploadImages, coverUploadInputRef, galleryUploadInputRef, showErrorNotice]
  );

  const handleCoverUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const target = event.target;
      const file = target.files?.[0];
      target.value = '';

      if (!file) {
        return;
      }

      if (!canUploadImages) {
        showErrorNotice(
          '이미지 업로드는 관리자 또는 고객 편집 로그인 후 사용할 수 있습니다.'
        );
        return;
      }

      const validationError = validateEditableImageBatch([file], 'cover');
      if (validationError) {
        showErrorNotice(validationError);
        return;
      }

      setUploadingField('cover');

      try {
        const draftState = await ensureDraftCreated();
        const uploaded = await uploadEditablePageImage(
          file,
          draftState.slug,
          'cover',
          uploadRole
        );

        updateForm((draft) => {
          draft.metadata.images.wedding = uploaded.url;
        });

        showNotice(
          'success',
          `대표 이미지를 업로드했습니다. ${getEditableImageUploadHint('cover')}`
        );
      } catch (error) {
        showErrorNotice(error, '대표 이미지를 업로드하지 못했습니다.');
      } finally {
        setUploadingField(null);
      }
    },
    [
      canUploadImages,
      ensureDraftCreated,
      setUploadingField,
      showErrorNotice,
      showNotice,
      uploadRole,
      updateForm,
    ]
  );

  const handleGalleryUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const target = event.target;
      const files = Array.from(target.files ?? []);
      target.value = '';

      if (files.length === 0) {
        return;
      }

      if (!canUploadImages) {
        showErrorNotice(
          '이미지 업로드는 관리자 또는 고객 편집 로그인 후 사용할 수 있습니다.'
        );
        return;
      }

      const currentCount = formState?.pageData?.galleryImages?.length ?? 0;
      const remainingSlots = Math.max(maxGalleryImages - currentCount, 0);
      const filesToUpload = files.slice(0, remainingSlots);
      const validationError = validateEditableImageBatch(
        filesToUpload,
        'gallery',
        Math.min(10, remainingSlots)
      );

      if (validationError) {
        showErrorNotice(validationError);
        return;
      }

      setUploadingField('gallery');

      try {
        const draftState = await ensureDraftCreated();
        const uploadedUrls: string[] = [];

        for (const file of filesToUpload) {
          const uploaded = await uploadEditablePageImage(
            file,
            draftState.slug,
            'gallery',
            uploadRole
          );
          uploadedUrls.push(uploaded.url);
        }

        updateForm((draft) => {
          if (!draft.pageData?.galleryImages) {
            return;
          }

          draft.pageData.galleryImages.push(...uploadedUrls);
        });

        showNotice(
          'success',
          `갤러리 이미지를 ${uploadedUrls.length}장 업로드했습니다. ${getEditableImageUploadHint(
            'gallery'
          )}`
        );
      } catch (error) {
        showErrorNotice(error, '갤러리 이미지를 업로드하지 못했습니다.');
      } finally {
        setUploadingField(null);
      }
    },
    [
      canUploadImages,
      ensureDraftCreated,
      formState?.pageData?.galleryImages?.length,
      maxGalleryImages,
      setUploadingField,
      showErrorNotice,
      showNotice,
      uploadRole,
      updateForm,
    ]
  );

  return {
    handleTriggerPicker,
    handleCoverUpload,
    handleGalleryUpload,
  };
}
