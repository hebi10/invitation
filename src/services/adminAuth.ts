// adminAuth.ts

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

// 관리자 인증 인터페이스 (필수는 아님, 타입 참고용)
export interface AdminAuth {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

// 관리자 인증 서비스 클래스

const ADMIN_COLLECTION = 'admin-password';
const ADMIN_DOC_ID = 'main';
// Firestore에서만 비밀번호를 관리하며, 코드에는 직접 노출하지 않음

export async function ensureAdminPasswordExists() {
  const docRef = doc(db, ADMIN_COLLECTION, ADMIN_DOC_ID);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    // 최초 생성 시, 환경변수 또는 별도 관리값을 사용하거나, 직접 Firestore에서만 관리
    await setDoc(docRef, { password: '' }); // 빈 값으로 생성 (관리자가 직접 Firestore에서 설정)
  }
}

export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  const docRef = doc(db, ADMIN_COLLECTION, ADMIN_DOC_ID);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    // Firestore에 비밀번호가 없으면 무조건 false 반환
    return false;
  }
  const data = snapshot.data();
  // Firestore에 저장된 password와 입력값 비교
  return inputPassword === data.password;
}

class AdminAuthService {
  get isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_auth') === 'true';
    }
    return false;
  }

  async login(password: string): Promise<boolean> {
    const isValid = await verifyAdminPassword(password);
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

  const login = async (password: string): Promise<boolean> => {
    const success = await adminAuth.login(password);
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
