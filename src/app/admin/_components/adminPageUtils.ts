import type { DisplayPeriod } from '@/services';
import {
  EVENT_TYPE_KEYS,
  getEventTypeDisplayLabel,
  type EventTypeKey,
} from '@/lib/eventTypes';
import {
  buildInvitationThemeRoutePath,
  getInvitationThemeAdminLabel,
  INVITATION_THEME_KEYS,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import type { StatusTone } from './StatusBadge';

export type AdminTab =
  | 'accounts'
  | 'pages'
  | 'memory'
  | 'images'
  | 'comments'
  | 'periods';
export type AdminSection = 'customers' | 'events';
export interface AdminSectionItem {
  key: AdminSection;
  label: string;
}
export interface AdminTabItem {
  key: AdminTab;
  section: AdminSection;
  label: string;
}

export type ShortcutKey = InvitationThemeKey;
export type PageStatusFilter = 'all' | 'complete' | 'partial' | 'empty';
export type PageEventTypeFilter = 'all' | EventTypeKey;
export type PageSort = 'newest' | 'name' | 'coverage';
export type CommentAgeFilter = 'all' | 'recent';
export type PageCategoryTabKey =
  | 'invitation'
  | 'first-birthday'
  | 'birthday'
  | 'general-event'
  | 'opening';
export type EventAdminTab = Extract<
  AdminTab,
  'pages' | 'memory' | 'images' | 'comments' | 'periods'
>;
export type PeriodStatusFilter =
  | 'all'
  | 'dueSoon'
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'inactive';

export const COMMENTS_PER_PAGE = 10;
export const RECENT_COMMENT_DAYS = 7;
export const DUE_SOON_DAYS = 7;

export const ADMIN_SECTIONS: AdminSectionItem[] = [
  { key: 'customers', label: '고객 관리' },
  { key: 'events', label: '이벤트 운영' },
];

export const TAB_ITEMS: AdminTabItem[] = [
  { key: 'accounts', section: 'customers', label: '고객 계정' },
  { key: 'pages', section: 'events', label: '모바일 청첩장' },
  { key: 'memory', section: 'events', label: '추억 페이지' },
  { key: 'images', section: 'events', label: '이미지' },
  { key: 'comments', section: 'events', label: '방명록' },
  { key: 'periods', section: 'events', label: '노출 기간' },
];

export const SHORTCUT_ITEMS: Array<{ key: ShortcutKey; label: string }> =
  INVITATION_THEME_KEYS.map((key) => ({
    key,
    label: getInvitationThemeAdminLabel(key),
  }));

export const TOTAL_SHORTCUT_COUNT = SHORTCUT_ITEMS.length;

export const PAGE_CATEGORY_TABS = [
  { key: 'invitation', label: '청첩장' },
  {
    key: 'first-birthday',
    label: '돌잔치',
    title: '돌잔치 관리 탭 준비 중',
    description:
      '돌잔치 전용 디자인, 관리 목록, 생성 흐름은 추후 순차적으로 연결할 예정입니다.',
  },
  {
    key: 'birthday',
    label: '생일',
    title: '생일 관리 탭 준비 중',
    description:
      '생일 페이지 전용 디자인과 운영 목록은 이후 단계에서 붙일 예정입니다.',
  },
  {
    key: 'general-event',
    label: '일반 행사',
    title: '일반 행사 관리 탭 준비 중',
    description:
      '일반 행사 유형에 맞는 템플릿과 관리 항목은 앞으로 추가할 예정입니다.',
  },
  {
    key: 'opening',
    label: '개업',
    title: '개업 관리 탭 준비 중',
    description:
      '개업 이벤트 전용 관리 화면과 디자인은 TODO 상태로 남겨둡니다.',
  },
] as const satisfies ReadonlyArray<
  | { key: 'invitation'; label: string }
  | {
      key: Exclude<PageCategoryTabKey, 'invitation'>;
      label: string;
      title: string;
      description: string;
    }
>;

const EVENT_ADMIN_TABS: EventAdminTab[] = [
  'pages',
  'memory',
  'images',
  'comments',
  'periods',
];

function getBaseTabLabel(tab: AdminTab) {
  switch (tab) {
    case 'accounts':
      return '고객 계정';
    case 'pages':
      return '모바일 청첩장';
    case 'memory':
      return '추억 페이지';
    case 'images':
      return '이미지';
    case 'comments':
      return '방명록';
    case 'periods':
      return '노출 기간';
    default:
      return '관리';
  }
}

export function parsePageCategory(value: string | null): PageCategoryTabKey {
  return PAGE_CATEGORY_TABS.some((tab) => tab.key === value)
    ? (value as PageCategoryTabKey)
    : 'invitation';
}

export function getPageCategoryMeta(pageCategory: PageCategoryTabKey) {
  return PAGE_CATEGORY_TABS.find((tab) => tab.key === pageCategory) ?? PAGE_CATEGORY_TABS[0];
}

export function isImplementedPageCategory(pageCategory: PageCategoryTabKey) {
  return pageCategory === 'invitation';
}

export function isEventAdminTab(tab: AdminTab): tab is EventAdminTab {
  return EVENT_ADMIN_TABS.includes(tab as EventAdminTab);
}

export function getTabLabelForPageCategory(
  tab: AdminTab,
  pageCategory: PageCategoryTabKey
) {
  if (!isEventAdminTab(tab) || pageCategory === 'invitation') {
    return getBaseTabLabel(tab);
  }

  const categoryLabel = getPageCategoryMeta(pageCategory).label;

  switch (tab) {
    case 'pages':
      return `${categoryLabel} 페이지`;
    case 'memory':
      return `${categoryLabel} 기록`;
    case 'comments':
      return `${categoryLabel} 메시지`;
    case 'images':
      return '이미지';
    case 'periods':
      return '노출 기간';
    default:
      return getBaseTabLabel(tab);
  }
}

export const PAGE_STATUS_LABELS: Record<PageStatusFilter, string> = {
  all: '전체 상태',
  complete: '전체 연결',
  partial: '일부 연결',
  empty: '미연결',
};

export const PAGE_EVENT_TYPE_OPTIONS: Array<{
  value: PageEventTypeFilter;
  label: string;
}> = [
  { value: 'all', label: '전체 이벤트' },
  ...EVENT_TYPE_KEYS.map((key) => ({
    value: key,
    label: getEventTypeDisplayLabel(key),
  })),
];

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
  return buildInvitationThemeRoutePath(pageSlug, key);
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

export function parseSection(value: string | null): AdminSection {
  return ADMIN_SECTIONS.some((section) => section.key === value)
    ? (value as AdminSection)
    : 'events';
}

export function getTabsForSection(
  section: AdminSection,
  pageCategory: PageCategoryTabKey = 'invitation'
) {
  return TAB_ITEMS.filter((tab) => tab.section === section).map((tab) => ({
    ...tab,
    label: getTabLabelForPageCategory(tab.key, pageCategory),
  }));
}

export function getDefaultTabForSection(
  section: AdminSection,
  pageCategory: PageCategoryTabKey = 'invitation'
): AdminTab {
  return getTabsForSection(section, pageCategory)[0]?.key ?? 'pages';
}

export function getSectionForTab(tab: AdminTab): AdminSection {
  return TAB_ITEMS.find((item) => item.key === tab)?.section ?? 'events';
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

export function parsePageEventType(value: string | null): PageEventTypeFilter {
  return EVENT_TYPE_KEYS.some((eventType) => eventType === value)
    ? (value as EventTypeKey)
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
