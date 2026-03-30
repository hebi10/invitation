'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { AdminUser } from '@/services/adminAuth';
import { loginAdmin, logoutAdmin, observeAdminSession } from '@/services/adminAuth';

export interface AdminContextType {
  adminUser: AdminUser | null;
  isAdminLoggedIn: boolean;
  isAdminLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAdminSession((snapshot) => {
      setAdminUser(snapshot.isAdmin ? snapshot.user : null);
      setIsAdminLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AdminContextType>(
    () => ({
      adminUser,
      isAdminLoggedIn: Boolean(adminUser),
      isAdminLoading,
      login: async (email: string, password: string) => {
        try {
          const user = await loginAdmin(email, password);
          setAdminUser(user);
          return true;
        } catch (error) {
          console.error('[AdminProvider] login failed', error);
          setAdminUser(null);
          return false;
        }
      },
      logout: async () => {
        await logoutAdmin();
        setAdminUser(null);
      },
    }),
    [adminUser, isAdminLoading]
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
