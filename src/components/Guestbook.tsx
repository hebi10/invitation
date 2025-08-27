'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts';
import { addComment, getComments, deleteComment, verifyClientPassword, type Comment } from '@/services';
import styles from './Guestbook.module.css';

interface GuestbookProps {
  pageSlug: string;
}

// 쿠키 관리 유틸리티 함수들
const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookie = (name: string, value: string, days: number = 7): void => {
  if (typeof window === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}; path=/`;
};

const getCommentCount = (pageSlug: string): number => {
  const cookieValue = getCookie(`comments_${pageSlug}`);
  return cookieValue ? parseInt(cookieValue, 10) : 0;
};

const incrementCommentCount = (pageSlug: string): void => {
  const currentCount = getCommentCount(pageSlug);
  setCookie(`comments_${pageSlug}`, (currentCount + 1).toString());
};

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
  const COMMENTS_PER_PAGE = 3;
  
  // 클라이언트 관리 기능 상태
  const [showClientManager, setShowClientManager] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);

  // 모바일 더블탭 처리를 위한 상태
  const [lastTap, setLastTap] = useState(0);

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

    // 관리자나 클라이언트가 아닌 경우 댓글 개수 제한 확인
    if (!isAdminLoggedIn && !isClientLoggedIn) {
      const currentCommentCount = getCommentCount(pageSlug);
      if (currentCommentCount >= 2) {
        setError('한 사람당 최대 2개의 댓글만 작성할 수 있습니다.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await addComment({
        author: author.trim(),
        message: message.trim(),
        pageSlug
      });

      // 관리자나 클라이언트가 아닌 경우에만 쿠키 카운트 증가
      if (!isAdminLoggedIn && !isClientLoggedIn) {
        incrementCommentCount(pageSlug);
      }

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

  // 클라이언트 로그인 처리
  const handleClientLogin = async () => {
    try {
      const isValid = await verifyClientPassword(pageSlug, clientPassword);
      if (isValid) {
        setIsClientLoggedIn(true);
        setShowClientManager(false);
        setClientPassword('');
        setError('');
      } else {
        setError('비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
      console.error('클라이언트 로그인 오류:', error);
    }
  };

  // 클라이언트 로그아웃 처리
  const handleClientLogout = () => {
    setIsClientLoggedIn(false);
    setClientPassword('');
  };

  // 모바일 더블탭 및 데스크톱 더블클릭 처리
  const handleTitleInteraction = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms 이내에 두 번 탭하면 더블탭으로 인식
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      // 더블탭/더블클릭 감지
      setShowClientManager(!showClientManager);
      setLastTap(0);
    } else {
      setLastTap(now);
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

  // 페이지 번호 배열 생성 (반응형)
  // 키보드 네비게이션 지원
  const handleKeyDown = (event: React.KeyboardEvent, page: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePageChange(page);
    }
  };

  // 페이지 변경 애니메이션
  const handlePageChangeWithAnimation = (page: number) => {
    if (page === currentPage) return;
    
    // 스크롤 없이 바로 페이지 변경
    handlePageChange(page);
  };

  // 모바일 감지 hook
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
    const maxPages = isMobile ? 3 : 5; // 모바일에서는 3개, 데스크톱에서는 5개
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
      <div className={styles.header}>
        <div 
          className={styles.titleSection}
          onDoubleClick={handleTitleInteraction}
          onTouchEnd={handleTitleInteraction}
          onClick={handleTitleInteraction}
          title="신랑신부님은 여기를 더블클릭/더블탭하세요"
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <h2 className={styles.title}>축하 메시지</h2>
        </div>
        <p className={styles.subtitle}>
          저희의 소중한 날을 함께 축하해 주세요
        </p>
        
        {/* 클라이언트 관리 버튼 - 특정 조건에서만 표시 */}
        <div className={styles.clientManager}>
          {!isClientLoggedIn ? (
            <>
              {showClientManager && (
                <div className={styles.clientManagerSection}>
                  <button 
                    className={styles.clientManagerButton}
                    onClick={() => setShowClientManager(false)}
                  >
                    <span className={styles.managerIcon}>❌</span>
                    닫기
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.clientLoggedIn}>
              <span className={styles.clientWelcome}>
                <span className={styles.welcomeIcon}>💕</span>
                댓글 관리 모드
              </span>
              <button 
                className={styles.clientLogoutButton}
                onClick={handleClientLogout}
              >
                로그아웃
              </button>
            </div>
          )}
          
          {/* 클라이언트 로그인 폼 */}
          {showClientManager && !isClientLoggedIn && (
            <div className={styles.clientLoginForm}>
              <div className={styles.loginHeader}>
                <span className={styles.loginIcon}>🔐</span>
                <span className={styles.loginTitle}>신랑신부 전용</span>
              </div>
              <div className={styles.loginInputGroup}>
                <input
                  type="password"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className={styles.clientPasswordInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleClientLogin()}
                />
                <button 
                  onClick={handleClientLogin}
                  className={styles.clientLoginButton}
                >
                  로그인
                </button>
              </div>
            </div>
          )}
          
          {/* 관리자용 버튼 */}
          {isAdminLoggedIn && !showClientManager && (
            <button 
              className={styles.adminClientButton}
              onClick={() => setShowClientManager(true)}
            >
              <span className={styles.managerIcon}>⚙️</span>
              클라이언트 관리 모드 활성화
            </button>
          )}
        </div>
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
              placeholder="진심 어린 축하 메시지를 남겨주세요. 예시: 결혼을 진심으로 축하드립니다!"
              disabled={isSubmitting}
              required
              rows={5}
              maxLength={200}
            />
            <div className={styles.guideText}>
              <p className={styles.guideMessage}>
                <span className={styles.guideIcon}>📝</span>
                최대 200자까지 작성 가능합니다 ({message.length}/200자)
              </p>
              <p className={styles.limitMessage}>
                <span className={styles.limitIcon}>⚠️</span>
                한 분당 최대 2개의 방명록을 작성할 수 있습니다
              </p>
            </div>
          </div>
          
          {error && <p className={styles.errorMessage}>{error}</p>}
          
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            <span className={styles.buttonIcon}>
              {isSubmitting ? '⏳' : '💝'}
            </span>
            {isSubmitting ? '등록 중...' : '축하 메시지 보내기'}
          </button>
        </form>
      </div>

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
                        {(isAdminLoggedIn || isClientLoggedIn) && (
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
              <div className={styles.pagination} role="navigation" aria-label="페이지 네비게이션">
                {/* 이전 버튼 */}
                <button 
                  className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
                  onClick={() => handlePageChangeWithAnimation(currentPage - 1)}
                  onKeyDown={(e) => handleKeyDown(e, currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="이전 페이지로 이동"
                  tabIndex={currentPage === 1 ? -1 : 0}
                >
                  <span className={styles.pageButtonIcon}>←</span>
                  <span className={styles.pageButtonText}>이전</span>
                </button>
                
                <div className={styles.pageNumbers}>
                  {/* 첫 페이지 (필요시) */}
                  {totalPages > (isMobile ? 3 : 5) && pageNumbers[0] > 1 && (
                    <>
                      <button
                        className={styles.pageNumber}
                        onClick={() => handlePageChangeWithAnimation(1)}
                        onKeyDown={(e) => handleKeyDown(e, 1)}
                        aria-label="첫 페이지로 이동"
                        tabIndex={0}
                      >
                        1
                      </button>
                      {pageNumbers[0] > 2 && (
                        <span className={styles.ellipsis} aria-hidden="true">···</span>
                      )}
                    </>
                  )}
                  
                  {/* 페이지 번호들 */}
                  {pageNumbers.map(page => (
                    <button
                      key={page}
                      className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                      onClick={() => handlePageChangeWithAnimation(page)}
                      onKeyDown={(e) => handleKeyDown(e, page)}
                      aria-label={`${page}페이지로 이동`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      tabIndex={0}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* 마지막 페이지 (필요시) */}
                  {totalPages > (isMobile ? 3 : 5) && pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                      {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span className={styles.ellipsis} aria-hidden="true">···</span>
                      )}
                      <button
                        className={styles.pageNumber}
                        onClick={() => handlePageChangeWithAnimation(totalPages)}
                        onKeyDown={(e) => handleKeyDown(e, totalPages)}
                        aria-label="마지막 페이지로 이동"
                        tabIndex={0}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                {/* 다음 버튼 */}
                <button 
                  className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                  onClick={() => handlePageChangeWithAnimation(currentPage + 1)}
                  onKeyDown={(e) => handleKeyDown(e, currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="다음 페이지로 이동"
                  tabIndex={currentPage === totalPages ? -1 : 0}
                >
                  <span className={styles.pageButtonText}>다음</span>
                  <span className={styles.pageButtonIcon}>→</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
