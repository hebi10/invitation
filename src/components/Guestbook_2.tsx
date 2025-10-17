'use client';

import { useState, useEffect } from 'react';
import { addComment, getComments, deleteComment, verifyClientPassword, type Comment } from '@/services';
import { useAdmin } from '@/contexts';
import styles from './Guestbook_2.module.css';

interface GuestbookProps {
  pageId: string; // pageSlug와 동일하게 사용
}

export default function Guestbook_2({ pageId }: GuestbookProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const COMMENTS_PER_PAGE = 3;
  
  // 클라이언트 관리 기능
  const [showClientManager, setShowClientManager] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  
  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    loadComments();
  }, [pageId]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const fetchedComments = await getComments(pageId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('댓글 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      alert('이름과 메시지를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        author: name.trim(),
        message: message.trim(),
        pageSlug: pageId
      });

      setName('');
      setMessage('');
      await loadComments();
      alert('축하 메시지가 등록되었습니다.');
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      alert('메시지 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('정말로 이 메시지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId, pageId);
      await loadComments();
      alert('메시지가 삭제되었습니다.');
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  // 클라이언트 로그인
  const handleClientLogin = async () => {
    try {
      const isValid = await verifyClientPassword(pageId, clientPassword);
      if (isValid) {
        setIsClientLoggedIn(true);
        setShowClientManager(false);
        setClientPassword('');
      } else {
        alert('비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('클라이언트 로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  // 클라이언트 로그아웃
  const handleClientLogout = () => {
    setIsClientLoggedIn(false);
    setClientPassword('');
  };

  // 타이틀 클릭/더블탭 처리
  const handleTitleInteraction = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      setShowClientManager(!showClientManager);
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  return (
    <section className={styles.container}>
      <div 
        className={styles.titleSection}
        onDoubleClick={handleTitleInteraction}
        onTouchEnd={handleTitleInteraction}
        onClick={handleTitleInteraction}
        title="신랑신부님은 여기를 더블클릭/더블탭하세요"
        style={{ userSelect: 'none' }}
      >
        <h2 className={styles.title}>축하 메시지</h2>
      </div>
      
      {/* 클라이언트 관리 섹션 */}
      {showClientManager && !isClientLoggedIn && (
        <div className={styles.clientManager}>
          <div className={styles.clientLoginForm}>
            <span className={styles.loginTitle}>신랑신부 전용</span>
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
            <button 
              className={styles.clientCloseButton}
              onClick={() => setShowClientManager(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
      
      {isClientLoggedIn && (
        <div className={styles.clientLoggedIn}>
          <span className={styles.clientWelcome}>💕 댓글 관리 모드</span>
          <button 
            className={styles.clientLogoutButton}
            onClick={handleClientLogout}
          >
            로그아웃
          </button>
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
          placeholder="축하 메시지를 남겨주세요"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={styles.textarea}
          rows={4}
          maxLength={500}
        />
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? '등록 중...' : '메시지 남기기'}
        </button>
      </form>

      <div className={styles.commentsList}>
        {isLoading ? (
          <p className={styles.loadingMessage}>댓글을 불러오는 중...</p>
        ) : comments.length === 0 ? (
          <div className={styles.emptyMessage}>
            아직 메시지가 없습니다.<br />
            첫 번째 축하 메시지를 남겨주세요!
          </div>
        ) : (
          <>
            <div className={styles.commentsCount}>
              총 {comments.length}개의 메시지
            </div>
            {comments.slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE).map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentName}>{comment.author}</span>
                  <div className={styles.commentActions}>
                    <span className={styles.commentDate}>
                      {comment.createdAt.toLocaleDateString('ko-KR')}
                    </span>
                    {(isAdminLoggedIn || isClientLoggedIn) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className={styles.deleteButton}
                        aria-label="삭제"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <p className={styles.commentMessage}>{comment.message}</p>
              </div>
            ))}
            
            {/* 페이징 */}
            {Math.ceil(comments.length / COMMENTS_PER_PAGE) > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                >
                  이전
                </button>
                <span className={styles.pageInfo}>
                  {currentPage} / {Math.ceil(comments.length / COMMENTS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(comments.length / COMMENTS_PER_PAGE), prev + 1))}
                  disabled={currentPage === Math.ceil(comments.length / COMMENTS_PER_PAGE)}
                  className={styles.pageButton}
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
