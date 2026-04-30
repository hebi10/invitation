import {
  BIRTHDAY_THEME_KEYS,
  DEFAULT_BIRTHDAY_THEME,
  getBirthdayThemeLabel,
  isBirthdayThemeKey,
  type BirthdayThemeKey,
} from '@/app/_components/birthday/birthdayThemes';
import {
  DEFAULT_FIRST_BIRTHDAY_THEME,
  FIRST_BIRTHDAY_THEME_KEYS,
  getFirstBirthdayThemeDefinition,
  isFirstBirthdayThemeKey,
  type FirstBirthdayThemeKey,
} from '@/app/_components/firstBirthday/firstBirthdayThemes';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  GENERAL_EVENT_THEME_KEYS,
  getGeneralEventTheme,
  isGeneralEventThemeKey,
  type GeneralEventThemeKey,
} from '@/app/_components/generalEvent/generalEventThemes';
import {
  DEFAULT_OPENING_THEME,
  OPENING_THEME_KEYS,
  getOpeningTheme,
  isOpeningThemeKey,
  type OpeningThemeKey,
} from '@/app/_components/opening/openingThemes';
import { normalizeEventTypeKey, type EventTypeKey } from '@/lib/eventTypes';
import {
  buildInvitationThemeRoutePath,
  DEFAULT_INVITATION_THEME,
  getInvitationThemeAdminLabel,
  getInvitationThemeLabel,
  INVITATION_THEME_KEYS,
  isInvitationThemeKey,
  normalizeInvitationThemeKey,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';

export type EventPreviewLink = {
  key: InvitationThemeKey;
  theme: InvitationThemeKey;
  label: string;
  path: string;
  href: string;
  isDefault: boolean;
};

export type EventPreviewLabelMode = 'default' | 'admin';

const BIRTHDAY_PREVIEW_THEME_KEYS =
  BIRTHDAY_THEME_KEYS as readonly InvitationThemeKey[];
const FIRST_BIRTHDAY_PREVIEW_THEME_KEYS =
  FIRST_BIRTHDAY_THEME_KEYS as readonly InvitationThemeKey[];
const GENERAL_EVENT_PREVIEW_THEME_KEYS =
  GENERAL_EVENT_THEME_KEYS as readonly InvitationThemeKey[];
const OPENING_PREVIEW_THEME_KEYS =
  OPENING_THEME_KEYS as readonly InvitationThemeKey[];

function uniqueThemes(themes: readonly InvitationThemeKey[]) {
  return [...new Set(themes)];
}

export function isEventSpecificPreviewThemeKey(theme: unknown) {
  return (
    isBirthdayThemeKey(theme) ||
    isFirstBirthdayThemeKey(theme) ||
    isGeneralEventThemeKey(theme) ||
    isOpeningThemeKey(theme)
  );
}

export function isWeddingPreviewThemeKey(
  theme: unknown
): theme is InvitationThemeKey {
  return isInvitationThemeKey(theme) && !isEventSpecificPreviewThemeKey(theme);
}

export function getWeddingPreviewThemeKeys() {
  return INVITATION_THEME_KEYS.filter(isWeddingPreviewThemeKey);
}

function normalizeWeddingPreviewTheme(value: unknown) {
  const theme = normalizeInvitationThemeKey(value, DEFAULT_INVITATION_THEME);
  return isWeddingPreviewThemeKey(theme) ? theme : DEFAULT_INVITATION_THEME;
}

export function getEventTypeDefaultPreviewTheme(
  eventType: unknown,
  preferredTheme?: unknown
): InvitationThemeKey {
  switch (normalizeEventTypeKey(eventType)) {
    case 'birthday':
      return (
        isBirthdayThemeKey(preferredTheme) ? preferredTheme : DEFAULT_BIRTHDAY_THEME
      ) as BirthdayThemeKey;
    case 'first-birthday':
      return (
        isFirstBirthdayThemeKey(preferredTheme)
          ? preferredTheme
          : DEFAULT_FIRST_BIRTHDAY_THEME
      ) as FirstBirthdayThemeKey;
    case 'general-event':
      return (
        isGeneralEventThemeKey(preferredTheme)
          ? preferredTheme
          : GENERAL_EVENT_DEFAULT_THEME
      ) as GeneralEventThemeKey;
    case 'opening':
      return (
        isOpeningThemeKey(preferredTheme) ? preferredTheme : DEFAULT_OPENING_THEME
      ) as OpeningThemeKey;
    case 'wedding':
    default:
      return normalizeWeddingPreviewTheme(preferredTheme);
  }
}

function normalizeThemeForEvent(eventType: EventTypeKey, theme: unknown) {
  switch (eventType) {
    case 'birthday':
      return isBirthdayThemeKey(theme) ? theme : null;
    case 'first-birthday':
      return isFirstBirthdayThemeKey(theme) ? theme : null;
    case 'general-event':
      return isGeneralEventThemeKey(theme) ? theme : null;
    case 'opening':
      return isOpeningThemeKey(theme) ? theme : null;
    case 'wedding':
    default:
      return isWeddingPreviewThemeKey(theme) ? theme : null;
  }
}

export function getEventPreviewThemeKeys({
  eventType,
  availableThemes = [],
  defaultTheme,
}: {
  eventType: unknown;
  availableThemes?: readonly unknown[];
  defaultTheme?: unknown;
}) {
  const normalizedEventType = normalizeEventTypeKey(eventType);

  switch (normalizedEventType) {
    case 'birthday':
      return [...BIRTHDAY_PREVIEW_THEME_KEYS];
    case 'first-birthday':
      return [...FIRST_BIRTHDAY_PREVIEW_THEME_KEYS];
    case 'general-event':
      return [...GENERAL_EVENT_PREVIEW_THEME_KEYS];
    case 'opening':
      return [...OPENING_PREVIEW_THEME_KEYS];
    case 'wedding':
    default: {
      const validAvailableThemes = availableThemes.filter(isWeddingPreviewThemeKey);
      const fallbackTheme = getEventTypeDefaultPreviewTheme(
        normalizedEventType,
        defaultTheme
      );
      return uniqueThemes(
        validAvailableThemes.length > 0 ? validAvailableThemes : [fallbackTheme]
      );
    }
  }
}

export function getEventPreviewThemeLabel(
  theme: InvitationThemeKey,
  labelMode: EventPreviewLabelMode = 'default'
) {
  if (isBirthdayThemeKey(theme)) {
    if (labelMode === 'admin') {
      return theme === 'birthday-minimal' ? 'Minimal' : 'Floral';
    }

    return getBirthdayThemeLabel(theme);
  }

  if (isFirstBirthdayThemeKey(theme)) {
    return getFirstBirthdayThemeDefinition(theme).variantLabel;
  }

  if (isGeneralEventThemeKey(theme)) {
    return getGeneralEventTheme(theme).shortLabel;
  }

  if (isOpeningThemeKey(theme)) {
    return getOpeningTheme(theme).shortLabel;
  }

  return labelMode === 'admin'
    ? getInvitationThemeAdminLabel(theme)
    : getInvitationThemeLabel(theme);
}

export function buildEventPreviewPath(
  slug: string,
  eventType: unknown,
  theme?: unknown
) {
  const normalizedEventType = normalizeEventTypeKey(eventType);
  const normalizedTheme =
    normalizeThemeForEvent(normalizedEventType, theme) ??
    getEventTypeDefaultPreviewTheme(normalizedEventType, theme);

  return buildInvitationThemeRoutePath(slug, normalizedTheme);
}

export function getEventPreviewLinks({
  slug,
  eventType,
  availableThemes,
  defaultTheme,
  labelMode = 'default',
}: {
  slug: string;
  eventType: unknown;
  availableThemes?: readonly unknown[];
  defaultTheme?: unknown;
  labelMode?: EventPreviewLabelMode;
}): EventPreviewLink[] {
  const defaultPreviewTheme = getEventTypeDefaultPreviewTheme(eventType, defaultTheme);

  return getEventPreviewThemeKeys({
    eventType,
    availableThemes,
    defaultTheme,
  }).map((theme) => {
    const path = buildEventPreviewPath(slug, eventType, theme);
    return {
      key: theme,
      theme,
      label: getEventPreviewThemeLabel(theme, labelMode),
      path,
      href: path,
      isDefault: theme === defaultPreviewTheme,
    };
  });
}
