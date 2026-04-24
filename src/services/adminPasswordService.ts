import { getCurrentFirebaseIdToken } from './adminAuth';

export interface AdminClientPasswordSummary {
  eventId: string;
  slug: string;
  displayName: string;
  defaultTheme: string;
  hasPassword: boolean;
  passwordVersion: number;
  requiresReset: boolean;
  updatedAt: Date | null;
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

function toDate(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizePasswordEntry(input: unknown): AdminClientPasswordSummary | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const eventId = typeof record.eventId === 'string' ? record.eventId.trim() : '';
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';

  if (!eventId || !slug) {
    return null;
  }

  return {
    eventId,
    slug,
    displayName:
      typeof record.displayName === 'string' && record.displayName.trim()
        ? record.displayName.trim()
        : slug,
    defaultTheme:
      typeof record.defaultTheme === 'string' && record.defaultTheme.trim()
        ? record.defaultTheme.trim()
        : 'emotional',
    hasPassword: record.hasPassword === true,
    passwordVersion:
      typeof record.passwordVersion === 'number' && Number.isFinite(record.passwordVersion)
        ? record.passwordVersion
        : 0,
    requiresReset: record.requiresReset === true,
    updatedAt: toDate(record.updatedAt),
  };
}

export async function getAdminClientPasswordsSnapshot() {
  const headers = await createAdminAuthHeaders();
  const response = await fetch('/api/admin/passwords', {
    method: 'GET',
    headers,
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; passwords?: unknown[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '고객 비밀번호 목록을 불러오지 못했습니다.'
    );
  }

  return Array.isArray(payload?.passwords)
    ? payload.passwords
        .map((entry) => normalizePasswordEntry(entry))
        .filter((entry): entry is AdminClientPasswordSummary => Boolean(entry))
    : [];
}
