'use client';

import { useState, useEffect } from 'react';
import { getComments, addComment, deleteComment, Comment } from '@/services/commentService';
import { verifyClientPassword } from '@/services/passwordService';
import styles from './Guestbook_3.module.css';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook_3({ pageSlug }: GuestbookProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const commentsPerPage = 3;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const endIndex = startIndex + commentsPerPage;
  const currentComments = comments.slice(startIndex, endIndex);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadComments();
  }, [pageSlug]);

  const loadComments = async () => {
    try {
      const loadedComments = await getComments(pageSlug);
      setComments(loadedComments);
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setLoading(true);
    try {
      await addComment({
        pageSlug,
        author: name.trim(),
        message: message.trim()
      });
      setName('');
      setMessage('');
      await loadComments();
      setCurrentPage(1);
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      alert('댓글 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isClientLoggedIn) {
      alert('삭제 권한이 없습니다.');
      return;
    }

    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;

    try {
      await deleteComment(commentId, pageSlug);
      await loadComments();
      if (currentComments.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleTitleClick = () => {
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    if (clickTimer) {
      clearTimeout(clickTimer);
    }

    if (newClickCount === 2) {
      setShowLoginModal(true);
      setClickCount(0);
      setClickTimer(null);
    } else {
      const timer = setTimeout(() => {
        setClickCount(0);
      }, 500);
      setClickTimer(timer);
    }
  };

  const handleLogin = async () => {
    try {
      const isValid = await verifyClientPassword(pageSlug, loginPassword);
      if (isValid) {
        setIsClientLoggedIn(true);
        setShowLoginModal(false);
        setLoginPassword('');
        alert('로그인 성공!');
      } else {
        alert('비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      alert('로그인에 실패했습니다.');
    }
  };

  // 페이지 번호 배열 생성 (반응형)
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

  // 키보드 네비게이션 지원
  const handleKeyDown = (event: React.KeyboardEvent, page: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setCurrentPage(page);
    }
  };

  return (
    <section className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      {/* 타이틀 */}
      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 
          className={styles.title}
          onClick={handleTitleClick}
          style={{ cursor: 'pointer' }}
        >
          축하 메시지
        </h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      {/* 작성 폼 */}
      <div className={styles.formCard}>
        <div className={styles.cardGlow}></div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className={styles.input}
              maxLength={20}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="message" className={styles.label}>
              메시지
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="축하 메시지를 남겨주세요"
              className={styles.textarea}
              rows={4}
              maxLength={200}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? (
              <span className={styles.spinner}></span>
            ) : (
              <span>작성하기</span>
            )}
          </button>
        </form>
      </div>

      {/* 댓글 목록 */}
      <div className={styles.commentsSection}>
        <div className={styles.commentsHeader}>
          <span className={styles.commentCount}>
            총 {comments.length}개의 메시지
          </span>
        </div>

        {currentComments.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💌</div>
            <p className={styles.emptyText}>
              아직 작성된 메시지가 없습니다.<br />
              첫 번째 축하 메시지를 남겨주세요!
            </p>
          </div>
        ) : (
          <>
            <div className={styles.commentsList}>
              {currentComments.map((comment) => (
                <div key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentName}>{comment.author}</span>
                    <div className={styles.commentActions}>
                      <span className={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {isClientLoggedIn && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className={styles.deleteButton}
                          aria-label="댓글 삭제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <p className={styles.commentMessage}>{comment.message}</p>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className={styles.pagination} role="navigation" aria-label="페이지 네비게이션">
                {/* 이전 버튼 */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  onKeyDown={(e) => handleKeyDown(e, Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
                  aria-label="이전 페이지"
                  tabIndex={currentPage === 1 ? -1 : 0}
                >
                  ‹
                </button>

                <div className={styles.pageNumbers}>
                  {/* 첫 페이지 (필요시) */}
                  {totalPages > (isMobile ? 3 : 5) && pageNumbers[0] > 1 && (
                    <>
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(1)}
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
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      onKeyDown={(e) => handleKeyDown(e, page)}
                      className={`${styles.pageButton} ${
                        currentPage === page ? styles.pageButtonActive : ''
                      }`}
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
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(totalPages)}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  onKeyDown={(e) => handleKeyDown(e, Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                  aria-label="다음 페이지"
                  tabIndex={currentPage === totalPages ? -1 : 0}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className={styles.modal} onClick={() => setShowLoginModal(false)}>
          <div className={styles.modalBackground}>
            <div className={styles.modalStars}></div>
          </div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>클라이언트 로그인</h3>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className={styles.modalInput}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <div className={styles.modalButtons}>
              <button onClick={handleLogin} className={styles.modalButton}>
                로그인
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginPassword('');
                }}
                className={styles.modalCancelButton}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장식 요소 */}
      <div className={styles.decorations}>
        <div className={styles.floatingPlanet1}></div>
        <div className={styles.floatingPlanet2}></div>
      </div>
    </section>
  );
}
