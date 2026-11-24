'use client';

import { useEffect, useRef, useState } from 'react';
import { getAdminRefundReview, type AdminRefundReviewResult } from '@/services/adminRefundReviewService';
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
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

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
      <p>Google Play 환불·취소 기록과 기존 지급 이력을 비교합니다. 청첩장을 자동 삭제하거나 비공개로 변경하지 않습니다.</p>
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
