import { getEventTypeDisplayLabel } from '@/lib/eventTypes';

import {
  ADMIN_EVENTS_PER_PAGE,
  ADMIN_EVENT_PAGE_SIZE_OPTIONS,
  ADMIN_EVENT_TYPE_OPTIONS,
  type AdminEventPageSize,
  type AdminEventFilters as AdminEventFiltersState,
} from './adminEventWorkspaceModel';
import styles from '../page.module.css';

interface AdminEventFiltersProps {
  filters: AdminEventFiltersState;
  pageSize: AdminEventPageSize;
  onQueryChange: (updates: Record<string, string | null>) => void;
}

export default function AdminEventFilters({
  filters,
  pageSize,
  onQueryChange,
}: AdminEventFiltersProps) {
  const activeAdvancedFilterCount = [
    filters.eventType !== 'all',
    filters.ownership !== 'all',
    filters.sort !== 'updated',
    pageSize !== ADMIN_EVENTS_PER_PAGE,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onQueryChange({
      pageQ: null,
      pageType: null,
      published: null,
      ownership: null,
      pageSort: null,
      event: null,
      pageCategory: null,
      page: null,
    });
  };

  return (
    <form
      className={styles.eventFilters}
      role="search"
      aria-label="이벤트 검색 및 필터"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={styles.eventPrimaryFilters}>
        <label className={styles.eventSearchField}>
          <span className={styles.eventFilterLabel}>검색</span>
          <input
            className="admin-input"
            type="search"
            value={filters.query}
            placeholder="이벤트명 또는 공개 주소 검색"
            onChange={(event) =>
              onQueryChange({ pageQ: event.currentTarget.value || null, event: null, page: '1' })
            }
          />
        </label>
        <label className={styles.eventFilterField}>
          <span className={styles.eventFilterLabel}>공개 상태</span>
          <select
            className="admin-select"
            value={filters.published}
            onChange={(event) =>
              onQueryChange({ published: event.currentTarget.value, event: null, page: '1' })
            }
          >
            <option value="all">전체</option>
            <option value="published">공개</option>
            <option value="private">비공개</option>
          </select>
        </label>
        <button type="button" className={styles.eventFilterReset} onClick={resetFilters}>
          초기화
        </button>
      </div>

      <details className={styles.eventAdvancedFilters}>
        <summary>
          상세 필터
          {activeAdvancedFilterCount > 0 ? ` · ${activeAdvancedFilterCount}개 적용` : ''}
        </summary>
        <div className={styles.eventAdvancedFilterGrid}>
          <label className={styles.eventFilterField}>
            <span className={styles.eventFilterLabel}>유형</span>
            <select
              className="admin-select"
              value={filters.eventType}
              onChange={(event) =>
                onQueryChange({ pageType: event.currentTarget.value, event: null, page: '1' })
              }
            >
              <option value="all">전체 유형</option>
              {ADMIN_EVENT_TYPE_OPTIONS.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {getEventTypeDisplayLabel(eventType, 'admin')}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.eventFilterField}>
            <span className={styles.eventFilterLabel}>고객 연결</span>
            <select
              className="admin-select"
              value={filters.ownership}
              onChange={(event) =>
                onQueryChange({ ownership: event.currentTarget.value, event: null, page: '1' })
              }
            >
              <option value="all">전체</option>
              <option value="customer">고객 연결</option>
              <option value="admin">관리자 소유</option>
              <option value="unassigned">고객 미연결</option>
            </select>
          </label>
          <label className={styles.eventFilterField}>
            <span className={styles.eventFilterLabel}>정렬</span>
            <select
              className="admin-select"
              value={filters.sort}
              onChange={(event) =>
                onQueryChange({ pageSort: event.currentTarget.value, event: null, page: '1' })
              }
            >
              <option value="updated">최근 수정순</option>
              <option value="event-date">행사일순</option>
              <option value="name">이름순</option>
            </select>
          </label>
          <label className={styles.eventFilterField}>
            <span className={styles.eventFilterLabel}>페이지당 개수</span>
            <select
              className="admin-select"
              value={String(pageSize)}
              onChange={(event) =>
                onQueryChange({
                  pageSize: event.currentTarget.value,
                  page: '1',
                  event: null,
                })
              }
            >
              {ADMIN_EVENT_PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}개
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </form>
  );
}
