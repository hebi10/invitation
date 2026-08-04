'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import type { InvitationProductTier } from '@/types/invitationPage';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';

import {
  getAdminEventCapabilities,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
  isAdminEventDetailCloseKey,
  type AdminEventCapabilityKey,
} from './adminEventWorkspaceModel';
import { SHORTCUT_ITEMS } from './adminPageUtils';
import styles from '../page.module.css';

interface AdminEventDetailPanelProps {
  page: InvitationPageSummary;
  updatingPublished: boolean;
  updatingTier: boolean;
  updatingVariantToken: string | null;
  deleting: boolean;
  issuingInvite: boolean;
  onClose: () => void;
  onTogglePublished: (page: InvitationPageSummary, next: boolean) => void;
  onChangeTier: (page: InvitationPageSummary, next: InvitationProductTier) => void;
  onEnableVariant: (page: InvitationPageSummary, variantKey: InvitationThemeKey) => void;
  onDisableVariant: (page: InvitationPageSummary, variantKey: InvitationThemeKey) => void;
  onOpenRelated: (query: Record<string, string>) => void;
  onIssueOwnershipInvite: (slug: string) => void;
  onDelete: (page: InvitationPageSummary) => void;
  routes: AppRoutes;
  experience: boolean;
}

type RelatedCapability = Extract<
  AdminEventCapabilityKey,
  'images' | 'memory' | 'comments' | 'period' | 'ownership'
>;

const relatedLabels: Record<RelatedCapability, string> = {
  images: '이미지 관리',
  memory: '추억 페이지 관리',
  comments: '방명록 관리',
  period: '노출 기간 관리',
  ownership: '고객 연결 관리',
};

const TIER_OPTIONS: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];

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
  onClose,
  onTogglePublished,
  onChangeTier,
  onEnableVariant,
  onDisableVariant,
  onOpenRelated,
  onIssueOwnershipInvite,
  onDelete,
  routes,
  experience,
}: AdminEventDetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const capabilities = getAdminEventCapabilities(page);
  const previewLinks = getAdminEventPreviewLinks(page);
  const preview = previewLinks.find((link) => link.isDefault) ?? previewLinks[0];
  const isReadOnlySeed = experience && page.slug.startsWith('demo-seed-');
  const relatedCapabilities = capabilities.filter(
    (capability): capability is RelatedCapability =>
      capability === 'images' ||
      capability === 'memory' ||
      capability === 'comments' ||
      capability === 'period' ||
      capability === 'ownership'
  );

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

        {relatedCapabilities.length > 0 ? (
          <section className={styles.eventDetailRelated} aria-labelledby="event-related-title">
            <h3 id="event-related-title">관련 관리</h3>
            <div>
              {relatedCapabilities.map((capability) => (
                <button
                  key={capability}
                  type="button"
                  className={styles.eventRelatedButton}
                  onClick={() => onOpenRelated(getAdminEventRelatedQuery(page, capability))}
                >
                  {relatedLabels[capability]}
                </button>
              ))}
            </div>
          </section>
        ) : null}

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
      </section>
    </div>,
    portalRoot
  );
}
