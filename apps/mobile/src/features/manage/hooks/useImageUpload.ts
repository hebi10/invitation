import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import {
  deleteMobileInvitationImages,
  uploadMobileInvitationImage,
  type MobileBase64ImageUploadInput,
  type MobileImageUploadResponse,
} from '../../../lib/api';
import { createRandomSuffix } from '../../../lib/id';
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

type TrackedUploadedImage = {
  assetKind: EditableImageAssetKind;
  url: string;
  path: string;
  thumbnailPath: string;
  uploadSessionId: string;
};

type UploadableImageAsset = Pick<
  ImagePicker.ImagePickerAsset,
  'uri' | 'width' | 'height' | 'mimeType' | 'fileSize'
>;

type ImageManipulatorModule = {
  SaveFormat?: {
    JPEG?: string;
    PNG?: string;
    WEBP?: string;
  };
  manipulateAsync?: (
    uri: string,
    actions: Array<{ resize: { width?: number; height?: number } }>,
    saveOptions: {
      compress?: number;
      format?: string;
    }
  ) => Promise<{
    uri: string;
    width: number;
    height: number;
  }>;
};

type UseImageUploadOptions = {
  apiBaseUrl: string;
  dashboard: MobileInvitationDashboard | null;
  session: MobileSessionSummary | null;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  setForm: Dispatch<SetStateAction<ManageFormState>>;
  setNotice: (message: string) => void;
};

function createUploadSessionId() {
  return `mobile-upload-${Date.now()}-${createRandomSuffix(8)}`;
}

const BYTES_PER_MB = 1024 * 1024;
const CLIENT_MAX_IMAGE_FILE_SIZE_BYTES = 8 * BYTES_PER_MB;
const CLIENT_BASE64_FALLBACK_MAX_BYTES = 2 * BYTES_PER_MB;
const CLIENT_MAX_IMAGE_DIMENSION = 6000;
const CLIENT_MAX_IMAGE_PIXELS = 16_000_000;
const CLIENT_TARGET_IMAGE_LONG_EDGE = 2400;
const CLIENT_IMAGE_PICKER_QUALITY = 0.82;
const CLIENT_IMAGE_MANIPULATOR_QUALITY = 0.82;

function dedupePaths(paths: string[]) {
  return Array.from(
    new Set(paths.map((path) => path.trim()).filter(Boolean))
  );
}

function hasMediaLibraryAccess(permission: ImagePicker.MediaLibraryPermissionResponse) {
  return permission.granted || permission.accessPrivileges === 'limited';
}

function formatMegabytes(bytes: number) {
  return `${(bytes / BYTES_PER_MB).toFixed(bytes >= 10 * BYTES_PER_MB ? 0 : 1)}MB`;
}

function loadImageManipulator(): ImageManipulatorModule | null {
  try {
    const dynamicRequire = Function('return require')() as (id: string) => unknown;
    const imageManipulatorModule = dynamicRequire('expo-image-manipulator') as
      | ImageManipulatorModule
      | { default?: ImageManipulatorModule };

    if (
      imageManipulatorModule &&
      typeof imageManipulatorModule === 'object' &&
      'default' in imageManipulatorModule &&
      imageManipulatorModule.default
    ) {
      return imageManipulatorModule.default;
    }

    return imageManipulatorModule as ImageManipulatorModule;
  } catch {
    return null;
  }
}

async function getAssetFileSize(asset: UploadableImageAsset) {
  if (typeof asset.fileSize === 'number' && asset.fileSize > 0) {
    return asset.fileSize;
  }

  const fileInfo = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
  if (fileInfo?.exists && !fileInfo.isDirectory && typeof fileInfo.size === 'number') {
    return fileInfo.size;
  }

  return null;
}

function getImagePixelCount(asset: UploadableImageAsset) {
  return Math.max(0, asset.width) * Math.max(0, asset.height);
}

function getImageLongEdge(asset: UploadableImageAsset) {
  return Math.max(asset.width, asset.height);
}

