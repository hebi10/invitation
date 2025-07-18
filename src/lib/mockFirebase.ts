// Mock Firebase for development
export const mockFirebase = {
  // Mock Firestore
  db: null,
  
  // Mock Storage  
  storage: null,
  
  // Mock Analytics
  analytics: null,
  
  // Mock app
  app: null
};

// 환경 변수로 Firebase 사용 여부 결정
const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

export { USE_FIREBASE };
