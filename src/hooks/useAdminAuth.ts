import { useState, useEffect } from 'react';
import { verifyAdminPassword } from '@/services/adminAuth';

// Firestore 기반 관리자 인증 서비스
class AdminAuthService {
  private authenticated = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_auth');
      this.authenticated = stored === 'true';
    }
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  async login(password: string): Promise<boolean> {
    const isValid = await verifyAdminPassword(password);
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

const adminAuthService = new AdminAuthService();

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setIsAdmin(adminAuthService.isAuthenticated);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    const success = await adminAuthService.login(password);
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
