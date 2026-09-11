import type { Comment } from '@/services/commentService';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import { getAdminEventCounts, getAdminEventVisibility } from './adminEventWorkspaceModel';
import { formatDateTime } from './adminPageUtils';
import AdminQueryState from './AdminQueryState';
import styles from './AdminOverview.module.css';

interface AdminOverviewProps {
  pages: InvitationPageSummary[];
  comments: Comment[];
  pagesLoading: boolean;
  commentsLoading: boolean;
  pagesError: Error | null;
  commentsError: Error | null;
  onRetryPages: () => void;
  onRetryComments: () => void;
  onNavigate: (query: Record<string, string | null>) => void;
  createHref: string;
}

const EVENT_QUERY: Record<string, string | null> = {
  view: null, section: 'events', tab: 'pages', event: null, detail: null,
  page: '1', pageQ: null, pageType: null, pageCategory: null,
  published: null, ownership: null, visibility: null, pageSort: 'updated',
};

export default function AdminOverview({
  pages, comments, pagesLoading, commentsLoading, pagesError, commentsError,
  onRetryPages, onRetryComments, onNavigate, createHref,
}: AdminOverviewProps) {
  const counts = getAdminEventCounts(pages);
  const recentPages = [...pages]
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    .slice(0, 5);
  const recentComments = [...comments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
  const pageNames = new Map(pages.map((page) => [page.slug, page.displayName]));
  const summaryItems: Array<{ label: string; value: number; query: Record<string, string | null> }> = [
    { label: '전체 이벤트', value: counts.total, query: {} },
    { label: '공개 설정', value: counts.published, query: { published: 'published' } },
    { label: '비공개', value: counts.private, query: { published: 'private' } },
    { label: '노출 종료', value: pages.filter((page) => getAdminEventVisibility(page).label === '만료').length, query: { visibility: 'expired' } },
    { label: '고객 미연결', value: counts.unassigned, query: { ownership: 'unassigned' } },
  ];
  const openComments = (slug?: string) => onNavigate({
    view: null, section: 'events', tab: 'comments', event: null,
    commentPageSlug: slug ?? 'all', commentPage: '1', commentQ: null,
    commentAge: null, pageCategory: null, pageType: null,
  });

  return (
    <div className={styles.overview}>
      <header className={styles.header}>
        <div><h1>운영 홈</h1><p>이벤트 현황과 최근 소식을 확인하고 필요한 작업으로 이동하세요.</p></div>
        <a className="admin-button admin-button-primary" href={createHref}>새 이벤트</a>
      </header>
      <section aria-label="이벤트 운영 현황">
        <AdminQueryState loading={pagesLoading} error={pagesError} empty={false}
          emptyTitle="" emptyDescription="" onRetry={onRetryPages} />
        {!pagesLoading && !pagesError && (
          <div className={styles.summary}>
            {summaryItems.map((item) => (
              <button key={item.label} type="button" onClick={() => onNavigate({ ...EVENT_QUERY, ...item.query })}>
                <span>{item.label}</span><strong>{item.value}<small>건</small></strong>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className={styles.columns}>
        <section aria-labelledby="recent-events-title">
          <div className={styles.sectionHeading}>
            <h2 id="recent-events-title">최근 수정 이벤트</h2>
            <button type="button" onClick={() => onNavigate(EVENT_QUERY)}>이벤트 전체 보기</button>
          </div>
          <AdminQueryState loading={pagesLoading} error={pagesError} empty={pages.length === 0}
            emptyTitle="아직 이벤트가 없습니다" emptyDescription="새 이벤트를 만들어 운영을 시작하세요."
            onRetry={onRetryPages} compact />
          {!pagesLoading && !pagesError && (
            <ul className={styles.list}>
              {recentPages.map((page) => (
                <li key={page.slug}>
                  <button className={styles.eventButton} type="button"
                    onClick={() => onNavigate({ ...EVENT_QUERY, event: page.slug })}>
                    <span className={styles.eventText}><strong>{page.displayName}</strong>
                      <span>{page.date}{page.venue ? ` · ${page.venue}` : ''}</span>
                      <small>{page.updatedAt ? `${formatDateTime(page.updatedAt)} 수정` : '수정일 정보 없음'}</small>
                    </span>
                    <span className={styles.state}>{getAdminEventVisibility(page).label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="recent-comments-title">
          <div className={styles.sectionHeading}>
            <h2 id="recent-comments-title">최근 방명록</h2>
            <button type="button" onClick={() => openComments()}>방명록 전체 보기</button>
          </div>
          <AdminQueryState loading={commentsLoading} error={commentsError} empty={comments.length === 0}
            emptyTitle="아직 방명록이 없습니다" emptyDescription="새로 작성된 축하 메시지가 여기에 표시됩니다."
            loadingMessage="방명록을 불러오는 중입니다." errorTitle="방명록을 불러오지 못했습니다."
            onRetry={onRetryComments} compact />
          {!commentsLoading && !commentsError && (
            <ul className={styles.list}>
              {recentComments.map((comment) => (
                <li key={`${comment.pageSlug}-${comment.id}`}>
                  <button type="button" className={styles.commentButton} onClick={() => openComments(comment.pageSlug)}>
                    <span className={styles.commentHeading}><strong>{comment.author || '작성자 미상'}</strong>
                      <small>{formatDateTime(comment.createdAt)}</small></span>
                    <span className={styles.message}>{comment.message}</span>
                    <small>{pageNames.get(comment.pageSlug) ?? comment.pageSlug}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
