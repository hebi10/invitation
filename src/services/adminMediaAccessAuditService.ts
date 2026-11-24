import { getCurrentFirebaseIdToken } from './adminAuth';

export type MediaAccessAuditResult = {
  complete: boolean;
  results: Array<{
    namespace: 'wedding-images' | 'memory-images';
    inspectedObjects: number;
    tokenObjects: number;
    cacheReviewObjects: number;
    originalTokenObjects: number;
    complete: boolean;
  }>;
};

export async function getMediaAccessAudit(slug: string, signal?: AbortSignal): Promise<MediaAccessAuditResult> {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) throw new Error('관리자 로그인 상태를 확인해 주세요.');
  const response = await fetch(`/api/admin/pages/${encodeURIComponent(slug)}/media/security/`, {
    method: 'GET', headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('이미지 접근 권한을 확인하지 못했습니다. 페이지 및 관리자 권한을 확인해 주세요.');
  const payload = await response.json() as MediaAccessAuditResult;
  if (typeof payload.complete !== 'boolean' || !Array.isArray(payload.results)) throw new Error('이미지 점검 응답을 확인하지 못했습니다.');
  return payload;
}
