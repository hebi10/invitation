export interface Comment {
  id: string;
  author: string;
  message: string;
  createdAt: Date;
  pageSlug: string;
}

export interface CommentInput {
  author: string;
  message: string;
  pageSlug: string;
}

// Firebase 사용 여부 확인
const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

// Dynamic Firebase imports
let firestoreModules: {
  db: any;
  collection: any;
  addDoc: any;
  getDocs: any;
  deleteDoc: any;
  doc: any;
  query: any;
  where: any;
  orderBy: any;
  serverTimestamp: any;
  Timestamp: any;
} | null = null;

const initFirestore = async () => {

  if (typeof window === 'undefined' || !USE_FIREBASE || firestoreModules) {
    console.log('[commentService] initFirestore 조기 종료');
    return;
  }

  try {
    const { ensureFirebaseInit } = await import('@/lib/firebase');
    await ensureFirebaseInit();
    
    const [firebaseModule, firestoreModule] = await Promise.all([
      import('@/lib/firebase'),
      import('firebase/firestore')
    ]);

    if (firebaseModule.db) {
      firestoreModules = {
        db: firebaseModule.db,
        collection: firestoreModule.collection,
        addDoc: firestoreModule.addDoc,
        getDocs: firestoreModule.getDocs,
        deleteDoc: firestoreModule.deleteDoc,
        doc: firestoreModule.doc,
        query: firestoreModule.query,
        where: firestoreModule.where,
        orderBy: firestoreModule.orderBy,
        serverTimestamp: firestoreModule.serverTimestamp,
        Timestamp: firestoreModule.Timestamp
      };
      return;
    } else {
      throw new Error('Firebase db is null after initialization');
    }
  } catch (error) {
    console.error('[commentService] Firestore initialization failed:', error);
    throw error;
  }
};

// Mock 댓글 데이터
const MOCK_COMMENTS: { [pageSlug: string]: Comment[] } = {
  "guestbook": [
    {
      id: "mock-1",
      author: "김철수",
      message: "축하드립니다! 행복하세요 💕",
      createdAt: new Date('2024-01-15T10:30:00'),
      pageSlug: "guestbook"
    },
    {
      id: "mock-2", 
      author: "이영희",
      message: "정말 멋진 결혼식이었어요! 두 분 모두 축하해요 🎉",
      createdAt: new Date('2024-01-14T15:20:00'),
      pageSlug: "guestbook"
    },
    {
      id: "mock-3",
      author: "박민수",
      message: "오래오래 행복하게 살아요~ 축하합니다!",
      createdAt: new Date('2024-01-13T09:45:00'),
      pageSlug: "guestbook"
    }
  ]
};

// 댓글 추가
export async function addComment(commentData: CommentInput): Promise<void> {
  if (!USE_FIREBASE) {
    // Mock comment addition for development
    const newComment: Comment = {
      id: `mock-${Date.now()}`,
      ...commentData,
      createdAt: new Date()
    };
    
    if (!MOCK_COMMENTS[commentData.pageSlug]) {
      MOCK_COMMENTS[commentData.pageSlug] = [];
    }
    MOCK_COMMENTS[commentData.pageSlug].unshift(newComment);
    console.log('Mock: 댓글 추가됨:', newComment);
    return;
  }

  await initFirestore();
  
  if (!firestoreModules?.db) {
    console.error('[commentService] Firestore가 초기화되지 않았습니다.');
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    console.log('[commentService] Firestore에 댓글 추가 시도...');
    console.log('[commentService] 추가할 데이터:', {
      ...commentData,
      createdAt: 'serverTimestamp()'
    });
    
    // 페이지별 컬렉션 이름 생성 (예: comments-kim-taehyun-choi-yuna)
    const collectionName = `comments-${commentData.pageSlug}`;
    
    const docRef = await firestoreModules.addDoc(
      firestoreModules.collection(firestoreModules.db, collectionName), 
      {
        author: commentData.author,
        message: commentData.message,
        pageSlug: commentData.pageSlug,
        createdAt: firestoreModules.serverTimestamp()
      }
    );
  } catch (error: any) {
    console.error('[commentService] Error adding comment:', error);
    console.error('[commentService] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    // 더 구체적인 오류 메시지 제공
    if (error?.code === 'permission-denied') {
      throw new Error(`권한이 거부되었습니다: ${error.message}`);
    } else if (error?.code === 'unavailable') {
      throw new Error(`Firebase 서비스에 연결할 수 없습니다: ${error.message}`);
    } else if (error?.code === 'failed-precondition') {
      throw new Error(`데이터베이스 사전 조건 실패: ${error.message}`);
    } else {
      throw new Error(`댓글 추가에 실패했습니다: ${error?.message || error}`);
    }
  }
}

// 특정 페이지의 댓글 가져오기
export async function getComments(pageSlug: string): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    // Mock 데이터 반환
    console.log('[commentService] Mock 모드 - 데이터 반환');
    return MOCK_COMMENTS[pageSlug] || [];
  }

  await initFirestore();
  
  if (!firestoreModules?.db) {
    console.warn('[commentService] Firestore가 초기화되지 않았습니다. Mock 데이터를 반환합니다.');
    return MOCK_COMMENTS[pageSlug] || [];
  }

  try {
    // 페이지별 컬렉션 이름 생성 (예: comments-kim-taehyun-choi-yuna)
    const collectionName = `comments-${pageSlug}`;
    
    const q = firestoreModules.query(
      firestoreModules.collection(firestoreModules.db, collectionName),
      firestoreModules.orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await firestoreModules.getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      
      comments.push({
        id: doc.id,
        author: data.author,
        message: data.message,
        createdAt: data.createdAt instanceof firestoreModules!.Timestamp ? data.createdAt.toDate() : new Date(),
        pageSlug: data.pageSlug
      });
    });
    
    return comments;
  } catch (error) {
    console.error('[commentService] Error getting comments:', error);
    // Firestore 오류 시 Mock 데이터 반환
    console.log('[commentService] 오류로 인해 Mock 데이터 반환');
    return MOCK_COMMENTS[pageSlug] || [];
  }
}

