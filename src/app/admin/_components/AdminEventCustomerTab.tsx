'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AdminCustomerAccountSummary } from '@/services/adminCustomerService';
import type { InvitationPageSummary } from '@/services/invitationPageService';

import styles from '../page.module.css';
import { useAdminWorkGuard } from './AdminWorkGuard';

interface AdminEventCustomerTabProps {
  page: InvitationPageSummary;
  accounts: AdminCustomerAccountSummary[];
  loading: boolean;
  error: Error | null;
  ownershipActionToken: string | null;
  issuingInvite: boolean;
  readOnly?: boolean;
  onRefresh: () => void;
  onAssign: (uid: string, pageSlug: string) => void;
  onClear: (pageSlug: string) => void;
  onIssueInvite: (pageSlug: string) => void;
}

function getProviderLabel(providerId: string) {
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'password') return '이메일';
  return providerId;
}

export default function AdminEventCustomerTab({
  page,
  accounts,
  loading,
  error,
  ownershipActionToken,
  issuingInvite,
  readOnly = false,
  onRefresh,
  onAssign,
  onClear,
  onIssueInvite,
}: AdminEventCustomerTabProps) {
  const linkedAccount = useMemo(
    () => accounts.find((account) => account.linkedEvents.some((event) => event.slug === page.slug)),
    [accounts, page.slug]
  );
  const assignableAccounts = useMemo(
    () => accounts.filter((account) => !account.isAdmin && !account.disabled && !account.missingAuthUser),
    [accounts]
  );
  const [selectedUid, setSelectedUid] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const busy = Boolean(ownershipActionToken) || issuingInvite;
  const selectedAccount = assignableAccounts.find((account) => account.uid === selectedUid);
  useAdminWorkGuard({ dirty: false, busy });
  const filteredAccounts = assignableAccounts.filter((account) =>
    `${account.displayName ?? ''} ${account.email ?? ''}`.toLocaleLowerCase().includes(customerQuery.trim().toLocaleLowerCase())
  );

  useEffect(() => {
    setSelectedUid('');
    setCustomerQuery('');
  }, [page.slug]);

  useEffect(() => {
    if (selectedUid && assignableAccounts.some((account) => account.uid === selectedUid)) return;
    setSelectedUid('');
  }, [assignableAccounts, selectedUid]);

  if (loading && accounts.length === 0) {
    return <p className={styles.eventManagementState}>고객 계정을 불러오는 중입니다.</p>;
  }

  if (error && accounts.length === 0) {
    return (
      <div className={styles.eventManagementState}>
        <p>고객 계정을 불러오지 못했습니다.</p>
        <button type="button" className="admin-button admin-button-secondary" onClick={onRefresh}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={styles.eventManagementStack}>
      <div className={styles.eventManagementHeading}>
        <div>
          <h3>고객 연결</h3>
          <p>고객을 연결하면 해당 계정에서 이 이벤트를 수정할 수 있습니다.</p>
        </div>
        <button type="button" className="admin-button admin-button-ghost" onClick={onRefresh} disabled={busy}>
          새로고침
        </button>
      </div>

      {linkedAccount ? (
        <div className={styles.eventCustomerCard}>
          <div>
            <p>현재 연결된 고객</p>
            <strong>{linkedAccount.displayName || linkedAccount.email || '이름 미등록 고객'}</strong>
            <p>{linkedAccount.email || '이메일 정보 없음'}</p>
            <span>
              {linkedAccount.providerIds.map(getProviderLabel).join(', ') || '로그인 방식 미확인'}
            </span>
          </div>
          <button
            type="button"
            className="admin-button admin-button-danger"
            disabled={readOnly || busy}
            onClick={() => onClear(page.slug)}
          >
            {ownershipActionToken === `clear:${page.slug}` ? '해제 중' : '연결 해제'}
          </button>
        </div>
      ) : (
        <div className={styles.eventManagementForm}>
          <p>현재 연결된 고객이 없습니다. 계정을 선택한 뒤 연결 버튼을 눌러 주세요.</p>
          <label className="admin-field">
            <span className="admin-field-label">고객 이름 또는 이메일 검색</span>
            <input className="admin-input" type="search" value={customerQuery}
              disabled={readOnly || busy}
              onChange={(event) => { setCustomerQuery(event.target.value); setSelectedUid(''); }}
              placeholder="이름 또는 이메일" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">연결할 고객 계정</span>
            <select
              className="admin-select"
              value={selectedUid}
              disabled={readOnly || busy || assignableAccounts.length === 0}
              onChange={(event) => setSelectedUid(event.target.value)}
            >
              <option value="">{filteredAccounts.length ? '연결할 고객을 선택해 주세요' : '검색된 고객 계정이 없습니다'}</option>
              {filteredAccounts.map((account) => (
                <option key={account.uid} value={account.uid}>
                  {account.displayName || account.email || account.uid}
                  {account.email ? ` · ${account.email}` : ''}
                </option>
              ))}
            </select>
          </label>
          {selectedAccount ? <p role="status">연결할 고객: {selectedAccount.displayName || selectedAccount.email || '이름 미등록 고객'}{selectedAccount.displayName && selectedAccount.email ? ` · ${selectedAccount.email}` : ''}</p> : null}
          <div className={styles.eventManagementActions}>
            <button
              type="button"
              className="admin-button admin-button-primary"
              disabled={readOnly || !selectedUid || busy}
              onClick={() => onAssign(selectedUid, page.slug)}
            >
              {ownershipActionToken?.startsWith('assign:') ? '연결 중' : '선택 계정에 연결'}
            </button>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={readOnly || busy}
              onClick={() => onIssueInvite(page.slug)}
            >
              {issuingInvite ? '링크 발급 중' : '고객 연결 링크 발급'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
