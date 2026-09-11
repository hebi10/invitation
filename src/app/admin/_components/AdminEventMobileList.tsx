import { getAdminEventVisibility } from './adminEventWorkspaceModel';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';

import { getInvitationThemeAdminLabel } from '@/lib/invitationThemes';
import { buildEventPreviewPath } from '@/lib/eventPreviewLinks';

import styles from './AdminEventList.module.css';

interface AdminEventMobileListProps {
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

function getOwnershipLabel(page: InvitationPageSummary) {
  if (page.ownershipKind === 'customer') return '고객 연결됨';
  if (page.ownershipKind === 'admin') return '관리자 소유';
  return '고객 미연결';
}

export default function AdminEventMobileList({
  pages,
  selectedSlug,
  onSelect,
  routes,
  experience,
}: AdminEventMobileListProps) {
  if (pages.length === 0) return null;

  return (
    <div className={styles.eventMobileList} aria-label="이벤트 목록">
      {pages.map((page) => {
        const isSelected = selectedSlug === page.slug;
        const isReadOnlySeed = experience && page.slug.startsWith('demo-seed-');
        const visibility = getAdminEventVisibility(page);
        const previewHref = experience ? routes.preview(page.slug, page.defaultTheme) : buildEventPreviewPath(page.slug, page.eventType, page.defaultTheme);

        return (
          <article
            key={page.slug}
            className={styles.eventMobileCard}
            data-selected={isSelected || undefined}
          >
            <div className={styles.eventMobileCardHeader}>
              <div className={styles.eventMobileCardText}>
                <p className={styles.eventMobileCardType}>
                  {page.eventType === 'wedding' ? getInvitationThemeAdminLabel(page.defaultTheme) : getEventTypeDisplayLabel(page.eventType, 'admin')}
                </p>
                <h2 className={styles.eventMobileCardTitle}>{page.displayName}</h2>
                {experience && page.slug === 'daily-experience-wedding' ? (
                  <small>금일 체험 청첩장</small>
                ) : null}
                <p className={styles.eventMobileCardDate}>{formatDate(page.date)}</p>
                <p className={styles.eventMobileCardDate}>{page.venue || '장소 미입력'}</p>
              </div>
              <span
                className={styles.eventState}
                data-state={page.published ? 'published' : 'private'}
              >
                {page.published ? '공개' : '비공개'}
              </span>
            </div>

            <p className={styles.eventMobileCardOwnership}>{getOwnershipLabel(page)}{page.published ? ` · ${!page.displayPeriodEnabled ? '기간 제한 없음' : visibility.label === '만료' ? '노출 종료' : visibility.label}` : ''}</p>

            <div className={styles.eventMobileCardActions}>
              <button
                type="button"
                className={styles.eventMobileDetailButton}
                data-event-slug={page.slug}
                data-event-mobile-select
                aria-expanded={isSelected}
                aria-controls="admin-event-detail"
                onClick={() => onSelect(page.slug)}
              >
                상세 보기
              </button>
              {isReadOnlySeed ? (
                <span>조회 전용</span>
              ) : (
                <a className={styles.eventEditLink} href={routes.wizardEdit(page.slug)}>
                  편집
                </a>
              )}
              <a className={styles.eventEditLink} href={previewHref} target="_blank" rel="noopener noreferrer" aria-label={`${page.displayName} 미리보기 (새 창)`}>미리보기</a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
