import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  type EditableImageAssetKind,
  type EditableImageUploadRole,
  getEditableImageUploadHint,
  uploadEditablePageImage,
  validateEditableImageBatch,
} from '@/services/imageService';
import type { InvitationPageSeed } from '@/types/invitationPage';
import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';

import type {
  NoticeState,
  PageEditorUploadFieldKind,
} from './pageEditorClientTypes';

function getSingleImageAssetKind(
  field: Exclude<PageEditorUploadFieldKind, 'gallery'>
): EditableImageAssetKind {
  return field === 'wedding' ? 'cover' : 'favicon';
}

export function usePageEditorImageUpload({
  slug,
  canUploadImages,
  uploadRole,
  formState,
  maxGalleryImages,
  updateForm,
  setNotice,
}: {
  slug: string;
  canUploadImages: boolean;
  uploadRole: EditableImageUploadRole;
  formState: InvitationPageSeed | null;
  maxGalleryImages: number;
  updateForm: (updater: (draft: InvitationPageSeed) => void) => void;
  setNotice: Dispatch<SetStateAction<NoticeState>>;
}) {
  const [uploadingField, setUploadingField] =
    useState<PageEditorUploadFieldKind | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const faviconUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerImagePicker = useCallback(
    (field: PageEditorUploadFieldKind) => {
      if (!canUploadImages) {
        setNotice({
          tone: 'error',
          message: '이미지 업로드는 Firebase가 켜진 환경에서 편집 권한이 있을 때만 사용할 수 있습니다.',
        });
        return;
      }

      if (field === 'wedding') {
        coverUploadInputRef.current?.click();
        return;
      }

      if (field === 'favicon') {
        faviconUploadInputRef.current?.click();
        return;
      }

      galleryUploadInputRef.current?.click();
    },
    [canUploadImages, setNotice]
  );

  const handleUploadAsset = useCallback(
    async (field: PageEditorUploadFieldKind, files: File[]) => {
      if (!formState || files.length === 0) {
        return;
      }

      if (!canUploadImages) {
        setNotice({
          tone: 'error',
          message: '이미지 업로드는 Firebase가 켜진 환경에서 편집 권한이 있을 때만 사용할 수 있습니다.',
        });
        return;
      }

      const assetKind = field === 'gallery' ? 'gallery' : getSingleImageAssetKind(field);
      const batchValidationError = validateEditableImageBatch(
        files,
        assetKind,
        field === 'gallery' ? Math.min(10, maxGalleryImages) : 1
      );

      if (batchValidationError) {
        setNotice({
          tone: 'error',
          message: batchValidationError,
        });
        return;
      }

      setUploadingField(field);

      try {
        if (field === 'gallery') {
          const currentGalleryCount = formState.pageData?.galleryImages?.length ?? 0;
          const remainingSlots = maxGalleryImages - currentGalleryCount;

          if (remainingSlots <= 0) {
            setNotice({
              tone: 'error',
              message: `갤러리 이미지는 최대 ${maxGalleryImages}장까지 설정할 수 있습니다.`,
            });
            return;
          }

          const uploadTargets = files.slice(0, remainingSlots);
          const uploadTargetValidationError = validateEditableImageBatch(
            uploadTargets,
            'gallery',
            Math.min(10, remainingSlots)
          );

          if (uploadTargetValidationError) {
            setNotice({
              tone: 'error',
              message: uploadTargetValidationError,
            });
            return;
          }

          const uploadedImages = await Promise.all(
            uploadTargets.map((file) =>
              uploadEditablePageImage(file, slug, 'gallery', uploadRole)
            )
          );

          updateForm((draft) => {
            if (!draft.pageData) {
              return;
            }

            draft.pageData.galleryImages = [
              ...(draft.pageData.galleryImages ?? []),
              ...uploadedImages.map((image) => image.url),
            ].slice(0, maxGalleryImages);
          });

          setNotice({
            tone: 'success',
            message:
              files.length > uploadTargets.length
                ? `갤러리 이미지 ${uploadTargets.length}장만 추가했습니다. 최대 ${maxGalleryImages}장까지 설정할 수 있습니다.`
                : `갤러리 이미지 ${uploadedImages.length}장을 업로드했습니다. ${getEditableImageUploadHint('gallery')}`,
          });
          return;
        }

        const uploadTarget = files[0];
        const singleAssetKind = getSingleImageAssetKind(field);
        const uploadedImage = await uploadEditablePageImage(
          uploadTarget,
          slug,
          singleAssetKind,
          uploadRole
        );

        updateForm((draft) => {
          draft.metadata.images[field] = uploadedImage.url;
        });

        setNotice({
          tone: 'success',
          message:
            field === 'wedding'
              ? `대표 이미지를 업로드했습니다. ${getEditableImageUploadHint('cover')}`
              : `파비콘을 업로드했습니다. ${getEditableImageUploadHint('favicon')}`,
        });
      } catch (error) {
        console.error('[PageEditorClient] failed to upload image asset', error);
        setNotice({
          tone: 'error',
          message: toUserFacingKoreanErrorMessage(error, '이미지 업로드에 실패했습니다.'),
        });
      } finally {
        setUploadingField((current) => (current === field ? null : current));
      }
    },
    [
      canUploadImages,
      formState,
      maxGalleryImages,
      setNotice,
      slug,
      updateForm,
      uploadRole,
    ]
  );

  const handleSingleImageUploadChange = useCallback(
    async (
      field: Exclude<PageEditorUploadFieldKind, 'gallery'>,
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      await handleUploadAsset(field, files);
    },
    [handleUploadAsset]
  );

  const handleGalleryUploadChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      await handleUploadAsset('gallery', files);
    },
    [handleUploadAsset]
  );

  return {
    uploadingField,
    coverUploadInputRef,
    faviconUploadInputRef,
    galleryUploadInputRef,
    handleTriggerImagePicker,
    handleSingleImageUploadChange,
    handleGalleryUploadChange,
  };
}
