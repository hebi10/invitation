import { getAdminEventVisibility } from './adminEventWorkspaceModel';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';

import { getInvitationThemeAdminLabel } from '@/lib/invitationThemes';
import { buildEventPreviewPath } from '@/lib/eventPreviewLinks';

import styles from './AdminEventList.module.css';

interface AdminEventListProps {
  pages: InvitationPageSummary[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  routes: AppRoutes;
  experience: boolean;
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
  routes,
  experience,
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
            <th scope="col">행사 정보</th>
            <th scope="col">{pages.every((page) => page.eventType === 'wedding') ? '디자인' : '유형 · 디자인'}</th>
            <th scope="col">공개 · 노출</th>
            <th scope="col">고객 연결</th>
            <th scope="col">최근 수정</th>
            <th scope="col">작업</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => {
            const isSelected = selectedSlug === page.slug;
            const isReadOnlySeed = experience && page.slug.startsWith('demo-seed-');
            const visibility = getAdminEventVisibility(page);
            const previewHref = experience ? routes.preview(page.slug, page.defaultTheme) : buildEventPreviewPath(page.slug, page.eventType, page.defaultTheme);
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
                    {experience && page.slug === 'daily-experience-wedding' ? (
                      <small>금일 체험 청첩장</small>
                    ) : null}
                    <span>/{page.slug}</span>
                  </button>
                </td>
                <td><div className={styles.cellStack}><span>{formatDate(page.date)}</span><small>{page.venue || '장소 미입력'}</small></div></td>
                <td>{page.eventType === 'wedding' ? getInvitationThemeAdminLabel(page.defaultTheme) : getEventTypeDisplayLabel(page.eventType, 'admin')}</td>
                <td>
                  <span className={styles.eventState} data-state={page.published ? 'published' : 'private'}>
                    {page.published ? '공개' : '비공개'}
                  </span>
                  {page.published ? <small className={styles.visibility} title={visibility.description}>{!page.displayPeriodEnabled ? '기간 제한 없음' : visibility.label === '만료' ? '노출 종료' : visibility.label}</small> : null}
                </td>
                <td>{getOwnershipLabel(page)}</td>
                <td>{formatUpdatedAt(page.updatedAt)}</td>
                <td>
                  <div className={styles.rowActions}>
                  <button type="button" onClick={() => onSelect(page.slug)}>상세</button>
                  {isReadOnlySeed ? (
                    <span>조회 전용</span>
                  ) : (
                    <a className={styles.eventEditLink} href={routes.wizardEdit(page.slug)}>
                      편집
                    </a>
                  )}
                  <a href={previewHref} target="_blank" rel="noopener noreferrer" aria-label={`${page.displayName} 미리보기 (새 창)`}>미리보기</a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
