import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AdminUser {
  uid: string;
  email: string | null;
}

export interface AuthActionResult {
  success: boolean;
  user: AuthUser | null;
  isAdmin: boolean;
  errorMessage?: string;
}

type AuthSessionSnapshot = {
  authUser: AuthUser | null;
  adminUser: AdminUser | null;
  isAdmin: boolean;
};

type FirebaseAuthUserLike = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  getIdToken: () => Promise<string>;
};

const ADMIN_SESSION_TIMEOUT_MS = 10000;

function createAdminSessionTimeoutError() {
  return new Error('관리자 권한 확인 시간이 초과되었습니다. 다시 로그인해 주세요.');
}

async function withAdminSessionTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>
) {
  const controller = new AbortController();
  let abortListener: (() => void) | null = null;
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ADMIN_SESSION_TIMEOUT_MS);

  const timeoutPromise = new Promise<never>((_, reject) => {
    abortListener = () => {
      reject(createAdminSessionTimeoutError());
    };
    controller.signal.addEventListener('abort', abortListener, { once: true });
  });

  try {
    return await Promise.race([task(controller.signal), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
    if (abortListener) {
      controller.signal.removeEventListener('abort', abortListener);
    }
  }
}

async function getAuthModules() {
  const firebase = await ensureFirebaseInit();
  const authModule = await import('firebase/auth');

  return {
    auth: firebase.auth,
    authModule,
  };
}

async function readAdminSessionResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | {
        isAdmin?: boolean;
        error?: string;
      }
    | null;

  if (response.status === 401 || response.status === 403) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '관리자 권한을 확인하지 못했습니다.'
    );
  }

  return payload?.isAdmin === true;
}

async function isUserAdmin(user: FirebaseAuthUserLike) {
  return withAdminSessionTimeout(async (signal) => {
    const idToken = await user.getIdToken();
    if (signal.aborted) {
      throw createAdminSessionTimeoutError();
    }

    const response = await fetch('/api/admin/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
      signal,
    });

    return readAdminSessionResponse(response);
  });
}

function toAuthUser(user: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
  };
}

function toAdminUser(user: { uid: string; email: string | null }): AdminUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

export async function loginFirebaseUser(
  email: string,
  password: string
): Promise<AuthActionResult> {
  if (!USE_FIREBASE) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase가 비활성화된 상태에서는 로그인할 수 없습니다.');
    }

    return {
      success: true,
      user: {
        uid: 'mock-user',
        email,
        displayName: 'Mock User',
      },
      isAdmin: true,
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

  return {
    success: true,
    user: toAuthUser(credential.user),
    isAdmin: await isUserAdmin(credential.user),
  };
}

export async function registerFirebaseUser(
  email: string,
  password: string
): Promise<AuthActionResult> {
  if (!USE_FIREBASE) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase가 비활성화된 상태에서는 회원가입할 수 없습니다.');
    }

    return {
      success: true,
      user: {
        uid: 'mock-user',
        email,
        displayName: 'Mock User',
      },
      isAdmin: true,
    };
  }

  const { auth, authModule } = await getAuthModules();
  if (!auth) {
    throw new Error('Firebase Auth가 초기화되지 않았습니다.');
  }

  const credential = await authModule.createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  return {
    success: true,
    user: toAuthUser(credential.user),
    isAdmin: await isUserAdmin(credential.user),
  };
}

export async function loginFirebaseUserWithGoogle(): Promise<AuthActionResult> {
  if (!USE_FIREBASE) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase가 비활성화된 상태에서는 Google 로그인을 사용할 수 없습니다.');
    }

    return {
      success: true,
      user: {
        uid: 'mock-google-user',
        email: 'mock@example.com',
        displayName: 'Mock Google User',
      },
      isAdmin: true,
    };
  }

  const { auth, authModule } = await getAuthModules();
  if (!auth) {
    throw new Error('Firebase Auth가 초기화되지 않았습니다.');
  }

  const provider = new authModule.GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  const credential = await authModule.signInWithPopup(auth, provider);

  return {
    success: true,
    user: toAuthUser(credential.user),
    isAdmin: await isUserAdmin(credential.user),
  };
}

export async function logoutFirebaseUser() {
  if (!USE_FIREBASE) {
    return;
  }

  const { auth, authModule } = await getAuthModules();
  if (!auth) {
    return;
  }

  await authModule.signOut(auth);
}

export async function getCurrentFirebaseIdToken() {
  if (!USE_FIREBASE) {
    return null;
  }

  const { auth } = await getAuthModules();
  if (!auth?.currentUser) {
    return null;
  }

  return auth.currentUser.getIdToken();
}

export function observeFirebaseSession(
  callback: (snapshot: AuthSessionSnapshot) => void
) {
  if (!USE_FIREBASE) {
    callback({
      authUser: null,
      adminUser: null,
      isAdmin: false,
    });

    return () => {};
  }

  let disposed = false;
  let unsubscribeAuth: (() => void) | null = null;

  void getAuthModules()
    .then(({ auth, authModule }) => {
      if (!auth || disposed) {
        if (!disposed) {
          callback({
            authUser: null,
            adminUser: null,
            isAdmin: false,
          });
        }
        return;
      }

      const unsubscribe = authModule.onAuthStateChanged(auth, async (user) => {
        if (disposed) {
          return;
        }

        if (!user) {
          callback({
            authUser: null,
            adminUser: null,
            isAdmin: false,
          });
          return;
        }

        try {
          const isAdmin = await isUserAdmin(user);
          if (disposed) {
            return;
          }

          callback({
            authUser: toAuthUser(user),
            adminUser: isAdmin ? toAdminUser(user) : null,
            isAdmin,
          });
        } catch (error) {
          console.error('[adminAuth] failed to verify signed-in user', error);
          callback({
            authUser: toAuthUser(user),
            adminUser: null,
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
      console.error('[adminAuth] failed to initialize auth session observer', error);

      if (disposed) {
        return;
      }

      callback({
        authUser: null,
        adminUser: null,
        isAdmin: false,
      });
    });

  return () => {
    disposed = true;
    unsubscribeAuth?.();
  };
}
