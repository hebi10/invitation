// Dynamic import로 Firebase 모듈 로드 (클라이언트 사이드 전용)
let firebaseStorage: any = null;

// 클라이언트 사이드에서만 Firebase Storage 모듈 로드
if (typeof window !== 'undefined') {
  import('firebase/storage').then((module) => {
    firebaseStorage = module;
  }).catch((error) => {
    console.log('Firebase storage import failed:', error);
  });
}

export interface UploadedImage {
  name: string;
  url: string;
  path: string;
  uploadedAt: Date;
}

// Firebase 사용 여부 확인
const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

// Mock 데이터
const mockImages: { [pageSlug: string]: UploadedImage[] } = {
  'shin-minje-kim-hyunji': [
    {
      name: 'sample1.jpg',
      url: '/placeholder-wedding-1.jpg',
      path: 'wedding-images/shin-minje-kim-hyunji/sample1.jpg',
      uploadedAt: new Date()
    },
    {
      name: 'sample2.jpg', 
      url: '/placeholder-wedding-2.jpg',
      path: 'wedding-images/shin-minje-kim-hyunji/sample2.jpg',
      uploadedAt: new Date()
    }
  ],
  'lee-junho-park-somin': [
    {
      name: 'sample3.jpg',
      url: '/placeholder-wedding-3.jpg',
      path: 'wedding-images/lee-junho-park-somin/sample3.jpg',
      uploadedAt: new Date()
    }
  ],
  'kim-taehyun-choi-yuna': []
};

// 이미지 업로드
export async function uploadImage(file: File, pageSlug: string): Promise<UploadedImage> {
  if (!USE_FIREBASE) {
    // Mock 업로드
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const mockImage: UploadedImage = {
      name: fileName,
      url: URL.createObjectURL(file),
      path: `wedding-images/${pageSlug}/${fileName}`,
      uploadedAt: new Date()
    };
    
    if (!mockImages[pageSlug]) {
      mockImages[pageSlug] = [];
    }
    mockImages[pageSlug].push(mockImage);
    
    return mockImage;
  }
  
  try {
    // Firebase Storage 연결 확인
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    
    // 파일명에 타임스탬프 추가로 중복 방지
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const imagePath = `wedding-images/${pageSlug}/${fileName}`;
    
    const imageRef = ref(storage, imagePath);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      name: fileName,
      url: downloadURL,
      path: imagePath,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    // 네트워크 오류인 경우 특별한 메시지
    if (error instanceof Error && error.message.includes('network')) {
      throw new Error('네트워크 연결을 확인해주세요.');
    }
    throw new Error('이미지 업로드에 실패했습니다.');
  }
}

// 특정 페이지의 이미지 목록 가져오기
export async function getPageImages(pageSlug: string): Promise<UploadedImage[]> {
  if (!USE_FIREBASE) {
    // Mock 데이터 반환
    return mockImages[pageSlug] || [];
  }
  
  try {
    if (!storage) {
      console.warn('Firebase Storage not initialized, returning empty array');
      return [];
    }
    
    const imagesRef = ref(storage, `wedding-images/${pageSlug}`);
    const imagesList = await listAll(imagesRef);
    
    const images: UploadedImage[] = [];
    
    for (const imageRef of imagesList.items) {
      try {
        const url = await getDownloadURL(imageRef);
        images.push({
          name: imageRef.name,
          url: url,
          path: imageRef.fullPath,
          uploadedAt: new Date() // 실제로는 메타데이터에서 가져올 수 있음
        });
      } catch (imageError) {
        console.error(`Error getting download URL for ${imageRef.name}:`, imageError);
        // 개별 이미지 오류는 무시하고 계속 진행
      }
    }
    
    return images.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting page images:', error);
    // 네트워크 오류시 빈 배열 반환
    return [];
  }
}

// 이미지 삭제
export async function deleteImage(imagePath: string): Promise<void> {
  if (!USE_FIREBASE) {
    // Mock 삭제
    Object.keys(mockImages).forEach(pageSlug => {
      mockImages[pageSlug] = mockImages[pageSlug].filter(img => img.path !== imagePath);
    });
    return;
  }
  
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('이미지 삭제에 실패했습니다.');
  }
}

// 모든 이미지 가져오기 (관리자용)
export async function getAllImages(): Promise<{ [pageSlug: string]: UploadedImage[] }> {
  if (!USE_FIREBASE) {
    // Mock 데이터 반환
    return { ...mockImages };
  }
  
  try {
    const allImagesRef = ref(storage, 'wedding-images');
    const pagesList = await listAll(allImagesRef);
    
    const allImages: { [pageSlug: string]: UploadedImage[] } = {};
    
    for (const folderRef of pagesList.prefixes) {
      const pageSlug = folderRef.name;
      const pageImages = await getPageImages(pageSlug);
      allImages[pageSlug] = pageImages;
    }
    
    return allImages;
  } catch (error) {
    console.error('Error getting all images:', error);
    return {};
  }
}
