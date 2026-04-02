import type { Comment } from '@/services';

import { EmptyState, FilterToolbar, Pagination, StatusBadge } from '.';
import {
  COMMENT_AGE_LABELS,
  COMMENTS_PER_PAGE,
  formatDateTime,
  type CommentAgeFilter,
} from './adminPageUtils';
import styles from '../page.module.css';

interface AdminCommentsTabProps {
  commentsLoading: boolean;
  comments: Comment[];
  filteredComments: Comment[];
  currentComments: Comment[];
  currentPage: number;
  totalPages: number;
  commentSearch: string;
  selectedPageSlug: string;
  commentAgeFilter: CommentAgeFilter;
  chips: Array<{ id: string; label: string; onRemove: () => void }>;
  commentPageOptions: Array<{ value: string; label: string }>;
  onRefresh: () => void;
  onQueryChange: (updates: Record<string, string | null>) => void;
  onDeleteComment: (comment: Comment) => void;
}

export default function AdminCommentsTab({
  commentsLoading,
  comments,
  filteredComments,
  currentComments,
  currentPage,
  totalPages,
  commentSearch,
  selectedPageSlug,
  commentAgeFilter,
  chips,
  commentPageOptions,
  onRefresh,
  onQueryChange,
  onDeleteComment,
}: AdminCommentsTabProps) {
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>방명록 관리</h2>
          <p className={styles.sectionDescription}>
            페이지, 검색어, 최근 댓글 필터를 기준으로 한 번에 조회하고 바로 삭제할 수
            있습니다.
          </p>
        </div>
        <p className={styles.sectionMeta}>총 {filteredComments.length}개 댓글</p>
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="작성자, 메시지, slug 검색"
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
              disabled={commentsLoading}
            >
              {commentsLoading ? '새로고침 중...' : '새로고침'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-ghost"
              onClick={() =>
                onQueryChange({
                  commentQ: null,
                  commentPageSlug: null,
                  commentAge: null,
                  commentPage: '1',
                })
              }
            >
              필터 초기화
            </button>
          </>
        }
        chips={chips}
      />

      {commentsLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>방명록 목록을 불러오는 중입니다.</p>
        </div>
      ) : currentComments.length > 0 ? (
        <>
          <div className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>작성자</th>
                    <th>페이지</th>
                    <th>메시지</th>
                    <th>등록일</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {currentComments.map((comment, index) => (
                    <tr key={`${comment.collectionName ?? 'comments'}:${comment.id}`}>
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
          </div>

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

                <div className={styles.mobileCardActions}>
                  <button
                    type="button"
                    className="admin-button admin-button-danger"
                    onClick={() => onDeleteComment(comment)}
                  >
                    삭제
                  </button>
                </div>
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
              ? '등록된 방명록이 없습니다.'
              : '조건에 맞는 방명록이 없습니다.'
          }
          description={
            comments.length === 0
              ? '댓글이 등록되면 이곳에서 검색과 삭제를 관리할 수 있습니다.'
              : '검색어 또는 필터를 조정해서 다시 확인해 주세요.'
          }
          actionLabel={comments.length === 0 ? '새로고침' : '필터 초기화'}
          onAction={
            comments.length === 0
              ? onRefresh
              : () =>
                  onQueryChange({
                    commentQ: null,
                    commentPageSlug: null,
                    commentAge: null,
                    commentPage: '1',
                  })
          }
        />
      )}
    </div>
  );
}
