import { optimizeUploadImage } from '@/utils/imageCompression';

export interface UploadedImage {
  name: string;
  url: string;
  path: string;
  uploadedAt: Date;
}

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
const imageCache = new Map<string, UploadedImage[]>();
const CACHE_DURATION = 5 * 60 * 1000;

let firebaseModules: {
  storage: any;
  ref: any;
  uploadBytes: any;
  getDownloadURL: any;
  deleteObject: any;
  listAll: any;
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

      if (firebaseModule.storage) {
        firebaseModules = {
          storage: firebaseModule.storage,
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

export const uploadImage = async (
  file: File,
  pageSlug: string
): Promise<UploadedImage> => {
  const optimizedFile = await optimizeUploadImage(file, {
    maxWidth: 2200,
    maxHeight: 2200,
    quality: 0.82,
  });

  if (!USE_FIREBASE) {
    return {
      name: optimizedFile.name,
      url: `/images/${optimizedFile.name}`,
      path: `wedding-images/${pageSlug}/${optimizedFile.name}`,
      uploadedAt: new Date(),
    };
  }

  await initFirebase();

  if (!firebaseModules?.storage) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const imagePath = `wedding-images/${pageSlug}/${optimizedFile.name}`;
    const imageRef = firebaseModules.ref(firebaseModules.storage, imagePath);
    const snapshot = await firebaseModules.uploadBytes(imageRef, optimizedFile);
    const downloadURL = await firebaseModules.getDownloadURL(snapshot.ref);

    return {
      name: optimizedFile.name,
      url: downloadURL,
      path: imagePath,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error('이미지 업로드 중 오류 발생:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
};

export const getImagesByPage = async (
  pageSlug: string
): Promise<UploadedImage[]> => {
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

    const images: UploadedImage[] = await Promise.all(
      imagesList.items.map(async (imageRef: any) => {
        const url = await firebaseModules!.getDownloadURL(imageRef);
        return {
          name: imageRef.name,
          url,
          path: imageRef.fullPath,
          uploadedAt: new Date(imageRef.timeCreated || Date.now()),
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
    console.error('이미지 목록 조회 중 오류 발생:', error);
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
      pagesList.prefixes.map(async (pageRef: any) => {
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

export const getPageImages = async (pageSlug: string): Promise<UploadedImage[]> =>
  getImagesByPage(pageSlug);
