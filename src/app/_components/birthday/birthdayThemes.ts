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
    label: '모던 미니멀',
    description: '절제된 타이포그래피와 선명한 대비로 생일 파티 정보를 정리합니다.',
  },
  'birthday-floral': {
    label: '로맨틱 플로럴',
    description: '부드러운 플로럴 장식과 따뜻한 톤으로 초대 분위기를 만듭니다.',
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
