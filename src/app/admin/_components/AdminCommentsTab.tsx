import type { Comment } from '@/services/commentService';

import { AdminQueryState, EmptyState, FilterToolbar, Pagination, StatusBadge } from '.';
import {
  COMMENT_AGE_LABELS,
  COMMENTS_PER_PAGE,
  formatDateTime,
  type CommentAgeFilter,
} from './adminPageUtils';
import styles from '../page.module.css';

interface AdminCommentsTabProps {
  commentsLoading: boolean;
  commentsRefreshing: boolean;
  commentsError: Error | null;
  comments: Comment[];
  filteredComments: Comment[];
  currentComments: Comment[];
  currentPage: number;
  totalPages: number;
  commentSearch: string;
  selectedPageSlug: string;
  commentAgeFilter: CommentAgeFilter;
  isEventFilterActive: boolean;
  chips: Array<{ id: string; label: string; onRemove: () => void }>;
  commentPageOptions: Array<{ value: string; label: string }>;
  onRefresh: () => void;
  onRetryComments: () => void;
  onQueryChange: (updates: Record<string, string | null>) => void;
  onDeleteComment: (comment: Comment) => void;
  mobileReadOnly: boolean;
}

function resetCommentFilters(
  onQueryChange: (updates: Record<string, string | null>) => void
) {
  onQueryChange({
    event: null,
    commentQ: null,
    commentPageSlug: 'all',
    commentAge: null,
    commentPage: '1',
  });
}

