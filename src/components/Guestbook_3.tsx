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

  const commentsPerPage = 3;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const endIndex = startIndex + commentsPerPage;
  const currentComments = comments.slice(startIndex, endIndex);

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
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                  aria-label="이전 페이지"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`${styles.pageButton} ${
                      currentPage === page ? styles.pageButtonActive : ''
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                  aria-label="다음 페이지"
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
