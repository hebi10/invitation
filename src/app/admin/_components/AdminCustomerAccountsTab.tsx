'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { AppRoutes } from '@/lib/demoExperienceRoutes';
import type {
  AdminCustomerAccountSummary,
  AdminCustomerLinkedEventSummary,
} from '@/services/adminCustomerService';
import type {
  InvitationThemeKey,
} from '@/types/invitationPage';

import { AdminQueryState, EmptyState, FilterToolbar, Pagination, StatusBadge } from '.';
import {
  filterAssignableEvents,
  getAssignableEventTypeOptions,
  type AssignmentEventTypeFilter,
} from './adminCustomerAssignmentFilters';
import { formatDateTime } from './adminPageUtils';
import styles from '../page.module.css';
import workspace from './AdminPeopleWorkspace.module.css';
import { getInvitationThemeAdminLabel, isInvitationThemeKey } from '@/lib/invitationThemes';
import { shouldNormalizeAdminPageQuery } from './adminQueryRecovery';

const CUSTOMER_ACCOUNTS_PAGE_SIZE = 10;
type CustomerConnectionFilter = 'all' | 'linked' | 'unlinked';

interface AdminCustomerAccountsTabProps {
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  accounts: AdminCustomerAccountSummary[];
  unassignedEvents: AdminCustomerLinkedEventSummary[];
  ownershipActionToken: string | null;
  issuingOwnershipInviteSlug: string | null;
  deletingCustomerUid: string | null;
  selectedEventSlug: string | null;
  mobileReadOnly: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onAssign: (uid: string, pageSlug: string) => void;
  onClear: (pageSlug: string) => void;
  onIssueOwnershipInvite: (pageSlug: string) => void;
  onDeleteAccount: (uid: string) => void;
  routes: AppRoutes;
  experience: boolean;
}

function formatDateValue(value: string | null) {
  if (!value) {
    return '기록 없음';
  }

  const nextDate = new Date(value);
  if (Number.isNaN(nextDate.getTime())) {
    return '기록 없음';
  }

  return formatDateTime(nextDate);
}

function getProviderLabels(providerIds: string[]) {
  if (!providerIds.length) {
    return ['미확인'];
  }

  return providerIds.map((providerId) => {
    switch (providerId) {
      case 'google.com':
        return 'Google';
      case 'password':
        return '이메일';
      default:
        return providerId;
    }
  });
}

function formatWalletUpdatedAt(value: string | null) {
  return value ? formatDateValue(value) : '지급 이력 없음';
}

function getLedgerSourceLabel(source: string) {
  switch (source) {
    case 'adminGrant':
      return '관리자 지급';
    case 'mobilePurchase':
      return '모바일 결제';
    case 'webPurchase':
      return '웹 결제';
    case 'eventAssignment':
      return '이벤트 배정';
    case 'migration':
      return '이관';
    default:
      return '시스템';
  }
}

function getLedgerDirectionLabel(direction: string) {
  return direction === 'debit' ? '사용' : '지급';
}

function getLedgerStatusLabel(status: string) {
  switch (status) {
    case 'consumed':
      return '소비됨';
    case 'assigned':
      return '배정됨';
    case 'revoked':
      return '회수됨';
    case 'refunded':
      return '환불됨';
    default:
      return '보유 반영';
  }
}

