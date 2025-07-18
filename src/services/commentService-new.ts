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
  orderBy: any;
  serverTimestamp: any;
  Timestamp: any;
} | null = null;

const initFirestore = async () => {
  if (typeof window === 'undefined' || !USE_FIREBASE || firestoreModules) {
    return;
  }

  try {
    const [firebaseModule, firestoreModule] = await Promise.all([
      import('@/lib/firebase'),
      import('firebase/firestore')
    ]);

    firestoreModules = {
      db: firebaseModule.db,
      collection: firestoreModule.collection,
      addDoc: firestoreModule.addDoc,
      getDocs: firestoreModule.getDocs,
      deleteDoc: firestoreModule.deleteDoc,
      doc: firestoreModule.doc,
      query: firestoreModule.query,
      orderBy: firestoreModule.orderBy,
      serverTimestamp: firestoreModule.serverTimestamp,
      Timestamp: firestoreModule.Timestamp
    };
  } catch (error) {
    console.warn('Firestore initialization failed:', error);
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
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    await firestoreModules.addDoc(firestoreModules.collection(firestoreModules.db, 'comments'), {
      ...commentData,
      createdAt: firestoreModules.serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw new Error('댓글 추가에 실패했습니다.');
  }
}

// 특정 페이지의 댓글 가져오기
export async function getComments(pageSlug: string): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    // Mock 데이터 반환
    return MOCK_COMMENTS[pageSlug] || [];
  }

  await initFirestore();
  
  if (!firestoreModules?.db) {
    console.warn('Firestore가 초기화되지 않았습니다. Mock 데이터를 반환합니다.');
    return MOCK_COMMENTS[pageSlug] || [];
  }

  try {
    const q = firestoreModules.query(
      firestoreModules.collection(firestoreModules.db, 'comments'),
      firestoreModules.orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await firestoreModules.getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.pageSlug === pageSlug) {
        comments.push({
          id: doc.id,
          author: data.author,
          message: data.message,
          createdAt: data.createdAt instanceof firestoreModules!.Timestamp ? data.createdAt.toDate() : new Date(),
          pageSlug: data.pageSlug
        });
      }
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    // Firestore 오류 시 Mock 데이터 반환
    return MOCK_COMMENTS[pageSlug] || [];
  }
}

// 댓글 삭제 (관리자만)
export async function deleteComment(commentId: string): Promise<void> {
  if (!USE_FIREBASE) {
    // Mock comment deletion for development
    Object.keys(MOCK_COMMENTS).forEach(pageSlug => {
      MOCK_COMMENTS[pageSlug] = MOCK_COMMENTS[pageSlug].filter(comment => comment.id !== commentId);
    });
    console.log('Mock: 댓글 삭제됨:', commentId);
    return;
  }

  await initFirestore();
  
  if (!firestoreModules?.db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    await firestoreModules.deleteDoc(firestoreModules.doc(firestoreModules.db, 'comments', commentId));
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
    const q = firestoreModules.query(
      firestoreModules.collection(firestoreModules.db, 'comments'),
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
    console.error('Error getting all comments:', error);
    // Firestore 오류 시 Mock 데이터 반환
    const allComments: Comment[] = [];
    Object.values(MOCK_COMMENTS).forEach(pageComments => {
      allComments.push(...pageComments);
    });
    return allComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
