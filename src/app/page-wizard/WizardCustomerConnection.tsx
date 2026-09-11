'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { assignAdminCustomerEventOwnership, clearAdminCustomerEventOwnership, getAdminCustomerAccountsSnapshot } from '@/services/adminCustomerService';
import styles from './page.module.css';

export default function WizardCustomerConnection({ slug, disabled, experience, onBusyChange }: {
  slug: string | null;
  disabled: boolean;
  experience: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedUid, setSelectedUid] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const accounts = useQuery({
    queryKey: ['wizard-customer-connection', slug],
    queryFn: getAdminCustomerAccountsSnapshot,
    enabled: Boolean(slug) && !experience,
  });
  const linked = accounts.data?.accounts.find(account => account.linkedEvents.some(event => event.slug === slug));
  const candidates = (accounts.data?.accounts ?? []).filter(account =>
    !account.isAdmin && !account.disabled && !account.missingAuthUser &&
    `${account.displayName ?? ''} ${account.email ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selected = candidates.find(account => account.uid === selectedUid);
  const connect = async () => {
    if (!slug || !selected || busy || disabled || experience) return;
    setBusy(true);
    onBusyChange(true);
    setMessage('');
    try {
      await assignAdminCustomerEventOwnership(selected.uid, slug);
      await queryClient.invalidateQueries({ queryKey: ['wizard-customer-connection'] });
      setSelectedUid('');
      setMessage('고객을 연결했습니다. 해당 고객의 내 초대장에 표시됩니다.');
    } catch {
      setMessage('고객을 연결하지 못했습니다. 연결 상태를 새로고침한 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };
  const disconnect = async () => {
    if (!slug || busy || disabled || experience || !window.confirm('현재 계정의 편집 권한을 해제할까요? 초대장 내용은 유지됩니다.')) return;
    setBusy(true);
    onBusyChange(true);
    setMessage('');
    try {
      await clearAdminCustomerEventOwnership(slug);
      await queryClient.invalidateQueries({ queryKey: ['wizard-customer-connection'] });
      setMessage('기존 연결을 해제했습니다. 연결할 고객을 선택해 주세요.');
    } catch {
      setMessage('연결을 해제하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };
  return <section className={styles.fieldGrid} aria-labelledby="wizard-customer-title">
    <h3 id="wizard-customer-title">고객 연결</h3>
    <p className={styles.sectionText}>연결한 고객은 내 초대장에서 내용과 사진을 편집할 수 있습니다.</p>
    {!slug ? <>
      <p className={styles.fieldHint}>위의 이름과 주소를 입력해 초대장을 먼저 생성해 주세요.</p>
    </> : experience ? <p className={styles.fieldHint}>체험에서는 실제 고객 계정을 연결하지 않습니다.</p>
      : accounts.isPending ? <p role="status">고객 목록을 불러오고 있습니다.</p>
      : linked ? <>
        <p>연결된 계정: <strong>{linked.displayName || linked.email || '이름 미등록'}</strong>{linked.isAdmin ? ' · 관리자' : linked.missingAuthUser ? ' · 삭제된 계정' : linked.disabled ? ' · 사용 중지' : ''}</p>
        <p className={styles.fieldHint}>다른 고객에게 연결하려면 기존 연결을 먼저 해제해 주세요.</p>
        <button type="button" className={styles.secondaryButton} disabled={disabled || busy} onClick={() => void disconnect()}>{busy ? '처리 중' : '기존 연결 해제'}</button>
      </>
      : accounts.isError ? <p role="alert">고객 목록을 불러오지 못했습니다.</p>
      : <>
        <label className={styles.field}>고객 검색
          <input type="search" className={styles.input} value={search} disabled={disabled || busy}
            placeholder="고객 이름 또는 이메일" onChange={event => { setSearch(event.target.value); setSelectedUid(''); }} />
        </label>
        <label className={styles.field}>연결할 고객
          <select className={styles.input} value={selectedUid} disabled={disabled || busy}
            onChange={event => setSelectedUid(event.target.value)}>
            <option value="">고객을 선택해 주세요</option>
            {candidates.map(account => <option key={account.uid} value={account.uid}>{account.displayName || '이름 미등록'} · {account.email || '이메일 없음'}</option>)}
          </select>
        </label>
        {!candidates.length ? <p className={styles.fieldHint}>연결할 고객이 없습니다. 고객의 가입 여부와 검색어를 확인해 주세요.</p> : null}
        <button type="button" className={styles.primaryButton} disabled={!selected || disabled || busy} onClick={() => void connect()}>
          {busy ? '연결 중' : '선택한 고객 연결'}
        </button>
      </>}
    {slug && !experience ? <button type="button" className={styles.secondaryButton} disabled={disabled || busy || accounts.isFetching} onClick={() => void accounts.refetch()}>연결 상태 새로고침</button> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
