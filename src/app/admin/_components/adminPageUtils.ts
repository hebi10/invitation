import type { DisplayPeriod } from '@/services';
import type { StatusTone } from './StatusBadge';

export type AdminTab =
  | 'pages'
  | 'memory'
  | 'images'
  | 'comments'
  | 'passwords'
  | 'periods';

export type ShortcutKey = 'emotional' | 'simple';
export type PageStatusFilter = 'all' | 'complete' | 'partial' | 'empty';
export type PageSort = 'newest' | 'name' | 'coverage';
export type CommentAgeFilter = 'all' | 'recent';
export type PeriodStatusFilter =
  | 'all'
  | 'dueSoon'
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'inactive';

export const COMMENTS_PER_PAGE = 10;
export const TOTAL_SHORTCUT_COUNT = 2;
export const RECENT_COMMENT_DAYS = 7;
export const DUE_SOON_DAYS = 7;

export const TAB_ITEMS: Array<{ key: AdminTab; label: string }> = [
  { key: 'pages', label: '청첩장' },
  { key: 'memory', label: '추억 페이지' },
  { key: 'images', label: '이미지' },
  { key: 'comments', label: '방명록' },
  { key: 'passwords', label: '비밀번호' },
  { key: 'periods', label: '노출 기간' },
];

export const SHORTCUT_ITEMS: Array<{ key: ShortcutKey; label: string }> = [
  { key: 'emotional', label: 'Emotional' },
  { key: 'simple', label: 'Simple' },
];

export const PAGE_STATUS_LABELS: Record<PageStatusFilter, string> = {
  all: '전체 상태',
  complete: '전체 연결',
  partial: '일부 연결',
  empty: '미연결',
};

export const PAGE_SORT_LABELS: Record<PageSort, string> = {
  newest: '최신순',
  name: '이름순',
  coverage: '연결순',
};

export const COMMENT_AGE_LABELS: Record<CommentAgeFilter, string> = {
  all: '전체 기간',
  recent: `최근 ${RECENT_COMMENT_DAYS}일`,
};

type VariantLink = {
  available: boolean;
  path: string;
  displayName: string;
};

type VariantCarrier = {
  slug: string;
  variants?: Partial<Record<ShortcutKey, VariantLink>>;
};

function getAdminPreviewPath(pageSlug: string, key: ShortcutKey) {
  return key === 'simple' ? `/${pageSlug}/simple` : `/${pageSlug}/emotional`;
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getAvailableShortcuts(page: VariantCarrier) {
  return SHORTCUT_ITEMS.filter(({ key }) => page.variants?.[key]?.available).map(
    ({ key, label }) => ({
      key,
      label,
      path: getAdminPreviewPath(page.slug, key),
    })
  );
}

export function getPageStatusMeta(
  availableCount: number
): { label: string; tone: StatusTone } {
  if (availableCount === 0) {
    return { label: '미연결', tone: 'neutral' };
  }

  if (availableCount === TOTAL_SHORTCUT_COUNT) {
    return { label: '전체 연결', tone: 'success' };
  }

  return { label: '일부 연결', tone: 'warning' };
}

export function getPeriodStatusMeta(
  period: DisplayPeriod
): { label: string; tone: StatusTone; description: string } {
  const now = new Date();

  if (!period.isActive) {
    return {
      label: '비활성',
      tone: 'neutral',
      description: '기간 제한이 꺼져 있습니다.',
    };
  }

  if (now < period.startDate) {
    return {
      label: '시작 전',
      tone: 'warning',
      description: '예약된 공개 기간이 아직 시작되지 않았습니다.',
    };
  }

  if (now > period.endDate) {
    return {
      label: '만료',
      tone: 'danger',
      description: '노출 기간이 이미 종료되었습니다.',
    };
  }

  if (daysBetween(now, period.endDate) <= DUE_SOON_DAYS) {
    return {
      label: '곧 종료',
      tone: 'warning',
      description: `${DUE_SOON_DAYS}일 이내 종료 예정입니다.`,
    };
  }

  return {
    label: '노출 중',
    tone: 'success',
    description: '현재 공개 가능한 기간입니다.',
  };
}

export function parseTab(value: string | null): AdminTab {
  return TAB_ITEMS.some((tab) => tab.key === value) ? (value as AdminTab) : 'pages';
}

export function parseShortcut(value: string | null): 'all' | ShortcutKey {
  return SHORTCUT_ITEMS.some((shortcut) => shortcut.key === value)
    ? (value as ShortcutKey)
    : 'all';
}

export function parsePageStatus(value: string | null): PageStatusFilter {
  return value === 'complete' || value === 'partial' || value === 'empty'
    ? value
    : 'all';
}

export function parsePageSort(value: string | null): PageSort {
  return value === 'name' || value === 'coverage' ? value : 'newest';
}

export function parseCommentAge(value: string | null): CommentAgeFilter {
  return value === 'recent' ? 'recent' : 'all';
}

export function parsePeriodFilter(value: string | null): PeriodStatusFilter {
  return value === 'dueSoon' ||
    value === 'active' ||
    value === 'scheduled' ||
    value === 'expired' ||
    value === 'inactive'
    ? value
    : 'all';
}

export function numberFromParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isRecentComment(date: Date) {
  return daysBetween(date, new Date()) <= RECENT_COMMENT_DAYS;
}

export function isDueSoonPeriod(period: DisplayPeriod) {
  const now = new Date();
  return (
    period.isActive &&
    now >= period.startDate &&
    now <= period.endDate &&
    daysBetween(now, period.endDate) <= DUE_SOON_DAYS
  );
}

export function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
