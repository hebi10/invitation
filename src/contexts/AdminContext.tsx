'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type {
  AdminUser,
  AuthActionResult,
  AuthUser,
} from '@/services/adminAuth';
import {
  loginFirebaseUser,
  loginFirebaseUserWithGoogle,
  logoutFirebaseUser,
  observeFirebaseSession,
  registerFirebaseUser,
} from '@/services/adminAuth';

export interface AdminContextType {
  adminUser: AdminUser | null;
  authUser: AuthUser | null;
  isAdminLoggedIn: boolean;
  isLoggedIn: boolean;
  isAdminLoading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string) => Promise<AuthActionResult>;
  loginWithGoogle: () => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

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

  const value = useMemo<AdminContextType>(
    () => ({
      adminUser,
      authUser,
      isAdminLoggedIn: Boolean(adminUser),
      isLoggedIn: Boolean(authUser),
      isAdminLoading,
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

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }

  return context;
}
