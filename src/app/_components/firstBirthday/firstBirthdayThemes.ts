import {
  getInvitationThemeDefinition,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';

export const FIRST_BIRTHDAY_THEME_KEYS = [
  'first-birthday-pink',
  'first-birthday-mint',
] as const satisfies readonly InvitationThemeKey[];

export type FirstBirthdayThemeKey = (typeof FIRST_BIRTHDAY_THEME_KEYS)[number];

export const DEFAULT_FIRST_BIRTHDAY_THEME: FirstBirthdayThemeKey =
  'first-birthday-pink';

export function isFirstBirthdayThemeKey(value: unknown): value is FirstBirthdayThemeKey {
  return (
    typeof value === 'string' &&
    FIRST_BIRTHDAY_THEME_KEYS.includes(value as FirstBirthdayThemeKey)
  );
}

export function normalizeFirstBirthdayThemeKey(
  value: unknown,
  fallback: FirstBirthdayThemeKey = DEFAULT_FIRST_BIRTHDAY_THEME
): FirstBirthdayThemeKey {
  return isFirstBirthdayThemeKey(value) ? value : fallback;
}

export function getFirstBirthdayThemeDefinition(theme: FirstBirthdayThemeKey) {
  return getInvitationThemeDefinition(theme);
}

export function getSelectableFirstBirthdayThemeKeys() {
  return [...FIRST_BIRTHDAY_THEME_KEYS];
}
