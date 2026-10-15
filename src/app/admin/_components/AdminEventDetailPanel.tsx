'use client';

import { useEffect, useRef } from 'react';
import { useAdminWorkNavigation } from './AdminWorkGuard';

import { getEventDeletionButtonLabel, getEventDeletionFailureMessage } from '@/lib/adminEventDeletionState';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import { getInvitationThemeAdminLabel, type InvitationThemeKey } from '@/lib/invitationThemes';
import type { InvitationProductTier } from '@/types/invitationPage';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';
import type { Comment } from '@/services/commentService';
import type { AdminCustomerAccountSummary } from '@/services/adminCustomerService';
import { ImageManager, MemoryPageManager } from '@/components/admin';

import {
  getAdminEventCapabilities,
  getAdminEventDetailTabs,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
  getAdminEventVisibility,
  resolveAdminEventDetailTab,
  getAdminEventKeyboardTab,
  type AdminEventDetailTabKey,
} from './adminEventWorkspaceModel';
import AdminEventCommentsTab from './AdminEventCommentsTab';
import AdminEventCustomerTab from './AdminEventCustomerTab';
import AdminEventPeriodTab from './AdminEventPeriodTab';
import AdminEventDesignTab from './AdminEventDesignTab';
import AdminStaleQueryNotice from './AdminStaleQueryNotice';
import styles from '../page.module.css';
import detailStyles from './AdminEventDetailPage.module.css';

interface AdminEventDetailPanelProps {
  page: InvitationPageSummary;
  eventError: Error | null;
  eventRefreshing: boolean;
  selectedDetailTab: string | null;
  mobileReadOnly: boolean;
  onDetailTabChange: (tab: AdminEventDetailTabKey) => void;
  onNavigate: (updates: Record<string, string | null>) => void;
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
  const start = page.displayPeriodStart && !Number.isNaN(page.displayPeriodStart.getTime()) ? formatter.format(page.displayPeriodStart) : '시작일 미정';
  const end = page.displayPeriodEnd && !Number.isNaN(page.displayPeriodEnd.getTime()) ? formatter.format(page.displayPeriodEnd) : '종료일 미정';
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
  eventError,
  eventRefreshing,
  selectedDetailTab,
  mobileReadOnly,
  onDetailTabChange,
  onNavigate,
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
  const capabilities = getAdminEventCapabilities(page);
  const tabs = experience
    ? getAdminEventDetailTabs(page).filter((tab) => tab.key === 'overview' || tab.key === 'design')
    : getAdminEventDetailTabs(page);
  const previewLinks = getAdminEventPreviewLinks(page);
  const preview = previewLinks.find((link) => link.isDefault) ?? previewLinks[0];
  const isReadOnlySeed = experience && page.slug.startsWith('demo-seed-');
  const activeTab = resolveAdminEventDetailTab(selectedDetailTab, tabs);
  const orientation = mobileReadOnly ? 'horizontal' : 'vertical';
  const changeTab = (tab: AdminEventDetailTabKey, focus = false) => {
    if (busy || activeTab === tab) return;
    work.request(() => {
      onDetailTabChange(tab);
      if (focus) document.getElementById(`admin-event-tab-${tab}`)?.focus();
    });
  };

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
          {preview ? <a className="admin-button admin-button-secondary" href={routes.preview(page.slug, preview.theme, page.eventType)} target="_blank" rel="noreferrer">미리보기</a> : null}
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

        <AdminStaleQueryNotice error={eventError} sourceLabel="이벤트" hasPreviousData onRetry={() => { void onRefreshEvent(); }} />
        <div className={detailStyles.layout}>
        <div className={detailStyles.tabs} role="tablist" aria-label="이벤트 관리 항목" aria-orientation={orientation}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`admin-event-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="admin-event-tabpanel"
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={styles.eventDetailTab}
              disabled={busy}
              onClick={() => changeTab(tab.key)}
              onKeyDown={(event) => {
                const nextTab = getAdminEventKeyboardTab(event.key, tab.key, tabs, orientation);
                if (!nextTab) return;
                event.preventDefault();
                changeTab(nextTab, true);
              }}
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
              href={routes.preview(page.slug, preview.theme, page.eventType)}
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
        {!isReadOnlySeed && !mobileReadOnly ? (
          <details className={styles.eventDangerArea}>
            <summary>위험 작업</summary>
            {page.deletion?.status === 'failed' ? <p role="alert">{getEventDeletionFailureMessage({ success: false, failedStep: page.deletion.currentStep, retryable: page.deletion.retryable })}</p> : null}
            <p>이벤트와 연결된 운영 데이터를 완전히 삭제합니다. 삭제 후에는 복구할 수 없습니다.</p>
            <button
              type="button"
              className="admin-button admin-button-danger"
              disabled={deleting}
              onClick={() => onDelete(page)}
            >
              {deleting ? '완전 삭제 중' : getEventDeletionButtonLabel(page.deletion)}
            </button>
          </details>
        ) : null}
        </> : null}

        {activeTab === 'design' && capabilities.includes('themes') ? (
          <AdminEventDesignTab page={page} canEdit={!mobileReadOnly && !experience} routes={routes} onUpdated={onRefreshEvent} />
        ) : null}

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
                readOnly={isReadOnlySeed || mobileReadOnly}
                experience={experience}
                onRefresh={onRefreshAccounts}
                onAssign={onAssignCustomerOwnership}
                onClear={onClearCustomerOwnership}
                onIssueInvite={onIssueOwnershipInvite}
                onOpenCustomer={(uid, tab) => work.request(() => onNavigate({
                  section: 'customers', tab: 'accounts', view: null,
                  customer: uid, customerDetail: tab, event: page.slug, detail: null,
                }))}
              />
            ) : null}
            {activeTab === 'memory' ? (
              mobileReadOnly ? <p className={styles.mobileReadOnlyNotice}>기록 사진과 내용 편집은 PC 관리자 화면을 이용해 주세요.</p> : <MemoryPageManager
                initialPageSlug={page.slug}
                lockedPageSlug={page.slug}
              />
            ) : null}
            {activeTab === 'images' ? (
              mobileReadOnly ? <p className={styles.mobileReadOnlyNotice}>이미지 업로드와 삭제는 PC 관리자 화면을 이용해 주세요.</p> : <ImageManager
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
                readOnly={isReadOnlySeed || mobileReadOnly}
                onRefresh={onRefreshComments}
                onDelete={onDeleteComment}
              />
            ) : null}
          </div>
        ) : null}
        </div>
        <div className={styles.eventWorkStatus} role="status">
          {busy ? '처리 중입니다. 완료될 때까지 기다려 주세요.' : work.dirty ? '저장하지 않은 변경 내용이 있습니다.' : eventRefreshing ? '이벤트 최신 정보를 조회하고 있습니다.' : eventError ? '이전에 조회한 이벤트 정보를 표시합니다.' : '현재 저장된 정보를 표시합니다.'}
        </div>
        </div>
      </section>
  );
}
