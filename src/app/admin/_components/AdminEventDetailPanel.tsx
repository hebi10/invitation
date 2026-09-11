'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminWorkNavigation } from './AdminWorkGuard';

import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import { getInvitationThemeAdminLabel, getInvitationThemeWizardDescription, type InvitationThemeKey } from '@/lib/invitationThemes';
import type { InvitationProductTier } from '@/types/invitationPage';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';
import type { Comment } from '@/services/commentService';
import type { AdminCustomerAccountSummary } from '@/services/adminCustomerService';
import { ImageManager, MemoryPageManager } from '@/components/admin';
import WeddingCover from '@/app/_components/public-invitations/wedding/WeddingCover';
import { sampleWeddingPage, SAMPLE_WEDDING_COVER } from '@/config/homeWeddingSample';

import {
  getAdminEventCapabilities,
  getAdminEventDetailTabs,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
  getAdminEventVisibility,
  type AdminEventDetailTabKey,
} from './adminEventWorkspaceModel';
import AdminEventCommentsTab from './AdminEventCommentsTab';
import AdminEventCustomerTab from './AdminEventCustomerTab';
import AdminEventPeriodTab from './AdminEventPeriodTab';
import { SHORTCUT_ITEMS } from './adminPageUtils';
import styles from '../page.module.css';
import detailStyles from './AdminEventDetailPage.module.css';

interface AdminEventDetailPanelProps {
  page: InvitationPageSummary;
  updatingPublished: boolean;
  updatingTier: boolean;
  updatingVariantToken: string | null;
  deleting: boolean;
  issuingInvite: boolean;
  comments: Comment[];
  commentsLoading: boolean;
  commentsRefreshing: boolean;
  commentsError: Error | null;
  customerAccounts: AdminCustomerAccountSummary[];
  accountsLoading: boolean;
  accountsError: Error | null;
  ownershipActionToken: string | null;
  onClose: () => void;
  onTogglePublished: (page: InvitationPageSummary, next: boolean) => void;
  onChangeTier: (page: InvitationPageSummary, next: InvitationProductTier) => void;
  onEnableVariant: (page: InvitationPageSummary, variantKey: InvitationThemeKey) => void;
  onDisableVariant: (page: InvitationPageSummary, variantKey: InvitationThemeKey) => void;
  onRefreshEvent: () => void | Promise<void>;
  onRefreshComments: () => void;
  onRefreshAccounts: () => void;
  onDeleteComment: (comment: Comment) => void | Promise<void>;
  onAssignCustomerOwnership: (uid: string, pageSlug: string) => void;
  onClearCustomerOwnership: (pageSlug: string) => void;
  onIssueOwnershipInvite: (slug: string) => void;
  onDelete: (page: InvitationPageSummary) => void;
  routes: AppRoutes;
  experience: boolean;
}


function getFullManagementHref(
  routes: AppRoutes,
  query: Record<string, string>
) {
  return `${routes.admin()}?${new URLSearchParams(query).toString()}`;
}

