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

export interface DisplayPeriod {
  id?: string;
  pageSlug: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = 'display-periods';

// 노출 기간 조회
export const getDisplayPeriod = async (pageSlug: string): Promise<DisplayPeriod | null> => {
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
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      isActive: data.isActive || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('노출 기간 조회 실패:', error);
    return null;
  }
};

// 노출 기간 설정/업데이트
export const setDisplayPeriod = async (
  pageSlug: string, 
  startDate: Date, 
  endDate: Date, 
  isActive: boolean
): Promise<void> => {
  try {
    const existing = await getDisplayPeriod(pageSlug);
    const now = new Date();
    
    if (existing && existing.id) {
      // 기존 노출 기간 업데이트
      const docRef = doc(db, COLLECTION_NAME, existing.id);
      await updateDoc(docRef, {
        startDate,
        endDate,
        isActive,
        updatedAt: now
      });
    } else {
      // 새로운 노출 기간 생성
      const docRef = doc(collection(db, COLLECTION_NAME));
      await setDoc(docRef, {
        pageSlug,
        startDate,
        endDate,
        isActive,
        createdAt: now,
        updatedAt: now
      });
    }
  } catch (error) {
    console.error('노출 기간 설정 실패:', error);
    throw error;
  }
};

// 모든 노출 기간 조회 (관리자용)
export const getAllDisplayPeriods = async (): Promise<DisplayPeriod[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const periods: DisplayPeriod[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      periods.push({
        id: doc.id,
        pageSlug: data.pageSlug,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        isActive: data.isActive || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    return periods;
  } catch (error) {
    console.error('노출 기간 목록 조회 실패:', error);
    return [];
  }
};

// 페이지가 현재 노출 가능한지 확인
export const isPageVisible = async (pageSlug: string): Promise<boolean> => {
  try {
    const displayPeriod = await getDisplayPeriod(pageSlug);
    
    // 노출 기간 설정이 없거나 비활성화된 경우 항상 표시
    if (!displayPeriod || !displayPeriod.isActive) {
      return true;
    }
    
    const now = new Date();
    return now >= displayPeriod.startDate && now <= displayPeriod.endDate;
  } catch (error) {
    console.error('페이지 노출 여부 확인 실패:', error);
    // 오류 발생 시 기본적으로 표시
    return true;
  }
};

// 노출 기간 삭제
export const deleteDisplayPeriod = async (pageSlug: string): Promise<void> => {
  try {
    const existing = await getDisplayPeriod(pageSlug);
    if (existing && existing.id) {
      const docRef = doc(db, COLLECTION_NAME, existing.id);
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error('노출 기간 삭제 실패:', error);
    throw error;
  }
};
