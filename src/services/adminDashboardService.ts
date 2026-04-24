import { getCurrentFirebaseIdToken } from './adminAuth';

export interface AdminDashboardSummarySnapshot {
  invitationCount: number;
  restrictedCount: number;
  dueSoonCount: number;
  memoryPublicCount: number;
  commentSummary: {
    totalCount: number;
    recentCount: number;
    recentDays: number;
  };
}

async function createAdminAuthHeaders() {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function getAdminDashboardSummary() {
  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/dashboard/summary', {
    method: 'GET',
    headers,
  });
  const payload = (await response.json().catch(() => null)) as
    | ({
        success?: boolean;
        invitationCount?: unknown;
        restrictedCount?: unknown;
        dueSoonCount?: unknown;
        memoryPublicCount?: unknown;
        commentSummary?: {
          totalCount?: unknown;
          recentCount?: unknown;
          recentDays?: unknown;
        };
        error?: string;
      })
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '관리자 요약을 불러오지 못했습니다.'
    );
  }

  return {
    invitationCount: readFiniteNumber(payload?.invitationCount),
    restrictedCount: readFiniteNumber(payload?.restrictedCount),
    dueSoonCount: readFiniteNumber(payload?.dueSoonCount),
    memoryPublicCount: readFiniteNumber(payload?.memoryPublicCount),
    commentSummary: {
      totalCount: readFiniteNumber(payload?.commentSummary?.totalCount),
      recentCount: readFiniteNumber(payload?.commentSummary?.recentCount),
      recentDays: readFiniteNumber(payload?.commentSummary?.recentDays),
    },
  } satisfies AdminDashboardSummarySnapshot;
}