function formatDate(value: string) {
  if (!value) return '일정 미입력';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function getPeriodLabel(page: InvitationPageSummary) {
  if (!page.displayPeriodEnabled) return '기간 제한 없음';

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const start = page.displayPeriodStart ? formatter.format(page.displayPeriodStart) : '시작일 미정';
  const end = page.displayPeriodEnd ? formatter.format(page.displayPeriodEnd) : '종료일 미정';
  return `${start} ~ ${end}`;
}

function getOwnershipLabel(page: InvitationPageSummary) {
  if (page.ownershipKind === 'customer') return '고객 연결됨';
  if (page.ownershipKind === 'admin') return '관리자 소유';
  return '고객 미연결';
}

export default function AdminEventDetailPanel(props: AdminEventDetailPanelProps) {
  return <EventDetailWorkspace key={props.page.slug} {...props} />;
}

function EventDetailWorkspace({
  page,
  updatingPublished,
  updatingTier,
  updatingVariantToken,
  deleting,
  issuingInvite,
  comments,
  commentsLoading,
  commentsRefreshing,
  commentsError,
  customerAccounts,
  accountsLoading,
  accountsError,
  ownershipActionToken,
  onClose,
  onTogglePublished,
  onEnableVariant,
  onDisableVariant,
  onRefreshEvent,
  onRefreshComments,
  onRefreshAccounts,
  onDeleteComment,
  onAssignCustomerOwnership,
  onClearCustomerOwnership,
  onIssueOwnershipInvite,
  onDelete,
  routes,
  experience,
}: AdminEventDetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const work = useAdminWorkNavigation();
  const busy = work.busy || updatingPublished || updatingTier || !!updatingVariantToken || deleting || issuingInvite || !!ownershipActionToken;
  const requestClose = () => { if (!busy) work.request(onClose); };
  const [activeTab, setActiveTab] = useState<AdminEventDetailTabKey>('overview');
  const capabilities = getAdminEventCapabilities(page);
  const tabs = experience
    ? getAdminEventDetailTabs(page).filter((tab) => tab.key === 'overview' || tab.key === 'design')
    : getAdminEventDetailTabs(page);
  const previewLinks = getAdminEventPreviewLinks(page);
  const preview = previewLinks.find((link) => link.isDefault) ?? previewLinks[0];
  const isReadOnlySeed = experience && page.slug.startsWith('demo-seed-');

  useEffect(() => {
    setActiveTab('overview');
  }, [page.slug]);

  useEffect(() => { panelRef.current?.focus(); }, [page.slug]);

  return (
      <section id="admin-event-detail" ref={panelRef} tabIndex={-1} className={detailStyles.page} aria-labelledby="admin-event-detail-title">
        <button type="button" className={detailStyles.back} disabled={busy} onClick={requestClose}>이벤트 목록으로</button>
        <div className={styles.eventDetailHeader}>
          <div className={styles.eventDetailHeading}>
            <p className={styles.eventDetailType}>
              {getEventTypeDisplayLabel(page.eventType, 'admin')} · {getAdminEventVisibility(page).label}
            </p>
            <h1 id="admin-event-detail-title" className={styles.eventDetailTitle}>
              {page.displayName}
            </h1>
            <p className={detailStyles.summary}>{formatDate(page.date)} · {page.venue || '장소 미입력'}</p>
            <p className={detailStyles.summary}>{page.published ? '공개' : '비공개'}{page.defaultTheme ? ` · ${getInvitationThemeAdminLabel(page.defaultTheme)}` : ''}</p>
          </div>
          <div className={styles.eventHeaderActions}>
          {preview ? <a className="admin-button admin-button-secondary" href={routes.preview(page.slug, preview.theme)} target="_blank" rel="noreferrer">미리보기</a> : null}
          <button
            type="button"
            className={detailStyles.close} aria-label="이벤트 상세 닫기" title="이벤트 목록으로"
            onClick={requestClose}
            disabled={busy}
          >
            <img src="/images/admin/close.webp" alt="" width="18" height="18" />
          </button>
          </div>
        </div>

        <div className={detailStyles.layout}>
        <div className={detailStyles.tabs} role="tablist" aria-label="이벤트 관리 항목">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`admin-event-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="admin-event-tabpanel"
              className={styles.eventDetailTab}
              disabled={busy}
              onClick={() => work.request(() => setActiveTab(tab.key))}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id="admin-event-tabpanel"
          className={detailStyles.content}
          role="tabpanel"
          aria-labelledby={`admin-event-tab-${activeTab}`}
        >
        {activeTab === 'overview' ? <>

        <dl className={styles.eventDetailMeta}>
          <div>
            <dt>행사일</dt>
            <dd>{formatDate(page.date)}</dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{page.venue || '장소 미입력'}</dd>
          </div>
          <div>
            <dt>공개 주소</dt>
            <dd>/{page.slug}</dd>
          </div>
        </dl>

        <div className={styles.eventDetailActions}>
          {!isReadOnlySeed ? (
            <a className="admin-button admin-button-primary" href={routes.wizardEdit(page.slug)}>
              편집
            </a>
          ) : null}
          {preview ? (
            <a
              className="admin-button admin-button-secondary"
              href={routes.preview(page.slug, preview.theme)}
              target="_blank"
              rel="noreferrer"
            >
              미리보기
            </a>
          ) : null}
        </div>

        {experience ? <section className={styles.eventDetailOperations} aria-label="공개 설정">
          <label className={styles.eventDetailStatusField}>
            <span>공개 상태</span>
            <select className="admin-select" value={page.published ? 'published' : 'private'} disabled={updatingPublished || isReadOnlySeed}
              onChange={(event) => onTogglePublished(page, event.currentTarget.value === 'published')} aria-label={`${page.displayName} 공개 상태`}>
              <option value="published">공개</option><option value="private">비공개</option>
            </select>
          </label>
        </section> : null}

        <div className={styles.eventDetailContext}>
          <p>
            <strong>노출 기간</strong>
            <span>{getPeriodLabel(page)}</span>
          </p>
          <p>
            <strong>고객 연결</strong>
            <span>{getOwnershipLabel(page)}</span>
          </p>
        </div>

        {isReadOnlySeed ? <p>기본 체험 데이터는 조회 전용입니다.</p> : null}
        {!isReadOnlySeed ? (
          <details className={styles.eventDangerArea}>
            <summary>위험 작업</summary>
            <p>이벤트와 연결된 운영 데이터를 완전히 삭제합니다. 삭제 후에는 복구할 수 없습니다.</p>
            <button
              type="button"
              className="admin-button admin-button-danger"
              disabled={deleting}
              onClick={() => onDelete(page)}
            >
              {deleting ? '완전 삭제 중' : '완전 삭제'}
            </button>
          </details>
        ) : null}
        </> : null}

        {activeTab === 'design' ? <>          {capabilities.includes('themes') ? (
            <div className={styles.eventThemeManager}>
              <h4 className={styles.eventThemeHeading}>청첩장 디자인</h4>
              <p className={styles.eventThemeHelp}>같은 샘플 사진으로 5종의 구성을 비교하세요. ‘고객 페이지 열기’에서는 {page.displayName}님의 저장된 사진과 내용을 확인할 수 있습니다.</p>
              <ul>
                {SHORTCUT_ITEMS.map((theme) => {
                  const isAvailable = page.variants?.[theme.key]?.available === true;
                  const isUpdating = updatingVariantToken === `${page.slug}:${theme.key}`;

                  return (
                    <li key={theme.key} data-current={theme.key === page.defaultTheme}>
                      <div className={styles.eventThemeThumbnail} aria-hidden="true">
                        <div><WeddingCover theme={theme.key} page={sampleWeddingPage} imageUrl={SAMPLE_WEDDING_COVER} titleId={`admin-theme-cover-${theme.key}`} /></div>
                      </div>
                      <div className={styles.eventThemeIdentity}>
                        <strong>{theme.label}</strong>
                        <span>{theme.key === page.defaultTheme ? '기본 적용' : isAvailable ? '연결됨' : '미연결'}</span>
                      </div>
                      <p className={styles.eventThemeDescription}>{getInvitationThemeWizardDescription(theme.key)}</p>
                      {isAvailable ? (
                        <a
                          className="admin-button admin-button-secondary"
                          href={routes.preview(page.slug, theme.key)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${theme.label} 청첩장 페이지 열기 (새 탭)`}
                        >
                          고객 페이지 열기
                        </a>
                      ) : <span className={styles.eventThemeUnavailable}>디자인 연결 후 페이지를 열 수 있습니다.</span>}
                      <button
                        type="button"
                        className="admin-button admin-button-ghost"
                        disabled={isUpdating || isReadOnlySeed}
                        onClick={() =>
                          isAvailable
                            ? onDisableVariant(page, theme.key)
                            : onEnableVariant(page, theme.key)
                        }
                        aria-label={`${theme.label} ${isAvailable ? '디자인 연결 해제' : '디자인 연결'}`}
                      >
                        {isUpdating ? '처리 중' : isAvailable ? '연결 해제' : '디자인 연결'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
</> : null}

        {activeTab !== 'overview' && activeTab !== 'design' ? (
          <div className={styles.eventManagementPanel}>
            <div className={styles.eventManagementToolbar}>
              <p>{tabs.find((tab) => tab.key === activeTab)?.label}</p>
              <a
                className="admin-button admin-button-secondary"
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  const href = event.currentTarget.href;
                  if (!busy) work.request(() => { window.location.href = href; });
                }}
                href={getFullManagementHref(
                  routes,
                  getAdminEventRelatedQuery(page, activeTab)
                )}
              >
                전체 관리 화면
              </a>
            </div>

            {activeTab === 'period' ? <>        <label className={styles.eventDetailStatusField}>
          <span>공개 상태</span>
          <select
            className="admin-select"
            value={page.published ? 'published' : 'private'}
            disabled={updatingPublished || isReadOnlySeed}
            onChange={(event) => onTogglePublished(page, event.currentTarget.value === 'published')}
            aria-label={`${page.displayName} 공개 상태`}
          >
            <option value="published">공개</option>
            <option value="private">비공개</option>
          </select>
          {updatingPublished ? <small>변경 중입니다.</small> : null}
        </label>

</> : null}
            {activeTab === 'period' ? (
              <AdminEventPeriodTab
                page={page}
                readOnly={isReadOnlySeed}
                onUpdated={onRefreshEvent}
              />
            ) : null}
            {activeTab === 'ownership' ? (
              <AdminEventCustomerTab
                page={page}
                accounts={customerAccounts}
                loading={accountsLoading}
                error={accountsError}
                ownershipActionToken={ownershipActionToken}
                issuingInvite={issuingInvite}
                readOnly={isReadOnlySeed}
                onRefresh={onRefreshAccounts}
                onAssign={onAssignCustomerOwnership}
                onClear={onClearCustomerOwnership}
                onIssueInvite={onIssueOwnershipInvite}
              />
            ) : null}
            {activeTab === 'memory' ? (
              <MemoryPageManager
                initialPageSlug={page.slug}
                lockedPageSlug={page.slug}
              />
            ) : null}
            {activeTab === 'images' ? (
              <ImageManager
                eventTypeFilter={page.eventType}
                initialPageSlug={page.slug}
                lockedPageSlug={page.slug}
              />
            ) : null}
            {activeTab === 'comments' ? (
              <AdminEventCommentsTab
                pageSlug={page.slug}
                comments={comments}
                loading={commentsLoading}
                refreshing={commentsRefreshing}
                error={commentsError}
                onRefresh={onRefreshComments}
                onDelete={onDeleteComment}
              />
            ) : null}
          </div>
        ) : null}
        </div>
        <div className={styles.eventWorkStatus} role="status">
          {busy ? '처리 중입니다. 완료될 때까지 기다려 주세요.' : work.dirty ? '저장하지 않은 변경 내용이 있습니다.' : '현재 저장된 정보를 표시합니다.'}
        </div>
        </div>
      </section>
  );
}
