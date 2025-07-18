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
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const COMMENTS_PER_PAGE = 5;

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
      await deleteComment(commentId, pageSlug);
      await loadComments();
    } catch (error) {
      setError('댓글 삭제에 실패했습니다.');
      console.error(error);
    }
  };

  // 페이징 계산
  const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
  const endIndex = startIndex + COMMENTS_PER_PAGE;
  const currentComments = comments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <span className={styles.titleIcon}>💝</span>
          <h2 className={styles.title}>축하 메시지</h2>
          <span className={styles.titleIcon}>💝</span>
        </div>
        <p className={styles.subtitle}>
          저희의 소중한 날을 함께 축하해 주세요
        </p>
      </div>
      
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <span className={styles.formIcon}>✨</span>
          <h3 className={styles.formTitle}>따뜻한 마음을 전해주세요</h3>
        </div>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="author">
              <span className={styles.labelIcon}>👤</span>
              이름
            </label>
            <input
              className={styles.input}
              id="author"
              type="text"
              value={author}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)}
              placeholder="성함을 입력해 주세요"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="message">
              <span className={styles.labelIcon}>💌</span>
              축하 메시지
            </label>
            <textarea
              className={styles.textarea}
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="진심 어린 축하 메시지를 남겨주세요...&#10;&#10;예시:&#10;• 결혼을 진심으로 축하드립니다!&#10;• 평생 행복하시길 바라요&#10;• 사랑이 가득한 가정 이루시길"
              disabled={isSubmitting}
              required
              rows={5}
            />
          </div>
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            <span className={styles.buttonIcon}>
              {isSubmitting ? '⏳' : '💝'}
            </span>
            {isSubmitting ? '등록 중...' : '축하 메시지 보내기'}
          </button>
        </form>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.commentsList}>
        {isLoading ? (
          <p className={styles.loadingMessage}>댓글을 불러오는 중...</p>
        ) : comments.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💌</span>
            <p className={styles.emptyMessage}>
              아직 작성된 메시지가 없습니다
            </p>
            <p className={styles.emptySubMessage}>
              첫 번째 축하 메시지의 주인공이 되어주세요!
            </p>
          </div>
        ) : (
          <>
            <div className={styles.commentsHeader}>
              <div className={styles.commentsCountSection}>
                <span className={styles.commentsIcon}>💝</span>
                <span className={styles.commentsCount}>
                  총 <strong>{comments.length}개</strong>의 축하 메시지
                </span>
              </div>
              {totalPages > 1 && (
                <span className={styles.pageInfo}>
                  <span className={styles.pageIcon}>📄</span>
                  {currentPage}/{totalPages} 페이지
                </span>
              )}
            </div>
            
            <div className={styles.commentsGrid}>
              {currentComments.map((comment) => (
                <div key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentCard}>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentAuthorSection}>
                        <span className={styles.commentAuthorIcon}>👤</span>
                        <span className={styles.commentAuthor}>{comment.author}</span>
                      </div>
                      <div className={styles.commentDateSection}>
                        <span className={styles.commentDate}>
                          {comment.createdAt.toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isAdminLoggedIn && (
                          <button 
                            className={styles.deleteButton} 
                            onClick={() => handleDelete(comment.id)}
                            title="댓글 삭제"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className={styles.commentContent}>
                      <span className={styles.commentQuote}>"</span>
                      <p className={styles.commentMessage}>{comment.message}</p>
                      <span className={styles.commentQuote}>"</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 페이징 */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button 
                  className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← 이전
                </button>
                
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button 
                  className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
