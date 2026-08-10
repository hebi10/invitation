'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
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
  isAdminEventDetailCloseKey,
  type AdminEventDetailTabKey,
} from './adminEventWorkspaceModel';
import AdminEventCommentsTab from './AdminEventCommentsTab';
import AdminEventCustomerTab from './AdminEventCustomerTab';
import AdminEventPeriodTab from './AdminEventPeriodTab';
import { SHORTCUT_ITEMS } from './adminPageUtils';
import styles from '../page.module.css';

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
  onDeleteComment: (comment: Comment) => void;
  onAssignCustomerOwnership: (uid: string, pageSlug: string) => void;
  onClearCustomerOwnership: (pageSlug: string) => void;
  onIssueOwnershipInvite: (slug: string) => void;
  onDelete: (page: InvitationPageSummary) => void;
  routes: AppRoutes;
  experience: boolean;
}

const TIER_OPTIONS: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];

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
  if (!page.displayPeriodEnabled) return '상시 노출';

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

function getVisibleTabbableElements(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((element) => element.offsetParent !== null && element.getAttribute('aria-hidden') !== 'true');
}

export default function AdminEventDetailPanel({
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
  onChangeTier,
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<AdminEventDetailTabKey>('overview');
  const capabilities = getAdminEventCapabilities(page);
  const tabs = experience
    ? getAdminEventDetailTabs(page).filter((tab) => tab.key === 'overview')
    : getAdminEventDetailTabs(page);
  const previewLinks = getAdminEventPreviewLinks(page);
  const preview = previewLinks.find((link) => link.isDefault) ?? previewLinks[0];
  const isReadOnlySeed = experience && page.slug.startsWith('demo-seed-');

  useEffect(() => {
    setActiveTab('overview');
  }, [page.slug]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setPortalRoot(document.querySelector<HTMLElement>('[data-admin-ui]') ?? document.body);
  }, []);

  useEffect(() => {
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isAdminEventDetailCloseKey(event.key)) return;

      event.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => document.removeEventListener('keydown', handleDocumentKeyDown);
  }, []);

  useEffect(() => {
    if (!portalRoot) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, [page.slug, portalRoot]);

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;

    const tabbableElements = getVisibleTabbableElements(panelRef.current);
    if (tabbableElements.length === 0) return;

    const first = tabbableElements[0];
    const last = tabbableElements[tabbableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === first || !panelRef.current.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      className={styles.eventDetailBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        id="admin-event-detail"
        ref={panelRef}
        className={styles.eventDetailPanel}
        aria-labelledby="admin-event-detail-title"
        aria-modal="true"
        role="dialog"
        onKeyDown={handlePanelKeyDown}
      >
        <div className={styles.eventDetailHeader}>
          <div className={styles.eventDetailHeading}>
            <p className={styles.eventDetailType}>
              {getEventTypeDisplayLabel(page.eventType, 'admin')}
            </p>
            <h2 id="admin-event-detail-title" className={styles.eventDetailTitle}>
              {page.displayName}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.eventDetailClose}
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className={styles.eventDetailTabs} role="tablist" aria-label="이벤트 관리 항목">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`admin-event-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="admin-event-tabpanel"
              className={styles.eventDetailTab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id="admin-event-tabpanel"
          className={styles.eventDetailTabPanel}
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

        <label className={styles.eventDetailStatusField}>
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

        <section className={styles.eventDetailOperations} aria-labelledby="event-operations-title">
          <h3 id="event-operations-title">운영 설정</h3>
          <label className={styles.eventDetailStatusField}>
            <span>상품 등급</span>
            <select
              className="admin-select"
              value={page.productTier}
              disabled={updatingTier || isReadOnlySeed}
              onChange={(event) =>
                onChangeTier(page, event.currentTarget.value as InvitationProductTier)
              }
              aria-label={`${page.displayName} 상품 등급`}
            >
              {TIER_OPTIONS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier.toUpperCase()}
                </option>
              ))}
            </select>
            {updatingTier ? <small>변경 중입니다.</small> : null}
          </label>

          {capabilities.includes('themes') ? (
            <div className={styles.eventThemeManager}>
              <p>청첩장 테마</p>
              <ul>
                {SHORTCUT_ITEMS.map((theme) => {
                  const isAvailable = page.variants?.[theme.key]?.available === true;
                  const isUpdating = updatingVariantToken === `${page.slug}:${theme.key}`;

                  return (
                    <li key={theme.key}>
                      <span>
                        {theme.label}
                        {theme.key === page.defaultTheme ? ' · 기본' : ''}
                      </span>
                      <button
                        type="button"
                        className="admin-button admin-button-ghost"
                        disabled={isUpdating || isReadOnlySeed}
                        onClick={() =>
                          isAvailable
                            ? onDisableVariant(page, theme.key)
                            : onEnableVariant(page, theme.key)
                        }
                      >
                        {isUpdating ? '처리 중' : isAvailable ? '제거' : '생성'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>

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
            <p>고객 연결 링크 발급과 삭제는 되돌리기 어려운 작업입니다.</p>
            {page.ownershipKind !== 'customer' ? (
              <button
                type="button"
                className="admin-button admin-button-secondary"
                disabled={issuingInvite}
                onClick={() => onIssueOwnershipInvite(page.slug)}
              >
                {issuingInvite ? '연결 링크 발급 중' : '고객 연결 링크 발급'}
              </button>
            ) : null}
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

        {activeTab !== 'overview' ? (
          <div className={styles.eventManagementPanel}>
            <div className={styles.eventManagementToolbar}>
              <p>{tabs.find((tab) => tab.key === activeTab)?.label}</p>
              <a
                className="admin-button admin-button-secondary"
                href={getFullManagementHref(
                  routes,
                  getAdminEventRelatedQuery(page, activeTab)
                )}
              >
                전체 관리 화면
              </a>
            </div>

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
      </section>
    </div>,
    portalRoot
  );
}
