import type { MemoryPage } from '@/types/memoryPage';

import { ensureClientFirestoreState } from './clientFirestoreRepositoryCore';
import { requireTrimmedString } from './repositoryValidators';

const MEMORY_PAGES_COLLECTION = 'memory-pages';

export interface MemoryPageRepository {
  isAvailable(): boolean;
  findByPageSlug(pageSlug: string): Promise<Partial<MemoryPage> | null>;
  listAll(): Promise<Array<{ pageSlug: string; data: Partial<MemoryPage> }>>;
  save(memoryPage: MemoryPage): Promise<void>;
  deleteByPageSlug(pageSlug: string): Promise<void>;
}

export const memoryPageRepository: MemoryPageRepository = {
  isAvailable() {
    return process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
  },

  async findByPageSlug(pageSlug) {
    const normalizedPageSlug = requireTrimmedString(pageSlug, {
      fieldLabel: 'Page slug',
      message: '추억 페이지 주소가 필요합니다.',
    });
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      return null;
    }

    const snapshot = await firestore.modules.getDoc(
      firestore.modules.doc(firestore.db, MEMORY_PAGES_COLLECTION, normalizedPageSlug)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data();
  },

  async listAll() {
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      return [];
    }

    const snapshot = await firestore.modules.getDocs(
      firestore.modules.collection(firestore.db, MEMORY_PAGES_COLLECTION)
    );

    return snapshot.docs.map((docSnapshot: { id: string; data: () => Partial<MemoryPage> }) => ({
      pageSlug: docSnapshot.id,
      data: docSnapshot.data(),
    }));
  },

  async save(memoryPage) {
    const normalizedPageSlug = requireTrimmedString(memoryPage.pageSlug, {
      fieldLabel: 'Page slug',
      message: '추억 페이지 주소가 필요합니다.',
    });
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      throw new Error('Firestore가 초기화되지 않았습니다.');
    }

    await firestore.modules.setDoc(
      firestore.modules.doc(firestore.db, MEMORY_PAGES_COLLECTION, normalizedPageSlug),
      memoryPage
    );
  },

  async deleteByPageSlug(pageSlug) {
    const normalizedPageSlug = requireTrimmedString(pageSlug, {
      fieldLabel: 'Page slug',
      message: '추억 페이지 주소가 필요합니다.',
    });
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      throw new Error('Firestore가 초기화되지 않았습니다.');
    }

    await firestore.modules.deleteDoc(
      firestore.modules.doc(firestore.db, MEMORY_PAGES_COLLECTION, normalizedPageSlug)
    );
  },
};
