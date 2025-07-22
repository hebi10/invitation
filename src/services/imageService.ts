export interface UploadedImage {
  name: string;
  url: string;
  path: string;
  uploadedAt: Date;
}

// Firebase 사용 여부 확인
const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

// Dynamic Firebase imports
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
    // Firebase가 초기화될 때까지 잠시 대기
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      const [firebaseModule, storageModule] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/storage')
      ]);

      // Firebase가 초기화되었는지 확인
      if (firebaseModule.storage) {
        firebaseModules = {
          storage: firebaseModule.storage,
          ref: storageModule.ref,
          uploadBytes: storageModule.uploadBytes,
          getDownloadURL: storageModule.getDownloadURL,
          deleteObject: storageModule.deleteObject,
          listAll: storageModule.listAll
        };
        return;
      }
      
      // 100ms 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    throw new Error('Firebase storage initialization timeout');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
};

// 목록 페이지용 이미지 목데이터 (Firebase 전용 모드에서는 사용하지 않음)
const MOCK_IMAGE_CATEGORIES = {};

export const uploadImage = async (file: File, pageSlug: string): Promise<UploadedImage> => {
  if (!USE_FIREBASE) {
    // Mock upload for development
    const mockImage: UploadedImage = {
      name: file.name,
      url: `/images/${file.name}`,
      path: `wedding-images/${pageSlug}/${file.name}`,
      uploadedAt: new Date()
    };
    return mockImage;
  }

  await initFirebase();
  
  if (!firebaseModules?.storage) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const imagePath = `wedding-images/${pageSlug}/${file.name}`;
    const imageRef = firebaseModules.ref(firebaseModules.storage, imagePath);
    const snapshot = await firebaseModules.uploadBytes(imageRef, file);
    const downloadURL = await firebaseModules.getDownloadURL(snapshot.ref);

    return {
      name: file.name,
      url: downloadURL,
      path: imagePath,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('이미지 업로드 중 오류 발생:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
};

export const getImagesByPage = async (pageSlug: string): Promise<UploadedImage[]> => {
  if (!USE_FIREBASE) {
    // Firebase가 비활성화된 경우 빈 배열 반환
    return [];
  }

  await initFirebase();
  
  if (!firebaseModules?.storage) {
    console.warn('Firebase가 초기화되지 않았습니다.');
    return [];
  }

  try {
    const imagesRef = firebaseModules.ref(firebaseModules.storage, `wedding-images/${pageSlug}`);
    const imagesList = await firebaseModules.listAll(imagesRef);

    const images: UploadedImage[] = await Promise.all(
      imagesList.items.map(async (imageRef: any) => {
        const url = await firebaseModules!.getDownloadURL(imageRef);
        return {
          name: imageRef.name,
          url,
          path: imageRef.fullPath,
          uploadedAt: new Date(imageRef.timeCreated || Date.now())
        };
      })
    );

    return images.sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  } catch (error) {
    console.error('이미지 목록 조회 중 오류 발생:', error);
    // Firebase 오류 시 빈 배열 반환
    return [];
  }
};

export const deleteImage = async (imagePath: string): Promise<void> => {
  if (!USE_FIREBASE) {
    // Mock delete for development
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

export const getAllPageImages = async (): Promise<{ [pageSlug: string]: UploadedImage[] }> => {
  if (!USE_FIREBASE) {
    // Firebase가 비활성화된 경우 빈 객체 반환
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
    // Firebase 오류 시 빈 객체 반환
    return {};
  }
};

// 특정 페이지의 이미지 가져오기 (public 함수)
export const getPageImages = async (pageSlug: string): Promise<UploadedImage[]> => {
  return await getImagesByPage(pageSlug);
};
