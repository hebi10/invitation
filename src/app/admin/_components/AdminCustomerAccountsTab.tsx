'use client';

import { useEffect, useMemo, useState } from 'react';

import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import { buildEventPreviewPath } from '@/lib/eventPreviewLinks';
import type {
  AdminCustomerAccountSummary,
  AdminCustomerLinkedEventSummary,
} from '@/services';
import type { InvitationProductTier } from '@/types/invitationPage';

import { EmptyState, FilterToolbar, Pagination, StatusBadge } from '.';
import { formatDateTime } from './adminPageUtils';
import styles from '../page.module.css';

const CUSTOMER_ACCOUNTS_PAGE_SIZE = 5;

interface AdminCustomerAccountsTabProps {
  loading: boolean;
  refreshing: boolean;
  accounts: AdminCustomerAccountSummary[];
  unassignedEvents: AdminCustomerLinkedEventSummary[];
  ownershipActionToken: string | null;
  walletGrantActionToken: string | null;
  deletingCustomerUid: string | null;
  onRefresh: () => void;
  onAssign: (uid: string, pageSlug: string) => void;
  onClear: (pageSlug: string) => void;
  onDeleteAccount: (uid: string) => void;
  onGrantWalletCredit: (
    uid: string,
    grant: {
      kind: 'pageCreation' | 'operationTicket';
      quantity: number;
      tier?: InvitationProductTier | null;
      note?: string | null;
    }
  ) => void;
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
  accounts,
  unassignedEvents,
  ownershipActionToken,
  walletGrantActionToken,
  deletingCustomerUid,
  onRefresh,
  onAssign,
  onClear,
  onDeleteAccount,
  onGrantWalletCredit,
}: AdminCustomerAccountsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const [selectedLinkedEvents, setSelectedLinkedEvents] = useState<Record<string, string>>({});
  const [grantDrafts, setGrantDrafts] = useState<
    Record<
      string,
      {
        tier: InvitationProductTier;
        pageCreationQuantity: string;
        operationTicketQuantity: string;
        note: string;
      }
    >
  >({});

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return accounts;
    }

    return accounts.filter((account) => {
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
  }, [accounts, searchQuery]);

  const totalLinkedEvents = useMemo(
    () => accounts.reduce((sum, account) => sum + account.linkedEvents.length, 0),
    [accounts]
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
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage !== normalizedCurrentPage) {
      setCurrentPage(normalizedCurrentPage);
    }
  }, [currentPage, normalizedCurrentPage]);

  const getSelectedLinkedEvent = (account: AdminCustomerAccountSummary) => {
    if (!account.linkedEvents.length) {
      return null;
    }

    const selectedSlug = selectedLinkedEvents[account.uid] ?? '';
    return (
      account.linkedEvents.find((event) => event.slug === selectedSlug) ??
      account.linkedEvents[0]
    );
  };

  const getGrantDraft = (uid: string) =>
    grantDrafts[uid] ?? {
      tier: 'standard' as InvitationProductTier,
      pageCreationQuantity: '1',
      operationTicketQuantity: '1',
      note: '',
    };

  const updateGrantDraft = (
    uid: string,
    patch: Partial<ReturnType<typeof getGrantDraft>>
  ) => {
    setGrantDrafts((current) => ({
      ...current,
      [uid]: {
        ...(current[uid] ?? getGrantDraft(uid)),
        ...patch,
      },
    }));
  };

  const readGrantQuantity = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  };

  const renderWalletManager = (account: AdminCustomerAccountSummary) => {
    const draft = getGrantDraft(account.uid);
    const isGrantingPageCreation =
      walletGrantActionToken === `grant:${account.uid}:pageCreation`;
    const isGrantingOperationTicket =
      walletGrantActionToken === `grant:${account.uid}:operationTicket`;
    const pageCreationQuantity = readGrantQuantity(draft.pageCreationQuantity);
    const operationTicketQuantity = readGrantQuantity(draft.operationTicketQuantity);

    return (
      <div className={styles.walletPanel}>
        <p className={styles.walletSectionLabel}>현재 보유</p>
        <div className={styles.walletSummaryGrid}>
          <span className={styles.walletMetric}>
            STANDARD {account.wallet.pageCreationCredits.standard}
          </span>
          <span className={styles.walletMetric}>
            DELUXE {account.wallet.pageCreationCredits.deluxe}
          </span>
          <span className={styles.walletMetric}>
            PREMIUM {account.wallet.pageCreationCredits.premium}
          </span>
          <span className={styles.walletMetric}>
            운영 티켓 {account.wallet.operationTicketBalance}장
          </span>
        </div>
        <p className={styles.tableSubtext}>
          최근 갱신 · {formatWalletUpdatedAt(account.wallet.updatedAt)}
        </p>
        <p className={styles.tableSubtext}>
          새 이벤트 생성은 STANDARD/DELUXE/PREMIUM 제작권만 사용합니다. 운영 티켓은 생성된
          청첩장 운영용입니다.
        </p>

        <div className={styles.walletGrantGrid}>
          <label className="admin-field">
            <span className="admin-field-label">제작권 등급</span>
            <select
              className="admin-input"
              value={draft.tier}
              disabled={account.missingAuthUser}
              onChange={(event) =>
                updateGrantDraft(account.uid, {
                  tier: event.target.value as InvitationProductTier,
                })
              }
            >
              <option value="standard">STANDARD</option>
              <option value="deluxe">DELUXE</option>
              <option value="premium">PREMIUM</option>
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">제작권 수량</span>
            <input
              className="admin-input"
              type="number"
              min="1"
              step="1"
              value={draft.pageCreationQuantity}
              disabled={account.missingAuthUser}
              onChange={(event) =>
                updateGrantDraft(account.uid, {
                  pageCreationQuantity: event.target.value,
                })
              }
            />
          </label>
          <button
            type="button"
            className="admin-button admin-button-primary"
            disabled={
              account.missingAuthUser ||
              pageCreationQuantity <= 0 ||
              isGrantingPageCreation
            }
            onClick={() =>
              onGrantWalletCredit(account.uid, {
                kind: 'pageCreation',
                tier: draft.tier,
                quantity: pageCreationQuantity,
                note: draft.note,
              })
            }
          >
            {isGrantingPageCreation ? '지급 중..' : '제작권 지급'}
          </button>
        </div>

        <div className={styles.walletGrantGrid}>
          <label className="admin-field">
            <span className="admin-field-label">운영 티켓 수량</span>
            <input
              className="admin-input"
              type="number"
              min="1"
              step="1"
              value={draft.operationTicketQuantity}
              disabled={account.missingAuthUser}
              onChange={(event) =>
                updateGrantDraft(account.uid, {
                  operationTicketQuantity: event.target.value,
                })
              }
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">메모</span>
            <input
              className="admin-input"
              type="text"
              value={draft.note}
              disabled={account.missingAuthUser}
              placeholder="선택 입력"
              onChange={(event) =>
                updateGrantDraft(account.uid, {
                  note: event.target.value,
                })
              }
            />
          </label>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            disabled={
              account.missingAuthUser ||
              operationTicketQuantity <= 0 ||
              isGrantingOperationTicket
            }
            onClick={() =>
              onGrantWalletCredit(account.uid, {
                kind: 'operationTicket',
                quantity: operationTicketQuantity,
                note: draft.note,
              })
            }
          >
            {isGrantingOperationTicket ? '지급 중..' : '운영 티켓 지급'}
          </button>
        </div>

        <div className={styles.walletLedgerPanel}>
          <p className={styles.walletSectionLabel}>최근 이용권 이력</p>
          {account.wallet.recentLedger.length > 0 ? (
            <div className={styles.walletLedgerList}>
              {account.wallet.recentLedger.slice(0, 5).map((entry) => (
                <div className={styles.walletLedgerItem} key={entry.id}>
                  <strong>
                    {getLedgerDirectionLabel(entry.direction)} ·{' '}
                    {entry.kind === 'pageCreation'
                      ? `${entry.tier?.toUpperCase() ?? '제작권'} ${entry.quantity}개`
                      : `운영 티켓 ${entry.quantity}장`}
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
      return <span className={styles.emptyInlineText}>연결된 청첩장이 없습니다.</span>;
    }

    const selectedEvent = getSelectedLinkedEvent(account);
    const isClearing = selectedEvent
      ? ownershipActionToken === `clear:${selectedEvent.slug}`
      : false;

    return (
      <div className={styles.linkedEventCompact}>
        <div className={styles.linkedEventSelectRow}>
          <select
            className="admin-input"
            value={selectedEvent?.slug ?? ''}
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
              <span>테마 {selectedEvent.defaultTheme}</span>
              <span>수정 {formatDateValue(selectedEvent.updatedAt)}</span>
            </div>
            <div className={styles.tableActions}>
              <a
                className="admin-button admin-button-ghost"
                href={`/page-wizard/${encodeURIComponent(selectedEvent.slug)}`}
                target="_blank"
                rel="noreferrer"
              >
                수정하기
              </a>
              <a
                className="admin-button admin-button-ghost"
                href={buildEventPreviewPath(
                  selectedEvent.slug,
                  selectedEvent.eventType,
                  selectedEvent.defaultTheme
                )}
                target="_blank"
                rel="noreferrer"
              >
                미리보기
              </a>
              <button
                type="button"
                className="admin-button admin-button-danger"
                disabled={isClearing}
                onClick={() => onClear(selectedEvent.slug)}
              >
                {isClearing ? '해제 중..' : '연결 해제'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const renderAccountCard = (account: AdminCustomerAccountSummary, index: number) => {
    const providerLabels = getProviderLabels(account.providerIds);
    const selectedSlug = draftAssignments[account.uid] ?? '';
    const isAssigning = ownershipActionToken === `assign:${account.uid}:${selectedSlug}`;
    const isDeletingAccount = deletingCustomerUid === account.uid;

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
              <p className={styles.tableSubtext}>UID · {account.uid}</p>
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
            {!account.isAdmin ? (
              <button
                type="button"
                className={styles.accountHeaderDangerButton}
                disabled={isDeletingAccount}
                onClick={() => onDeleteAccount(account.uid)}
                title="Firebase 계정과 지갑 데이터를 삭제하고 연결된 청첩장을 비공개로 전환합니다."
              >
                {isDeletingAccount
                  ? '처리 중'
                  : account.missingAuthUser
                    ? '잔여 정리'
                    : '탈퇴 처리'}
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.accountCardMetaGrid}>
          <span>로그인 수단 · {providerLabels.join(', ')}</span>
          <span>최근 로그인 · {formatDateValue(account.lastSignInAt)}</span>
          <span>연결된 청첩장 · {account.linkedEvents.length}개</span>
        </div>

        <div className={styles.accountCardBody}>
          <section className={`${styles.accountCardSection} ${styles.accountConnectSection}`}>
            <div className={styles.accountCardSectionHeader}>
              <h4 className={styles.accountCardSectionTitle}>새 청첩장 연결</h4>
              <StatusBadge tone={unassignedEvents.length > 0 ? 'warning' : 'neutral'}>
                미연결 {unassignedEvents.length}개
              </StatusBadge>
            </div>
            <div className={styles.accountConnectPanel}>
              <div className={styles.inlineInputGroup}>
                <select
                  className="admin-input"
                  value={selectedSlug}
                  disabled={account.missingAuthUser || !unassignedEvents.length}
                  onChange={(event) =>
                    setDraftAssignments((current) => ({
                      ...current,
                      [account.uid]: event.target.value,
                    }))
                  }
                >
                  <option value="">연결할 청첩장 선택</option>
                  {unassignedEvents.map((event) => (
                    <option key={event.slug} value={event.slug}>
                      [{getEventTypeDisplayLabel(event.eventType)}] {event.displayName} ({event.slug})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  disabled={account.missingAuthUser || !selectedSlug || isAssigning}
                  onClick={() => onAssign(account.uid, selectedSlug)}
                >
                  {isAssigning ? '연결 중..' : '청첩장 연결'}
                </button>
              </div>
              <span className={styles.actionHint}>
                {account.missingAuthUser
                  ? '삭제된 계정에는 청첩장을 연결할 수 없습니다.'
                  : unassignedEvents.length > 0
                    ? '미연결 청첩장을 선택하면 고객 페이지에서 바로 관리할 수 있습니다.'
                    : '현재 바로 연결할 수 있는 미연결 청첩장이 없습니다.'}
              </span>
            </div>
          </section>

          <section className={styles.accountCardSection}>
            <div className={styles.accountCardSectionHeader}>
              <h4 className={styles.accountCardSectionTitle}>연결된 청첩장</h4>
              <StatusBadge tone={account.linkedEvents.length > 0 ? 'primary' : 'neutral'}>
                {account.linkedEvents.length}개
              </StatusBadge>
            </div>
            {renderLinkedEventManager(account)}
          </section>

          <section className={styles.accountCardSection}>
            <div className={styles.accountCardSectionHeader}>
              <h4 className={styles.accountCardSectionTitle}>보유 이용권</h4>
              <StatusBadge tone="neutral">
                운영 티켓 {account.wallet.operationTicketBalance}장
              </StatusBadge>
            </div>
            {renderWalletManager(account)}
          </section>
        </div>
      </article>
    );
  };

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>고객 계정</h2>
          <p className={styles.sectionDescription}>
            Firebase 로그인 계정과 청첩장 소유권을 연결해 고객이 `/my-invitations`에서
            바로 수정하고 관리할 수 있게 합니다.
          </p>
        </div>
        <p className={styles.sectionMeta}>
          계정 {accounts.length}개 · 화면 표시 최대 5개 · 연결된 이벤트 {totalLinkedEvents}개 · 미연결 이벤트{' '}
          {unassignedEvents.length}개
        </p>
      </div>

      <FilterToolbar
        fields={
          <>
            <label className="admin-field">
              <span className="admin-field-label">고객 계정 검색</span>
              <input
                className="admin-input"
                type="search"
                placeholder="이메일, 이름, UID, 청첩장 주소 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <div className={styles.metaStack}>
              <span className={styles.toolbarNote}>
                아직 어떤 계정에도 연결되지 않은 청첩장만 바로 연결할 수 있습니다.
                이미 다른 계정에 연결된 청첩장은 먼저 연결 해제 후 다시 연결해 주세요.
              </span>
            </div>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={onRefresh}
              disabled={loading || refreshing}
            >
              {refreshing ? '새로고침 중' : loading ? '불러오는 중' : '새로고침'}
            </button>
            {searchQuery ? (
              <button
                type="button"
                className="admin-button admin-button-ghost"
                onClick={() => setSearchQuery('')}
              >
                검색 초기화
              </button>
            ) : null}
          </>
        }
        chips={
          searchQuery
            ? [
                {
                  id: 'customer-account-search',
                  label: `검색: ${searchQuery}`,
                  onRemove: () => setSearchQuery(''),
                },
              ]
            : []
        }
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>고객 계정과 연결된 청첩장을 불러오는 중입니다.</p>
        </div>
      ) : filteredAccounts.length > 0 ? (
        <>
          <div className={styles.accountCardList}>
            {paginatedAccounts.map((account, index) =>
              renderAccountCard(
                account,
                (normalizedCurrentPage - 1) * CUSTOMER_ACCOUNTS_PAGE_SIZE + index
              )
            )}
          </div>
          <Pagination
            currentPage={normalizedCurrentPage}
            totalPages={totalPages}
            totalItems={filteredAccounts.length}
            pageSize={CUSTOMER_ACCOUNTS_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <EmptyState
          title={
            searchQuery
              ? '검색 조건에 맞는 고객 계정이 없습니다.'
              : '관리할 고객 계정이 아직 없습니다.'
          }
          description={
            searchQuery
              ? '검색어를 다시 확인하거나 새로고침으로 최신 목록을 불러와 주세요.'
              : 'Firebase Authentication에 등록된 고객 계정이 보이면 여기서 청첩장을 연결해 사용자 페이지로 보낼 수 있습니다.'
          }
          highlights={[
            '미연결 청첩장을 고객 계정에 연결하면 /my-invitations 에서 바로 관리할 수 있습니다.',
            '이미 다른 계정에 연결된 청첩장은 먼저 연결 해제 후 다시 연결해 주세요.',
          ]}
          actionLabel={searchQuery ? '검색 초기화' : '새로고침'}
          onAction={searchQuery ? () => setSearchQuery('') : onRefresh}
          secondaryActionLabel={searchQuery ? '새로고침' : undefined}
          onSecondaryAction={searchQuery ? onRefresh : undefined}
        />
      )}
    </div>
  );
}