export default function AdminCustomerAccountsTab({
  loading,
  refreshing,
  error,
  accounts,
  unassignedEvents,
  ownershipActionToken,
  issuingOwnershipInviteSlug,
  deletingCustomerUid,
  selectedEventSlug,
  mobileReadOnly,
  onRefresh,
  onRetry,
  onAssign,
  onClear,
  onIssueOwnershipInvite,
  onDeleteAccount,
  routes,
  experience,
}: AdminCustomerAccountsTabProps) {
  const customerBusy = Boolean(ownershipActionToken || issuingOwnershipInviteSlug || deletingCustomerUid);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const updateCustomerQuery = useCallback((updates: Record<string, string | null>, navigation: 'replace' | 'push' = 'replace') => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router[navigation](`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);
  const searchQuery = searchParams?.get('customerQ') ?? '';
  const requestedConnection = searchParams?.get('customerConnection');
  const connectionFilter: CustomerConnectionFilter = requestedConnection === 'linked' || requestedConnection === 'unlinked' ? requestedConnection : 'all';
  const parsedPage = Number(searchParams?.get('customerPage') ?? 1);
  const currentPage = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
  const setSearchQuery = (value: string) => updateCustomerQuery({ customerQ: value, customerPage: null });
  const setConnectionFilter = (value: CustomerConnectionFilter) => updateCustomerQuery({ customerConnection: value === 'all' ? null : value, customerPage: null });
  const setCurrentPage = (value: number) => updateCustomerQuery({ customerPage: String(value) });
  const contextualAccount = selectedEventSlug ? accounts.find((account) => account.linkedEvents.some((event) => event.slug === selectedEventSlug)) : undefined;
  const selectedCustomerUid = searchParams?.get('customer') || contextualAccount?.uid || '';
  const selectedAccount = accounts.find((account) => account.uid === selectedCustomerUid);
  const selectedAccountUid = selectedAccount?.uid;
  const requestedDetailTab = searchParams?.get('customerDetail');
  const customerDetailTab = requestedDetailTab === 'wallet' || requestedDetailTab === 'management' ? requestedDetailTab : 'events';
  const listScroll = useRef(0);
  const previousCustomer = useRef('');
  const customerDetailRef = useRef<HTMLElement>(null);
  const openCustomer = (uid: string) => {
    if (customerBusy) return;
    listScroll.current = window.scrollY;
    updateCustomerQuery({ customer: uid, customerDetail: null, event: null }, 'push');
  };
  useEffect(() => {
    if (!selectedAccountUid) return;
    const detail = customerDetailRef.current;
    detail?.focus({ preventScroll: true });
    detail?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [selectedAccountUid, mobileReadOnly]);
  useEffect(() => {
    if (selectedCustomerUid) {
      previousCustomer.current = selectedCustomerUid;
      return;
    }
    if (!previousCustomer.current) return;
    const uid = previousCustomer.current;
    previousCustomer.current = '';
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-customer-uid="${CSS.escape(uid)}"]`)?.focus({ preventScroll: true });
      window.scrollTo({ top: listScroll.current, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedCustomerUid]);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const [draftAssignmentEventTypes, setDraftAssignmentEventTypes] = useState<
    Record<string, AssignmentEventTypeFilter>
  >({});
  const [draftAssignmentQueries, setDraftAssignmentQueries] = useState<Record<string, string>>({});
  const [selectedLinkedEvents, setSelectedLinkedEvents] = useState<Record<string, string>>({});

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesConnection =
        connectionFilter === 'all' ||
        (connectionFilter === 'linked' && account.linkedEvents.length > 0) ||
        (connectionFilter === 'unlinked' && account.linkedEvents.length === 0);
      if (!matchesConnection) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const linkedEventSearchText = account.linkedEvents
        .map(
          (event) =>
            `${event.displayName} ${event.slug} ${getEventTypeDisplayLabel(event.eventType)}`
        )
        .join(' ');

      return `${account.displayName ?? ''} ${account.email ?? ''} ${account.uid} ${linkedEventSearchText}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [accounts, connectionFilter, searchQuery]);
  const assignableEventTypeOptions = useMemo(
    () => getAssignableEventTypeOptions(unassignedEvents),
    [unassignedEvents]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / CUSTOMER_ACCOUNTS_PAGE_SIZE)
  );
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAccounts = filteredAccounts.slice(
    (normalizedCurrentPage - 1) * CUSTOMER_ACCOUNTS_PAGE_SIZE,
    normalizedCurrentPage * CUSTOMER_ACCOUNTS_PAGE_SIZE
  );
  useEffect(() => {
    if (shouldNormalizeAdminPageQuery({
      requestedPage: currentPage,
      normalizedPage: normalizedCurrentPage,
      active: !mobileReadOnly || !selectedCustomerUid,
      loading,
      refreshing,
      error,
    })) {
      updateCustomerQuery({ customerPage: String(normalizedCurrentPage) });
    }
  }, [currentPage, error, loading, mobileReadOnly, normalizedCurrentPage, refreshing, selectedCustomerUid, updateCustomerQuery]);

  const getSelectedLinkedEvent = (account: AdminCustomerAccountSummary) => {
    if (!account.linkedEvents.length) {
      return null;
    }

    const selectedSlug = selectedLinkedEvents[account.uid] ?? selectedEventSlug ?? '';
    return (
      account.linkedEvents.find((event) => event.slug === selectedSlug) ??
      account.linkedEvents[0]
    );
  };

  const renderMobileAccountCard = (
    account: AdminCustomerAccountSummary,
    index: number
  ) => {
    const providerLabels = getProviderLabels(account.providerIds);

    return (
      <article className={styles.accountCard} key={account.uid}>
        <div className={styles.accountCardHeader}>
          <div className={styles.accountCardIdentity}>
            <span className={styles.rowNumber}>{index + 1}</span>
            <div className={styles.identityStack}>
              <h3 className={styles.accountCardTitle}>
                {selectedCustomerUid === account.uid ? account.displayName || account.email || account.uid : <button type="button" className={styles.customerSelectButton} data-customer-uid={account.uid} disabled={customerBusy} onClick={() => openCustomer(account.uid)}>{account.displayName || account.email || account.uid}</button>}
              </h3>
              <p className={styles.tableSubtext}>{account.email ?? '이메일 없음'}</p>
              <details className={workspace.accountId}><summary>계정 정보</summary><p>고객 식별번호 · {account.uid}</p></details>
            </div>
          </div>
          <StatusBadge tone={account.disabled ? 'danger' : 'success'}>
            {account.disabled ? '비활성화' : '사용 가능'}
          </StatusBadge>
        </div>

        <div className={styles.accountCardMetaGrid}>
          <span>로그인 수단 · {providerLabels.join(', ')}</span>
          <span>최근 로그인 · {formatDateValue(account.lastSignInAt)}</span>
          <span>연결된 이벤트 · {account.linkedEvents.length}개</span>
        </div>

        {selectedCustomerUid === account.uid ? <nav className={styles.customerDetailNav} aria-label="고객 상세 항목">
          <button type="button" disabled={customerBusy} aria-current={customerDetailTab === 'events' ? 'page' : undefined} onClick={() => updateCustomerQuery({ customerDetail: 'events' })}>이벤트</button>
          <button type="button" disabled={customerBusy} aria-current={customerDetailTab === 'wallet' ? 'page' : undefined} onClick={() => updateCustomerQuery({ customerDetail: 'wallet' })}>이용권 이력</button>
        </nav> : null}
        {selectedCustomerUid === account.uid && customerDetailTab === 'wallet' ? renderWalletManager(account) : <section className={styles.accountCardSection}>
          <h4 className={styles.accountCardSectionTitle}>연결된 이벤트</h4>
          {account.linkedEvents.length > 0 ? (
            <ul className={styles.mobileLinkedEventList}>
              {account.linkedEvents.map((event) => (
                <li key={`${account.uid}:${event.slug}`}>
                  <strong>{event.displayName}</strong>
                  <span>
                    {getEventTypeDisplayLabel(event.eventType, 'admin')} · /{event.slug}
                  </span>
                  <button type="button" className="admin-button admin-button-ghost" disabled={customerBusy} onClick={() => updateCustomerQuery({ section: 'events', tab: 'pages', view: null, event: event.slug, detail: null, customer: null, customerDetail: null }, 'push')}>이벤트 상세 보기</button>
                </li>
              ))}
            </ul>
          ) : (
            <span className={styles.emptyInlineText}>연결된 이벤트가 없습니다.</span>
          )}
        </section>}
      </article>
    );
  };

  const getDraftAssignmentEventType = (uid: string) =>
    draftAssignmentEventTypes[uid] ?? 'all';

  const getDraftAssignmentQuery = (uid: string) => draftAssignmentQueries[uid] ?? '';

  const getFilteredAssignableEvents = (uid: string) =>
    filterAssignableEvents(
      unassignedEvents,
      getDraftAssignmentEventType(uid),
      getDraftAssignmentQuery(uid)
    );

  const updateDraftAssignmentEventType = (
    uid: string,
    eventType: AssignmentEventTypeFilter
  ) => {
    setDraftAssignmentEventTypes((current) => ({
      ...current,
      [uid]: eventType,
    }));
    setDraftAssignments((current) => ({
      ...current,
      [uid]: '',
    }));
  };

  const updateDraftAssignmentQuery = (uid: string, query: string) => {
    setDraftAssignmentQueries((current) => ({
      ...current,
      [uid]: query,
    }));
    setDraftAssignments((current) => ({
      ...current,
      [uid]: '',
    }));
  };

  const renderWalletManager = (account: AdminCustomerAccountSummary) => {
    return (
      <div className={styles.walletPanel}>
        <p className={styles.walletSectionLabel}>현재 보유</p>
        <div className={styles.walletSummaryGrid}>
          {account.wallet.pageCreationCredits.standard + account.wallet.pageCreationCredits.deluxe > 0 ? (
            <span className={styles.walletMetric}>
              기존 제작권 보관 {account.wallet.pageCreationCredits.standard + account.wallet.pageCreationCredits.deluxe}개
            </span>
          ) : null}
          <span className={styles.walletMetric}>
            초대장 제작권 {account.wallet.pageCreationCredits.premium}
          </span>
          <span className={styles.walletMetric}>
            모바일 초대장 생성 티켓 {account.wallet.operationTicketBalance}장
          </span>
        </div>
        <p className={styles.tableSubtext}>
          최근 갱신 · {formatWalletUpdatedAt(account.wallet.updatedAt)}
        </p>
        <p className={styles.tableSubtext}>
          이용권은 기존 잔액과 이력을 조회하는 용도입니다. 현재 이벤트는 관리자가 생성한 뒤 고객 계정에 연결합니다. 신규 제작권·생성 티켓 지급은 지원하지 않습니다.
        </p>

        <div className={styles.walletLedgerPanel}>
          <p className={styles.walletSectionLabel}>최근 이용권 이력</p>
          {account.wallet.recentLedger.length > 0 ? (
            <div className={styles.walletLedgerList}>
              {account.wallet.recentLedger.slice(0, 5).map((entry) => (
                <div className={styles.walletLedgerItem} key={entry.id}>
                  <strong>
                    {getLedgerDirectionLabel(entry.direction)} ·{' '}
                    {entry.kind === 'pageCreation'
                      ? `초대장 제작권 ${entry.quantity}개`
                      : `모바일 초대장 생성 티켓 ${entry.quantity}장`}
                  </strong>
                  <span>
                    {getLedgerSourceLabel(entry.source)} · {getLedgerStatusLabel(entry.status)}
                    {entry.createdAt ? ` · ${formatDateValue(entry.createdAt)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className={styles.emptyInlineText}>아직 지급 또는 사용 이력이 없습니다.</span>
          )}
        </div>
      </div>
    );
  };

  const renderLinkedEventManager = (account: AdminCustomerAccountSummary) => {
    if (!account.linkedEvents.length) {
      return <span className={styles.emptyInlineText}>연결된 이벤트가 없습니다.</span>;
    }

    const selectedEvent = getSelectedLinkedEvent(account);
    const isIssuingOwnershipInvite = selectedEvent
      ? issuingOwnershipInviteSlug === selectedEvent.slug
      : false;

    return (
      <div className={styles.linkedEventCompact}>
        <div className={styles.linkedEventSelectRow}>
          <select
            className="admin-input"
            value={selectedEvent?.slug ?? ''}
            disabled={customerBusy}
            onChange={(event) =>
              setSelectedLinkedEvents((current) => ({
                ...current,
                [account.uid]: event.target.value,
              }))
            }
          >
            {account.linkedEvents.map((event) => (
              <option key={`${account.uid}:${event.slug}`} value={event.slug}>
                [{getEventTypeDisplayLabel(event.eventType)}] {event.displayName} ({event.slug})
              </option>
            ))}
          </select>
          {selectedEvent ? (
            <StatusBadge tone="neutral">
              {getEventTypeDisplayLabel(selectedEvent.eventType)}
            </StatusBadge>
          ) : null}
          <StatusBadge tone="neutral">{account.linkedEvents.length}개 연결</StatusBadge>
        </div>

        {selectedEvent ? (
          <>
            <div className={styles.linkedEventCompactMeta}>
              <span>/{selectedEvent.slug}</span>
              <span>디자인 · {isInvitationThemeKey(selectedEvent.defaultTheme) ? getInvitationThemeAdminLabel(selectedEvent.defaultTheme) : '기본 디자인'}</span>
              <span>{selectedEvent.published ? '공개' : '비공개'}</span>
              <span>수정 {formatDateValue(selectedEvent.updatedAt)}</span>
            </div>
            <div className={styles.tableActions}>
              <a className="admin-button admin-button-secondary" aria-disabled={customerBusy} onClick={(event) => { if (customerBusy) event.preventDefault(); }} href={`${routes.admin()}?section=events&tab=pages&event=${encodeURIComponent(selectedEvent.slug)}`}>이벤트 관리</a>
              <a
                className="admin-button admin-button-ghost"
                href={routes.wizardEdit(selectedEvent.slug)}
                target="_blank"
                rel="noreferrer"
                aria-disabled={customerBusy}
                onClick={(event) => { if (customerBusy) event.preventDefault(); }}
              >
                수정하기
              </a>
              <a
                className="admin-button admin-button-ghost"
                href={routes.preview(
                  selectedEvent.slug,
                  selectedEvent.defaultTheme as InvitationThemeKey
                )}
                target="_blank"
                rel="noreferrer"
              >
                미리보기
              </a>
              {account.isAdmin && !experience ? (
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  disabled={customerBusy}
                  onClick={() => onIssueOwnershipInvite(selectedEvent.slug)}
                >
                  {isIssuingOwnershipInvite ? '링크 발급 중' : '고객 연결 링크'}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const renderAccountCard = (account: AdminCustomerAccountSummary, index: number) => {
    const providerLabels = getProviderLabels(account.providerIds);
    const selectedSlug = draftAssignments[account.uid] ?? '';
    const assignmentEventType = getDraftAssignmentEventType(account.uid);
    const assignmentQuery = getDraftAssignmentQuery(account.uid);
    const filteredAssignableEvents = getFilteredAssignableEvents(account.uid);
    const isAssigning = ownershipActionToken === `assign:${account.uid}:${selectedSlug}`;
    const isIssuingSelectedInvite = issuingOwnershipInviteSlug === selectedSlug;
    const isDeletingAccount = deletingCustomerUid === account.uid;
    const selectedLinkedEvent = getSelectedLinkedEvent(account);
    const isClearing = selectedLinkedEvent
      ? ownershipActionToken === `clear:${selectedLinkedEvent.slug}`
      : false;

    return (
      <article className={styles.accountCard} key={account.uid}>
        <div className={styles.accountCardHeader}>
          <div className={styles.accountCardIdentity}>
            <span className={styles.rowNumber}>{index + 1}</span>
            <div className={styles.identityStack}>
              <div className={styles.customerIdentityHeader}>
                <h3 className={styles.accountCardTitle}>
                  {account.displayName || account.email || account.uid}
                </h3>
                {account.isAdmin ? <StatusBadge tone="primary">관리자</StatusBadge> : null}
              </div>
              <p className={styles.tableSubtext}>{account.email ?? '이메일 없음'}</p>
              <details className={workspace.accountId}><summary>계정 정보</summary><p>고객 식별번호 · {account.uid}</p></details>
            </div>
          </div>

          <div className={styles.accountCardBadges}>
            <StatusBadge tone={account.disabled ? 'danger' : 'success'}>
              {account.disabled ? '비활성화' : '사용 가능'}
            </StatusBadge>
            <StatusBadge tone={account.emailVerified ? 'success' : 'warning'}>
              {account.emailVerified ? '이메일 확인됨' : '이메일 미확인'}
            </StatusBadge>
            {account.missingAuthUser ? (
              <StatusBadge tone="danger">삭제된 계정</StatusBadge>
            ) : null}
          </div>
        </div>

        <div className={styles.accountCardMetaGrid}>
          <span>로그인 수단 · {providerLabels.join(', ')}</span>
          <span>최근 로그인 · {formatDateValue(account.lastSignInAt)}</span>
          <span>연결된 이벤트 · {account.linkedEvents.length}개</span>
        </div>

        <nav className={styles.customerDetailNav} aria-label="고객 상세 항목">
          {([{ key: 'events', label: '이벤트' }, { key: 'wallet', label: '이용권' }, { key: 'management', label: '관리' }] as const).map((tab) => (
            <button type="button" key={tab.key} disabled={customerBusy} aria-current={customerDetailTab === tab.key ? 'page' : undefined}
              onClick={() => updateCustomerQuery({ customerDetail: tab.key })}>{tab.label}</button>
          ))}
        </nav>
        <div className={styles.accountCardBody}>
          {customerDetailTab === 'events' ? <>
          <section className={styles.accountCardSection}>
            <div className={styles.accountCardSectionHeader}>
              <h4 className={styles.accountCardSectionTitle}>연결된 이벤트</h4>
              <StatusBadge tone={account.linkedEvents.length > 0 ? 'primary' : 'neutral'}>{account.linkedEvents.length}개</StatusBadge>
            </div>
            {renderLinkedEventManager(account)}
          </section>
          <details className={workspace.connectDisclosure}>
            <summary>관리자가 만든 이벤트 연결</summary>
          <section className={`${styles.accountCardSection} ${styles.accountConnectSection}`}>
            <div className={styles.accountCardSectionHeader}>
              <h4 className={styles.accountCardSectionTitle}>새 이벤트 연결</h4>
              <StatusBadge tone={unassignedEvents.length > 0 ? 'warning' : 'neutral'}>
                전체 미연결 {unassignedEvents.length}개
              </StatusBadge>
            </div>
            <p className={styles.tableSubtext}>직접 연결은 현재 고객 계정에 적용됩니다. 연결 링크는 링크를 받은 사람이 로그인한 계정에 적용되며 현재 고객 계정으로 제한되지 않습니다.</p>
            <div className={styles.accountConnectPanel}>
              <div className={styles.accountConnectControls}>
                <label className="admin-field">
                  <span className="admin-field-label">이벤트 종류</span>
                  <select
                    className="admin-input"
                    value={assignmentEventType}
                    disabled={customerBusy || account.missingAuthUser || !unassignedEvents.length}
                    onChange={(event) =>
                      updateDraftAssignmentEventType(
                        account.uid,
                        event.target.value as AssignmentEventTypeFilter
                      )
                    }
                  >
                    {assignableEventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">이벤트 검색</span>
                  <input
                    className="admin-input"
                    type="search"
                    value={assignmentQuery}
                    placeholder="이름 또는 URL 검색"
                    disabled={customerBusy || account.missingAuthUser || !unassignedEvents.length}
                    onChange={(event) =>
                      updateDraftAssignmentQuery(account.uid, event.target.value)
                    }
                  />
                </label>
              </div>
              <div className={styles.inlineInputGroup}>
                <select
                  className="admin-input"
                  value={selectedSlug}
                  disabled={customerBusy || account.missingAuthUser || !filteredAssignableEvents.length}
                  onChange={(event) =>
                    setDraftAssignments((current) => ({
                      ...current,
                      [account.uid]: event.target.value,
                    }))
                  }
                >
                  <option value="">연결할 이벤트 선택</option>
                  {filteredAssignableEvents.map((event) => (
                    <option key={event.slug} value={event.slug}>
                      [{getEventTypeDisplayLabel(event.eventType)}] {event.displayName} ({event.slug})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  disabled={
                    customerBusy || account.missingAuthUser ||
                    !selectedSlug ||
                    !filteredAssignableEvents.some((event) => event.slug === selectedSlug) ||
                    isAssigning
                  }
                  onClick={() => onAssign(account.uid, selectedSlug)}
                >
                  {isAssigning ? '연결 중..' : '이 고객 계정에 직접 연결'}
                </button>
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  disabled={
                    customerBusy || !selectedSlug ||
                    !filteredAssignableEvents.some((event) => event.slug === selectedSlug) ||
                    isIssuingSelectedInvite
                  }
                  onClick={() => onIssueOwnershipInvite(selectedSlug)}
                >
                  {isIssuingSelectedInvite ? '링크 발급 중' : '로그인 계정 연결 링크'}
                </button>
              </div>
              <span className={styles.actionHint}>
                {account.missingAuthUser
                  ? '삭제된 계정에는 이벤트를 연결할 수 없습니다.'
                  : unassignedEvents.length > 0
                    ? filteredAssignableEvents.length > 0
                      ? `선택 조건에 맞는 미연결 이벤트 ${filteredAssignableEvents.length}개를 연결할 수 있습니다.`
                      : '선택한 조건에 맞는 미연결 이벤트가 없습니다.'
                    : '현재 바로 연결할 수 있는 미연결 이벤트가 없습니다.'}
              </span>
            </div>
          </section>

          </details>

          </> : null}
          {customerDetailTab === 'wallet' ? <section className={styles.accountCardSection}>
            <div className={styles.accountCardSectionHeader}>
              <h4 className={styles.accountCardSectionTitle}>보유 이용권</h4>
              <StatusBadge tone="neutral">
                모바일 초대장 생성 티켓 {account.wallet.operationTicketBalance}장
              </StatusBadge>
            </div>
            {renderWalletManager(account)}
          </section> : null}
        </div>

        {customerDetailTab === 'management' && (!account.isAdmin || selectedLinkedEvent) ? (
          <details className={styles.accountDangerArea}>
            <summary>위험 작업</summary>
            <p>소유권 연결 해제와 계정 정리는 되돌리기 어렵습니다.</p>
            {selectedLinkedEvent ? <p>연결 해제 대상 · {selectedLinkedEvent.displayName}</p> : null}
            <div className={styles.tableActions}>
              {selectedLinkedEvent ? (
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  disabled={customerBusy}
                  onClick={() => onClear(selectedLinkedEvent.slug)}
                >
                  {isClearing ? '해제 중..' : '선택 이벤트 연결 해제'}
                </button>
              ) : null}
              {!account.isAdmin ? (
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  disabled={customerBusy}
                  onClick={() => onDeleteAccount(account.uid)}
                >
                  {isDeletingAccount
                    ? '처리 중'
                    : account.missingAuthUser
                      ? '잔여 정리'
                      : '계정 탈퇴 처리'}
                </button>
              ) : null}
            </div>
          </details>
        ) : null}
      </article>
    );
  };

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div><h1 className={styles.sectionTitle}>고객 관리</h1><p className={workspace.description}>고객을 선택해 연결 이벤트와 이용권을 관리합니다.</p></div>
        <p className={styles.sectionMeta}>결과 {filteredAccounts.length}명</p>
      </div>

      {mobileReadOnly ? (
        <p className={styles.mobileReadOnlyNotice}>
          모바일에서는 고객, 연결 이벤트와 이용권 이력 조회만 지원합니다. 고객 연결과
          삭제는 PC 관리자 화면을 이용해 주세요.
        </p>
      ) : null}

      {selectedEventSlug ? (
        <div className={styles.selectionContext}>
          <p className={styles.sectionMeta}>선택 이벤트 · {contextualAccount?.linkedEvents.find((event) => event.slug === selectedEventSlug)?.displayName ?? unassignedEvents.find((event) => event.slug === selectedEventSlug)?.displayName ?? selectedEventSlug}</p>
        </div>
      ) : null}

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="이름, 이메일 또는 이벤트 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">연결 상태</span>
              <select
                className="admin-select"
                value={connectionFilter}
                onChange={(event) =>
                  setConnectionFilter(event.target.value as CustomerConnectionFilter)
                }
              >
                <option value="all">전체</option>
                <option value="linked">이벤트 연결</option>
                <option value="unlinked">미연결</option>
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
              disabled={customerBusy || loading || refreshing}
            >
              {refreshing ? '새로고침 중' : loading ? '불러오는 중' : '새로고침'}
            </button>
            {searchQuery || connectionFilter !== 'all' ? (
              <button
                type="button"
                className="admin-button admin-button-ghost"
                onClick={() => {
                  updateCustomerQuery({ customerQ: null, customerConnection: null, customerPage: null });
                }}
              >
                필터 초기화
              </button>
            ) : null}
          </>
        }
        chips={
          [
            ...(searchQuery
              ? [
                  {
                    id: 'customer-account-search',
                    label: `검색: ${searchQuery}`,
                    onRemove: () => setSearchQuery(''),
                  },
                ]
              : []),
            ...(connectionFilter !== 'all'
              ? [
                  {
                    id: 'customer-connection-filter',
                    label: connectionFilter === 'linked' ? '이벤트 연결' : '미연결',
                    onRemove: () => setConnectionFilter('all'),
                  },
                ]
              : []),
          ]
        }
      />

      {error && accounts.length > 0 ? (
        <AdminQueryState
          loading={false}
          error={error}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={onRetry}
          compact={true}
          errorTitle="고객 계정 최신 정보를 불러오지 못했습니다."
        />
      ) : null}

      {loading && accounts.length === 0 ? (
        <AdminQueryState
          loading={true}
          error={null}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={onRetry}
          loadingMessage="고객 계정을 불러오는 중입니다."
        />
      ) : error && accounts.length === 0 ? (
        <AdminQueryState
          loading={false}
          error={error}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={onRetry}
          errorTitle="고객 계정을 불러오지 못했습니다."
        />
      ) : filteredAccounts.length > 0 || selectedAccount ? (
        <>
          {mobileReadOnly ? (
            <div className={styles.accountCardList} ref={selectedAccount ? (node) => { customerDetailRef.current = node; } : undefined} tabIndex={selectedAccount ? -1 : undefined}>
              {selectedAccount ? <>
                <button type="button" className="admin-button admin-button-ghost" disabled={customerBusy} onClick={() => updateCustomerQuery({ customer: null, customerDetail: null, event: null })}>고객 목록으로</button>
                {renderMobileAccountCard(selectedAccount, accounts.indexOf(selectedAccount))}
              </> : paginatedAccounts.map((account, index) => renderMobileAccountCard(account, (normalizedCurrentPage - 1) * CUSTOMER_ACCOUNTS_PAGE_SIZE + index))}
            </div>
          ) : (
            <div className={workspace.customerWorkspace}>
              <div className={styles.customerListFrame}>
                <table className={styles.customerListTable}>
                  <thead><tr><th scope="col">고객</th><th scope="col">연결 이벤트</th><th scope="col">상태</th><th scope="col">최근 로그인</th></tr></thead>
                  <tbody>{paginatedAccounts.map((account) => (
                    <tr key={account.uid} data-selected={account.uid === selectedCustomerUid || undefined}>
                      <td><button type="button" className={styles.customerSelectButton} data-customer-uid={account.uid} disabled={customerBusy} aria-current={account.uid === selectedCustomerUid ? 'true' : undefined}
                        onClick={() => openCustomer(account.uid)}>
                        <strong>{account.displayName || account.email || '이름 미등록 고객'}</strong>{account.displayName && account.displayName !== account.email ? <span>{account.email ?? '이메일 없음'}</span> : null}
                      </button></td>
                      <td><span className={workspace.eventName}>{account.linkedEvents[0]?.displayName ?? '미연결'}</span>{account.linkedEvents.length > 1 ? <span className={workspace.description}> 외 {account.linkedEvents.length - 1}개</span> : null}</td>
                      <td>{account.missingAuthUser ? '삭제된 계정' : account.disabled ? '비활성' : account.isAdmin ? '관리자' : '사용 가능'}</td><td>{formatDateValue(account.lastSignInAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {selectedAccount ? <section ref={customerDetailRef} tabIndex={-1} className={`${styles.customerDetailPane} ${workspace.customerDetail}`} aria-label="선택한 고객 상세">
                  <button type="button" disabled={customerBusy} className={`admin-button admin-button-ghost ${workspace.closeButton}`} aria-label="고객 상세 닫기" title="고객 상세 닫기" onClick={() => updateCustomerQuery({ customer: null, customerDetail: null, event: null })}><img src="/images/admin/close.webp" alt="" width={16} height={16} /></button>
                  {renderAccountCard(selectedAccount, accounts.indexOf(selectedAccount))}
              </section> : null}
            </div>
          )}
          {!mobileReadOnly || !selectedAccount ? <Pagination
            currentPage={normalizedCurrentPage}
            totalPages={totalPages}
            totalItems={filteredAccounts.length}
            pageSize={CUSTOMER_ACCOUNTS_PAGE_SIZE}
            onPageChange={setCurrentPage}
          /> : null}
        </>
      ) : (
        <EmptyState
          title={
            searchQuery || connectionFilter !== 'all'
              ? '검색 조건에 맞는 고객 계정이 없습니다.'
              : '관리할 고객 계정이 아직 없습니다.'
          }
          description={
            searchQuery || connectionFilter !== 'all'
              ? '검색어나 연결 상태를 조정해 다시 확인해 주세요.'
              : '고객 계정이 등록되면 여기에서 이벤트 연결과 기존 이용권 이력을 확인할 수 있습니다.'
          }
          actionLabel={searchQuery || connectionFilter !== 'all' ? '필터 초기화' : '새로고침'}
          onAction={
            searchQuery || connectionFilter !== 'all'
              ? () => {
                  updateCustomerQuery({ customerQ: null, customerConnection: null, customerPage: null });
                }
              : onRefresh
          }
        />
      )}
    </div>
  );
}
