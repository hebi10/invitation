import {
  getEditableImageUploadHint,
  type EditableImageAssetKind,
  validateEditableImageBatch,
  validateEditableImageFile,
} from '@/lib/imageUploadPolicy';
import {
  optimizeUploadImage,
  type OptimizeUploadImageOptions,
} from '@/utils/imageCompression';
import type { FirebaseStorage, StorageReference } from 'firebase/storage';

export interface UploadedImage {
  name: string;
  url: string;
  path: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  uploadedAt: Date;
}

export type PageEditorImageAssetKind = EditableImageAssetKind;

interface UploadImageOptions {
  preserveFileName?: boolean;
  assetKind?: PageEditorImageAssetKind;
  variant?: 'original' | 'thumbnail';
}

interface GetImagesByPageOptions {
  allowListing?: boolean;
}

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
const imageCache = new Map<string, UploadedImage[]>();
const storageDownloadUrlCache = new Map<string, string>();
const CACHE_DURATION = 5 * 60 * 1000;
const THUMBNAIL_FILE_PREFIX = 'thumb-';

type FirebaseStorageModule = typeof import('firebase/storage');

let firebaseModules: {
  storage: FirebaseStorage;
  ref: FirebaseStorageModule['ref'];
  uploadBytes: FirebaseStorageModule['uploadBytes'];
  getDownloadURL: FirebaseStorageModule['getDownloadURL'];
  deleteObject: FirebaseStorageModule['deleteObject'];
  listAll: FirebaseStorageModule['listAll'];
} | null = null;

const initFirebase = async () => {
  if (typeof window === 'undefined' || !USE_FIREBASE || firebaseModules) {
    return;
  }

  try {
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      const [firebaseModule, storageModule] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/storage'),
      ]);

      const initializedStorage = firebaseModule.storage;
      if (initializedStorage) {
        firebaseModules = {
          storage: initializedStorage,
          ref: storageModule.ref,
          uploadBytes: storageModule.uploadBytes,
          getDownloadURL: storageModule.getDownloadURL,
          deleteObject: storageModule.deleteObject,
          listAll: storageModule.listAll,
        };
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      retries += 1;
    }

    throw new Error('Firebase storage initialization timeout');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
};

export async function getStorageDownloadUrl(storagePath: string): Promise<string | null> {
  const normalizedStoragePath = storagePath.trim();

  if (!normalizedStoragePath) {
    return null;
  }

  if (
    normalizedStoragePath.startsWith('http://') ||
    normalizedStoragePath.startsWith('https://') ||
    normalizedStoragePath.startsWith('/')
  ) {
    return normalizedStoragePath;
  }

  const cached = storageDownloadUrlCache.get(normalizedStoragePath);
  if (cached) {
    return cached;
  }

  if (!USE_FIREBASE) {
    return null;
  }

  await initFirebase();

  if (!firebaseModules?.storage) {
    return null;
  }

  try {
    const storageRef = firebaseModules.ref(
      firebaseModules.storage,
      normalizedStoragePath
    );
    const downloadUrl = await firebaseModules.getDownloadURL(storageRef);
    storageDownloadUrlCache.set(normalizedStoragePath, downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.warn('[imageService] failed to resolve storage path', normalizedStoragePath, error);
    return null;
  }
}

function sanitizeFileNameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildStoredFileName(
  fileName: string,
  options: UploadImageOptions = {}
) {
  if (options.preserveFileName !== false) {
    return fileName;
  }

  const extensionIndex = fileName.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? sanitizeFileNameSegment(fileName.slice(extensionIndex + 1)) : '';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const prefix = sanitizeFileNameSegment(options.assetKind ?? 'image') || 'image';

  return extension
    ? `${prefix}-${timestamp}-${randomSuffix}.${extension}`
    : `${prefix}-${timestamp}-${randomSuffix}`;
}

function buildUploadMetadata(
  pageSlug: string,
  sourceFile: File,
  options: UploadImageOptions = {}
) {
  const metadata: Record<string, string> = {
    pageSlug,
    originalFileName: sourceFile.name,
  };

  if (options.assetKind) {
    metadata.assetKind = options.assetKind;
  }

  if (options.variant) {
    metadata.variant = options.variant;
  }

  return {
    contentType: sourceFile.type || 'image/jpeg',
    customMetadata: metadata,
  };
}

function buildThumbnailFileName(fileName: string) {
  return `${THUMBNAIL_FILE_PREFIX}${fileName}`;
}

function buildThumbnailImagePath(path: string) {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    return '';
  }

  const segments = normalizedPath.split('/');
  const fileName = segments.pop();

  if (!fileName) {
    return '';
  }

  if (fileName.startsWith(THUMBNAIL_FILE_PREFIX)) {
    return normalizedPath;
  }

  return [...segments, buildThumbnailFileName(fileName)].join('/');
}

