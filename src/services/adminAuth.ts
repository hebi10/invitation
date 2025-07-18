// 간단한 관리자 인증 서비스
export interface AdminAuth {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

class AdminAuthService implements AdminAuth {
  private authenticated = false;
  private readonly ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  constructor() {
    // 페이지 로드 시 sessionStorage에서 인증 상태 복원
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_auth');
      this.authenticated = stored === 'true';
    }
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  login(password: string): boolean {
    const isValid = password === this.ADMIN_PASSWORD;
    if (isValid) {
      this.authenticated = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_auth', 'true');
      }
    }
    return isValid;
  }

  logout(): void {
    this.authenticated = false;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_auth');
    }
  }
}

// 싱글톤 인스턴스
export const adminAuth = new AdminAuthService();

// 관리자 로그인 상태를 확인하는 React Hook
import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setIsAuthenticated(adminAuth.isAuthenticated);
  }, []);

  const login = (password: string): boolean => {
    const success = adminAuth.login(password);
    if (success) {
      setIsAuthenticated(true);
      setShowLoginModal(false);
    }
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
