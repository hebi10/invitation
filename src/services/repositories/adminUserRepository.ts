import { ensureClientFirestoreState } from './clientFirestoreRepositoryCore';
import { requireTrimmedString } from './repositoryValidators';

const ADMIN_USERS_COLLECTION = 'admin-users';

export interface AdminUserRepository {
  isAvailable(): boolean;
  isEnabled(uid: string): Promise<boolean>;
}

export const adminUserRepository: AdminUserRepository = {
  isAvailable() {
    return process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
  },

  async isEnabled(uid) {
    const normalizedUid = requireTrimmedString(uid, {
      fieldLabel: 'User id',
      message: '관리자 사용자 정보가 올바르지 않습니다.',
    });
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      return false;
    }

    const snapshot = await firestore.modules.getDoc(
      firestore.modules.doc(firestore.db, ADMIN_USERS_COLLECTION, normalizedUid)
    );

    return snapshot.exists() && snapshot.data()?.enabled !== false;
  },
};