function isThumbnailFileName(fileName: string) {
  return fileName.startsWith(THUMBNAIL_FILE_PREFIX);
}

function supportsThumbnailVariant(assetKind?: PageEditorImageAssetKind) {
  return assetKind !== 'favicon';
}

function resolveUploadOptimizationOptions(
  assetKind: PageEditorImageAssetKind | undefined,
  variant: 'original' | 'thumbnail'
): OptimizeUploadImageOptions {
  if (assetKind === 'favicon') {
    return {
      maxWidth: 256,
      maxHeight: 256,
      quality: 0.82,
      maxBytes: 180 * 1024,
    };
  }

  if (
    assetKind === 'cover' ||
    assetKind === 'share-preview' ||
    assetKind === 'kakao-card'
  ) {
    return variant === 'thumbnail'
      ? {
          maxWidth: 960,
          maxHeight: 960,
          quality: 0.72,
          maxBytes: 280 * 1024,
        }
      : {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
          maxBytes: 1.2 * 1024 * 1024,
        };
  }

  if (assetKind === 'gallery') {
    return variant === 'thumbnail'
      ? {
          maxWidth: 720,
          maxHeight: 720,
          quality: 0.7,
          maxBytes: 200 * 1024,
        }
      : {
          maxWidth: 1400,
          maxHeight: 1400,
          quality: 0.78,
          maxBytes: 900 * 1024,
        };
  }

  return variant === 'thumbnail'
    ? {
        maxWidth: 720,
        maxHeight: 720,
        quality: 0.72,
        maxBytes: 220 * 1024,
      }
    : {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        maxBytes: 1.2 * 1024 * 1024,
      };
}

async function createUploadFiles(
  file: File,
  assetKind?: PageEditorImageAssetKind
) {
  const [originalFile, thumbnailFile] = await Promise.all([
    optimizeUploadImage(file, resolveUploadOptimizationOptions(assetKind, 'original')),
    supportsThumbnailVariant(assetKind)
      ? optimizeUploadImage(file, resolveUploadOptimizationOptions(assetKind, 'thumbnail'))
      : Promise.resolve<File | null>(null),
  ]);

  return {
    originalFile,
    thumbnailFile:
      thumbnailFile && thumbnailFile.size < originalFile.size ? thumbnailFile : null,
  };
}

function extractPageSlugFromImagePath(imagePath: string) {
  const segments = imagePath.trim().split('/');
  if (segments.length < 3) {
    return '';
  }

  return segments[1] ?? '';
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '이미지 업로드에 실패했습니다.'
    );
  }

  return payload as T;
}

