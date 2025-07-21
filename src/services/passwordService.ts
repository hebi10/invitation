import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ClientPassword {
  id?: string;
  pageSlug: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = 'client-passwords';

// 기본 비밀번호 생성
export const initializeDefaultPassword = async (pageSlug: string): Promise<string> => {
  try {
    const existing = await getClientPassword(pageSlug);
    if (existing) {
      return existing.password;
    }

    const defaultPassword = '1234';
    await setClientPassword(pageSlug, defaultPassword);
    return defaultPassword;
  } catch (error) {
    console.error('기본 비밀번호 초기화 실패:', error);
    return '1234'; // 실패시 기본값 반환
  }
};

// 클라이언트 비밀번호 조회
export const getClientPassword = async (pageSlug: string): Promise<ClientPassword | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('pageSlug', '==', pageSlug)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      pageSlug: data.pageSlug,
      password: data.password,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('비밀번호 조회 실패:', error);
    return null;
  }
};

// 클라이언트 비밀번호 설정/업데이트
export const setClientPassword = async (pageSlug: string, password: string): Promise<void> => {
  try {
    const existing = await getClientPassword(pageSlug);
    const now = new Date();
    
    if (existing && existing.id) {
      // 기존 비밀번호 업데이트
      const docRef = doc(db, COLLECTION_NAME, existing.id);
      await updateDoc(docRef, {
        password,
        updatedAt: now
      });
    } else {
      // 새 비밀번호 생성
      await addDoc(collection(db, COLLECTION_NAME), {
        pageSlug,
        password,
        createdAt: now,
        updatedAt: now
      });
    }
  } catch (error) {
    console.error('비밀번호 설정 실패:', error);
    throw error;
  }
};

// 모든 클라이언트 비밀번호 조회 (관리자용)
export const getAllClientPasswords = async (): Promise<ClientPassword[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        pageSlug: data.pageSlug,
        password: data.password,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error('전체 비밀번호 조회 실패:', error);
    return [];
  }
};

// 클라이언트 비밀번호 삭제
export const deleteClientPassword = async (pageSlug: string): Promise<void> => {
  try {
    const existing = await getClientPassword(pageSlug);
    if (existing && existing.id) {
      await deleteDoc(doc(db, COLLECTION_NAME, existing.id));
    }
  } catch (error) {
    console.error('비밀번호 삭제 실패:', error);
    throw error;
  }
};

// 비밀번호 검증
export const verifyClientPassword = async (pageSlug: string, inputPassword: string): Promise<boolean> => {
  try {
    const clientPassword = await getClientPassword(pageSlug);
    if (!clientPassword) {
      // 비밀번호가 없으면 기본값으로 초기화하고 검증
      const defaultPassword = await initializeDefaultPassword(pageSlug);
      return inputPassword === defaultPassword;
    }
    
    return inputPassword === clientPassword.password;
  } catch (error) {
    console.error('비밀번호 검증 실패:', error);
    return false;
  }
};
