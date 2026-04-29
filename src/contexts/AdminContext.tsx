'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type {
  AdminUser,
  AuthActionResult,
  AuthSessionSnapshot,
  AuthUser,
  EmailVerificationActionResult,
} from '@/services/adminAuth';
import {
  loginFirebaseUser,
  loginFirebaseUserWithGoogle,
  logoutFirebaseUser,
  observeFirebaseSession,
  refreshCurrentFirebaseSession,
  registerFirebaseUser,
  sendCurrentUserEmailVerification,
} from '@/services/adminAuth';

export interface AdminContextType {
  adminUser: AdminUser | null;
  authUser: AuthUser | null;
  isAdminLoggedIn: boolean;
  isLoggedIn: boolean;
  isAdminLoading: boolean;
  supportsInteractiveAuth: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string) => Promise<AuthActionResult>;
  loginWithGoogle: () => Promise<AuthActionResult>;
  sendVerificationEmail: () => Promise<EmailVerificationActionResult>;
  refreshSession: () => Promise<AuthSessionSnapshot>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const unavailableAuthResult: AuthActionResult = {
  success: false,
  user: null,
  isAdmin: false,
  errorMessage: '이 화면에서는 로그인을 지원하지 않습니다.',
};

const unavailableEmailVerificationResult: EmailVerificationActionResult = {
  success: false,
  user: null,
  errorMessage: '현재 화면에서는 인증 메일을 보낼 수 없습니다.',
};

const unavailableSessionSnapshot: AuthSessionSnapshot = {
  authUser: null,
  adminUser: null,
  isAdmin: false,
};

const anonymousAdminContextValue: AdminContextType = {
  adminUser: null,
  authUser: null,
  isAdminLoggedIn: false,
  isLoggedIn: false,
  isAdminLoading: false,
  supportsInteractiveAuth: false,
  login: async () => unavailableAuthResult,
  register: async () => unavailableAuthResult,
  loginWithGoogle: async () => unavailableAuthResult,
  sendVerificationEmail: async () => unavailableEmailVerificationResult,
  refreshSession: async () => unavailableSessionSnapshot,
  logout: async () => {},
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeFirebaseSession((snapshot) => {
      setAuthUser(snapshot.authUser);
      setAdminUser(snapshot.adminUser);
      setIsAdminLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    let cancelled = false;
    const refreshSession = async () => {
      try {
        const snapshot = await refreshCurrentFirebaseSession();
        if (cancelled) {
          return;
        }

        setAuthUser(snapshot.authUser);
        setAdminUser(snapshot.adminUser);
      } catch (error) {
        console.error('[AdminProvider] session refresh failed', error);
      }
    };

    const handleFocus = () => {
      void refreshSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authUser]);

  const value = useMemo<AdminContextType>(
    () => ({
      adminUser,
      authUser,
      isAdminLoggedIn: Boolean(adminUser),
      isLoggedIn: Boolean(authUser),
      isAdminLoading,
      supportsInteractiveAuth: true,
      login: async (email: string, password: string) => {
        try {
          const result = await loginFirebaseUser(email, password);
          setAuthUser(result.user);
          setAdminUser(result.isAdmin && result.user ? {
            uid: result.user.uid,
            email: result.user.email,
          } : null);
          return result;
        } catch (error) {
          console.error('[AdminProvider] email login failed', error);
          setAuthUser(null);
          setAdminUser(null);
          return {
            success: false,
            user: null,
            isAdmin: false,
            errorMessage:
              error instanceof Error ? error.message : '로그인에 실패했습니다.',
          };
        }
      },
      register: async (email: string, password: string) => {
        try {
          const result = await registerFirebaseUser(email, password);
          setAuthUser(result.user);
          setAdminUser(result.isAdmin && result.user ? {
            uid: result.user.uid,
            email: result.user.email,
          } : null);
          return result;
        } catch (error) {
          console.error('[AdminProvider] register failed', error);
          setAuthUser(null);
          setAdminUser(null);
          return {
            success: false,
            user: null,
            isAdmin: false,
            errorMessage:
              error instanceof Error ? error.message : '회원가입에 실패했습니다.',
          };
        }
      },
      loginWithGoogle: async () => {
        try {
          const result = await loginFirebaseUserWithGoogle();
          setAuthUser(result.user);
          setAdminUser(result.isAdmin && result.user ? {
            uid: result.user.uid,
            email: result.user.email,
          } : null);
          return result;
        } catch (error) {
          console.error('[AdminProvider] google login failed', error);
          setAuthUser(null);
          setAdminUser(null);
          return {
            success: false,
            user: null,
            isAdmin: false,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Google 로그인에 실패했습니다.',
          };
        }
      },
      sendVerificationEmail: async () => {
        try {
          const result = await sendCurrentUserEmailVerification();
          if (result.user) {
            setAuthUser(result.user);
          }
          return result;
        } catch (error) {
          console.error('[AdminProvider] verification email resend failed', error);
          return {
            success: false,
            user: authUser,
            errorMessage:
              error instanceof Error
                ? error.message
                : '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
          };
        }
      },
      refreshSession: async () => {
        try {
          const snapshot = await refreshCurrentFirebaseSession();
          setAuthUser(snapshot.authUser);
          setAdminUser(snapshot.adminUser);
          return snapshot;
        } catch (error) {
          console.error('[AdminProvider] session refresh failed', error);
          return {
            authUser,
            adminUser,
            isAdmin: Boolean(adminUser),
          };
        }
      },
      logout: async () => {
        await logoutFirebaseUser();
        setAuthUser(null);
        setAdminUser(null);
      },
    }),
    [adminUser, authUser, isAdminLoading]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function AnonymousAdminProvider({ children }: { children: ReactNode }) {
  return (
    <AdminContext.Provider value={anonymousAdminContextValue}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }

  return context;
}
