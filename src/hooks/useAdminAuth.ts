import { useState, useEffect } from 'react';

// 간단한 관리자 인증 서비스
class AdminAuthService {
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
const adminAuthService = new AdminAuthService();

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setIsAdmin(adminAuthService.isAuthenticated);
  }, []);

  const login = (password: string): boolean => {
    const success = adminAuthService.login(password);
    if (success) {
      setIsAdmin(true);
      setShowLoginModal(false);
    }
    return success;
  };

  const logout = () => {
    adminAuthService.logout();
    setIsAdmin(false);
  };

  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);

  return {
    isAdmin,
    login,
    logout,
    showLoginModal,
    openLoginModal,
    closeLoginModal
  };
}
