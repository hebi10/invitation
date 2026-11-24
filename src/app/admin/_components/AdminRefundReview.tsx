'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getAdminRefundReview, getRefundAccessState, changeRefundAccess,
  type AdminRefundReviewResult, type RefundAccessState, type RefundReleaseReason,
} from '@/services/adminRefundReviewService';
import { useAdminOverlay } from './AdminOverlayProvider';
import { formatDateTime } from './adminPageUtils';
import styles from './AdminOverview.module.css';

const statusLabels = { processing: '지급 처리 중', fulfilled: '지급 기록 있음', failed: '지급 실패' } as const;
const kindLabels = { pageCreation: '청첩장 제작', ticketPack: '기존 티켓', periodExtension: '기존 기간 연장' } as const;
const PAGE_SIZE = 30;

export default function AdminRefundReview() {
  const [result, setResult] = useState<AdminRefundReviewResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [accessState, setAccessState] = useState<RefundAccessState | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [releaseReason, setReleaseReason] = useState<RefundReleaseReason | ''>('');
  const accessLock = useRef(false);
  const mounted = useRef(true);
  const { confirm, showToast } = useAdminOverlay();
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; active.current?.abort(); };
  }, []);

  async function refreshAccess() {
    if (accessLock.current) return;
    accessLock.current = true;
    setAccessBusy(true);
    setAccessError('');
    try {
      const state = await getRefundAccessState();
      if (mounted.current) setAccessState(state);
    } catch (error) {
      if (mounted.current) { setAccessState(null); setAccessError(error instanceof Error ? error.message : '보류 목록 조회 실패'); }
    } finally {
      accessLock.current = false;
      if (mounted.current) setAccessBusy(false);
    }
  }

  async function updateAccess(action: 'hold' | 'release', id: string, pageSlug: string) {
    if (accessLock.current || !accessState || (action === 'hold' && !accessState.holdEnabled) ||
        (action === 'release' && !releaseReason)) return;
    accessLock.current = true;
    setAccessBusy(true);
    setAccessError('');
    try {
      const confirmed = await confirm({
        title: action === 'hold' ? '청첩장 공개 이용 보류' : '이용 보류 해제',
        description: action === 'hold'
          ? `${pageSlug}의 공개 이용을 보류합니다. Play 환불·지급 기록과 소유권이 다시 확인된 경우에만 적용하며 사진과 편집 데이터는 보존합니다.`
          : `${pageSlug}의 보류 상태만 해제합니다. 자동 공개되지 않으며 별도 공개 검토가 필요합니다.`,
        confirmLabel: action === 'hold' ? '이용 보류' : '보류 해제', tone: action === 'hold' ? 'danger' : 'primary',
      });
      if (!confirmed || !mounted.current) return;
      await changeRefundAccess(action, id, releaseReason || undefined);
      if (!mounted.current) return;
      showToast({ title: action === 'hold' ? '이용 보류 처리 완료' : '보류 해제 완료', tone: 'success' });
      setReleaseReason('');
      const next = await getRefundAccessState();
      if (mounted.current) setAccessState(next);
    } catch (error) {
      if (mounted.current) {
        setAccessState(null);
        setAccessError(error instanceof Error ? error.message : '처리 상태를 확인하지 못했습니다. 다시 조회해 주세요.');
      }
    } finally {
      accessLock.current = false;
      if (mounted.current) setAccessBusy(false);
    }
  }

  async function load() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getAdminRefundReview(controller.signal);
      if (!controller.signal.aborted) {
        setResult(data);
        setVisibleCount(PAGE_SIZE);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '환불 거래 확인에 실패했습니다.');
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  }

  return (
    <section aria-labelledby="admin-refund-review-title">
      <div className={styles.sectionHeading}>
        <h2 id="admin-refund-review-title">결제 환불 검토</h2>
        <button type="button" disabled={loading} onClick={() => void load()}>
          {loading ? '확인 중…' : '최근 30일 조회'}
        </button>
      </div>
      <p>Google Play 환불·취소 기록과 기존 지급 이력을 비교합니다. 자동 삭제·자동 보류는 하지 않으며 관리자의 명시적 검토로만 공개 이용을 보류합니다.</p>
      <button type="button" className="admin-button admin-button-secondary" disabled={accessBusy} onClick={() => void refreshAccess()}>
        {accessBusy ? '처리 중…' : '이용 보류 상태 확인'}
      </button>
      {accessError ? <p role="alert">{accessError}</p> : null}
      {accessState ? (
        <div aria-live="polite">
          <p>{accessState.holdEnabled ? '관리자 확인 후 신규 이용 보류 가능' : '신규 이용 보류 비활성'} · 현재 보류 목록 {accessState.holds.length}건{accessState.truncated ? ' 이상' : ''}</p>
          {accessState.holds.length ? (
            <label className="admin-field">
              <span className="admin-field-label">보류 해제 사유 (관리자 확인)</span>
              <select className="admin-select" value={releaseReason} disabled={accessBusy}
                onChange={event => setReleaseReason(event.target.value as RefundReleaseReason | '')}>
                <option value="">선택해 주세요.</option>
                <option value="replacement-payment-reviewed">대체 결제 확인</option>
                <option value="approved-exception">이용 유지 예외 승인</option>
                <option value="record-correction">거래 기록 정정</option>
              </select>
            </label>
          ) : null}
          <ul className={styles.list}>
            {accessState.holds.map(hold => (
              <li key={hold.transactionIdentifier}>
                <strong>{hold.pageSlug}</strong>
                <p>보류 시각: {formatDateTime(new Date(hold.heldAt))}</p>
                <button type="button" className="admin-button admin-button-secondary" disabled={accessBusy || !releaseReason}
                  onClick={() => void updateAccess('release', hold.transactionIdentifier, hold.pageSlug)}>보류 해제</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {loading ? <p role="status">거래 확인 중입니다.</p> : null}
      {result ? (
        <div aria-live="polite">
          <p>최근 {result.windowDays}일 환불·취소 {result.count}건. {result.count ? '관리자 확인이 필요합니다.' : '조회 범위 내 기록이 없습니다.'}</p>
          <ul className={styles.list}>
            {result.records.slice(0, visibleCount).map(record => (
              <li key={record.transactionIdentifier}>
                <span className={styles.eventText}>
                  <strong>{record.pageSlug || '연결된 지급 기록 없음'}</strong>
                  <span>{record.kind ? kindLabels[record.kind] : '상품 확인 필요'} · {record.fulfillmentStatus ? statusLabels[record.fulfillmentStatus] : '거래 대조 필요'}</span>
                  <small>{formatDateTime(new Date(record.voidedAt))} · 환불 검토 필요</small>
                </span>
                {accessState?.holdEnabled && record.fulfillmentStatus === 'fulfilled' && record.kind === 'pageCreation' &&
                  record.pageSlug && !accessState.holds.some(hold => hold.transactionIdentifier === record.transactionIdentifier) ? (
                    <button type="button" className="admin-button admin-button-secondary" disabled={accessBusy}
                      onClick={() => void updateAccess('hold', record.transactionIdentifier, record.pageSlug!)}>이용 보류 검토</button>
                  ) : null}
              </li>
            ))}
          </ul>
          {visibleCount < result.records.length ? (
            <button className="admin-button admin-button-secondary" type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>더 보기</button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
