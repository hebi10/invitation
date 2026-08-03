import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';

import styles from '../page.module.css';

interface AdminEventListProps {
  pages: InvitationPageSummary[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

function formatDate(value: string) {
  if (!value) return '일정 미입력';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatUpdatedAt(value: Date | null) {
  if (!value) return '수정 기록 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function getOwnershipLabel(page: InvitationPageSummary) {
  if (page.ownershipKind === 'customer') return '고객 연결';
  if (page.ownershipKind === 'admin') return '관리자 소유';
  return '고객 미연결';
}

export default function AdminEventList({
  pages,
  selectedSlug,
  onSelect,
}: AdminEventListProps) {
  if (pages.length === 0) {
    return (
      <div className={styles.eventListEmpty} role="status">
        현재 조건에 맞는 이벤트가 없습니다. 검색어나 필터를 조정해 주세요.
      </div>
    );
  }

  return (
    <div className={styles.eventListFrame}>
      <table className={styles.eventListTable}>
        <thead>
          <tr>
            <th scope="col">이벤트</th>
            <th scope="col">유형</th>
            <th scope="col">행사일</th>
            <th scope="col">공개 상태</th>
            <th scope="col">고객 연결</th>
            <th scope="col">최근 수정</th>
            <th scope="col">편집</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => {
            const isSelected = selectedSlug === page.slug;
            return (
              <tr key={page.slug} data-selected={isSelected || undefined}>
                <td>
                  <button
                    type="button"
                    className={styles.eventSelectButton}
                    data-event-slug={page.slug}
                    aria-expanded={isSelected}
                    aria-controls="admin-event-detail"
                    onClick={() => onSelect(page.slug)}
                  >
                    <strong>{page.displayName}</strong>
                    <span>/{page.slug}</span>
                  </button>
                </td>
                <td>{getEventTypeDisplayLabel(page.eventType, 'admin')}</td>
                <td>{formatDate(page.date)}</td>
                <td>
                  <span className={styles.eventState} data-state={page.published ? 'published' : 'private'}>
                    {page.published ? '공개' : '비공개'}
                  </span>
                </td>
                <td>{getOwnershipLabel(page)}</td>
                <td>{formatUpdatedAt(page.updatedAt)}</td>
                <td>
                  <a className={styles.eventEditLink} href={`/page-wizard/${page.slug}`}>
                    편집
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