export default function AdminCommentsTab({
  commentsLoading,
  commentsRefreshing,
  commentsError,
  comments,
  filteredComments,
  currentComments,
  currentPage,
  totalPages,
  commentSearch,
  selectedPageSlug,
  commentAgeFilter,
  isEventFilterActive,
  chips,
  commentPageOptions,
  onRefresh,
  onRetryComments,
  onQueryChange,
  onDeleteComment,
  mobileReadOnly,
}: AdminCommentsTabProps) {
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
  const selectedEventLabel = commentPageOptions.find(
    (option) => option.value === selectedPageSlug
  )?.label;
  const hasCachedComments = comments.length > 0;

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>방명록 관리</h2>
        </div>
        <p className={styles.sectionMeta}>결과 {filteredComments.length}개</p>
      </div>

      {mobileReadOnly ? (
        <p className={styles.mobileReadOnlyNotice}>
          모바일에서는 방명록 조회만 지원합니다. 삭제는 PC 관리자 화면을 이용해 주세요.
        </p>
      ) : null}

      {isEventFilterActive ? (
        <div className={styles.selectionContext}>
          <p className={styles.sectionMeta}>
            선택 이벤트 · {selectedEventLabel ?? selectedPageSlug}
          </p>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={() =>
              onQueryChange({
                event: null,
                commentPageSlug: 'all',
                commentPage: '1',
              })
            }
          >
            전체 방명록 보기
          </button>
        </div>
      ) : null}

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="작성자, 메시지, slug로 찾기"
                value={commentSearch}
                onChange={(event) =>
                  onQueryChange({
                    commentQ: event.target.value || null,
                    commentPage: '1',
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">페이지</span>
              <select
                className="admin-select"
                value={selectedPageSlug}
                onChange={(event) =>
                  onQueryChange({
                    commentPageSlug: event.target.value,
                    commentPage: '1',
                  })
                }
              >
                <option value="all">전체 페이지</option>
                {commentPageOptions.map((pageOption) => (
                  <option key={pageOption.value} value={pageOption.value}>
                    {pageOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">기간</span>
              <select
                className="admin-select"
                value={commentAgeFilter}
                onChange={(event) =>
                  onQueryChange({
                    commentAge: event.target.value,
                    commentPage: '1',
                  })
                }
              >
                {Object.entries(COMMENT_AGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={onRefresh}
              disabled={commentsLoading || commentsRefreshing}
            >
              {commentsRefreshing
                ? '새로고침 중'
                : commentsLoading
                  ? '불러오는 중'
                  : '새로고침'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-ghost"
              onClick={() => resetCommentFilters(onQueryChange)}
            >
              필터 초기화
            </button>
          </>
        }
        chips={chips}
      />

      {commentsError && hasCachedComments ? (
        <AdminQueryState
          loading={false}
          error={commentsError}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={onRetryComments}
          compact={true}
          errorTitle="방명록 최신 정보를 불러오지 못했습니다."
        />
      ) : null}

      {commentsLoading && !hasCachedComments ? (
        <AdminQueryState
          loading={true}
          error={null}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={onRetryComments}
          loadingMessage="방명록을 불러오는 중입니다."
        />
      ) : commentsError && !hasCachedComments ? (
        <AdminQueryState
          loading={false}
          error={commentsError}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={onRetryComments}
          errorTitle="방명록을 불러오지 못했습니다."
        />
      ) : currentComments.length > 0 ? (
        <>
          {!mobileReadOnly ? <div className={styles.tableCard}>
            <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="방명록 테이블">
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>작성자</th>
                    <th>페이지</th>
                    <th>메시지</th>
                    <th>등록일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {currentComments.map((comment, index) => (
                    <tr
                      key={`${comment.collectionName ?? 'comments'}:${comment.id}`}
                      className={styles.tableRowInteractive}
                    >
                      <td className={styles.numberCell}>
                        {filteredComments.length - (startIndex + index)}
                      </td>
                      <td>
                        <span className={styles.tableTitle}>{comment.author}</span>
                      </td>
                      <td>
                        <StatusBadge tone="neutral">{comment.pageSlug}</StatusBadge>
                      </td>
                      <td>
                        <p className={styles.messagePreview}>{comment.message}</p>
                      </td>
                      <td>
                        <span className={styles.tableSubtext}>
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          onClick={() => onDeleteComment(comment)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div> : null}

          <div className={styles.mobileList}>
            {currentComments.map((comment, index) => (
              <article
                key={`${comment.collectionName ?? 'comments'}:${comment.id}`}
                className={styles.mobileCard}
              >
                <div className={styles.mobileCardHead}>
                  <div>
                    <h3 className={styles.mobileCardTitle}>{comment.author}</h3>
                    <p className={styles.mobileCardSlug}>
                      #{filteredComments.length - (startIndex + index)}
                    </p>
                  </div>
                  <StatusBadge tone="neutral">{comment.pageSlug}</StatusBadge>
                </div>

                <p className={styles.mobileCommentMessage}>{comment.message}</p>
                <p className={styles.mobileCardMetaLine}>
                  {formatDateTime(comment.createdAt)}
                </p>

                {!mobileReadOnly ? <div className={styles.mobileCardActions}>
                  <button
                    type="button"
                    className="admin-button admin-button-danger"
                    onClick={() => onDeleteComment(comment)}
                  >
                    삭제
                  </button>
                </div> : null}
              </article>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredComments.length}
            pageSize={COMMENTS_PER_PAGE}
            onPageChange={(page) => onQueryChange({ commentPage: String(page) })}
          />
        </>
      ) : (
        <EmptyState
          title={
            comments.length === 0
              ? '아직 등록된 방명록이 없습니다.'
              : '현재 조건에 맞는 방명록이 없습니다.'
          }
          description={
            comments.length === 0
              ? '댓글이 등록되면 이 탭에서 검색과 삭제를 바로 관리할 수 있습니다.'
              : '검색어나 페이지, 기간 필터가 너무 좁게 잡혀 있을 수 있습니다.'
          }
          actionLabel={comments.length === 0 ? '새로고침' : '필터 초기화'}
          onAction={
            comments.length === 0
              ? onRefresh
              : () => resetCommentFilters(onQueryChange)
          }
          secondaryActionLabel={comments.length === 0 ? undefined : '현재 조건 새로고침'}
          onSecondaryAction={comments.length === 0 ? undefined : onRefresh}
        />
      )}
    </div>
  );
}
