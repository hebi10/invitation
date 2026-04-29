import {
  DEFAULT_INVITATION_THEME,
  normalizeInvitationThemeKey,
} from '@/lib/invitationThemes';
import type { InvitationThemeKey } from '@/types/invitationPage';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function readNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeInvitationTheme(
  value: unknown,
  fallback: InvitationThemeKey = DEFAULT_INVITATION_THEME
): InvitationThemeKey {
  return normalizeInvitationThemeKey(value, fallback);
}
