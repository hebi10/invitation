import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import * as ImagePicker from 'expo-image-picker';

import {
  uploadMobileInvitationImage,
  type MobileBase64ImageUploadInput,
} from '../../../lib/api';
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

export type ImageUploadProgressState = {
  assetKind: EditableImageAssetKind;
  totalCount: number;
  completedCount: number;
  currentIndex: number;
};

type UseImageUploadOptions = {
  apiBaseUrl: string;
  dashboard: MobileInvitationDashboard | null;
  session: MobileSessionSummary | null;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  setForm: Dispatch<SetStateAction<ManageFormState>>;
  setNotice: (message: string) => void;
};

function createUploadPayload(
  asset: ImagePicker.ImagePickerAsset,
  assetKind: EditableImageAssetKind,
  mimeType: string,
  fileName: string
): FormData | MobileBase64ImageUploadInput {
  const base64 = typeof asset.base64 === 'string' ? asset.base64 : '';
  if (base64.trim()) {
    return {
      assetKind,
      fileName,
      mimeType,
      base64,
    };
  }

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
  return formData;
}

function toUploadErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes('Network request failed')) {
      return '이미지 파일을 앱에서 서버로 전송하지 못했습니다. 다시 선택해 시도해 주세요.';
    }

    return error.message;
  }

  return '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

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
  const [uploadProgress, setUploadProgress] =
    useState<ImageUploadProgressState | null>(null);

  const handleUploadImage = useCallback(
    async (assetKind: EditableImageAssetKind) => {
      if (!dashboard || !session) {
        setNotice('청첩장을 먼저 연동해야 이미지를 업로드할 수 있습니다.');
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
        mediaTypes: 'images',
        allowsMultipleSelection: assetKind === 'gallery',
        selectionLimit,
        quality: 0.95,
        base64: true,
      });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return;
      }

      const selectedAssets = pickerResult.assets.slice(0, selectionLimit);
      const localPreviewUrls = selectedAssets.map((asset) => asset.uri.trim()).filter(Boolean);

      setUploadingImageKind(assetKind);
      setUploadProgress({
        assetKind,
        totalCount: selectedAssets.length,
        completedCount: 0,
        currentIndex: 1,
      });

      try {
        const uploadedImages: Array<{ url: string; previewUrl: string }> = [];

        for (const [index, asset] of selectedAssets.entries()) {
          setUploadProgress({
            assetKind,
            totalCount: selectedAssets.length,
            completedCount: index,
            currentIndex: index + 1,
          });

          const fallbackMimeType =
            typeof asset.mimeType === 'string' && asset.mimeType.trim().startsWith('image/')
              ? asset.mimeType.trim()
              : 'image/jpeg';
          const mimeType =
            typeof asset.base64 === 'string' && asset.base64.trim()
              ? 'image/jpeg'
              : fallbackMimeType;
          const fileName = buildUploadFileName(assetKind, mimeType);
          const uploadPayload = createUploadPayload(asset, assetKind, mimeType, fileName);

          const uploaded = await uploadMobileInvitationImage(
            apiBaseUrl,
            session.pageSlug,
            session.token,
            uploadPayload
          );

          uploadedImages.push({
            url: uploaded.url,
            previewUrl: uploaded.thumbnailUrl.trim() || uploaded.url,
          });

          setUploadProgress({
            assetKind,
            totalCount: selectedAssets.length,
            completedCount: index + 1,
            currentIndex: Math.min(selectedAssets.length, index + 2),
          });
        }

        if (assetKind === 'cover') {
          const uploadedCoverImage = uploadedImages[0];
          if (uploadedCoverImage) {
            setForm((current) => ({
              ...current,
              coverImageUrl: uploadedCoverImage.url,
              coverImageThumbnailUrl:
                localPreviewUrls[0] || uploadedCoverImage.previewUrl || uploadedCoverImage.url,
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
              ...uploadedImages.map(
                (image, index) => localPreviewUrls[index] || image.previewUrl || image.url
              ),
            ].slice(0, maxGalleryImages);

            return {
              ...current,
              galleryImages: nextGallery,
              galleryImageThumbnailUrls: nextGalleryThumbnailUrls,
              galleryImagesText: nextGallery.join('\n'),
            };
          });

          setNotice(`갤러리 이미지 ${uploadedImages.length}장을 업로드했습니다.`);
        }
      } catch (error) {
        setNotice(toUploadErrorMessage(error));
      } finally {
        setUploadingImageKind(null);
        setUploadProgress(null);
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
    uploadProgress,
    handleUploadImage,
    handleMoveGalleryImage,
    handleRemoveGalleryImage,
  };
}
