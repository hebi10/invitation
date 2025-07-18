// src/libs/firebase.ts - 클라이언트 사이드 전용
let app: any = null;
let db: any = null;
let storage: any = null;
let analytics: any = null;
let initPromise: Promise<void> | null = null;

// Firebase 초기화 함수
const initFirebase = async () => {
  if (typeof window === 'undefined') {
    console.log('[Firebase] 서버 사이드에서는 초기화하지 않음');
    return;
  }

  console.log('[Firebase] 초기화 시작...');
  
  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const { getStorage } = await import('firebase/storage');
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "invitation-35d60.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "invitation-35d60",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "invitation-35d60.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "939850286607",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:939850286607:web:ab59f53d84478107ad857a",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EJ4YQHQ4XT",
    };

    console.log('[Firebase] Firebase 앱 초기화 중...');
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    console.log('[Firebase] Firebase 앱 초기화 완료');
    
    // Firestore 초기화
    console.log('[Firebase] Firestore 초기화 중...');
    db = getFirestore(app);
    console.log('[Firebase] Firestore 초기화 완료');
    
    // Storage 초기화
    console.log('[Firebase] Storage 초기화 중...');
    storage = getStorage(app);
    console.log('[Firebase] Storage 초기화 완료');

    console.log('[Firebase] 모든 초기화 완료');
  } catch (error) {
    console.error('[Firebase] 초기화 실패:', error);
    throw error;
  }
};

// Firebase 초기화 보장 함수
export const ensureFirebaseInit = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Firebase는 클라이언트 사이드에서만 사용할 수 있습니다.');
  }

  if (!initPromise && process.env.NEXT_PUBLIC_USE_FIREBASE === 'true') {
    initPromise = initFirebase();
  }

  if (initPromise) {
    await initPromise;
  }

  return { app, db, storage };
};

// 클라이언트 사이드에서만 자동 초기화
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE === 'true') {
  ensureFirebaseInit().catch(console.error);
}

export { app, analytics, db, storage };