function isOverServerImageLimit(asset: UploadableImageAsset, fileSize: number | null) {
  return (
    (fileSize !== null && fileSize > CLIENT_MAX_IMAGE_FILE_SIZE_BYTES) ||
    asset.width > CLIENT_MAX_IMAGE_DIMENSION ||
    asset.height > CLIENT_MAX_IMAGE_DIMENSION ||
    getImagePixelCount(asset) > CLIENT_MAX_IMAGE_PIXELS
  );
}

function buildResizeAction(asset: UploadableImageAsset) {
  const longEdge = getImageLongEdge(asset);
  if (longEdge <= CLIENT_TARGET_IMAGE_LONG_EDGE) {
    return null;
  }

  return asset.width >= asset.height
    ? { resize: { width: CLIENT_TARGET_IMAGE_LONG_EDGE } }
    : { resize: { height: CLIENT_TARGET_IMAGE_LONG_EDGE } };
}

function getManipulatorSaveOptions(
  imageManipulator: ImageManipulatorModule,
  mimeType: string
) {
  if (mimeType === 'image/png' && imageManipulator.SaveFormat?.PNG) {
    return {
      format: imageManipulator.SaveFormat.PNG,
      mimeType: 'image/png',
    };
  }

  if (mimeType === 'image/webp' && imageManipulator.SaveFormat?.WEBP) {
    return {
      format: imageManipulator.SaveFormat.WEBP,
      mimeType: 'image/webp',
    };
  }

  return {
    format: imageManipulator.SaveFormat?.JPEG ?? 'jpeg',
    mimeType: 'image/jpeg',
  };
}

async function optimizeAssetForUpload(
  asset: ImagePicker.ImagePickerAsset,
  mimeType: string
): Promise<UploadableImageAsset> {
  const initialFileSize = await getAssetFileSize(asset);
  const resizeAction = buildResizeAction(asset);
  const needsOptimization =
    Boolean(resizeAction) || isOverServerImageLimit(asset, initialFileSize);

  if (!needsOptimization) {
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType,
      fileSize: initialFileSize ?? asset.fileSize,
    };
  }

  const imageManipulator = loadImageManipulator();
  if (!imageManipulator?.manipulateAsync) {
    if (isOverServerImageLimit(asset, initialFileSize)) {
      throw new Error(
        `이미지가 너무 큽니다. ${formatMegabytes(CLIENT_MAX_IMAGE_FILE_SIZE_BYTES)} 이하, 긴 변 ${CLIENT_MAX_IMAGE_DIMENSION}px 이하의 이미지로 다시 선택해 주세요.`
      );
    }

    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType,
      fileSize: initialFileSize ?? asset.fileSize,
    };
  }

  const saveOptions = getManipulatorSaveOptions(imageManipulator, mimeType);
  const manipulated = await imageManipulator.manipulateAsync(
    asset.uri,
    resizeAction ? [resizeAction] : [],
    {
      compress: CLIENT_IMAGE_MANIPULATOR_QUALITY,
      format: saveOptions.format,
    }
  );
  const optimizedAsset = {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
    mimeType: saveOptions.mimeType,
    fileSize: undefined,
  } satisfies UploadableImageAsset;
  const optimizedFileSize = await getAssetFileSize(optimizedAsset);

  if (isOverServerImageLimit(optimizedAsset, optimizedFileSize)) {
    throw new Error(
      `이미지를 줄였지만 아직 업로드 제한을 초과합니다. ${formatMegabytes(CLIENT_MAX_IMAGE_FILE_SIZE_BYTES)} 이하, 긴 변 ${CLIENT_MAX_IMAGE_DIMENSION}px 이하의 이미지로 다시 선택해 주세요.`
    );
  }

  return {
    ...optimizedAsset,
    fileSize: optimizedFileSize ?? undefined,
  };
}

function toMediaLibraryPermissionMessage(
  permission: ImagePicker.MediaLibraryPermissionResponse
) {
  if (hasMediaLibraryAccess(permission)) {
    return '';
  }

  if (!permission.canAskAgain) {
    return '사진 보관함 권한이 꺼져 있습니다. 기기 설정에서 사진 접근을 허용한 뒤 다시 시도해 주세요.';
  }

  return '이미지 선택을 위해 사진 보관함 접근 권한을 허용해 주세요.';
}

