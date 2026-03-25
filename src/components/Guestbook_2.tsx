'use client';

import { useEffect, useState } from 'react';

import { useAdmin } from '@/contexts';
import { addComment, deleteComment, getComments, verifyClientPassword, type Comment } from '@/services';

import styles from './Guestbook_2.module.css';

interface GuestbookProps {
  pageId?: string;
  pageSlug?: string;
}

type StatusTone = 'success' | 'error';

export default function Guestbook_2({ pageId, pageSlug }: GuestbookProps) {
  const resolvedPageSlug = pageSlug ?? pageId;
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showClientManager, setShowClientManager] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('success');

  const { isAdminLoggedIn } = useAdmin();
  const COMMENTS_PER_PAGE = 3;

  useEffect(() => {
    if (!resolvedPageSlug) {
      return;
    }

    void loadComments();
  }, [resolvedPageSlug]);

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
    if (!resolvedPageSlug) {
      return;
    }

    try {
      setIsLoading(true);
      const fetchedComments = await getComments(resolvedPageSlug);
      setComments(fetchedComments);
    } catch (error) {
      console.error('방명록을 불러오지 못했습니다:', error);
      showStatus('방명록을 불러오지 못했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolvedPageSlug) {
      return;
    }

    if (!name.trim() || !message.trim()) {
      showStatus('이름과 메시지를 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await addComment({
        author: name.trim(),
        message: message.trim(),
        pageSlug: resolvedPageSlug,
      });

      setName('');
      setMessage('');
      setCurrentPage(1);
      await loadComments();
      showStatus('축하 메시지가 등록되었습니다.', 'success');
    } catch (error) {
      console.error('메시지 등록 실패:', error);
      showStatus('메시지 등록에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!resolvedPageSlug) {
      return;
    }

    if (!window.confirm('메시지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId, resolvedPageSlug);
      await loadComments();
      showStatus('메시지가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      showStatus('메시지 삭제에 실패했습니다.', 'error');
    }
  };

  const handleClientLogin = async () => {
    if (!resolvedPageSlug) {
      return;
    }

    try {
      const isValid = await verifyClientPassword(resolvedPageSlug, clientPassword);
      if (!isValid) {
        showStatus('비밀번호를 다시 확인해 주세요.', 'error');
        return;
      }

      setIsClientLoggedIn(true);
      setShowClientManager(false);
      setClientPassword('');
      showStatus('관리 모드가 활성화되었습니다.', 'success');
    } catch (error) {
      console.error('클라이언트 로그인 오류:', error);
      showStatus('로그인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleClientLogout = () => {
    setIsClientLoggedIn(false);
    setClientPassword('');
    showStatus('관리 모드를 종료했습니다.', 'success');
  };

  const canManage = isAdminLoggedIn || isClientLoggedIn;
  const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);
  const pagedComments = comments.slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE);

  return (
    <section className={styles.container}>
      <div className={styles.titleSection}>
        <h2 className={styles.title}>축하 메시지</h2>
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
            style={{ width: 'auto', minHeight: '44px', padding: '0.75rem 1rem' }}
            onClick={() => setShowClientManager((current) => !current)}
          >
            {showClientManager ? '관리 창 닫기' : '방명록 관리'}
          </button>
        )}
        {isClientLoggedIn && (
          <button
            type="button"
            className={styles.submitButton}
            style={{ width: 'auto', minHeight: '44px', padding: '0.75rem 1rem' }}
            onClick={handleClientLogout}
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
            color: statusTone === 'error' ? '#c0392b' : '#2d6a4f',
            fontSize: '0.92rem',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </p>
      )}

      {showClientManager && !isClientLoggedIn && (
        <div className={styles.clientManager}>
          <div className={styles.clientLoginForm}>
            <span className={styles.loginTitle}>방명록 관리자 로그인</span>
            <div className={styles.loginInputGroup}>
              <input
                type="password"
                value={clientPassword}
                onChange={(e) => setClientPassword(e.target.value)}
                placeholder="비밀번호를 입력해 주세요"
                className={styles.clientPasswordInput}
                onKeyDown={(e) => e.key === 'Enter' && handleClientLogin()}
              />
              <button onClick={handleClientLogin} className={styles.clientLoginButton} type="button">
                로그인
              </button>
            </div>
            <button className={styles.clientCloseButton} onClick={() => setShowClientManager(false)} type="button">
              닫기
            </button>
          </div>
        </div>
      )}

      {isClientLoggedIn && (
        <div className={styles.clientLoggedIn}>
          <span className={styles.clientWelcome}>관리 모드가 켜져 있습니다</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          maxLength={20}
        />
        <textarea
          placeholder="축하 메시지를 남겨 주세요"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={styles.textarea}
          rows={4}
          maxLength={500}
        />
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? '등록 중...' : '메시지 남기기'}
        </button>
      </form>

      <div className={styles.commentsList}>
        {isLoading ? (
          <p className={styles.loadingMessage}>메시지를 불러오는 중입니다.</p>
        ) : comments.length === 0 ? (
          <div className={styles.emptyMessage}>
            아직 남겨진 메시지가 없습니다.
            <br />
            첫 축하 메시지를 남겨 주세요.
          </div>
        ) : (
          <>
            <div className={styles.commentsCount}>총 {comments.length}개의 메시지</div>
            {pagedComments.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentName}>{comment.author}</span>
                  <div className={styles.commentActions}>
                    <span className={styles.commentDate}>{comment.createdAt.toLocaleDateString('ko-KR')}</span>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className={styles.deleteButton}
                        aria-label="삭제"
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

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                  type="button"
                >
                  이전
                </button>
                <span className={styles.pageInfo}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                  type="button"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
