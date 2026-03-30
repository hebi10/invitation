import { EmptyState, FilterToolbar, StatusBadge } from '.';
import type { InvitationPageSummary } from '@/services';
import {
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  TOTAL_SHORTCUT_COUNT,
  SHORTCUT_ITEMS,
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
}: AdminPagesTabProps) {
  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>청첩장 라우트 현황</h2>
          <p className={styles.sectionDescription}>Firestore에 저장된 invitation-pages 문서를 기준으로 공개 상태와 테마 바로가기를 확인합니다.</p>
        </div>
        <p className={styles.sectionMeta}>{summaryLoading ? '집계 중' : `총 ${filteredPages.length}개 페이지`}</p>
      </div>

      <div className={styles.shortcutStrip}>
        {SHORTCUT_ITEMS.map((shortcut) => {
          const count = weddingPages.filter((page) => page.variants?.[shortcut.key]?.available).length;
          const isActive = pageShortcutFilter === shortcut.key;

          return (
            <button
              key={shortcut.key}
              type="button"
              className={`${styles.shortcutPill} ${isActive ? styles.shortcutPillActive : ''}`}
              onClick={() => onQueryChange({ shortcut: isActive ? null : shortcut.key })}
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
                placeholder="이름, slug, 장소 검색"
                value={pageSearch}
                onChange={(event) => onQueryChange({ pageQ: event.target.value || null })}
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">상태</span>
              <select className="admin-select" value={pageStatusFilter} onChange={(event) => onQueryChange({ pageStatus: event.target.value })}>
                {Object.entries(PAGE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">테마</span>
              <select className="admin-select" value={pageShortcutFilter} onChange={(event) => onQueryChange({ shortcut: event.target.value })}>
                <option value="all">전체 테마</option>
                {SHORTCUT_ITEMS.map((shortcut) => (
                  <option key={shortcut.key} value={shortcut.key}>
                    {shortcut.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">정렬</span>
              <select className="admin-select" value={pageSort} onChange={(event) => onQueryChange({ pageSort: event.target.value })}>
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
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={() => onQueryChange({ pageQ: null, shortcut: null, pageStatus: null, pageSort: null })}
          >
            필터 초기화
          </button>
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
                    <th>일정 / 장소</th>
                    <th>바로가기 상태</th>
                    <th>공개</th>
                    <th>테마 링크</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.map((page, index) => {
                    const links = getAvailableShortcuts(page);
                    const status = getPageStatusMeta(links.length);

                    return (
                      <tr key={page.slug}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.rowNumber}>{filteredPages.length - index}</span>
                            <div>
                              <p className={styles.tableTitle}>{page.displayName}</p>
                              <p className={styles.tableSubtext}>{page.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.metaStack}>
                            <span>{page.date || '일정 정보 없음'}</span>
                            <span className={styles.tableSubtext}>{page.venue || '장소 정보 없음'}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            <span className={styles.tableSubtext}>
                              {links.length} / {TOTAL_SHORTCUT_COUNT} 연결
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge tone={page.published ? 'success' : 'neutral'}>
                            {page.published ? 'Published' : 'Draft'}
                          </StatusBadge>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            {links.length > 0 ? (
                              links.map((link) => (
                                <a key={link.key} href={link.path} target="_blank" rel="noreferrer" className="admin-button admin-button-ghost">
                                  {link.label}
                                </a>
                              ))
                            ) : (
                              <span className={styles.tableSubtext}>연결된 링크 없음</span>
                            )}
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
                    <span>{page.date || '일정 정보 없음'}</span>
                    <span>{page.venue || '장소 정보 없음'}</span>
                    <span>{page.published ? 'Published' : 'Draft'}</span>
                  </div>

                  <div className={styles.mobileCardActions}>
                    {links.length > 0 ? (
                      links.map((link) => (
                        <a key={link.key} href={link.path} target="_blank" rel="noreferrer" className="admin-button admin-button-ghost">
                          {link.label}
                        </a>
                      ))
                    ) : (
                      <span className={styles.tableSubtext}>연결된 링크 없음</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          title="조건에 맞는 청첩장이 없습니다."
          description="검색어나 필터를 조정한 뒤 다시 확인해주세요."
          actionLabel="필터 초기화"
          onAction={() => onQueryChange({ pageQ: null, shortcut: null, pageStatus: null, pageSort: null })}
        />
      )}
    </div>
  );
}
