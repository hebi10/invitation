import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

function initializeFirebaseAdmin() {
  if (!USE_FIREBASE) {
    return null;
  }

  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
      });
    }
  }

  return getFirestore();
}

let firestoreInstance: ReturnType<typeof getFirestore> | null | undefined;

export function getServerFirestore() {
  if (firestoreInstance !== undefined) {
    return firestoreInstance;
  }

  firestoreInstance = initializeFirebaseAdmin();
  return firestoreInstance;
}

