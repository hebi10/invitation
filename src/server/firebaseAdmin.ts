import 'server-only';

import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.GCLOUD_PROJECT ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  undefined;
const FIREBASE_STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ??
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
  undefined;

function hasServiceAccountJson() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function hasApplicationDefaultCredentials() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function resolveApplicationDefaultCredentialsPath() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!credentialsPath) {
    return null;
  }

  return path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);
}

function sanitizeApplicationDefaultCredentials() {
  const resolvedPath = resolveApplicationDefaultCredentialsPath();

  if (!resolvedPath) {
    return;
  }

  if (existsSync(resolvedPath)) {
    return;
  }

  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

function isManagedGoogleRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.K_REVISION ||
      process.env.FUNCTION_TARGET ||
      process.env.FIREBASE_CONFIG ||
      process.env.GAE_ENV
  );
}

function initializeFirebaseAdminApp() {
  if (!USE_FIREBASE) {
    return null;
  }

  sanitizeApplicationDefaultCredentials();

  if (getApps().length > 0) {
    return getApps()[0] ?? null;
  }

  try {
    if (hasServiceAccountJson()) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id ?? FIREBASE_PROJECT_ID,
        storageBucket:
          serviceAccount.storage_bucket ?? FIREBASE_STORAGE_BUCKET ?? undefined,
      });
      return getApps()[0] ?? null;
    }

    if (hasApplicationDefaultCredentials() || isManagedGoogleRuntime()) {
      initializeApp({
        credential: applicationDefault(),
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: FIREBASE_STORAGE_BUCKET,
      });
      return getApps()[0] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

let firebaseAdminApp: App | null | undefined;
let firestoreInstance: ReturnType<typeof getFirestore> | null | undefined;

export function getServerFirebaseAdminApp() {
  if (firebaseAdminApp !== undefined) {
    return firebaseAdminApp;
  }

  firebaseAdminApp = initializeFirebaseAdminApp();
  return firebaseAdminApp;
}

export function getServerFirestore() {
  if (firestoreInstance !== undefined) {
    return firestoreInstance;
  }

  const app = getServerFirebaseAdminApp();
  firestoreInstance = app ? getFirestore(app) : null;
  return firestoreInstance;
}

export function getServerStorageBucketName() {
  return FIREBASE_STORAGE_BUCKET ?? null;
}

export function getServerStorageBucket() {
  const app = getServerFirebaseAdminApp();
  const bucketName = getServerStorageBucketName();

  if (!app || !bucketName) {
    return null;
  }

  return getStorage(app).bucket(bucketName);
}
