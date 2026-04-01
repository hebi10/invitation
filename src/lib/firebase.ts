import { getPublicFirebaseConfig } from './publicRuntimeConfig';

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

  const firebaseConfig = getPublicFirebaseConfig();

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export async function ensureFirebaseInit() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized in the browser.');
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
