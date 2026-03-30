let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let initPromise: Promise<void> | null = null;

export const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

async function initFirebase() {
  if (typeof window === 'undefined') {
    return;
  }

  const { initializeApp, getApp, getApps } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const { getFirestore } = await import('firebase/firestore');
  const { getStorage } = await import('firebase/storage');

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'invitation-35d60.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'invitation-35d60',
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'invitation-35d60.firebasestorage.app',
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '939850286607',
    appId:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:939850286607:web:ab59f53d84478107ad857a',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-EJ4YQHQ4XT',
  };

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export async function ensureFirebaseInit() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase는 브라우저 런타임에서만 초기화할 수 있습니다.');
  }

  if (!USE_FIREBASE) {
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
    };
  }

  if (!initPromise) {
    initPromise = initFirebase();
  }

  await initPromise;

  return {
    app,
    auth,
    db,
    storage,
  };
}

if (typeof window !== 'undefined' && USE_FIREBASE) {
  void ensureFirebaseInit().catch((error) => {
    console.error('[firebase] initialization failed', error);
  });
}

export { app, auth, db, storage };
