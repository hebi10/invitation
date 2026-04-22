import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import { adminUserRepository } from '@/services/repositories/adminUserRepository';

export interface AdminUser {
  uid: string;
  email: string | null;
}

type AdminSessionSnapshot = {
  user: AdminUser | null;
  isAdmin: boolean;
};

async function getAuthModules() {
  const firebase = await ensureFirebaseInit();
  const authModule = await import('firebase/auth');

  return {
    auth: firebase.auth,
    authModule,
  };
}

async function isUserAdmin(uid: string) {
  return adminUserRepository.isEnabled(uid);
}

function toAdminUser(user: { uid: string; email: string | null }): AdminUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  if (!USE_FIREBASE) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase가 비활성화된 상태에서는 로그인할 수 없습니다.');
    }

    return {
      uid: 'mock-admin',
      email,
    };
  }

  const { auth, authModule } = await getAuthModules();
  if (!auth) {
    throw new Error('Firebase Auth가 초기화되지 않았습니다.');
  }

  const credential = await authModule.signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const admin = await isUserAdmin(credential.user.uid);
  if (!admin) {
    await authModule.signOut(auth);
    throw new Error('관리자 권한이 없는 계정입니다.');
  }

  return toAdminUser(credential.user);
}

export async function logoutAdmin() {
  if (!USE_FIREBASE) {
    return;
  }

  const { auth, authModule } = await getAuthModules();
  if (!auth) {
    return;
  }

  await authModule.signOut(auth);
}

export function observeAdminSession(
  callback: (snapshot: AdminSessionSnapshot) => void
) {
  if (!USE_FIREBASE) {
    callback({
      user: null,
      isAdmin: false,
    });

    return () => {};
  }

  let disposed = false;
  let unsubscribeAuth: (() => void) | null = null;

  void getAuthModules()
    .then(({ auth, authModule }) => {
      if (!auth || disposed) {
        return;
      }

      const unsubscribe = authModule.onAuthStateChanged(auth, async (user) => {
        if (disposed) {
          return;
        }

        if (!user) {
          callback({
            user: null,
            isAdmin: false,
          });
          return;
        }

        try {
          const admin = await isUserAdmin(user.uid);
          if (disposed) {
            return;
          }

          callback({
            user: admin ? toAdminUser(user) : null,
            isAdmin: admin,
          });
        } catch (error) {
          console.error('[adminAuth] failed to verify admin user', error);
          callback({
            user: null,
            isAdmin: false,
          });
        }
      });

      if (disposed) {
        unsubscribe();
        return;
      }

      unsubscribeAuth = unsubscribe;
    })
    .catch((error) => {
      console.error('[adminAuth] failed to initialize admin session observer', error);

      if (disposed) {
        return;
      }

      callback({
        user: null,
        isAdmin: false,
      });
    });

  return () => {
    disposed = true;
    unsubscribeAuth?.();
  };
}
