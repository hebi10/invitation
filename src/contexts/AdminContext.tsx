'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AdminContextType {
  isAdminLoggedIn: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    // 페이지 로드 시 로그인 상태 확인
    const adminAuth = localStorage.getItem('admin_auth');
    if (adminAuth === 'true') {
      setIsAdminLoggedIn(true);
    }
  }, []);

  const login = async (password: string): Promise<boolean> => {
    // Firestore 기반 인증
    const { verifyAdminPassword, ensureAdminPasswordExists } = await import('@/services/adminAuth');
    await ensureAdminPasswordExists();
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setIsAdminLoggedIn(true);
      localStorage.setItem('admin_auth', 'true');
    }
    return isValid;
  };

  const logout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('admin_auth');
  };

  return (
    <AdminContext.Provider value={{ isAdminLoggedIn, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
