import 'server-only';

import { getServerFirestore } from './firebaseAdmin';

const ADMIN_USERS_COLLECTION = 'admin-users';

export async function isServerAdminUserEnabled(uid: string) {
  const normalizedUid = uid.trim();
  if (!normalizedUid) {
    return false;
  }

  const db = getServerFirestore();
  if (!db) {
    return false;
  }

  const snapshot = await db.collection(ADMIN_USERS_COLLECTION).doc(normalizedUid).get();
  return snapshot.exists && snapshot.data()?.enabled !== false;
}

export async function listServerAdminUserIds() {
  const db = getServerFirestore();
  if (!db) {
    return new Set<string>();
  }

  const snapshot = await db.collection(ADMIN_USERS_COLLECTION).get();
  return new Set(
    snapshot.docs
      .filter((docSnapshot) => docSnapshot.data()?.enabled !== false)
      .map((docSnapshot) => docSnapshot.id.trim())
      .filter(Boolean)
  );
}
