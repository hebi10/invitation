import {
  BIRTHDAY_THEME_KEYS,
  DEFAULT_BIRTHDAY_THEME,
} from '@/app/_components/birthday/birthdayThemes';
import {
  DEFAULT_FIRST_BIRTHDAY_THEME,
  getSelectableFirstBirthdayThemeKeys,
} from '@/app/_components/firstBirthday/firstBirthdayThemes';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  GENERAL_EVENT_THEME_KEYS,
} from '@/app/_components/generalEvent/generalEventThemes';
import {
  DEFAULT_OPENING_THEME,
  OPENING_THEME_KEYS,
} from '@/app/_components/opening/openingThemes';
import { DEFAULT_EVENT_TYPE, type EventTypeKey } from '@/lib/eventTypes';
import {
  DEFAULT_INVITATION_THEME,
  getSelectableInvitationThemeKeys,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';

export type PageWizardEventConfig = {
  eventType: EventTypeKey;
  createHref: string;
  defaultTheme: InvitationThemeKey;
  selectableThemeKeys: readonly InvitationThemeKey[];
};

const WEDDING_THEME_EXCLUDED_PREFIXES = [
  'first-birthday-',
  'birthday-',
  'general-event-',
  'opening-',
] as const;

function getWeddingThemeKeys() {
  return getSelectableInvitationThemeKeys().filter(
    (theme) =>
      !WEDDING_THEME_EXCLUDED_PREFIXES.some((prefix) => theme.startsWith(prefix))
  );
}

export const PAGE_WIZARD_EVENT_CONFIGS = {
  wedding: {
    eventType: 'wedding',
    createHref: '/page-wizard',
    defaultTheme: DEFAULT_INVITATION_THEME,
    selectableThemeKeys: getWeddingThemeKeys(),
  },
  birthday: {
    eventType: 'birthday',
    createHref: '/birthday-wizard',
    defaultTheme: DEFAULT_BIRTHDAY_THEME,
    selectableThemeKeys: [...BIRTHDAY_THEME_KEYS],
  },
  'first-birthday': {
    eventType: 'first-birthday',
    createHref: '/first-birthday-wizard',
    defaultTheme: DEFAULT_FIRST_BIRTHDAY_THEME,
    selectableThemeKeys: getSelectableFirstBirthdayThemeKeys(),
  },
  'general-event': {
    eventType: 'general-event',
    createHref: '/general-event-wizard',
    defaultTheme: GENERAL_EVENT_DEFAULT_THEME,
    selectableThemeKeys: [...GENERAL_EVENT_THEME_KEYS],
  },
  opening: {
    eventType: 'opening',
    createHref: '/opening-wizard',
    defaultTheme: DEFAULT_OPENING_THEME,
    selectableThemeKeys: [...OPENING_THEME_KEYS],
  },
  seventieth: {
    eventType: 'seventieth',
    createHref: '/page-wizard',
    defaultTheme: DEFAULT_INVITATION_THEME,
    selectableThemeKeys: getWeddingThemeKeys(),
  },
  etc: {
    eventType: 'etc',
    createHref: '/page-wizard',
    defaultTheme: DEFAULT_INVITATION_THEME,
    selectableThemeKeys: getWeddingThemeKeys(),
  },
} satisfies Record<EventTypeKey, PageWizardEventConfig>;

export function getPageWizardEventConfig(eventType: EventTypeKey) {
  return PAGE_WIZARD_EVENT_CONFIGS[eventType] ?? PAGE_WIZARD_EVENT_CONFIGS[DEFAULT_EVENT_TYPE];
}

export function getPageWizardCreateHrefForEventType(eventType: EventTypeKey) {
  return getPageWizardEventConfig(eventType).createHref;
}

export function getDefaultThemeForEventType(eventType: EventTypeKey) {
  return getPageWizardEventConfig(eventType).defaultTheme;
}

export function getSelectableThemeKeysForEventType(eventType: EventTypeKey) {
  return [...getPageWizardEventConfig(eventType).selectableThemeKeys];
}

export function isThemeSelectableForEventType(
  eventType: EventTypeKey,
  theme: InvitationThemeKey
) {
  const selectableThemeKeys: readonly InvitationThemeKey[] =
    getPageWizardEventConfig(eventType).selectableThemeKeys;
  return selectableThemeKeys.includes(theme);
}

export function isDedicatedPageWizardEventType(eventType: EventTypeKey) {
  return getPageWizardCreateHrefForEventType(eventType) !== '/page-wizard';
}
