import type { DisplayPeriod } from '@/services';
import type { WeddingPageInfo } from '@/utils';
import type { StatusTone } from './StatusBadge';

export type AdminTab = 'pages' | 'images' | 'comments' | 'passwords' | 'periods' | 'memory';
export type ShortcutKey = 'emotional' | 'simple' | 'minimal' | 'space' | 'blue' | 'classic';
export type PageStatusFilter = 'all' | 'complete' | 'partial' | 'empty';
export type PageSort = 'newest' | 'name' | 'coverage';
export type CommentAgeFilter = 'all' | 'recent';
export type PasswordStatusFilter = 'all' | 'default' | 'custom';
export type PeriodStatusFilter = 'all' | 'dueSoon' | 'active' | 'scheduled' | 'expired' | 'inactive';

export const COMMENTS_PER_PAGE = 10;
export const TOTAL_SHORTCUT_COUNT = 6;
export const RECENT_COMMENT_DAYS = 7;
export const DUE_SOON_DAYS = 7;
export const DEFAULT_PASSWORD = '12344';

export const TAB_ITEMS: Array<{ key: AdminTab; label: string }> = [
  { key: 'pages', label: '청첩장' },
  { key: 'memory', label: '추억 페이지' },
  { key: 'images', label: '이미지' },
  { key: 'comments', label: '댓글' },
  { key: 'passwords', label: '비밀번호' },
  { key: 'periods', label: '노출 기간' },
];

export const SHORTCUT_ITEMS: Array<{ key: ShortcutKey; label: string }> = [
  { key: 'emotional', label: '감성' },
  { key: 'simple', label: '심플' },
  { key: 'minimal', label: '미니멀' },
  { key: 'space', label: '우주' },
  { key: 'blue', label: '블루' },
  { key: 'classic', label: '클래식' },
];

export const PAGE_STATUS_LABELS: Record<PageStatusFilter, string> = {
  all: '전체 상태',
  complete: '전체 연결',
  partial: '일부 연결',
  empty: '미설정',
};

export const PAGE_SORT_LABELS: Record<PageSort, string> = {
  newest: '최신순',
  name: '이름순',
  coverage: '바로가기 많은 순',
};

export const COMMENT_AGE_LABELS: Record<CommentAgeFilter, string> = {
  all: '전체 기간',
  recent: '최근 7일',
};

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getAvailableShortcuts(page: WeddingPageInfo) {
  return SHORTCUT_ITEMS.filter(({ key }) => page.variants?.[key]?.available).map(({ key, label }) => ({
    key,
    label,
    path: page.variants?.[key]?.path ?? '#',
  }));
}

export function getPageStatusMeta(availableCount: number): { label: string; tone: StatusTone } {
  if (availableCount === 0) {
    return { label: '미설정', tone: 'neutral' };
  }

  if (availableCount === TOTAL_SHORTCUT_COUNT) {
    return { label: '전체 연결', tone: 'success' };
  }

  return { label: '일부 연결', tone: 'warning' };
}

export function getPeriodStatusMeta(period: DisplayPeriod): { label: string; tone: StatusTone; description: string } {
  const now = new Date();

  if (!period.isActive) {
    return { label: '제한 없음', tone: 'neutral', description: '비활성화되어 항상 노출됩니다.' };
  }

  if (now < period.startDate) {
    return { label: '시작 전', tone: 'warning', description: '예약된 기간에 맞춰 노출됩니다.' };
  }

  if (now > period.endDate) {
    return { label: '종료됨', tone: 'danger', description: '일반 사용자 노출이 종료된 상태입니다.' };
  }

  if (daysBetween(now, period.endDate) <= DUE_SOON_DAYS) {
    return { label: '종료 임박', tone: 'warning', description: `${DUE_SOON_DAYS}일 이내 종료됩니다.` };
  }

  return { label: '노출 중', tone: 'success', description: '현재 기간 내에서 정상 노출 중입니다.' };
}

export function parseTab(value: string | null): AdminTab {
  return TAB_ITEMS.some((tab) => tab.key === value) ? (value as AdminTab) : 'pages';
}

export function parseShortcut(value: string | null): 'all' | ShortcutKey {
  return SHORTCUT_ITEMS.some((shortcut) => shortcut.key === value) ? (value as ShortcutKey) : 'all';
}

export function parsePageStatus(value: string | null): PageStatusFilter {
  return value === 'complete' || value === 'partial' || value === 'empty' ? value : 'all';
}

export function parsePageSort(value: string | null): PageSort {
  return value === 'name' || value === 'coverage' ? value : 'newest';
}

export function parseCommentAge(value: string | null): CommentAgeFilter {
  return value === 'recent' ? 'recent' : 'all';
}

export function parsePasswordFilter(value: string | null): PasswordStatusFilter {
  return value === 'default' || value === 'custom' ? value : 'all';
}

export function parsePeriodFilter(value: string | null): PeriodStatusFilter {
  return value === 'dueSoon' || value === 'active' || value === 'scheduled' || value === 'expired' || value === 'inactive'
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
  return period.isActive && now >= period.startDate && now <= period.endDate && daysBetween(now, period.endDate) <= DUE_SOON_DAYS;
}

export function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
