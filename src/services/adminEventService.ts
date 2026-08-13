import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import type { AdminEventDeletionResult } from '@/server/adminEventDeletionService';

import { getCurrentFirebaseIdToken } from './adminAuth';

export type { AdminEventDeletionResult };

export async function deleteAdminEventByPageSlug(
  pageSlug: string,
  options: { retry?: boolean } = {}
): Promise<AdminEventDeletionResult> {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('삭제할 청첩장 주소가 올바르지 않습니다.');
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(`/api/admin/events/${encodeURIComponent(normalizedPageSlug)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(options.retry ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.retry ? JSON.stringify({ retry: true }) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | (AdminEventDeletionResult & { error?: string })
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 전체 삭제에 실패했습니다.'
    );
  }

  return payload as AdminEventDeletionResult;
}
