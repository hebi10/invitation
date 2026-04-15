import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import * as ImagePicker from 'expo-image-picker';

import { uploadMobileInvitationImage } from '../../../lib/api';
import type {
  MobileInvitationDashboard,
  MobileSessionSummary,
} from '../../../types/mobileInvitation';
import {
  buildUploadFileName,
  moveArrayItem,
  type EditableImageAssetKind,
  type ManageFormState,
  type ManageGalleryPreviewItem,
} from '../shared';

type UseImageUploadOptions = {
  apiBaseUrl: string;
  dashboard: MobileInvitationDashboard | null;
  session: MobileSessionSummary | null;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  setForm: Dispatch<SetStateAction<ManageFormState>>;
  setNotice: (message: string) => void;
};

export function useImageUpload({
  apiBaseUrl,
  dashboard,
  session,
  galleryPreviewItems,
  setForm,
  setNotice,
}: UseImageUploadOptions) {
  const [uploadingImageKind, setUploadingImageKind] =
    useState<EditableImageAssetKind | null>(null);

  const handleUploadImage = useCallback(
    async (assetKind: EditableImageAssetKind) => {
      if (!dashboard || !session) {
        setNotice('청첩장 연동 후 이미지를 업로드할 수 있습니다.');
        return;
      }

      if (assetKind === 'gallery') {
        const remainingSlots = Math.max(
          0,
          dashboard.page.features.maxGalleryImages - galleryPreviewItems.length
        );

        if (remainingSlots <= 0) {
          setNotice(
            `갤러리는 최대 ${dashboard.page.features.maxGalleryImages}장까지 등록할 수 있습니다.`
          );
          return;
        }
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice('이미지 업로드를 위해 사진 보관함 접근 권한이 필요합니다.');
        return;
      }

      const selectionLimit =
        assetKind === 'gallery'
          ? Math.max(1, dashboard.page.features.maxGalleryImages - galleryPreviewItems.length)
          : 1;

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: assetKind === 'gallery',
        selectionLimit,
        quality: 0.95,
      });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return;
      }

      const selectedAssets = pickerResult.assets.slice(0, selectionLimit);
      setUploadingImageKind(assetKind);

      try {
        const uploadedImages: Array<{ url: string; previewUrl: string }> = [];

        for (const asset of selectedAssets) {
          const mimeType =
            typeof asset.mimeType === 'string' && asset.mimeType.trim().startsWith('image/')
              ? asset.mimeType.trim()
              : 'image/jpeg';
          const fileName =
            typeof asset.fileName === 'string' && asset.fileName.trim()
              ? asset.fileName.trim()
              : buildUploadFileName(assetKind, mimeType);

          const formData = new FormData();
          formData.append('assetKind', assetKind);
          formData.append(
            'file',
            {
              uri: asset.uri,
              name: fileName,
              type: mimeType,
            } as unknown as Blob
          );

          const uploaded = await uploadMobileInvitationImage(
            apiBaseUrl,
            session.pageSlug,
            session.token,
            formData
          );
          uploadedImages.push({
            url: uploaded.url,
            previewUrl: uploaded.thumbnailUrl.trim() || uploaded.url,
          });
        }

        const uploadedUrls = uploadedImages.map((image) => image.url);

        if (assetKind === 'cover') {
          const uploadedCoverImage = uploadedImages[0];
          if (uploadedCoverImage) {
            setForm((current) => ({
              ...current,
              coverImageUrl: uploadedCoverImage.url,
              coverImageThumbnailUrl: uploadedCoverImage.previewUrl,
            }));
            setNotice('대표 이미지를 업로드했습니다.');
          }
        } else {
          setForm((current) => {
            const maxGalleryImages = dashboard.page.features.maxGalleryImages;
            const nextGallery = [
              ...current.galleryImages,
              ...uploadedImages.map((image) => image.url),
            ].slice(0, maxGalleryImages);
            const nextGalleryThumbnailUrls = [
              ...current.galleryImageThumbnailUrls,
              ...uploadedImages.map((image) => image.previewUrl),
            ].slice(0, maxGalleryImages);

            return {
              ...current,
              galleryImages: nextGallery,
              galleryImageThumbnailUrls: nextGalleryThumbnailUrls,
              galleryImagesText: nextGallery.join('\n'),
            };
          });

          setNotice(`갤러리 이미지 ${uploadedUrls.length}장을 업로드했습니다.`);
        }
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        );
      } finally {
        setUploadingImageKind(null);
      }
    },
    [apiBaseUrl, dashboard, galleryPreviewItems.length, session, setForm, setNotice]
  );

  const handleMoveGalleryImage = useCallback(
    (index: number, direction: 'up' | 'down') => {
      setForm((current) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const nextGalleryImages = moveArrayItem(current.galleryImages, index, targetIndex);

        return {
          ...current,
          galleryImages: nextGalleryImages,
          galleryImageThumbnailUrls: moveArrayItem(
            current.galleryImageThumbnailUrls,
            index,
            targetIndex
          ),
          galleryImagesText: nextGalleryImages.join('\n'),
        };
      });
    },
    [setForm]
  );

  const handleRemoveGalleryImage = useCallback(
    (index: number) => {
      setForm((current) => {
        const nextGalleryImages = current.galleryImages.filter(
          (_, itemIndex) => itemIndex !== index
        );

        return {
          ...current,
          galleryImages: nextGalleryImages,
          galleryImageThumbnailUrls: current.galleryImageThumbnailUrls.filter(
            (_, itemIndex) => itemIndex !== index
          ),
          galleryImagesText: nextGalleryImages.join('\n'),
        };
      });
    },
    [setForm]
  );

  return {
    uploadingImageKind,
    handleUploadImage,
    handleMoveGalleryImage,
    handleRemoveGalleryImage,
  };
}
