'use client';

import { useMemo, type ReactNode } from 'react';

import AppQueryProvider from '@/app/AppQueryProvider';
import {
  AdminSessionProvider,
  ExperienceProvider,
  useExperience,
} from '@/contexts';
import type { AdminContextType } from '@/contexts/AdminContext';
import type { AuthUser } from '@/services/adminAuth';

const demoAuthUser: AuthUser = {
  uid: 'demo-experience-user',
  email: 'experience@example.invalid',
  displayName: '체험 사용자',
  emailVerified: true,
};

function ExperienceAuthProvider({ children }: { children: ReactNode }) {
  const { session, endExperience } = useExperience();
  const value = useMemo<AdminContextType>(() => {
    const isAdmin = session.role === 'admin';
    const adminUser = isAdmin
      ? { uid: demoAuthUser.uid, email: demoAuthUser.email }
      : null;
    const unavailable = async () => ({
      success: false as const,
      user: demoAuthUser,
      isAdmin,
      errorMessage: '체험 모드에서는 실제 로그인 기능을 실행하지 않습니다.',
    });

    return {
      adminUser,
      authUser: demoAuthUser,
      isAdminLoggedIn: isAdmin,
      isLoggedIn: true,
      isAdminLoading: false,
      supportsInteractiveAuth: false,
      login: unavailable,
      register: unavailable,
      loginWithGoogle: unavailable,
      sendVerificationEmail: async () => ({
        success: false,
        user: demoAuthUser,
        errorMessage: '체험 모드에서는 실제 인증 메일을 보내지 않습니다.',
      }),
      refreshSession: async () => ({
        authUser: demoAuthUser,
        adminUser,
        isAdmin,
      }),
      logout: endExperience,
    };
  }, [endExperience, session.role]);

  return <AdminSessionProvider value={value}>{children}</AdminSessionProvider>;
}

export default function ExperienceAppProviders({ children }: { children: ReactNode }) {
  return (
    <AppQueryProvider>
      <ExperienceProvider>
        <ExperienceAuthProvider>{children}</ExperienceAuthProvider>
      </ExperienceProvider>
    </AppQueryProvider>
  );
}
