import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';

const ADMIN_USERS_COLLECTION = 'admin-users';

export interface ServerAdminUserRepository {
  isAvailable(): boolean;
  isEnabled(uid: string): Promise<boolean>;
  listEnabledIds(): Promise<Set<string>>;
}

export const firestoreServerAdminUserRepository: ServerAdminUserRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async isEnabled(uid) {
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
  },

  async listEnabledIds() {
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
  },
};
