// adminAuth.ts

import { useState, useEffect } from 'react';

// 관리자 인증 인터페이스 (필수는 아님, 타입 참고용)
export interface AdminAuth {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

// 관리자 인증 서비스 클래스
class AdminAuthService {
  private readonly ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  get isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_auth') === 'true';
    }
    return false;
  }

  login(password: string): boolean {
    const isValid = password === this.ADMIN_PASSWORD;
    if (isValid && typeof window !== 'undefined') {
      sessionStorage.setItem('admin_auth', 'true');
    }
    return isValid;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_auth');
    }
  }
}

// 싱글톤 인스턴스 (한 번만 선언!!)
export const adminAuth = new AdminAuthService();

// 관리자 로그인 상태를 확인하는 React Hook
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 최초 마운트 시 인증상태 반영 + 다른 탭 동기화 (storage 이벤트)
  useEffect(() => {
    setIsAuthenticated(adminAuth.isAuthenticated);

    const syncAuth = () => setIsAuthenticated(adminAuth.isAuthenticated);
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const login = (password: string): boolean => {
    const success = adminAuth.login(password);
    setIsAuthenticated(adminAuth.isAuthenticated); // 항상 최신값 반영
    if (success) setShowLoginModal(false);
    return success;
  };

  const logout = () => {
    adminAuth.logout();
    setIsAuthenticated(false);
  };

  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);

  return {
    isAuthenticated,
    login,
    logout,
    showLoginModal,
    openLoginModal,
    closeLoginModal
  };
}
