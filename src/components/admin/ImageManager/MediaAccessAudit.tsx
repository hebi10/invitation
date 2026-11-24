'use client';

import { useEffect, useRef, useState } from 'react';
import { getMediaAccessAudit, getMediaMigrationPreflight, type MediaAccessAuditResult, type MediaMigrationPreflight } from '@/services/adminMediaAccessAuditService';
import styles from './ImageManager.module.css';

const blockerLabels: Record<string, string> = {
  'pilot-disabled': '파일럿 미활성화',
  'not-wedding': '웨딩 외 유형의 호환성 확인 필요',
  'no-current-content': '저장된 청첩장 내용 없음',
  'event-unavailable': '이용 불가 상태',
  'partial-inventory': '일부만 조사됨',
  'unsupported-image-reference': '지원하지 않는 이미지 참조',
  'unmapped-stored-reference': '이미지 필드 외의 저장 참조',
  'missing-or-unscanned-object': '미확인 또는 누락된 이미지 객체',
  'incompatible-object': '형식 또는 용량 등 메타데이터 불일치',
  'unreferenced-token-object': '사용 참조가 확인되지 않은 토큰 객체',
  'memory-page-review-required': '추억 페이지 호환성 확인 필요',
  'legacy-token-reference': '기존 토큰 URL 참조 존재',
  'editor-upload-client-cutover-required': '편집기·업로드·구버전 앱 전환 확인 필요',
  'cross-event-reference-review-required': '다른 이벤트 참조 및 공유 경로 확인 필요',
  'live-compatibility-and-revocation-approval-required': '실제 환경 검증 및 폐기 승인 필요',
};

export default function MediaAccessAudit({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [result, setResult] = useState<MediaAccessAuditResult | null>(null);
  const [preflight, setPreflight] = useState<MediaMigrationPreflight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function inspect(mode: 'audit' | 'migration') {
    if (active.current || disabled) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    setPreflight(null);
    try {
      if (mode === 'audit') {
        const data = await getMediaAccessAudit(slug, controller.signal);
        if (!controller.signal.aborted) setResult(data);
      } else {
        const data = await getMediaMigrationPreflight(slug, controller.signal);
        if (!controller.signal.aborted) setPreflight(data);
      }
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
      <button className="admin-button admin-button-secondary" type="button" disabled={disabled || loading} onClick={() => void inspect('audit')}>
        {loading ? '점검 중…' : '선택 페이지 점검'}
      </button>
      <button className="admin-button admin-button-secondary" type="button" disabled={disabled || loading} onClick={() => void inspect('migration')}>
        이미지 이관 사전 점검
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {preflight ? <div aria-live="polite">
        <strong>토큰 폐기 불가 — 읽기 전용 점검</strong>
        <p>선택한 청첩장과 추억 페이지 기준 · {preflight.inventoryComplete ? '조회 범위 확인 완료' : '일부만 조회됨'}</p>
        <p>변환 후보 {preflight.candidateFiles}개 · 메타데이터 적합 {preflight.compatibleCandidateFiles}개 · 기존 토큰 참조 {preflight.legacyTokenReferences}개</p>
        <p>지원 외 참조 {preflight.unsupportedImageReferences}개 · 저장 필드 외 참조 {preflight.unmappedStoredReferences}개 · 미확인 객체 {preflight.missingOrUnscannedObjects}개 · 미호환 객체 {preflight.incompatibleObjects}개</p>
        <p>사용처 미확인 토큰 객체 {preflight.unreferencedTokenObjects}개 · 추억 페이지 참조 {preflight.memoryReferences}개 · 추억 이미지 {preflight.memoryObjects}개</p>
        <ul>{preflight.blockers.map(blocker => <li key={blocker}>{blockerLabels[blocker] ?? '추가 확인 필요'}</li>)}</ul>
        <p>적합 판정은 메타데이터 기준이며 실제 브라우저·앱 표시와 토큰 폐기 안전성을 보장하지 않습니다. 기존 파일은 변경하지 않았습니다.</p>
      </div> : null}
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
