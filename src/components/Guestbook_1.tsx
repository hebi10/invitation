'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts';
import { addComment, getComments, deleteComment, type Comment } from '@/services';
import styles from './Guestbook_1.module.css';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook_1({ pageSlug }: GuestbookProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { isAdminLoggedIn } = useAdmin();
  
  const [currentPage, setCurrentPage] = useState(1);
  const COMMENTS_PER_PAGE = 3;

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
      setError('성함과 메시지를 모두 입력해주세요.');
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

      setAuthor('');
      setMessage('');
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

  const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
  const endIndex = startIndex + COMMENTS_PER_PAGE;
  const currentComments = comments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 모바일 감지 및 페이지 번호 계산
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getPageNumbers = () => {
    const maxPages = isMobile ? 3 : 5; // 모바일: 3개, 데스크톱: 5개
    const pages = [];
    
    if (totalPages <= maxPages) {
      // 총 페이지가 maxPages 이하면 모든 페이지 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 총 페이지가 maxPages 초과인 경우
      const sidePages = Math.floor((maxPages - 1) / 2);
      
      if (currentPage <= sidePages + 1) {
        for (let i = 1; i <= maxPages; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - sidePages) {
        for (let i = totalPages - maxPages + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - sidePages; i <= currentPage + sidePages; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>축하 메시지</h2>
        <p className={styles.subtitle}>저희의 소중한 날을 함께 축하해 주세요</p>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="author">성함</label>
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
            <label className={styles.label} htmlFor="message">축하 메시지</label>
            <textarea
              className={styles.textarea}
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="진심 어린 축하 메시지를 남겨주세요"
              disabled={isSubmitting}
              required
              rows={4}
              maxLength={200}
            />
            <div className={styles.charCount}>
              {message.length}/200자
            </div>
          </div>
          
          {error && <p className={styles.errorMessage}>{error}</p>}
          
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? '등록 중...' : '축하 메시지 보내기'}
          </button>
        </form>

        <div className={styles.commentsList}>
          {isLoading ? (
            <p className={styles.loadingMessage}>댓글을 불러오는 중...</p>
          ) : comments.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyMessage}>아직 작성된 메시지가 없습니다</p>
              <p className={styles.emptySubMessage}>첫 번째 축하 메시지의 주인공이 되어주세요!</p>
            </div>
          ) : (
            <>
              <div className={styles.commentsHeader}>
                <span className={styles.commentsCount}>
                  총 {comments.length}개의 축하 메시지
                </span>
              </div>
              
              <div className={styles.commentsGrid}>
                {currentComments.map((comment) => (
                  <div key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentAuthor}>{comment.author}</span>
                      <div className={styles.commentActions}>
                        <span className={styles.commentDate}>
                          {comment.createdAt.toLocaleDateString('ko-KR')}
                        </span>
                        {isAdminLoggedIn && (
                          <button 
                            className={styles.deleteButton} 
                            onClick={() => handleDelete(comment.id)}
                            title="댓글 삭제"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={styles.commentMessage}>{comment.message}</p>
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button 
                    className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    이전
                  </button>
                  
                  <div className={styles.pageNumbers}>
                    {/* 첫 페이지 (필요시) */}
                    {totalPages > (isMobile ? 3 : 5) && pageNumbers[0] > 1 && (
                      <>
                        <button
                          className={styles.pageNumber}
                          onClick={() => handlePageChange(1)}
                        >
                          1
                        </button>
                        {pageNumbers[0] > 2 && (
                          <span className={styles.ellipsis}>...</span>
                        )}
                      </>
                    )}
                    
                    {/* 페이지 번호들 */}
                    {pageNumbers.map(page => (
                      <button
                        key={page}
                        className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    
                    {/* 마지막 페이지 (필요시) */}
                    {totalPages > (isMobile ? 3 : 5) && pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <>
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                          <span className={styles.ellipsis}>...</span>
                        )}
                        <button
                          className={styles.pageNumber}
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button 
                    className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
