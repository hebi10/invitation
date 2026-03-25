'use client';

import { useEffect, useState } from 'react';

import { addComment, deleteComment, getComments, Comment } from '@/services/commentService';
import { verifyClientPassword } from '@/services/passwordService';

import styles from './Guestbook_3.module.css';

interface GuestbookProps {
  pageSlug: string;
}

type StatusTone = 'success' | 'error';

export default function Guestbook_3({ pageSlug }: GuestbookProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('success');

  const commentsPerPage = 3;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const currentComments = comments.slice(startIndex, startIndex + commentsPerPage);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    void loadComments();
  }, [pageSlug]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const showStatus = (messageText: string, tone: StatusTone) => {
    setStatusTone(tone);
    setStatusMessage(messageText);
  };

  const loadComments = async () => {
    try {
      const loadedComments = await getComments(pageSlug);
      setComments(loadedComments);
    } catch (error) {
      console.error('방명록 로딩 실패:', error);
      showStatus('방명록을 불러오지 못했습니다.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !message.trim()) {
      showStatus('이름과 메시지를 입력해 주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      await addComment({
        pageSlug,
        author: name.trim(),
        message: message.trim(),
      });
      setName('');
      setMessage('');
      setCurrentPage(1);
      await loadComments();
      showStatus('축하 메시지가 등록되었습니다.', 'success');
    } catch (error) {
      console.error('방명록 등록 실패:', error);
      showStatus('방명록 등록에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isClientLoggedIn) {
      showStatus('관리 모드에서만 삭제할 수 있습니다.', 'error');
      return;
    }

    if (!window.confirm('메시지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId, pageSlug);
      await loadComments();
      if (currentComments.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      showStatus('메시지가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('방명록 삭제 실패:', error);
      showStatus('메시지 삭제에 실패했습니다.', 'error');
    }
  };

  const handleLogin = async () => {
    try {
      const isValid = await verifyClientPassword(pageSlug, loginPassword);
      if (!isValid) {
        showStatus('비밀번호를 다시 확인해 주세요.', 'error');
        return;
      }

      setIsClientLoggedIn(true);
      setShowLoginModal(false);
      setLoginPassword('');
      showStatus('관리 모드가 활성화되었습니다.', 'success');
    } catch (error) {
      console.error('로그인 실패:', error);
      showStatus('로그인에 실패했습니다.', 'error');
    }
  };

  const getPageNumbers = () => {
    const maxPages = isMobile ? 3 : 5;
    const pages = [];

    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    const sidePages = Math.floor((maxPages - 1) / 2);

    if (currentPage <= sidePages + 1) {
      for (let i = 1; i <= maxPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    if (currentPage >= totalPages - sidePages) {
      for (let i = totalPages - maxPages + 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    for (let i = currentPage - sidePages; i <= currentPage + sidePages; i += 1) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handleKeyDown = (event: React.KeyboardEvent, page: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setCurrentPage(page);
    }
  };

  return (
    <section className={styles.container}>
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>축하 메시지</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.6rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {!isClientLoggedIn && (
          <button
            type="button"
            className={styles.submitButton}
            style={{ width: 'auto', minWidth: '160px' }}
            onClick={() => setShowLoginModal(true)}
          >
            방명록 관리
          </button>
        )}
        {isClientLoggedIn && (
          <button
            type="button"
            className={styles.submitButton}
            style={{ width: 'auto', minWidth: '160px' }}
            onClick={() => {
              setIsClientLoggedIn(false);
              showStatus('관리 모드를 종료했습니다.', 'success');
            }}
          >
            관리 모드 종료
          </button>
        )}
      </div>

      {statusMessage && (
        <p
          style={{
            margin: '0 0 1rem',
            textAlign: 'center',
            color: statusTone === 'error' ? '#ff9f9f' : '#d9f7ff',
            fontSize: '0.92rem',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </p>
      )}

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
              placeholder="이름을 입력해 주세요"
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
              placeholder="축하 메시지를 남겨 주세요"
              className={styles.textarea}
              rows={4}
              maxLength={200}
              required
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? <span className={styles.spinner}></span> : <span>메시지 남기기</span>}
          </button>
        </form>
      </div>

      <div className={styles.commentsSection}>
        <div className={styles.commentsHeader}>
          <span className={styles.commentCount}>총 {comments.length}개의 메시지</span>
        </div>

        {currentComments.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✦</div>
            <p className={styles.emptyText}>
              아직 남겨진 메시지가 없습니다.
              <br />
              첫 축하 메시지를 남겨 주세요.
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
                          day: 'numeric',
                        })}
                      </span>
                      {isClientLoggedIn && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className={styles.deleteButton}
                          aria-label="방명록 삭제"
                          type="button"
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
              <div className={styles.pagination} role="navigation" aria-label="페이지 내비게이션">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  onKeyDown={(e) => handleKeyDown(e, Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
                  aria-label="이전 페이지"
                  tabIndex={currentPage === 1 ? -1 : 0}
                  type="button"
                >
                  이전
                </button>

                <div className={styles.pageNumbers}>
                  {totalPages > (isMobile ? 3 : 5) && pageNumbers[0] > 1 && (
                    <>
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(1)}
                        onKeyDown={(e) => handleKeyDown(e, 1)}
                        aria-label="첫 페이지로 이동"
                        tabIndex={0}
                        type="button"
                      >
                        1
                      </button>
                      {pageNumbers[0] > 2 && <span className={styles.ellipsis} aria-hidden="true">...</span>}
                    </>
                  )}

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      onKeyDown={(e) => handleKeyDown(e, page)}
                      className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
                      aria-label={`${page}페이지로 이동`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      tabIndex={0}
                      type="button"
                    >
                      {page}
                    </button>
                  ))}

                  {totalPages > (isMobile ? 3 : 5) && pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                      {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span className={styles.ellipsis} aria-hidden="true">...</span>
                      )}
                      <button
                        className={styles.pageButton}
                        onClick={() => setCurrentPage(totalPages)}
                        onKeyDown={(e) => handleKeyDown(e, totalPages)}
                        aria-label="마지막 페이지로 이동"
                        tabIndex={0}
                        type="button"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  onKeyDown={(e) => handleKeyDown(e, Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                  aria-label="다음 페이지"
                  tabIndex={currentPage === totalPages ? -1 : 0}
                  type="button"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showLoginModal && (
        <div className={styles.modal} onClick={() => setShowLoginModal(false)}>
          <div className={styles.modalBackground}>
            <div className={styles.modalStars}></div>
          </div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>방명록 관리자 로그인</h3>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              className={styles.modalInput}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <div className={styles.modalButtons}>
              <button onClick={handleLogin} className={styles.modalButton} type="button">
                로그인
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginPassword('');
                }}
                className={styles.modalCancelButton}
                type="button"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.decorations}>
        <div className={styles.floatingPlanet1}></div>
        <div className={styles.floatingPlanet2}></div>
      </div>
    </section>
  );
}