export const uploadImage = async (
  file: File,
  pageSlug: string,
  options: UploadImageOptions = {}
): Promise<UploadedImage> => {
  const validationError = validateEditableImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const { originalFile, thumbnailFile } = await createUploadFiles(file, options.assetKind);
  const storedFileName = buildStoredFileName(originalFile.name, options);
  const thumbnailFileName = thumbnailFile ? buildThumbnailFileName(storedFileName) : '';
  const imagePath = `wedding-images/${pageSlug}/${storedFileName}`;
  const thumbnailPath = thumbnailFile
    ? `wedding-images/${pageSlug}/${thumbnailFileName}`
    : '';

  if (!USE_FIREBASE) {
    return {
      name: storedFileName,
      url: `/images/${storedFileName}`,
      path: imagePath,
      thumbnailUrl: `/images/${storedFileName}`,
      thumbnailPath: thumbnailPath || imagePath,
      uploadedAt: new Date(),
    };
  }

  await initFirebase();

  if (!firebaseModules?.storage) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const imageRef = firebaseModules.ref(firebaseModules.storage, imagePath);
    const thumbnailRef =
      thumbnailFile && thumbnailPath
        ? firebaseModules.ref(firebaseModules.storage, thumbnailPath)
        : null;

    const [snapshot, thumbnailSnapshot] = await Promise.all([
      firebaseModules.uploadBytes(
        imageRef,
        originalFile,
        buildUploadMetadata(pageSlug, originalFile, { ...options, variant: 'original' })
      ),
      thumbnailRef && thumbnailFile
        ? firebaseModules.uploadBytes(
            thumbnailRef,
            thumbnailFile,
            buildUploadMetadata(pageSlug, thumbnailFile, {
              ...options,
              variant: 'thumbnail',
            })
          )
        : Promise.resolve(null),
    ]);
    const [downloadURL, thumbnailUrl] = await Promise.all([
      firebaseModules.getDownloadURL(snapshot.ref),
      thumbnailSnapshot
        ? firebaseModules.getDownloadURL(thumbnailSnapshot.ref)
        : Promise.resolve<string | null>(null),
    ]);

    imageCache.delete(pageSlug);

    return {
      name: storedFileName,
      url: downloadURL,
      path: imagePath,
      thumbnailUrl: thumbnailUrl ?? downloadURL,
      thumbnailPath: thumbnailPath || imagePath,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error('이미지 업로드 중 오류 발생:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
};

export const uploadPageEditorImage = async (
  file: File,
  pageSlug: string,
  assetKind: PageEditorImageAssetKind
) =>
  uploadImage(file, pageSlug, {
    preserveFileName: false,
    assetKind,
  });

export type EditableImageUploadRole = 'admin' | 'client';

export async function uploadEditablePageImage(
  file: File,
  pageSlug: string,
  assetKind: PageEditorImageAssetKind,
  role: EditableImageUploadRole
) {
  if (role === 'admin') {
    return uploadPageEditorImage(file, pageSlug, assetKind);
  }

  return uploadClientEditorImage(file, pageSlug, assetKind);
}

export async function uploadClientEditorImage(
  file: File,
  pageSlug: string,
  assetKind: PageEditorImageAssetKind
) {
  const validationError = validateEditableImageBatch([file], assetKind);
  if (validationError) {
    throw new Error(validationError);
  }

  const { originalFile, thumbnailFile } = await createUploadFiles(file, assetKind);
  const formData = new FormData();
  formData.append('assetKind', assetKind);
  formData.append('file', originalFile, originalFile.name);
  if (thumbnailFile) {
    formData.append('thumbnail', thumbnailFile, thumbnailFile.name);
  }

  const response = await readJsonResponse<{
    name: string;
    url: string;
    path: string;
    thumbnailUrl?: string;
    thumbnailPath?: string;
    uploadedAt: string;
  }>(
    await fetch(`/api/client-editor/pages/${encodeURIComponent(pageSlug)}/images`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    })
  );

  return {
    ...response,
    uploadedAt: new Date(response.uploadedAt),
  };
}

export {
  getEditableImageUploadHint,
  validateEditableImageBatch,
};

export type { EditableImageAssetKind };

export const getImagesByPage = async (
  pageSlug: string,
  options: GetImagesByPageOptions = {}
): Promise<UploadedImage[]> => {
  if (options.allowListing === false) {
    return [];
  }

  const cachedData = imageCache.get(pageSlug);
  if (cachedData) {
    return cachedData;
  }

  if (!USE_FIREBASE) {
    return [];
  }

  await initFirebase();

  if (!firebaseModules?.storage) {
    console.warn('Firebase가 초기화되지 않았습니다.');
    return [];
  }

  try {
    const imagesRef = firebaseModules.ref(
      firebaseModules.storage,
      `wedding-images/${pageSlug}`
    );
    const imagesList = await firebaseModules.listAll(imagesRef);
    const thumbnailRefs = new Map<string, StorageReference>();
    const originalImageRefs = imagesList.items.filter((imageRef) => {
      if (!isThumbnailFileName(imageRef.name)) {
        return true;
      }

      thumbnailRefs.set(imageRef.name.replace(THUMBNAIL_FILE_PREFIX, ''), imageRef);
      return false;
    });

    const images: UploadedImage[] = await Promise.all(
      originalImageRefs.map(async (imageRef) => {
        const thumbnailRef = thumbnailRefs.get(imageRef.name);
        const [url, thumbnailUrl] = await Promise.all([
          firebaseModules!.getDownloadURL(imageRef),
          thumbnailRef
            ? firebaseModules!
                .getDownloadURL(thumbnailRef)
                .catch(() => null)
            : Promise.resolve<string | null>(null),
        ]);
        return {
          name: imageRef.name,
          url,
          path: imageRef.fullPath,
          thumbnailUrl: thumbnailUrl ?? url,
          thumbnailPath: thumbnailRef?.fullPath ?? imageRef.fullPath,
          uploadedAt: new Date(),
        };
      })
    );

    const sortedImages = images.sort(
      (left, right) => left.uploadedAt.getTime() - right.uploadedAt.getTime()
    );

    imageCache.set(pageSlug, sortedImages);

    setTimeout(() => {
      imageCache.delete(pageSlug);
    }, CACHE_DURATION);

    return sortedImages;
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    if (
      errorCode === 'storage/unauthorized' ||
      errorCode === 'permission-denied' ||
      errorCode === 'unauthorized'
    ) {
      console.warn('이미지 목록 조회 권한이 없어 빈 목록으로 처리합니다.', {
        pageSlug,
        errorCode,
      });
      return [];
    }

    console.warn('이미지 목록 조회 중 오류 발생:', error);
    return [];
  }
};

export const deleteImage = async (imagePath: string): Promise<void> => {
  if (!USE_FIREBASE) {
    console.log('Mock: 이미지 삭제 요청:', imagePath);
    return;
  }

  await initFirebase();

  if (!firebaseModules?.storage) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const imageRef = firebaseModules.ref(firebaseModules.storage, imagePath);
    await firebaseModules.deleteObject(imageRef);

    const thumbnailPath = buildThumbnailImagePath(imagePath);
    if (thumbnailPath && thumbnailPath !== imagePath) {
      const thumbnailRef = firebaseModules.ref(firebaseModules.storage, thumbnailPath);
      await firebaseModules.deleteObject(thumbnailRef).catch(() => undefined);
    }

    const pageSlug = extractPageSlugFromImagePath(imagePath);
    if (pageSlug) {
      imageCache.delete(pageSlug);
    }
  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    throw new Error('이미지 삭제에 실패했습니다.');
  }
};

export const getAllPageImages = async (): Promise<{
  [pageSlug: string]: UploadedImage[];
}> => {
  if (!USE_FIREBASE) {
    return {};
  }

  await initFirebase();

  if (!firebaseModules?.storage) {
    console.warn('Firebase가 초기화되지 않았습니다.');
    return {};
  }

  try {
    const allImagesRef = firebaseModules.ref(firebaseModules.storage, 'wedding-images');
    const pagesList = await firebaseModules.listAll(allImagesRef);
    const allPageImages: { [pageSlug: string]: UploadedImage[] } = {};

    await Promise.all(
      pagesList.prefixes.map(async (pageRef) => {
        const pageSlug = pageRef.name;
        const pageImages = await getImagesByPage(pageSlug);
        allPageImages[pageSlug] = pageImages;
      })
    );

    return allPageImages;
  } catch (error) {
    console.error('전체 이미지 목록 조회 중 오류 발생:', error);
    return {};
  }
};

export const getPageImages = async (
  pageSlug: string,
  options: GetImagesByPageOptions = {}
): Promise<UploadedImage[]> => getImagesByPage(pageSlug, options);
