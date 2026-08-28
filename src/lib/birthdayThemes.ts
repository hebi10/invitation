import type { InvitationPage } from '@/types/invitationPage';

export const BIRTHDAY_THEME_KEYS = ['birthday-minimal', 'birthday-floral'] as const;

export type BirthdayThemeKey = (typeof BIRTHDAY_THEME_KEYS)[number];

export const DEFAULT_BIRTHDAY_THEME: BirthdayThemeKey = 'birthday-minimal';

export const BIRTHDAY_THEME_PREVIEW_CANDIDATES = [
  'birthday-luxury',
  'birthday-y2k',
  'birthday-aurora',
  'birthday-paper',
] as const;

export const BIRTHDAY_THEME_META = {
  'birthday-minimal': {
    label: '파티 노트',
    description: '일정·장소·연락처를 우선하는 생일 파티 메모입니다.',
  },
  'birthday-floral': {
    label: '생일 이야기',
    description: '사진과 축하 문장을 중심으로 한 짧은 생일 기록입니다.',
  },
} as const satisfies Record<
  BirthdayThemeKey,
  {
    label: string;
    description: string;
  }
>;

export function isBirthdayThemeKey(value: unknown): value is BirthdayThemeKey {
  return (
    typeof value === 'string' &&
    BIRTHDAY_THEME_KEYS.includes(value as BirthdayThemeKey)
  );
}

export function normalizeBirthdayThemeKey(
  value: unknown,
  fallback: BirthdayThemeKey = DEFAULT_BIRTHDAY_THEME
) {
  return isBirthdayThemeKey(value) ? value : fallback;
}

export function resolveBirthdayRouteTheme(
  previewPage: InvitationPage | null | undefined,
  requestedTheme?: string | null,
  defaultTheme?: string | null
) {
  if (isBirthdayThemeKey(requestedTheme)) {
    return requestedTheme;
  }

  if (isBirthdayThemeKey(previewPage?.pageData?.birthdayTheme)) {
    return previewPage.pageData.birthdayTheme;
  }

  return normalizeBirthdayThemeKey(defaultTheme, DEFAULT_BIRTHDAY_THEME);
}

export function getBirthdayThemeLabel(theme: BirthdayThemeKey) {
  return BIRTHDAY_THEME_META[theme].label;
}

export function getBirthdayThemeDescription(theme: BirthdayThemeKey) {
  return BIRTHDAY_THEME_META[theme].description;
}
