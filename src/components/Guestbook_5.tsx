'use client';

import { useState, useEffect } from 'react';
import { getComments, addComment, deleteComment, Comment } from '@/services/commentService';
import { verifyClientPassword } from '@/services/passwordService';
import styles from './Guestbook_5.module.css';

interface GuestbookProps {
  pageSlug: string;
}

export default function Guestbook_5({ pageSlug }: GuestbookProps) {
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

  const commentsPerPage = 5;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const endIndex = startIndex + commentsPerPage;
  const currentComments = comments.slice(startIndex, endIndex);

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

  const getPageNumbers = () => {
    const maxPages = isMobile ? 3 : 5;
    const pages = [];
    
    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
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

  return (
    <section className={styles.container}>
      <svg className={styles.topDecoration} viewBox="0 0 100 10">
        <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
      
      <h2 className={styles.title} onClick={handleTitleClick}>芳名錄</h2>
      <p className={styles.subtitle}>Guestbook</p>

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
          placeholder="축하 메시지를 남겨주세요"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={4}
          required
        />
        <button 
          type="submit" 
          className={styles.submitButton} 
          disabled={loading}
        >
          {loading ? '등록 중...' : '메시지 남기기'}
        </button>
      </form>

      <div className={styles.commentsList}>
        <div className={styles.commentsHeader}>
          <span className={styles.commentsCount}>
            {comments.length}개의 축하 메시지
          </span>
        </div>

        {currentComments.map((comment) => (
          <div key={comment.id} className={styles.commentItem}>
            <div className={styles.commentHeader}>
              <div className={styles.commentAuthor}>
                <span className={styles.authorName}>{comment.author}</span>
              </div>
              <div className={styles.commentActions}>
                <span className={styles.commentDate}>
                  {comment.createdAt.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                {isClientLoggedIn && (
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(comment.id)}
                  >
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
            <p className={styles.emptyText}>
              첫 번째 축하 메시지를 남겨주세요
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ←
          </button>

          {getPageNumbers().map((page) => (
            <button
              key={page}
              className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      )}

      {showLoginModal && (
        <div className={styles.modal} onClick={() => setShowLoginModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>방명록 관리</h3>
            <input
              type="password"
              className={styles.modalInput}
              placeholder="비밀번호"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
            <div className={styles.modalButtons}>
              <button className={styles.modalButton} onClick={handleLogin}>
                확인
              </button>
              <button 
                className={`${styles.modalButton} ${styles.cancel}`}
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginPassword('');
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
        <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
    </section>
  );
}
