import type { InvitationPageSummary } from '@/services';

import { EmptyState, FilterToolbar, StatusBadge } from '.';
import {
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  SHORTCUT_ITEMS,
  TOTAL_SHORTCUT_COUNT,
  type PageSort,
  type PageStatusFilter,
  type ShortcutKey,
  getAvailableShortcuts,
  getPageStatusMeta,
} from './adminPageUtils';
import styles from '../page.module.css';

interface AdminPagesTabProps {
  loading: boolean;
  summaryLoading: boolean;
  weddingPages: InvitationPageSummary[];
  filteredPages: InvitationPageSummary[];
  pageSearch: string;
  pageShortcutFilter: 'all' | ShortcutKey;
  pageStatusFilter: PageStatusFilter;
  pageSort: PageSort;
  chips: Array<{ id: string; label: string; onRemove: () => void }>;
  onQueryChange: (updates: Record<string, string | null>) => void;
  onRefresh: () => void;
}

function getSourceMeta(page: InvitationPageSummary) {
  if (page.hasCustomConfig || page.dataSource === 'firestore') {
    return {
      label: 'Firestore 사용자 설정',
      description: '기본 config 위에 고객 또는 관리자 설정이 덮여 있습니다.',
      tone: 'primary' as const,
    };
  }

  return {
    label: 'Seed 기본값',
    description: '로컬 config 기본값을 그대로 사용 중입니다.',
    tone: 'neutral' as const,
  };
}

function getPrimaryPreview(page: InvitationPageSummary) {
  const links = getAvailableShortcuts(page);
  const emotionalLink = links.find((link) => link.key === 'emotional');
  const simpleLink = links.find((link) => link.key === 'simple');
  const primaryLink = emotionalLink ?? simpleLink ?? links[0] ?? null;

  return {
    link: primaryLink,
    hint:
      links.length === 0
        ? '미리보기 경로가 아직 연결되지 않았습니다.'
        : links.length === TOTAL_SHORTCUT_COUNT
          ? '감성형과 심플형 두 가지 미리보기를 모두 확인할 수 있습니다.'
          : `${links[0].label} 미리보기만 연결되어 있습니다.`,
  };
}

