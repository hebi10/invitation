import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.GCLOUD_PROJECT ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  undefined;

function hasServiceAccountJson() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function hasApplicationDefaultCredentials() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
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

function initializeFirebaseAdmin() {
  if (!USE_FIREBASE) {
    return null;
  }

  if (getApps().length > 0) {
    return getFirestore();
  }

  try {
    if (hasServiceAccountJson()) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id ?? FIREBASE_PROJECT_ID,
      });
      return getFirestore();
    }

    if (hasApplicationDefaultCredentials() || isManagedGoogleRuntime()) {
      initializeApp({
        credential: applicationDefault(),
        projectId: FIREBASE_PROJECT_ID,
      });
      return getFirestore();
    }

    return null;
  } catch {
    return null;
  }
}

let firestoreInstance: ReturnType<typeof getFirestore> | null | undefined;

export function getServerFirestore() {
  if (firestoreInstance !== undefined) {
    return firestoreInstance;
  }

  firestoreInstance = initializeFirebaseAdmin();
  return firestoreInstance;
}
