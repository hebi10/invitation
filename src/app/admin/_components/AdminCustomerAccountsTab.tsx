'use client';

import { useMemo, useState } from 'react';

import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type {
  AdminCustomerAccountSummary,
  AdminCustomerLinkedEventSummary,
} from '@/services';

import { EmptyState, FilterToolbar, StatusBadge } from '.';
import { formatDateTime } from './adminPageUtils';
import styles from '../page.module.css';

interface AdminCustomerAccountsTabProps {
  loading: boolean;
  refreshing: boolean;
  accounts: AdminCustomerAccountSummary[];
  unassignedEvents: AdminCustomerLinkedEventSummary[];
  ownershipActionToken: string | null;
  onRefresh: () => void;
  onAssign: (uid: string, pageSlug: string) => void;
  onClear: (pageSlug: string) => void;
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

export default function AdminCustomerAccountsTab({
  loading,
  refreshing,
  accounts,
  unassignedEvents,
  ownershipActionToken,
  onRefresh,
  onAssign,
  onClear,
}: AdminCustomerAccountsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const [selectedLinkedEvents, setSelectedLinkedEvents] = useState<Record<string, string>>({});

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
                href={`/${selectedEvent.slug}/${selectedEvent.defaultTheme}`}
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
          계정 {accounts.length}개 · 연결된 이벤트 {totalLinkedEvents}개 · 미연결 이벤트{' '}
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
          <div className={styles.tableCard}>
            <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="고객 계정 목록">
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>고객 계정</th>
                    <th>인증 상태</th>
                    <th>연결된 청첩장</th>
                    <th>새 청첩장 연결</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account, index) => {
                    const providerLabels = getProviderLabels(account.providerIds);
                    const selectedSlug = draftAssignments[account.uid] ?? '';
                    const isAssigning = ownershipActionToken === `assign:${account.uid}:${selectedSlug}`;

                    return (
                      <tr key={account.uid} className={styles.tableRowInteractive}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.rowNumber}>{index + 1}</span>
                            <div className={styles.identityStack}>
                              <div className={styles.customerIdentityHeader}>
                                <p className={styles.tableTitle}>
                                  {account.displayName || account.email || account.uid}
                                </p>
                                {account.isAdmin ? (
                                  <StatusBadge tone="primary">관리자</StatusBadge>
                                ) : null}
                              </div>
                              <p className={styles.tableSubtext}>{account.email ?? '이메일 없음'}</p>
                              <p className={styles.tableSubtext}>UID · {account.uid}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <div className={styles.customerStatusRow}>
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
                            <span className={styles.tableSubtext}>
                              로그인 수단 · {providerLabels.join(', ')}
                            </span>
                            <span className={styles.tableSubtext}>
                              최근 로그인 · {formatDateValue(account.lastSignInAt)}
                            </span>
                          </div>
                        </td>
                        <td>{renderLinkedEventManager(account)}</td>
                        <td>
                          <div className={styles.actionStack}>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {filteredAccounts.map((account) => {
              const providerLabels = getProviderLabels(account.providerIds);
              const selectedSlug = draftAssignments[account.uid] ?? '';
              const isAssigning = ownershipActionToken === `assign:${account.uid}:${selectedSlug}`;

              return (
                <article className={styles.mobileCard} key={account.uid}>
                  <div className={styles.mobileCardHead}>
                    <div>
                      <div className={styles.customerIdentityHeader}>
                        <h3 className={styles.mobileCardTitle}>
                          {account.displayName || account.email || account.uid}
                        </h3>
                        {account.isAdmin ? (
                          <StatusBadge tone="primary">관리자</StatusBadge>
                        ) : null}
                      </div>
                      <p className={styles.mobileCardSlug}>{account.email ?? '이메일 없음'}</p>
                      <p className={styles.mobileCardSlug}>UID · {account.uid}</p>
                    </div>
                    <StatusBadge tone={account.disabled ? 'danger' : 'success'}>
                      {account.disabled ? '비활성화' : '사용 가능'}
                    </StatusBadge>
                  </div>

                  <div className={styles.metaStack}>
                    <span className={styles.tableSubtext}>로그인 수단 · {providerLabels.join(', ')}</span>
                    <span className={styles.tableSubtext}>
                      최근 로그인 · {formatDateValue(account.lastSignInAt)}
                    </span>
                  </div>

                  {renderLinkedEventManager(account)}

                  <div className={styles.actionStack}>
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
                </article>
              );
            })}
          </div>
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
