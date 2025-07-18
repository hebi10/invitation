// src/libs/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator, disableNetwork, enableNetwork } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "invitation-35d60.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "invitation-35d60",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "invitation-35d60.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "939850286607",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:939850286607:web:ab59f53d84478107ad857a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EJ4YQHQ4XT",
};

// 환경 변수 검증 (콘솔 로그 제거)
if (!firebaseConfig.projectId) {
  console.error('Firebase projectId is missing. Check your .env.local file.');
  throw new Error('Firebase projectId is required');
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore 초기화
const db = getFirestore(app);

// Firestore 네트워크 연결 비활성화 (오류 방지)
if (typeof window !== 'undefined') {
  disableNetwork(db).catch(() => {
    // 네트워크 비활성화 실패시 무시
    console.log('Firestore network already disabled or unavailable');
  });
}

// Storage 초기화
const storage = getStorage(app);

// 개발 환경에서 오류 무시
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // 개발 환경에서는 오류를 최소화
  console.log('Firebase initialized in development mode');
}

// analytics는 브라우저 환경에서만 호출(SSR 에러 방지)
let analytics: ReturnType<typeof getAnalytics> | undefined;
// Analytics 비활성화 (오류 방지)
// if (typeof window !== "undefined") {
//   isSupported().then((supported) => {
//     if (supported) analytics = getAnalytics(app);
//   }).catch((error) => {
//     console.log('Analytics not supported:', error);
//   });
// }

export { app, analytics, db, storage };
