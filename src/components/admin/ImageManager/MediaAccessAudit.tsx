'use client';

import { useEffect, useRef, useState } from 'react';
import { getMediaAccessAudit, type MediaAccessAuditResult } from '@/services/adminMediaAccessAuditService';
import styles from './ImageManager.module.css';

export default function MediaAccessAudit({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [result, setResult] = useState<MediaAccessAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function inspect() {
    if (active.current || disabled) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getMediaAccessAudit(slug, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '이미지 점검에 실패했습니다.');
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  }

  return (
    <div className={styles.uploadInfo}>
      <strong>이미지 접근 권한 점검</strong>
      <p>선택한 청첩장의 장기 다운로드 토큰과 캐시 설정을 읽기 전용으로 확인합니다. 파일이나 기존 링크는 변경하지 않습니다.</p>
      <button className="admin-button admin-button-secondary" type="button" disabled={disabled || loading} onClick={() => void inspect()}>
        {loading ? '점검 중…' : '선택 페이지 점검'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {result ? <div aria-live="polite">
        <p>{result.complete ? '조회 범위 점검 완료' : '일부만 점검됨 — 전체 완료로 판단하지 마세요.'}</p>
        {result.results.map(row => <div key={row.namespace}>
          <strong>{row.namespace === 'wedding-images' ? '청첩장 사진' : '추억 페이지 사진'}</strong>
          <p>검사 {row.inspectedObjects}개 · 장기 토큰 {row.tokenObjects}개 · 캐시 확인 필요 {row.cacheReviewObjects}개 · 원본 표시 토큰 {row.originalTokenObjects}개</p>
        </div>)}
        <p>토큰이 발견되면 기존 사진 링크를 안전하게 이관한 뒤 별도 폐기 검증이 필요합니다. 이 점검은 실제 공개 URL 차단을 보장하지 않습니다.</p>
      </div> : null}
    </div>
  );
}
