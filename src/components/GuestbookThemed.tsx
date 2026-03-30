'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/contexts';
import { addComment, deleteComment, getComments, type Comment } from '@/services/commentService';

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

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function GuestbookThemed({
  pageSlug,
  styles,
  title,
  subtitle,
  statusColors,
  emptyIcon = '♡',
}: GuestbookThemedProps) {
  const { isAdminLoggedIn } = useAdmin();

  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('success');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const commentsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(comments.length / commentsPerPage));
  const currentComments = comments.slice((currentPage - 1) * commentsPerPage, currentPage * commentsPerPage);

  const showStatus = (messageText: string, tone: StatusTone) => {
    setStatusTone(tone);
    setStatusMessage(messageText);
  };

  const loadComments = async () => {
    try {
      const loadedComments = await getComments(pageSlug);
      setComments(loadedComments);
    } catch (error) {
      console.error('Failed to load comments', error);
      showStatus('방명록을 불러오지 못했습니다.', 'error');
    }
  };

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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !message.trim()) {
      showStatus('이름과 메시지를 입력해주세요.', 'error');
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
      showStatus('메시지가 등록되었습니다.', 'success');
    } catch (error) {
      console.error('Failed to add comment', error);
      showStatus('메시지 등록에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isAdminLoggedIn) {
      showStatus('관리자만 댓글을 삭제할 수 있습니다.', 'error');
      return;
    }

    if (!window.confirm('이 댓글을 삭제할까요?')) {
      return;
    }

    try {
      await deleteComment(commentId);
      await loadComments();
      showStatus('메시지를 삭제했습니다.', 'success');
    } catch (error) {
      console.error('Failed to delete comment', error);
      showStatus('메시지 삭제에 실패했습니다.', 'error');
    }
  };

  const pageNumbers = useMemo(() => {
    const maxPages = isMobile ? 3 : 5;
    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const sidePages = Math.floor((maxPages - 1) / 2);
    if (currentPage <= sidePages + 1) {
      return Array.from({ length: maxPages }, (_, index) => index + 1);
    }

    if (currentPage >= totalPages - sidePages) {
      return Array.from({ length: maxPages }, (_, index) => totalPages - maxPages + index + 1);
    }

    return Array.from({ length: maxPages }, (_, index) => currentPage - sidePages + index);
  }, [currentPage, isMobile, totalPages]);

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      {isAdminLoggedIn ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: statusColors.success,
            }}
          >
            Admin mode: delete enabled
          </span>
        </div>
      ) : null}

      {statusMessage ? (
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
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={20}
          required
        />
        <textarea
          className={styles.textarea}
          placeholder="축하 메시지를 남겨주세요."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
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

        {currentComments.length > 0 ? (
          currentComments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <div className={styles.commentAuthor}>
                  {'authorIcon' in styles ? <span className={styles.authorIcon}>{emptyIcon}</span> : null}
                  <span className={styles.authorName ?? styles.commentName ?? styles.commentAuthor}>{comment.author}</span>
                </div>
                <div className={styles.commentActions}>
                  <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                  {isAdminLoggedIn ? (
                    <button className={styles.deleteButton} onClick={() => void handleDelete(comment.id)} type="button">
                      삭제
                    </button>
                  ) : null}
                </div>
              </div>
              <p className={styles.commentMessage}>{comment.message}</p>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            {'emptyIcon' in styles ? <span className={styles.emptyIcon}>{emptyIcon}</span> : null}
            <p className={styles.emptyText}>첫 축하 메시지를 남겨주세요.</p>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled ?? '' : ''}`}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            type="button"
          >
            이전
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`${styles.pageNumber ?? styles.pageButton} ${currentPage === page ? styles.active ?? styles.pageButtonActive ?? '' : ''}`}
              onClick={() => setCurrentPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}

          <button
            className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled ?? '' : ''}`}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            type="button"
          >
            다음
          </button>
        </div>
      ) : null}
    </section>
  );
}
