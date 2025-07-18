'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import ImageManager from '@/components/ImageManager';
import { getWeddingPagesClient, WeddingPageInfo } from '@/utils/getWeddingPagesClient';
import { getAllComments, deleteComment, Comment } from '@/services/commentService';
import { useAdmin } from '@/contexts/AdminContext';
import styles from './page.module.css';

export default function AdminPage() {
  const { isAdminLoggedIn, login, logout } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'images' | 'comments'>('pages');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(password);
    if (success) {
      setError('');
      fetchWeddingPages();
      fetchAllComments();
    } else {
      setError('잘못된 비밀번호입니다.');
    }
  };

  const fetchWeddingPages = () => {
    setLoading(true);
    try {
      const data = getWeddingPagesClient();
      setWeddingPages(data);
    } catch (error) {
      console.error('Error fetching wedding pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllComments = async () => {
    setCommentsLoading(true);
    try {
      const allComments = await getAllComments();
      setComments(allComments);
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      alert('댓글이 삭제되었습니다.');
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  useEffect(() => {
    // 페이지 로드 시 인증 상태 확인
    if (isAdminLoggedIn) {
      fetchWeddingPages();
      fetchAllComments();
    }
  }, [isAdminLoggedIn]);

  const handleLogout = () => {
    logout();
    setWeddingPages([]);
    setPassword('');
  };

  if (!isAdminLoggedIn) {
    return (
      <>
        <Head>
          <title>Admin 로그인 - 모바일 청첩장 관리</title>
          <meta name="description" content="모바일 청첩장 관리자 페이지입니다. 로그인하여 생성된 청첩장들을 확인하고 관리하세요." />
          <meta property="og:title" content="모바일 청첩장 관리자" />
          <meta property="og:description" content="청첩장 관리 및 댓글 관리 시스템" />
          <meta property="og:image" content="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop" />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        
        <div className={styles.container}>
          <a className={styles.backButton} href="/">← 홈으로 돌아가기</a>
          <div className={styles.loginContainer}>
            <h2 className={styles.loginTitle}>Admin 로그인</h2>
            <form className={styles.loginForm} onSubmit={handleLogin}>
              <input
                className={styles.loginInput}
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />
              <button className={styles.loginButton} type="submit">로그인</button>
              {error && <p className={styles.errorMessage}>{error}</p>}
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin 대시보드 - 모바일 청첩장 관리</title>
        <meta name="description" content="생성된 청첩장들을 확인하고 관리할 수 있는 관리자 대시보드입니다." />
        <meta property="og:title" content="모바일 청첩장 관리 대시보드" />
        <meta property="og:description" content="청첩장, 이미지, 댓글 통합 관리 시스템" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className={styles.container}>
        <header className={styles.header}>
          <a className={styles.backButton} href="/">← 홈으로 돌아가기</a>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>생성된 청첩장 관리</p>
          <button 
            className={styles.loginButton}
            onClick={handleLogout}
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            로그아웃
          </button>
        </header>

        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{weddingPages.length}</div>
            <div className={styles.statLabel}>총 청첩장 수</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{new Date().getFullYear()}</div>
            <div className={styles.statLabel}>현재 연도</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>7</div>
            <div className={styles.statLabel}>컴포넌트 수</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>100%</div>
            <div className={styles.statLabel}>반응형 지원</div>
          </div>
        </div>
        
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tab} ${activeTab === 'pages' ? styles.active : ''}`}
            onClick={() => setActiveTab('pages')}
          >
            청첩장 페이지
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'images' ? styles.active : ''}`}
            onClick={() => setActiveTab('images')}
          >
            이미지 관리
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'comments' ? styles.active : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            댓글 관리
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'pages' && (
            <div className={styles.pagesContainer}>
              {loading ? (
                <div className={styles.noPages}>
                  <h3>로딩 중...</h3>
                </div>
              ) : weddingPages.length > 0 ? (
                <>
                  <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', fontWeight: '300' }}>
                    생성된 청첩장 목록 ({weddingPages.length}개)
                  </h2>
                  <div className={styles.pagesGrid}>
                    {weddingPages.map((page) => (
                      <a key={page.slug} className={styles.pageCard} href={`/${page.slug}`} target="_blank">
                        <h3 className={styles.cardTitle}>{page.displayName}</h3>
                        <p className={styles.cardDescription}>{page.description}</p>
                        <div className={styles.cardMeta}>
                          <span>{page.date}</span>
                          <span>{page.venue}</span>
                        </div>
                        <div style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: '0.7' }}>
                          URL: /{page.slug}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.noPages}>
                  <h3>아직 생성된 청첩장이 없습니다.</h3>
                  <p>새로운 청첩장을 만들어보세요!</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'images' && <ImageManager />}
          
          {activeTab === 'comments' && (
            <div className={styles.commentsContainer}>
              <div className={styles.commentsHeader}>
                <h2>전체 댓글 관리 ({comments.length}개)</h2>
                <button 
                  onClick={fetchAllComments} 
                  disabled={commentsLoading}
                  className={styles.refreshButton}
                >
                  {commentsLoading ? '로딩 중...' : '새로고침'}
                </button>
              </div>
              
              {commentsLoading ? (
                <p>댓글을 불러오는 중...</p>
              ) : (
                <div className={styles.commentsList}>
                  {comments.map((comment) => (
                    <div key={comment.id} className={styles.commentItem}>
                      <div className={styles.commentHeader}>
                        <strong>{comment.author}</strong>
                        <span className={styles.pageSlug}>[{comment.pageSlug}]</span>
                        <span className={styles.commentDate}>
                          {comment.createdAt.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.commentMessage}>
                        {comment.message}
                      </div>
                      <div className={styles.commentActions}>
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className={styles.deleteButton}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className={styles.noComments}>댓글이 없습니다.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
