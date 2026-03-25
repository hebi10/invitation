'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ImageManager, ClientPasswordManager, DisplayPeriodManager, MemoryPageManager } from '@/components';
import { useAdmin } from '@/contexts';
import { getWeddingPagesClient, type WeddingPageInfo } from '@/utils';
import {
  deleteComment,
  getAllClientPasswords,
  getAllComments,
  getAllDisplayPeriods,
  type ClientPassword,
  type Comment,
  type DisplayPeriod,
} from '@/services';
import { AdminCommentsTab, AdminPagesTab, StatusBadge, SummaryCards, useAdminOverlay, type SummaryCardItem } from './_components';
import {
  TAB_ITEMS,
  COMMENTS_PER_PAGE,
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  TOTAL_SHORTCUT_COUNT,
  SHORTCUT_ITEMS,
  parseCommentAge,
  parsePageSort,
  parsePageStatus,
  parsePasswordFilter,
  parsePeriodFilter,
  parseTab,
  parseShortcut,
  numberFromParam,
  isDueSoonPeriod,
  isRecentComment,
  getAvailableShortcuts,
} from './_components/adminPageUtils';
import styles from './page.module.css';

export default function AdminPage() {
  const { isAdminLoggedIn, login, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { confirm, showToast } = useAdminOverlay();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [weddingPages, setWeddingPages] = useState<WeddingPageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [passwords, setPasswords] = useState<ClientPassword[]>([]);
  const [periods, setPeriods] = useState<DisplayPeriod[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const activeTab = parseTab(searchParams.get('tab'));
  const pageSearch = searchParams.get('pageQ') ?? '';
  const pageShortcutFilter = parseShortcut(searchParams.get('shortcut') ?? searchParams.get('variant'));
  const pageStatusFilter = parsePageStatus(searchParams.get('pageStatus'));
  const pageSort = parsePageSort(searchParams.get('pageSort'));
  const commentSearch = searchParams.get('commentQ') ?? '';
  const selectedPageSlug = searchParams.get('commentPageSlug') ?? 'all';
  const commentAgeFilter = parseCommentAge(searchParams.get('commentAge'));
  const currentPage = numberFromParam(searchParams.get('commentPage'), 1);
  const passwordStatusFilter = parsePasswordFilter(searchParams.get('passwordStatus'));
  const periodStatusFilter = parsePeriodFilter(searchParams.get('periodStatus'));

  const updateQuery = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if ('shortcut' in updates) {
      nextParams.delete('variant');
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    router.replace(`${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`, { scroll: false });
  };

  const fetchWeddingPages = () => {
    setLoading(true);

    try {
      setWeddingPages(getWeddingPagesClient());
    } catch (fetchError) {
      console.error('Error fetching wedding pages:', fetchError);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllComments = async () => {
    setCommentsLoading(true);

    try {
      setComments(await getAllComments());
    } catch (fetchError) {
      console.error('댓글 로드 실패:', fetchError);
      showToast({
        title: '댓글을 불러오지 못했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchSummarySources = async () => {
    setSummaryLoading(true);

    try {
      const [allPasswords, allPeriods] = await Promise.all([getAllClientPasswords(), getAllDisplayPeriods()]);
      setPasswords(allPasswords);
      setPeriods(allPeriods);
    } catch (fetchError) {
      console.error('관리 요약 로드 실패:', fetchError);
    } finally {
      setSummaryLoading(false);
    }
  };

  const refreshAllAdminData = async () => {
    fetchWeddingPages();
    await Promise.all([fetchAllComments(), fetchSummarySources()]);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const success = await login(password);
    if (success) {
      setError('');
      await refreshAllAdminData();
      showToast({
        title: '로그인되었습니다.',
        message: '운영 데이터를 불러왔습니다.',
        tone: 'success',
      });
      return;
    }

    setError('비밀번호를 확인해주세요.');
  };

  const handleDeleteComment = async (commentId: string, author: string, pageSlug: string) => {
    const approved = await confirm({
      title: '댓글을 삭제할까요?',
      description: `${author} 님의 댓글이 삭제되며 복구할 수 없습니다.`,
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    });

    if (!approved) {
      return;
    }

    try {
      await deleteComment(commentId, pageSlug);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      showToast({
        title: '댓글을 삭제했습니다.',
        message: '목록이 최신 상태로 갱신되었습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      console.error('댓글 삭제 실패:', deleteError);
      showToast({
        title: '댓글 삭제에 실패했습니다.',
        message: '잠시 후 다시 시도해주세요.',
        tone: 'error',
      });
    }
  };

  const handleLogout = () => {
    logout();
    setWeddingPages([]);
    setComments([]);
    setPasswords([]);
    setPeriods([]);
    setPassword('');
    setError('');
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (!isAdminLoggedIn) {
      return;
    }

    fetchWeddingPages();
    fetchAllComments();
    fetchSummarySources();
  }, [isAdminLoggedIn]);

  const defaultPasswordCount = weddingPages.filter((page) => !passwords.some((item) => item.pageSlug === page.slug && item.password !== '')).length;
  const dueSoonCount = periods.filter((period) => isDueSoonPeriod(period)).length;
  const recentCommentsCount = comments.filter((comment) => isRecentComment(comment.createdAt)).length;
  const incompleteShortcutCount = weddingPages.filter((page) => getAvailableShortcuts(page).length < TOTAL_SHORTCUT_COUNT).length;

  const filteredPages = [...weddingPages]
    .filter((page) => {
      const links = getAvailableShortcuts(page);
      const matchesSearch = `${page.displayName} ${page.slug} ${page.description ?? ''} ${page.venue ?? ''}`.toLowerCase().includes(pageSearch.trim().toLowerCase());
      const matchesShortcut = pageShortcutFilter === 'all' || links.some((link) => link.key === pageShortcutFilter);
      const matchesStatus =
        pageStatusFilter === 'all' ||
        (pageStatusFilter === 'complete' && links.length === TOTAL_SHORTCUT_COUNT) ||
        (pageStatusFilter === 'partial' && links.length > 0 && links.length < TOTAL_SHORTCUT_COUNT) ||
        (pageStatusFilter === 'empty' && links.length === 0);
      return matchesSearch && matchesShortcut && matchesStatus;
    })
    .sort((a, b) => {
      if (pageSort === 'name') {
        return a.displayName.localeCompare(b.displayName, 'ko');
      }

      if (pageSort === 'coverage') {
        return getAvailableShortcuts(b).length - getAvailableShortcuts(a).length;
      }

      return weddingPages.findIndex((item) => item.slug === b.slug) - weddingPages.findIndex((item) => item.slug === a.slug);
    });

  const filteredComments = comments.filter((comment) => {
    const matchesSearch = `${comment.author} ${comment.message} ${comment.pageSlug}`.toLowerCase().includes(commentSearch.trim().toLowerCase());
    const matchesPage = selectedPageSlug === 'all' || comment.pageSlug === selectedPageSlug;
    const matchesAge = commentAgeFilter === 'all' || isRecentComment(comment.createdAt);
    return matchesSearch && matchesPage && matchesAge;
  });

  const totalCommentPages = Math.max(1, Math.ceil(filteredComments.length / COMMENTS_PER_PAGE));
  const normalizedCurrentPage = Math.min(currentPage, totalCommentPages);
  const currentComments = filteredComments.slice((normalizedCurrentPage - 1) * COMMENTS_PER_PAGE, normalizedCurrentPage * COMMENTS_PER_PAGE);
  const weddingPageNameMap = new Map(weddingPages.map((page) => [page.slug, page.displayName]));
  const commentPageOptions = [...new Set([...weddingPages.map((page) => page.slug), ...comments.map((comment) => comment.pageSlug)])]
    .sort((a, b) => (weddingPageNameMap.get(a) ?? a).localeCompare(weddingPageNameMap.get(b) ?? b, 'ko'))
    .map((slug) => ({
      value: slug,
      label: weddingPageNameMap.get(slug) ? `${weddingPageNameMap.get(slug)} (${slug})` : slug,
    }));

  useEffect(() => {
    if (currentPage !== normalizedCurrentPage) {
      updateQuery({ commentPage: String(normalizedCurrentPage) });
    }
  }, [currentPage, normalizedCurrentPage]);

  const summaryCards: SummaryCardItem[] = [
    {
      id: 'dueSoon',
      label: '노출 종료 임박',
      value: dueSoonCount,
      meta: dueSoonCount > 0 ? '7일 이내 종료되는 페이지' : '지금 바로 확인할 임박 페이지가 없습니다.',
      tone: dueSoonCount > 0 ? 'warning' : 'neutral',
      onClick: () => updateQuery({ tab: 'periods', periodStatus: 'dueSoon' }),
    },
    {
      id: 'defaultPasswords',
      label: '기본 비밀번호 사용',
      value: defaultPasswordCount,
      meta: defaultPasswordCount > 0 ? '커스텀 비밀번호 설정이 필요한 페이지' : '모든 페이지에 비밀번호가 설정되어 있습니다.',
      tone: defaultPasswordCount > 0 ? 'warning' : 'success',
      onClick: () => updateQuery({ tab: 'passwords', passwordStatus: 'default' }),
    },
    {
      id: 'recentComments',
      label: '최근 7일 댓글',
      value: recentCommentsCount,
      meta: recentCommentsCount > 0 ? '최근 반응이 있는 메시지를 우선 확인' : '최근 7일간 새 댓글이 없습니다.',
      tone: recentCommentsCount > 0 ? 'primary' : 'neutral',
      onClick: () => updateQuery({ tab: 'comments', commentAge: 'recent', commentPage: '1' }),
    },
    {
      id: 'incompleteShortcuts',
      label: '바로가기 미완성',
      value: incompleteShortcutCount,
      meta: incompleteShortcutCount > 0 ? '일부 링크가 비어 있는 페이지' : '모든 페이지의 바로가기 연결이 완료되었습니다.',
      tone: incompleteShortcutCount > 0 ? 'warning' : 'success',
      onClick: () => updateQuery({ tab: 'pages', pageStatus: 'partial' }),
    },
  ];

  const pageFilterChips = [
    pageSearch ? { id: 'page-search', label: `검색: ${pageSearch}`, onRemove: () => updateQuery({ pageQ: null }) } : null,
    pageShortcutFilter !== 'all'
      ? {
          id: 'page-shortcut',
          label: `바로가기: ${SHORTCUT_ITEMS.find((shortcut) => shortcut.key === pageShortcutFilter)?.label ?? pageShortcutFilter}`,
          onRemove: () => updateQuery({ shortcut: null }),
        }
      : null,
    pageStatusFilter !== 'all' ? { id: 'page-status', label: `상태: ${PAGE_STATUS_LABELS[pageStatusFilter]}`, onRemove: () => updateQuery({ pageStatus: null }) } : null,
    pageSort !== 'newest' ? { id: 'page-sort', label: `정렬: ${PAGE_SORT_LABELS[pageSort]}`, onRemove: () => updateQuery({ pageSort: null }) } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onRemove: () => void }>;

  const commentFilterChips = [
    commentSearch ? { id: 'comment-search', label: `검색: ${commentSearch}`, onRemove: () => updateQuery({ commentQ: null, commentPage: '1' }) } : null,
    selectedPageSlug !== 'all' ? { id: 'comment-page', label: `페이지: ${selectedPageSlug}`, onRemove: () => updateQuery({ commentPageSlug: null, commentPage: '1' }) } : null,
    commentAgeFilter !== 'all' ? { id: 'comment-age', label: '기간: 최근 7일', onRemove: () => updateQuery({ commentAge: null, commentPage: '1' }) } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onRemove: () => void }>;

  const activeTabLabel = TAB_ITEMS.find((tab) => tab.key === activeTab)?.label ?? '청첩장';

  if (!isAdminLoggedIn) {
    return (
      <>
        <Head>
          <title>관리자 로그인 - 모바일 청첩장</title>
          <meta name="description" content="청첩장 운영 데이터를 확인하고 관리할 수 있는 관리자 로그인 화면입니다." />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <div className={styles.container}>
          <div className={styles.loginShell}>
            <a className="admin-button admin-button-ghost" href="/">메인으로 돌아가기</a>
            <div className={styles.loginCard}>
              <StatusBadge tone="neutral">Admin Access</StatusBadge>
              <div className={styles.loginHeader}>
                <h1 className={styles.loginTitle}>관리자 로그인</h1>
                <p className={styles.loginDescription}>청첩장, 이미지, 댓글, 비밀번호, 노출 기간을 운영툴 방식으로 관리할 수 있습니다.</p>
              </div>
              <form className={styles.loginForm} onSubmit={handleLogin}>
                <label className="admin-field" htmlFor="admin-password">
                  <span className="admin-field-label">비밀번호</span>
                  <input id="admin-password" className="admin-input" type="password" placeholder="관리자 비밀번호를 입력하세요" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </label>
                {error ? <p className={styles.errorBanner}>{error}</p> : null}
                <button className="admin-button admin-button-primary" type="submit">로그인</button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>관리자 대시보드 - 모바일 청첩장</title>
        <meta name="description" content="청첩장 페이지, 이미지, 댓글, 비밀번호, 노출 기간을 운영형 UI로 관리하는 관리자 대시보드입니다." />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <div className={styles.shell}>
          <header className={styles.pageHeader}>
            <div className={styles.headerTopRow}>
              <a className="admin-button admin-button-ghost" href="/">메인으로 돌아가기</a>
              <div className={styles.headerActions}>
                <StatusBadge tone="success">운영 중</StatusBadge>
                <button className="admin-button admin-button-secondary" onClick={handleLogout} type="button">로그아웃</button>
              </div>
            </div>

            <div className={styles.headerMain}>
              <div className={styles.headingBlock}>
                <span className={styles.pageEyebrow}>Invitation Admin</span>
                <h1 className={styles.pageTitle}>청첩장 관리자 대시보드</h1>
                <p className={styles.pageDescription}>요약 카드, 필터, 리스트, 상태 피드백을 운영 효율 중심으로 다시 정리해 반복 작업에 더 강한 구조로 고도화했습니다.</p>
              </div>
              <div className={styles.headerSummary}>
                <StatusBadge tone="primary">{activeTabLabel}</StatusBadge>
                <p className={styles.headerSummaryText}>현재 탭에서 필요한 데이터와 액션을 한 화면에서 이어서 처리할 수 있습니다.</p>
              </div>
            </div>
          </header>

          <SummaryCards items={summaryCards} />

          <nav className={styles.tabBar} aria-label="관리 탭">
            {TAB_ITEMS.map((tab) => (
              <button key={tab.key} type="button" className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`} onClick={() => updateQuery({ tab: tab.key === 'pages' ? null : tab.key })}>
                {tab.label}
              </button>
            ))}
          </nav>

          <section className={styles.panel}>
            {activeTab === 'pages' ? (
              <AdminPagesTab
                loading={loading}
                summaryLoading={summaryLoading}
                weddingPages={weddingPages}
                filteredPages={filteredPages}
                pageSearch={pageSearch}
                pageShortcutFilter={pageShortcutFilter}
                pageStatusFilter={pageStatusFilter}
                pageSort={pageSort}
                chips={pageFilterChips}
                onQueryChange={updateQuery}
              />
            ) : null}

            {activeTab === 'memory' ? <MemoryPageManager /> : null}

            {activeTab === 'images' ? <ImageManager /> : null}

            {activeTab === 'comments' ? (
              <AdminCommentsTab
                commentsLoading={commentsLoading}
                comments={comments}
                filteredComments={filteredComments}
                currentComments={currentComments}
                currentPage={normalizedCurrentPage}
                totalPages={totalCommentPages}
                commentSearch={commentSearch}
                selectedPageSlug={selectedPageSlug}
                commentAgeFilter={commentAgeFilter}
                chips={commentFilterChips}
                commentPageOptions={commentPageOptions}
                onRefresh={fetchAllComments}
                onQueryChange={updateQuery}
                onDeleteComment={handleDeleteComment}
              />
            ) : null}

            {activeTab === 'passwords' ? <ClientPasswordManager isVisible={true} statusFilter={passwordStatusFilter} onDataChanged={fetchSummarySources} /> : null}
            {activeTab === 'periods' ? <DisplayPeriodManager isVisible={true} statusFilter={periodStatusFilter} onDataChanged={fetchSummarySources} /> : null}
          </section>
        </div>
      </div>
    </>
  );
}
