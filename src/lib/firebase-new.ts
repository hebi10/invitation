// src/libs/firebase.ts - 클라이언트 사이드 전용
let app: any = null;
let db: any = null;
let storage: any = null;
let analytics: any = null;

// 클라이언트 사이드에서만 Firebase 초기화
if (typeof window !== 'undefined') {
  const initFirebase = async () => {
    try {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getFirestore, disableNetwork } = await import('firebase/firestore');
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

      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      storage = getStorage(app);

      // Firestore 네트워크 비활성화 (오류 방지)
      try {
        await disableNetwork(db);
      } catch (error) {
        console.log('Firestore network already disabled');
      }

      console.log('Firebase initialized successfully (client-side only)');
    } catch (error) {
      console.log('Firebase initialization failed:', error);
    }
  };

  // Firebase 사용이 활성화된 경우에만 초기화
  if (process.env.NEXT_PUBLIC_USE_FIREBASE === 'true') {
    initFirebase();
  }
}

export { app, analytics, db, storage };
