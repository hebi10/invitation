import { useCallback, type ChangeEvent, type RefObject } from 'react';

import {
  type EditableImageAssetKind,
  type EditableImageUploadRole,
  getEditableImageUploadHint,
  uploadEditablePageImage,
  validateEditableImageBatch,
} from '@/services/imageService';
import type { InvitationPageSeed } from '@/types/invitationPage';

import type { UploadFieldKind } from '../pageWizardShared';
import type { WizardDraftCreationState } from './useWizardPersistence';

type SingleImageFieldKind = Exclude<UploadFieldKind, 'gallery'>;

export function useImageUpload({
  canUploadImages,
  uploadRole,
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
}: {
  canUploadImages: boolean;
  uploadRole: EditableImageUploadRole;
  formState: InvitationPageSeed | null;
  maxGalleryImages: number;
  coverUploadInputRef: RefObject<HTMLInputElement | null>;
  sharePreviewUploadInputRef: RefObject<HTMLInputElement | null>;
  kakaoCardUploadInputRef: RefObject<HTMLInputElement | null>;
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
          '이미지 업로드는 관리자 또는 고객 인증 로그인 후에 사용할 수 있습니다.'
        );
        return;
      }

      switch (kind) {
        case 'cover':
          coverUploadInputRef.current?.click();
          return;
        case 'sharePreview':
          sharePreviewUploadInputRef.current?.click();
          return;
        case 'kakaoCard':
          kakaoCardUploadInputRef.current?.click();
          return;
        default:
          galleryUploadInputRef.current?.click();
      }
    },
    [
      canUploadImages,
      coverUploadInputRef,
      galleryUploadInputRef,
      kakaoCardUploadInputRef,
      sharePreviewUploadInputRef,
      showErrorNotice,
    ]
  );

  const uploadSingleImage = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
      options: {
        fieldKind: SingleImageFieldKind;
        assetKind: EditableImageAssetKind;
        successLabel: string;
        errorLabel: string;
        applyUrl: (draft: InvitationPageSeed, imageUrl: string) => void;
      }
    ) => {
      const target = event.target;
      const file = target.files?.[0];
      target.value = '';

      if (!file) {
        return;
      }

      if (!canUploadImages) {
        showErrorNotice(
          '이미지 업로드는 관리자 또는 고객 인증 로그인 후에 사용할 수 있습니다.'
        );
        return;
      }

      const validationError = validateEditableImageBatch([file], options.assetKind);
      if (validationError) {
        showErrorNotice(validationError);
        return;
      }

      setUploadingField(options.fieldKind);

      try {
        const draftState = await ensureDraftCreated();
        const uploaded = await uploadEditablePageImage(
          file,
          draftState.slug,
          options.assetKind,
          uploadRole
        );

        updateForm((draft) => {
          options.applyUrl(draft, uploaded.url);
        });

        showNotice(
          'success',
          `${options.successLabel}를 업로드했습니다. ${getEditableImageUploadHint(options.assetKind)}`
        );
      } catch (error) {
        showErrorNotice(error, `${options.errorLabel}를 업로드하지 못했습니다.`);
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
      updateForm,
      uploadRole,
    ]
  );

  const handleCoverUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await uploadSingleImage(event, {
        fieldKind: 'cover',
        assetKind: 'cover',
        successLabel: '대표 이미지',
        errorLabel: '대표 이미지',
        applyUrl: (draft, imageUrl) => {
          draft.metadata.images.wedding = imageUrl;
        },
      });
    },
    [uploadSingleImage]
  );

  const handleSharePreviewUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await uploadSingleImage(event, {
        fieldKind: 'sharePreview',
        assetKind: 'share-preview',
        successLabel: '공유 미리보기 이미지',
        errorLabel: '공유 미리보기 이미지',
        applyUrl: (draft, imageUrl) => {
          draft.metadata.images.social = imageUrl;
        },
      });
    },
    [uploadSingleImage]
  );

  const handleKakaoCardUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await uploadSingleImage(event, {
        fieldKind: 'kakaoCard',
        assetKind: 'kakao-card',
        successLabel: '카카오 카드 이미지',
        errorLabel: '카카오 카드 이미지',
        applyUrl: (draft, imageUrl) => {
          draft.metadata.images.kakaoCard = imageUrl;
        },
      });
    },
    [uploadSingleImage]
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
          '이미지 업로드는 관리자 또는 고객 인증 로그인 후에 사용할 수 있습니다.'
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
      updateForm,
      uploadRole,
    ]
  );

  return {
    handleTriggerPicker,
    handleCoverUpload,
    handleSharePreviewUpload,
    handleKakaoCardUpload,
    handleGalleryUpload,
  };
}