// 댓글 삭제 (관리자만)
export async function deleteComment(commentId: string, pageSlug: string): Promise<void> {
  if (!USE_FIREBASE) {
    // Mock comment deletion for development
    if (MOCK_COMMENTS[pageSlug]) {
      MOCK_COMMENTS[pageSlug] = MOCK_COMMENTS[pageSlug].filter(comment => comment.id !== commentId);
    }
    console.log('Mock: 댓글 삭제됨:', commentId);
    return;
  }

  await initFirestore();
  
  if (!firestoreModules?.db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    // 페이지별 컬렉션 이름 생성
    const collectionName = `comments-${pageSlug}`;
    await firestoreModules.deleteDoc(firestoreModules.doc(firestoreModules.db, collectionName, commentId));
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('댓글 삭제에 실패했습니다.');
  }
}

// 모든 댓글 가져오기 (관리자용)
export async function getAllComments(): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    // Mock 데이터 반환
    const allComments: Comment[] = [];
    Object.values(MOCK_COMMENTS).forEach(pageComments => {
      allComments.push(...pageComments);
    });
    return allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  await initFirestore();
  
  if (!firestoreModules?.db) {
    console.warn('Firestore가 초기화되지 않았습니다. Mock 데이터를 반환합니다.');
    const allComments: Comment[] = [];
    Object.values(MOCK_COMMENTS).forEach(pageComments => {
      allComments.push(...pageComments);
    });
    return allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  try {
    // 모든 페이지별 컬렉션에서 댓글 가져오기
    const pageNames = ['kim-taehyun-choi-yuna', 'shin-minje-kim-hyunji', 'lee-junho-park-somin'];
    const allComments: Comment[] = [];
    
    for (const pageName of pageNames) {
      const collectionName = `comments-${pageName}`;
      
      try {
        const q = firestoreModules.query(
          firestoreModules.collection(firestoreModules.db, collectionName),
          firestoreModules.orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await firestoreModules.getDocs(q);
        
        querySnapshot.forEach((doc: any) => {
          const data = doc.data();
          allComments.push({
            id: doc.id,
            author: data.author,
            message: data.message,
            createdAt: data.createdAt instanceof firestoreModules!.Timestamp ? data.createdAt.toDate() : new Date(),
            pageSlug: data.pageSlug
          });
        });
      } catch (collectionError) {
        console.log(`컬렉션 ${collectionName}이 존재하지 않거나 접근할 수 없습니다:`, collectionError);
        // 컬렉션이 없어도 계속 진행
      }
    }
    
    // 전체 댓글을 날짜순으로 정렬
    return allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error getting all comments:', error);
    // Firestore 오류 시 Mock 데이터 반환
    const allComments: Comment[] = [];
    Object.values(MOCK_COMMENTS).forEach(pageComments => {
      allComments.push(...pageComments);
    });
    return allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
