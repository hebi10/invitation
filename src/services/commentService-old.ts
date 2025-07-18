import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// 댓글 추가
export async function addComment(commentData: CommentInput): Promise<void> {
  try {
    await addDoc(collection(db, 'comments'), {
      ...commentData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw new Error('댓글 추가에 실패했습니다.');
  }
}

// 특정 페이지의 댓글 가져오기
export async function getComments(pageSlug: string): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.pageSlug === pageSlug) {
        comments.push({
          id: doc.id,
          author: data.author,
          message: data.message,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          pageSlug: data.pageSlug
        });
      }
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw new Error('댓글을 불러오는데 실패했습니다.');
  }
}

// 댓글 삭제 (관리자만)
export async function deleteComment(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('댓글 삭제에 실패했습니다.');
  }
}

// 모든 댓글 가져오기 (관리자용)
export async function getAllComments(): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        author: data.author,
        message: data.message,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        pageSlug: data.pageSlug
      });
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting all comments:', error);
    throw new Error('모든 댓글을 불러오는데 실패했습니다.');
  }
}
