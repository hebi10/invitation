'use client';

import { useEffect, useState } from 'react';

import { addComment, deleteComment, getComments, Comment } from '@/services/commentService';
import { verifyClientPassword } from '@/services/passwordService';

interface GuestbookThemedProps {
  pageSlug: string;
  styles: Record<string, string>;
  title: string;
  subtitle: string;
  statusColors: {
    success: string;
    error: string;
  };
  emptyIcon?: string;
}

type StatusTone = 'success' | 'error';

export default function GuestbookThemed({
  pageSlug,
  styles,
  title,
  subtitle,
  statusColors,
  emptyIcon = '✦',
}: GuestbookThemedProps) {
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

  const commentsPerPage = 5;
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

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

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
            style={{ width: 'auto', minHeight: '44px', padding: '0.75rem 1rem' }}
            onClick={() => setShowLoginModal(true)}
          >
            방명록 관리
          </button>
        )}
        {isClientLoggedIn && (
          <button
            type="button"
            className={styles.submitButton}
            style={{ width: 'auto', minHeight: '44px', padding: '0.75rem 1rem' }}
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
            color: statusTone === 'error' ? statusColors.error : statusColors.success,
            fontSize: '0.92rem',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          required
        />
        <textarea
          className={styles.textarea}
          placeholder="축하 메시지를 남겨 주세요"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={4}
          required
        />
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? '등록 중...' : '메시지 남기기'}
        </button>
      </form>

      <div className={styles.commentsList}>
        <div className={styles.commentsHeader}>
          <span className={styles.commentsCount}>총 {comments.length}개의 메시지</span>
        </div>

        {currentComments.map((comment) => (
          <div key={comment.id} className={styles.commentItem}>
            <div className={styles.commentHeader}>
              <div className={styles.commentAuthor}>
                {'authorIcon' in styles && <span className={styles.authorIcon}>{emptyIcon}</span>}
                <span className={styles.authorName}>{comment.author}</span>
              </div>
              <div className={styles.commentActions}>
                <span className={styles.commentDate}>
                  {comment.createdAt.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                {isClientLoggedIn && (
                  <button className={styles.deleteButton} onClick={() => handleDelete(comment.id)} type="button">
                    삭제
                  </button>
                )}
              </div>
            </div>
            <p className={styles.commentMessage}>{comment.message}</p>
          </div>
        ))}

        {comments.length === 0 && (
          <div className={styles.emptyState}>
            {'emptyIcon' in styles && <span className={styles.emptyIcon}>{emptyIcon}</span>}
            <p className={styles.emptyText}>첫 축하 메시지를 남겨 주세요.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            type="button"
          >
            이전
          </button>

          {getPageNumbers().map((page) => (
            <button
              key={page}
              className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
              onClick={() => setCurrentPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}

          <button
            className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            type="button"
          >
            다음
          </button>
        </div>
      )}

      {showLoginModal && (
        <div className={styles.modal} onClick={() => setShowLoginModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>방명록 관리자 로그인</h3>
            <input
              type="password"
              className={styles.modalInput}
              placeholder="비밀번호를 입력해 주세요"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
            <div className={styles.modalButtons}>
              <button className={styles.modalButton} onClick={handleLogin} type="button">
                로그인
              </button>
              <button
                className={`${styles.modalButton} ${styles.cancel}`}
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginPassword('');
                }}
                type="button"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