function createFormDataUploadPayload(
  asset: UploadableImageAsset,
  assetKind: EditableImageAssetKind,
  mimeType: string,
  fileName: string,
  uploadSessionId: string
) {
  const normalizedUri = asset.uri.trim();
  if (!normalizedUri) {
    return null;
  }

  const formData = new FormData();
  formData.append('assetKind', assetKind);
  formData.append('uploadSessionId', uploadSessionId);
  formData.append(
    'file',
    {
      uri: normalizedUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob
  );
  return formData;
}

async function createBase64UploadPayload(
  asset: UploadableImageAsset,
  assetKind: EditableImageAssetKind,
  mimeType: string,
  fileName: string,
  uploadSessionId: string
): Promise<MobileBase64ImageUploadInput | null> {
  const normalizedUri = asset.uri.trim();
  if (!normalizedUri) {
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
    encoding: FileSystem.EncodingType.Base64,
  }).catch(() => '');

  if (!base64.trim()) {
    return null;
  }

  return {
    assetKind,
    fileName,
    mimeType,
    base64,
    uploadSessionId,
  };
}

function isRetryableMultipartUploadError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Network request failed') ||
    error.message.includes('이미지 업로드 요청을 보내지 못했습니다.') ||
    error.message.includes('이미지 업로드 요청이 시간 초과되었습니다.') ||
    error.message.includes('이미지 업로드 요청을 시작하지 못했습니다.')
  );
}

function buildTrackedUploadedImage(
  uploaded: MobileImageUploadResponse,
  assetKind: EditableImageAssetKind,
  uploadSessionId: string
): TrackedUploadedImage {
  return {
    assetKind,
    url: uploaded.url,
    path: uploaded.path,
    thumbnailPath: uploaded.thumbnailPath,
    uploadSessionId,
  };
}

