'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { addComment, getComments, deleteComment, Comment } from '@/services/commentService';
import styles from './Guestbook.module.css';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook({ pageSlug }: GuestbookProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { isAdminLoggedIn } = useAdmin();

  // 댓글 불러오기
  useEffect(() => {
    loadComments();
  }, [pageSlug]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const fetchedComments = await getComments(pageSlug);
      setComments(fetchedComments);
    } catch (error) {
      setError('댓글을 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!author.trim() || !message.trim()) {
      setError('이름과 메시지를 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await addComment({
        author: author.trim(),
        message: message.trim(),
        pageSlug
      });

      // 폼 초기화
      setAuthor('');
      setMessage('');
      
      // 댓글 목록 새로고침
      await loadComments();
    } catch (error) {
      setError('댓글 작성에 실패했습니다. 다시 시도해주세요.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (error) {
      setError('댓글 삭제에 실패했습니다.');
      console.error(error);
    }
  };

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>축하 메시지</h2>
      </div>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="author">이름</label>
          <input
            className={styles.input}
            id="author"
            type="text"
            value={author}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)}
            placeholder="이름을 입력하세요"
            disabled={isSubmitting}
            required
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="message">메시지</label>
          <textarea
            className={styles.textarea}
            id="message"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            placeholder="축하 메시지를 남겨주세요..."
            disabled={isSubmitting}
            required
          />
        </div>
        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? '등록 중...' : '메시지 남기기'}
        </button>
      </form>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.commentsList}>
        {isLoading ? (
          <p className={styles.loadingMessage}>댓글을 불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className={styles.loadingMessage}>아직 작성된 메시지가 없습니다. 첫 번째 축하 메시지를 남겨보세요!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAuthor}>{comment.author}</span>
                <span className={styles.commentDate}>
                  {comment.createdAt.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {isAdminLoggedIn && (
                    <button 
                      className={styles.deleteButton} 
                      onClick={() => handleDelete(comment.id)}
                    >
                      삭제
                    </button>
                  )}
                </span>
              </div>
              <p className={styles.commentMessage}>{comment.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