export default function AdminPagesTab({
  loading,
  summaryLoading,
  weddingPages,
  filteredPages,
  pageSearch,
  pageShortcutFilter,
  pageStatusFilter,
  pageSort,
  chips,
  onQueryChange,
  onRefresh,
}: AdminPagesTabProps) {
  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>청첩장 관리</h2>
          <p className={styles.sectionDescription}>
            공개 상태와 테마 연결, 데이터 기준을 확인하고 가장 중요한 작업인 편집으로
            바로 이동할 수 있습니다.
          </p>
        </div>
        <p className={styles.sectionMeta}>
          {summaryLoading ? '집계 중' : `현재 ${filteredPages.length}개 / 전체 ${weddingPages.length}개`}
        </p>
      </div>

      <div className={styles.shortcutStrip}>
        {SHORTCUT_ITEMS.map((shortcut) => {
          const count = weddingPages.filter(
            (page) => page.variants?.[shortcut.key]?.available
          ).length;
          const isActive = pageShortcutFilter === shortcut.key;

          return (
            <button
              key={shortcut.key}
              type="button"
              className={`${styles.shortcutPill} ${
                isActive ? styles.shortcutPillActive : ''
              }`}
              onClick={() =>
                onQueryChange({ shortcut: isActive ? null : shortcut.key })
              }
            >
              <span>{shortcut.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="이름, slug, 예식장으로 찾기"
                value={pageSearch}
                onChange={(event) =>
                  onQueryChange({ pageQ: event.target.value || null })
                }
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">연결 상태</span>
              <select
                className="admin-select"
                value={pageStatusFilter}
                onChange={(event) =>
                  onQueryChange({ pageStatus: event.target.value })
                }
              >
                {Object.entries(PAGE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">바로가기 종류</span>
              <select
                className="admin-select"
                value={pageShortcutFilter}
                onChange={(event) =>
                  onQueryChange({ shortcut: event.target.value })
                }
              >
                <option value="all">전체 바로가기</option>
                {SHORTCUT_ITEMS.map((shortcut) => (
                  <option key={shortcut.key} value={shortcut.key}>
                    {shortcut.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">정렬</span>
              <select
                className="admin-select"
                value={pageSort}
                onChange={(event) =>
                  onQueryChange({ pageSort: event.target.value })
                }
              >
                {Object.entries(PAGE_SORT_LABELS).map(([value, label]) => (
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
              disabled={loading}
            >
              {loading ? '새로고침 중..' : '새로고침'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-ghost"
              onClick={() =>
                onQueryChange({
                  pageQ: null,
                  shortcut: null,
                  pageStatus: null,
                  pageSort: null,
                })
              }
            >
              필터 초기화
            </button>
          </>
        }
        chips={chips}
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>청첩장 목록을 불러오는 중입니다.</p>
        </div>
      ) : filteredPages.length > 0 ? (
        <>
          <div className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>청첩장</th>
                    <th>예식 정보</th>
                    <th>테마 연결 상태</th>
                    <th>공개 상태</th>
                    <th>데이터 기준</th>
                    <th>주요 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.map((page, index) => {
                    const links = getAvailableShortcuts(page);
                    const status = getPageStatusMeta(links.length);
                    const sourceMeta = getSourceMeta(page);
                    const preview = getPrimaryPreview(page);

                    return (
                      <tr key={page.slug} className={styles.tableRowInteractive}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.rowNumber}>
                              {filteredPages.length - index}
                            </span>
                            <a
                              href={`/page-editor/${page.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.primaryCellLink}
                            >
                              <p className={styles.tableTitle}>{page.displayName}</p>
                              <p className={styles.tableSubtext}>{page.slug}</p>
                            </a>
                          </div>
                        </td>
                        <td>
                          <div className={styles.metaStack}>
                            <span>{page.date || '예식 일정이 아직 없습니다.'}</span>
                            <span className={styles.tableSubtext}>
                              {page.venue || '예식장 정보가 아직 없습니다.'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            <span className={styles.tableSubtext}>
                              {links.length} / {TOTAL_SHORTCUT_COUNT}개 테마 연결
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge tone={page.published ? 'success' : 'neutral'}>
                            {page.published ? '공개' : '비공개'}
                          </StatusBadge>
                        </td>
                        <td>
                          <div className={styles.sourceInfo}>
                            <StatusBadge tone={sourceMeta.tone}>
                              {sourceMeta.label}
                            </StatusBadge>
                            <span className={styles.tableSubtext}>
                              {sourceMeta.description}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionStack}>
                            <div className={styles.tableActions}>
                              <a
                                href={`/page-editor/${page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-button admin-button-primary"
                              >
                                편집
                              </a>
                              {preview.link ? (
                                <a
                                  href={preview.link.path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="admin-button admin-button-ghost"
                                >
                                  미리보기
                                </a>
                              ) : null}
                            </div>
                            <span className={styles.actionHint}>{preview.hint}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {filteredPages.map((page) => {
              const links = getAvailableShortcuts(page);
              const status = getPageStatusMeta(links.length);
              const sourceMeta = getSourceMeta(page);
              const preview = getPrimaryPreview(page);

              return (
                <article key={page.slug} className={styles.mobileCard}>
                  <div className={styles.mobileCardHead}>
                    <div>
                      <h3 className={styles.mobileCardTitle}>{page.displayName}</h3>
                      <p className={styles.mobileCardSlug}>{page.slug}</p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  <div className={styles.mobileCardMeta}>
                    <span>{page.date || '예식 일정 없음'}</span>
                    <span>{page.venue || '예식장 정보 없음'}</span>
                    <span>{page.published ? '공개 중' : '비공개'}</span>
                    <span>{sourceMeta.label}</span>
                  </div>

                  <div className={styles.actionStack}>
                    <div className={styles.mobileCardActions}>
                      <a
                        href={`/page-editor/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-button admin-button-primary"
                      >
                        편집
                      </a>
                      {preview.link ? (
                        <a
                          href={preview.link.path}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-button admin-button-ghost"
                        >
                          미리보기
                        </a>
                      ) : null}
                    </div>
                    <span className={styles.actionHint}>{preview.hint}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          title="조건에 맞는 청첩장이 없습니다."
          description="검색어나 필터가 너무 좁게 잡혀 있을 수 있습니다. 조건을 풀고 다시 확인해 보세요."
          highlights={[
            '핵심 작업은 편집입니다. 필요한 페이지를 찾으면 바로 편집기로 이동할 수 있습니다.',
            '바로가기 종류와 연결 상태를 함께 보면 미리보기 누락 페이지를 빠르게 찾을 수 있습니다.',
          ]}
          actionLabel="필터 초기화"
          onAction={() =>
            onQueryChange({
              pageQ: null,
              shortcut: null,
              pageStatus: null,
              pageSort: null,
            })
          }
          secondaryActionLabel="현재 조건 새로고침"
          onSecondaryAction={onRefresh}
        />
      )}
    </div>
  );
}
