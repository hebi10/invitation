'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { ImageManager, ClientPasswordManager, DisplayPeriodManager } from '@/components';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import { getAllComments, deleteComment, type Comment } from '@/services';
import { useAdmin } from '@/contexts';
import styles from './page.module.css';

export default function AdminPage() {
  const { isAdminLoggedIn, login, logout } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'images' | 'comments' | 'passwords' | 'periods'>('pages');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const COMMENTS_PER_PAGE = 10;
  
  // 댓글 필터링 상태
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>('all');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(password);
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

  const handleDeleteComment = async (commentId: string, pageSlug: string) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId, pageSlug);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      alert('댓글이 삭제되었습니다.');
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 페이징 계산
  const filteredComments = selectedPageSlug === 'all' 
    ? comments 
    : comments.filter(comment => comment.pageSlug === selectedPageSlug);
  
  const totalPages = Math.ceil(filteredComments.length / COMMENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
  const endIndex = startIndex + COMMENTS_PER_PAGE;
  const currentComments = filteredComments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tab: 'pages' | 'images' | 'comments' | 'passwords' | 'periods') => {
    setActiveTab(tab);
    if (tab === 'comments') {
      setCurrentPage(1); // 댓글 탭으로 변경시 페이지를 1로 리셋
      setSelectedPageSlug('all'); // 필터도 초기화
    }
  };

  const handlePageFilterChange = (pageSlug: string) => {
    setSelectedPageSlug(pageSlug);
    setCurrentPage(1); // 필터 변경시 페이지를 1로 리셋
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
            <div className={styles.statNumber}>
              {weddingPages.length}
            </div>
            <div className={styles.statLabel}>기본 청첩장</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {weddingPages.filter(page => page.variants?.emotional?.available).length}
            </div>
            <div className={styles.statLabel}>감성 버전</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {weddingPages.filter(page => page.variants?.simple?.available).length}
            </div>
            <div className={styles.statLabel}>심플 버전</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {weddingPages.filter(page => page.variants?.minimal?.available).length}
            </div>
            <div className={styles.statLabel}>미니멀 버전</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {weddingPages.reduce((total, page) => {
                let count = 0;
                if (page.variants?.emotional?.available) count++;
                if (page.variants?.simple?.available) count++;
                if (page.variants?.minimal?.available) count++;
                return total + count;
              }, 0)}
            </div>
            <div className={styles.statLabel}>총 페이지 수</div>
          </div>
        </div>
        
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tab} ${activeTab === 'pages' ? styles.active : ''}`}
            onClick={() => handleTabChange('pages')}
          >
            청첩장 페이지
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'images' ? styles.active : ''}`}
            onClick={() => handleTabChange('images')}
          >
            이미지 관리
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'comments' ? styles.active : ''}`}
            onClick={() => handleTabChange('comments')}
          >
            댓글 관리
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'passwords' ? styles.active : ''}`}
            onClick={() => handleTabChange('passwords')}
          >
            비밀번호 관리
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'periods' ? styles.active : ''}`}
            onClick={() => handleTabChange('periods')}
          >
            노출 기간 관리
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'pages' && (
            <div className={styles.pagesContainer}>
              {loading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p>청첩장 목록을 불러오는 중...</p>
                </div>
              ) : weddingPages.length > 0 ? (
                <>
                  <div className={styles.pagesHeader}>
                    <h2>생성된 청첩장 목록</h2>
                    <div className={styles.pagesStats}>
                      <span className={styles.pageCount}>
                        {weddingPages.filter(page => page.variants?.emotional?.available).length}개의 감성 버전
                      </span>
                      <span className={styles.separator}>•</span>
                      <span className={styles.pageCount}>
                        {weddingPages.filter(page => page.variants?.simple?.available).length}개의 심플 버전
                      </span>
                      <span className={styles.separator}>•</span>
                      <span className={styles.pageCount}>
                        {weddingPages.filter(page => page.variants?.minimal?.available).length}개의 미니멀 버전
                      </span>
                      <span className={styles.separator}>•</span>
                      <span className={styles.pageStatus}>모두 활성화됨</span>
                    </div>
                  </div>
                  <div className={styles.pagesGrid}>
                    {[...weddingPages].reverse().map((page, index) => (
                      <div key={page.slug} className={styles.pageCard}>
                        <div className={styles.cardNumber}>#{index + 1}</div>
                        <h3 className={styles.cardTitle}>💍 {page.displayName}</h3>
                        <p className={styles.cardDescription}>{page.description}</p>
                        <div className={styles.cardMeta}>
                          <span>📅 {page.date}</span>
                          <span>🏛️ {page.venue}</span>
                        </div>
                        
                        {/* 버전 선택 버튼들 */}
                        <div className={styles.versionButtons}>
                          {page.variants?.emotional?.available && (
                            <a 
                              href={page.variants.emotional.path} 
                              target="_blank" 
                              className={`${styles.versionButton} ${styles.normalButton}`}
                            >
                              🎨 감성 버전
                            </a>
                          )}
                          {page.variants?.simple?.available && (
                            <a 
                              href={page.variants.simple.path} 
                              target="_blank" 
                              className={`${styles.versionButton} ${styles.simpleButton}`}
                            >
                              ✨ 심플 버전
                            </a>
                          )}
                          {page.variants?.minimal?.available && (
                            <a 
                              href={page.variants.minimal.path} 
                              target="_blank" 
                              className={`${styles.versionButton} ${styles.minimalButton}`}
                            >
                              ✨ 미니멀 버전
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.noPages}>
                  <div className={styles.emptyIcon}>💒</div>
                  <h3>아직 생성된 청첩장이 없습니다</h3>
                  <p>새로운 청첩장을 만들어보세요!</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'images' && <ImageManager />}
          
          {activeTab === 'comments' && (
            <div className={styles.commentsContainer}>
              <div className={styles.commentsHeader}>
                <div className={styles.commentsHeaderInfo}>
                  <h2>전체 댓글 관리</h2>
                  <div className={styles.commentsStats}>
                    <span className={styles.commentCount}>{filteredComments.length}개의 댓글</span>
                    <span className={styles.commentSeparator}>•</span>
                    <span className={styles.pageCount}>
                      {selectedPageSlug === 'all' 
                        ? `${[...new Set(comments.map(c => c.pageSlug))].length}개 페이지` 
                        : `${selectedPageSlug} 페이지`
                      }
                    </span>
                    {totalPages > 1 && (
                      <>
                        <span className={styles.commentSeparator}>•</span>
                        <span className={styles.pageInfo}>
                          {currentPage}/{totalPages} 페이지
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.commentsControls}>
                  <select 
                    value={selectedPageSlug} 
                    onChange={(e) => handlePageFilterChange(e.target.value)}
                    className={styles.pageFilter}
                  >
                    <option value="all">전체 페이지</option>
                    {[...new Set(comments.map(c => c.pageSlug))].sort().map(pageSlug => (
                      <option key={pageSlug} value={pageSlug}>
                        {pageSlug} ({comments.filter(c => c.pageSlug === pageSlug).length}개)
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={fetchAllComments} 
                    disabled={commentsLoading}
                    className={styles.refreshButton}
                  >
                    {commentsLoading ? (
                      <>
                        <span className={styles.spinner}></span>
                        로딩 중...
                      </>
                    ) : (
                      <>
                        🔄 새로고침
                      </>
                    )}
                  </button>
                </div>
              </div>              {commentsLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p>댓글을 불러오는 중...</p>
                </div>
              ) : (
                <>
                  <div className={styles.commentsList}>
                    {currentComments.map((comment, index) => (
                      <div key={comment.id} className={styles.commentItem}>
                        <div className={styles.commentNumber}>#{filteredComments.length - (startIndex + index)}</div>
                        <div className={styles.commentHeader}>
                          <div className={styles.commentAuthor}>
                            <strong>👤 {comment.author}</strong>
                          </div>
                          <div className={styles.commentMeta}>
                            <span className={styles.pageSlug}>📄 {comment.pageSlug}</span>
                            <span className={styles.commentDate}>
                              🕒 {comment.createdAt.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className={styles.commentMessage}>
                          {comment.message}
                        </div>
                        <div className={styles.commentActions}>
                          <button 
                            onClick={() => handleDeleteComment(comment.id, comment.pageSlug)}
                            className={styles.deleteButton}
                          >
                            🗑️ 삭제
                          </button>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className={styles.noComments}>
                        <div className={styles.emptyIcon}>💬</div>
                        <h3>아직 댓글이 없습니다</h3>
                        <p>청첩장 페이지에서 방명록을 작성해보세요!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* 페이징 */}
                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button 
                        className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        ← 이전
                      </button>
                      
                      <div className={styles.pageNumbers}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button 
                        className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        다음 →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'passwords' && (
            <ClientPasswordManager isVisible={true} />
          )}

          {activeTab === 'periods' && (
            <DisplayPeriodManager isVisible={true} />
          )}
        </div>
      </div>
    </>
  );
}