async function openImageLibraryWithPermissionRecovery(
  options: ImagePicker.ImagePickerOptions
) {
  try {
    return await ImagePicker.launchImageLibraryAsync(options);
  } catch (error) {
    const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (hasMediaLibraryAccess(currentPermission)) {
      throw error;
    }

    if (!currentPermission.canAskAgain) {
      throw new Error(toMediaLibraryPermissionMessage(currentPermission));
    }

    const requestedPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!hasMediaLibraryAccess(requestedPermission)) {
      throw new Error(toMediaLibraryPermissionMessage(requestedPermission));
    }

    return ImagePicker.launchImageLibraryAsync(options);
  }
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

  const trackedUploadsRef = useRef<TrackedUploadedImage[]>([]);
  const uploadSessionIdRef = useRef(createUploadSessionId());

  const readUploadSessionId = useCallback(() => {
    const currentValue = uploadSessionIdRef.current.trim();
    if (currentValue) {
      return currentValue;
    }

    const nextValue = createUploadSessionId();
    uploadSessionIdRef.current = nextValue;
    return nextValue;
  }, []);

  const rotateUploadSessionId = useCallback(() => {
    uploadSessionIdRef.current = createUploadSessionId();
  }, []);

  const appendTrackedUploads = useCallback((entries: TrackedUploadedImage[]) => {
    if (!entries.length) {
      return;
    }

    const existingPaths = new Set(
      trackedUploadsRef.current.map((entry) => entry.path)
    );
    trackedUploadsRef.current = [
      ...trackedUploadsRef.current,
      ...entries.filter((entry) => !existingPaths.has(entry.path)),
    ];
  }, []);

  const deleteUploadedEntries = useCallback(
    async (entries: TrackedUploadedImage[]) => {
      if (!entries.length) {
        return true;
      }

      if (!session) {
        return false;
      }

      const paths = dedupePaths(
        entries.flatMap((entry) => [entry.path, entry.thumbnailPath])
      );
      if (!paths.length) {
        return true;
      }

      try {
        await deleteMobileInvitationImages(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          { paths }
        );
        return true;
      } catch {
        return false;
      }
    },
    [apiBaseUrl, session]
  );

  const uploadAsset = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
      assetKind: EditableImageAssetKind,
      uploadSessionId: string
    ) => {
      const initialMimeType =
        typeof asset.mimeType === 'string' && asset.mimeType.trim().startsWith('image/')
          ? asset.mimeType.trim()
          : 'image/jpeg';
      const uploadAssetCandidate = await optimizeAssetForUpload(asset, initialMimeType);
      const mimeType =
        typeof uploadAssetCandidate.mimeType === 'string' &&
        uploadAssetCandidate.mimeType.trim().startsWith('image/')
          ? uploadAssetCandidate.mimeType.trim()
          : initialMimeType;
      const fileName = buildUploadFileName(assetKind, mimeType);
      const formDataPayload = createFormDataUploadPayload(
        uploadAssetCandidate,
        assetKind,
        mimeType,
        fileName,
        uploadSessionId
      );
      let multipartError: unknown = null;

      if (formDataPayload) {
        try {
          return await uploadMobileInvitationImage(
            apiBaseUrl,
            session!.pageSlug,
            session!.token,
            formDataPayload
          );
        } catch (error) {
          multipartError = error;
          if (!isRetryableMultipartUploadError(error)) {
            throw error;
          }
        }
      }

      const fallbackFileSize = await getAssetFileSize(uploadAssetCandidate);
      if (
        fallbackFileSize === null ||
        fallbackFileSize > CLIENT_BASE64_FALLBACK_MAX_BYTES
      ) {
        throw new Error(
          fallbackFileSize === null
            ? '이미지 전송이 실패했고 파일 크기를 확인하지 못해 보조 전송을 중단했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
            : `이미지 전송이 실패했고 파일이 ${formatMegabytes(fallbackFileSize)}로 커서 보조 전송을 중단했습니다. 더 작은 이미지를 선택하거나 네트워크 상태를 확인해 주세요.`
        );
      }

      const base64Payload = await createBase64UploadPayload(
        uploadAssetCandidate,
        assetKind,
        mimeType,
        fileName,
        uploadSessionId
      );

      if (!base64Payload) {
        if (multipartError) {
          throw multipartError;
        }

        throw new Error(
          '이미지 파일을 읽지 못했습니다. 다른 이미지를 선택해 다시 시도해 주세요.'
        );
      }

      return uploadMobileInvitationImage(
        apiBaseUrl,
        session!.pageSlug,
        session!.token,
        base64Payload
      );
    },
    [apiBaseUrl, session]
  );

  const discardTrackedUploads = useCallback(async () => {
    const trackedUploads = trackedUploadsRef.current;
    if (!trackedUploads.length) {
      rotateUploadSessionId();
      return true;
    }

    const cleaned = await deleteUploadedEntries(trackedUploads);
    if (cleaned) {
      trackedUploadsRef.current = [];
    }

    rotateUploadSessionId();
    return cleaned;
  }, [deleteUploadedEntries, rotateUploadSessionId]);

  const finalizeTrackedUploads = useCallback(
    async (form: ManageFormState) => {
      const retainedUrls = new Set(
        [
          form.coverImageUrl,
          form.sharePreviewImageUrl,
          form.kakaoCardImageUrl,
          ...form.galleryImages,
        ]
          .map((value) => value.trim())
          .filter(Boolean)
      );
      const staleUploads = trackedUploadsRef.current.filter(
        (entry) => !retainedUrls.has(entry.url)
      );

      trackedUploadsRef.current = staleUploads;

      if (!staleUploads.length) {
        rotateUploadSessionId();
        return true;
      }

      const cleaned = await deleteUploadedEntries(staleUploads);
      if (cleaned) {
        trackedUploadsRef.current = [];
      }

      rotateUploadSessionId();
      return cleaned;
    },
    [deleteUploadedEntries, rotateUploadSessionId]
  );

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

      const selectionLimit =
        assetKind === 'gallery'
          ? Math.max(1, dashboard.page.features.maxGalleryImages - galleryPreviewItems.length)
          : 1;

      let pickerResult: ImagePicker.ImagePickerResult;
      try {
        pickerResult = await openImageLibraryWithPermissionRecovery({
          mediaTypes: 'images',
          allowsMultipleSelection: assetKind === 'gallery',
          selectionLimit,
          quality: CLIENT_IMAGE_PICKER_QUALITY,
        });
      } catch (error) {
        setNotice(toUploadErrorMessage(error));
        return;
      }

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return;
      }

      const selectedAssets = pickerResult.assets.slice(0, selectionLimit);
      const localPreviewUrls = selectedAssets
        .map((asset) => asset.uri.trim())
        .filter(Boolean);
      const uploadSessionId = readUploadSessionId();

      setUploadingImageKind(assetKind);
      setUploadProgress({
        assetKind,
        totalCount: selectedAssets.length,
        completedCount: 0,
        currentIndex: 1,
      });

      const uploadedImages: Array<{ url: string; previewUrl: string }> = [];
      const uploadedEntries: TrackedUploadedImage[] = [];

      try {
        for (const [index, asset] of selectedAssets.entries()) {
          setUploadProgress({
            assetKind,
            totalCount: selectedAssets.length,
            completedCount: index,
            currentIndex: index + 1,
          });

          const uploaded = await uploadAsset(asset, assetKind, uploadSessionId);

          uploadedImages.push({
            url: uploaded.url,
            previewUrl: uploaded.thumbnailUrl.trim() || uploaded.url,
          });
          uploadedEntries.push(
            buildTrackedUploadedImage(uploaded, assetKind, uploadSessionId)
          );

          setUploadProgress({
            assetKind,
            totalCount: selectedAssets.length,
            completedCount: index + 1,
            currentIndex: Math.min(selectedAssets.length, index + 2),
          });
        }

        if (assetKind === 'cover' || assetKind === 'share-preview' || assetKind === 'kakao-card') {
          const uploadedSingleImage = uploadedImages[0];
          if (uploadedSingleImage) {
            setForm((current) => {
              const nextPreviewUrl =
                localPreviewUrls[0] || uploadedSingleImage.previewUrl || uploadedSingleImage.url;

              if (assetKind === 'cover') {
                return {
                  ...current,
                  coverImageUrl: uploadedSingleImage.url,
                  coverImageThumbnailUrl: nextPreviewUrl,
                };
              }

              if (assetKind === 'share-preview') {
                return {
                  ...current,
                  sharePreviewImageUrl: uploadedSingleImage.url,
                  sharePreviewImageThumbnailUrl: nextPreviewUrl,
                };
              }

              return {
                ...current,
                kakaoCardImageUrl: uploadedSingleImage.url,
                kakaoCardImageThumbnailUrl: nextPreviewUrl,
              };
            });
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
        }

        appendTrackedUploads(uploadedEntries);
        setNotice('');
      } catch (error) {
        const cleanupSucceeded = await deleteUploadedEntries(uploadedEntries);
        if (!cleanupSucceeded) {
          appendTrackedUploads(uploadedEntries);
        }

        const uploadMessage = toUploadErrorMessage(error);
        setNotice(
          cleanupSucceeded
            ? uploadMessage
            : `${uploadMessage} 임시 업로드 이미지 정리도 확인이 필요합니다.`
        );
      } finally {
        setUploadingImageKind(null);
        setUploadProgress(null);
      }
    },
    [
      appendTrackedUploads,
      dashboard,
      deleteUploadedEntries,
      galleryPreviewItems.length,
      readUploadSessionId,
      session,
      setForm,
      setNotice,
      uploadAsset,
    ]
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

  const handleRemoveSingleImage = useCallback(
    (assetKind: 'cover' | 'share-preview' | 'kakao-card') => {
      setForm((current) => {
        if (assetKind === 'cover') {
          return {
            ...current,
            coverImageUrl: '',
            coverImageThumbnailUrl: '',
          };
        }

        if (assetKind === 'share-preview') {
          return {
            ...current,
            sharePreviewImageUrl: '',
            sharePreviewImageThumbnailUrl: '',
          };
        }

        return {
          ...current,
          kakaoCardImageUrl: '',
          kakaoCardImageThumbnailUrl: '',
        };
      });
    },
    [setForm]
  );

  return {
    uploadingImageKind,
    uploadProgress,
    handleUploadImage,
    handleRemoveSingleImage,
    handleMoveGalleryImage,
    handleRemoveGalleryImage,
    discardTrackedUploads,
    finalizeTrackedUploads,
  };
}
