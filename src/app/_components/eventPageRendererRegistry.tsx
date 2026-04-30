import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';

import {
  DEFAULT_EVENT_TYPE,
  getEventTypeMeta,
  normalizeEventTypeKey,
  type EventTypeKey,
} from '@/lib/eventTypes';
import {
  DEFAULT_INVITATION_THEME,
  isInvitationThemeKey,
  normalizeInvitationThemeKey,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import { resolveAvailableInvitationVariant } from '@/lib/invitationVariants';
import type { InvitationPage } from '@/types/invitationPage';

import {
  birthdayInvitationViewport,
  createBirthdayInvitationLayout,
  getBirthdayInvitationMetadata,
} from './birthday/BirthdayInvitationLayout';
import { BirthdayInvitationRoutePage } from './birthday/BirthdayInvitationPage';
import {
  DEFAULT_BIRTHDAY_THEME,
  isBirthdayThemeKey,
  normalizeBirthdayThemeKey,
  resolveBirthdayRouteTheme,
  type BirthdayThemeKey,
} from './birthday/birthdayThemes';
import {
  createEventInvitationLayout,
  eventInvitationViewport,
  getEventInvitationMetadata,
} from './EventInvitationLayout';
import { EventInvitationRoutePage } from './EventInvitationPage';
import type { EventInvitationRouteOptions } from './eventPageThemes';
import {
  createFirstBirthdayInvitationLayout,
  firstBirthdayInvitationViewport,
  getFirstBirthdayInvitationMetadata,
} from './firstBirthday/FirstBirthdayInvitationLayout';
import { FirstBirthdayInvitationRoutePage } from './firstBirthday/FirstBirthdayInvitationPage';
import {
  DEFAULT_FIRST_BIRTHDAY_THEME,
  isFirstBirthdayThemeKey,
  normalizeFirstBirthdayThemeKey,
  type FirstBirthdayThemeKey,
} from './firstBirthday/firstBirthdayThemes';
import {
  createGeneralEventInvitationLayout,
  generalEventInvitationViewport,
  getGeneralEventInvitationMetadata,
} from './generalEvent/GeneralEventInvitationLayout';
import GeneralEventInvitationPage from './generalEvent/GeneralEventInvitationPage';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  isGeneralEventThemeKey,
  normalizeGeneralEventThemeKey,
  type GeneralEventThemeKey,
} from './generalEvent/generalEventThemes';

export interface EventPageRouteRenderOptions {
  slug: string;
  theme: string;
  initialPageConfig?: InvitationPage | null;
  loadingDelay?: number;
  showGuestbook?: boolean;
  eventType?: EventTypeKey;
}

export interface EventPageRendererDefinition {
  eventType: EventTypeKey;
  renderPage: (options: EventPageRouteRenderOptions) => ReactElement;
  createLayout: (
    theme: string
  ) => ({ children }: { children: ReactNode }) => ReactElement;
  getMetadata: (page?: InvitationPage | null) => Metadata;
  viewport: Viewport;
  isThemeSupported: (theme: string) => boolean;
  normalizeTheme: (
    theme: string | null | undefined,
    fallback?: string
  ) => string;
  resolveRouteTheme: (
    previewPage: InvitationPage | null | undefined,
    requestedTheme?: string | null,
    defaultTheme?: string | null
  ) => string | null;
}

function createWeddingBackedRenderer(
  eventType: EventTypeKey
): EventPageRendererDefinition {
  return {
    eventType,
    renderPage(options) {
      return (
        <EventInvitationRoutePage
          {...(options as EventInvitationRouteOptions)}
          theme={normalizeInvitationThemeKey(options.theme)}
        />
      );
    },
    createLayout(theme) {
      return createEventInvitationLayout({ theme: normalizeInvitationThemeKey(theme) });
    },
    getMetadata(page) {
      return getEventInvitationMetadata(page);
    },
    viewport: eventInvitationViewport,
    isThemeSupported(theme): theme is InvitationThemeKey {
      return isInvitationThemeKey(theme);
    },
    normalizeTheme(theme, fallback = DEFAULT_INVITATION_THEME) {
      const themeFallback = normalizeInvitationThemeKey(fallback, DEFAULT_INVITATION_THEME);
      return normalizeInvitationThemeKey(theme, themeFallback);
    },
    resolveRouteTheme(previewPage, requestedTheme, defaultTheme) {
      const preferredTheme = normalizeInvitationThemeKey(
        requestedTheme ?? defaultTheme,
        DEFAULT_INVITATION_THEME
      );

      return resolveAvailableInvitationVariant(previewPage?.variants, preferredTheme);
    },
  };
}

function createBirthdayRenderer(): EventPageRendererDefinition {
  return {
    eventType: 'birthday',
    renderPage(options) {
      return <BirthdayInvitationRoutePage {...(options as EventInvitationRouteOptions)} />;
    },
    createLayout() {
      return createBirthdayInvitationLayout();
    },
    getMetadata(page) {
      return getBirthdayInvitationMetadata(page);
    },
    viewport: birthdayInvitationViewport,
    isThemeSupported(theme) {
      return isBirthdayThemeKey(theme);
    },
    normalizeTheme(theme, fallback = DEFAULT_BIRTHDAY_THEME) {
      return normalizeBirthdayThemeKey(theme, fallback as BirthdayThemeKey);
    },
    resolveRouteTheme(previewPage, requestedTheme, defaultTheme) {
      return resolveBirthdayRouteTheme(previewPage, requestedTheme, defaultTheme);
    },
  };
}

function createFirstBirthdayRenderer(): EventPageRendererDefinition {
  return {
    eventType: 'first-birthday',
    renderPage(options) {
      return <FirstBirthdayInvitationRoutePage {...(options as EventInvitationRouteOptions)} />;
    },
    createLayout() {
      return createFirstBirthdayInvitationLayout();
    },
    getMetadata(page) {
      return getFirstBirthdayInvitationMetadata(page);
    },
    viewport: firstBirthdayInvitationViewport,
    isThemeSupported(theme) {
      return isFirstBirthdayThemeKey(theme);
    },
    normalizeTheme(theme, fallback = DEFAULT_FIRST_BIRTHDAY_THEME) {
      return normalizeFirstBirthdayThemeKey(theme, fallback as FirstBirthdayThemeKey);
    },
    resolveRouteTheme(_previewPage, requestedTheme, defaultTheme) {
      return normalizeFirstBirthdayThemeKey(
        requestedTheme ?? defaultTheme,
        DEFAULT_FIRST_BIRTHDAY_THEME
      );
    },
  };
}

function createGeneralEventRenderer(): EventPageRendererDefinition {
  return {
    eventType: 'general-event',
    renderPage(options) {
      return (
        <GeneralEventInvitationPage
          {...options}
          theme={normalizeGeneralEventThemeKey(options.theme)}
          eventType="general-event"
        />
      );
    },
    createLayout() {
      return createGeneralEventInvitationLayout();
    },
    getMetadata(page) {
      return getGeneralEventInvitationMetadata(page);
    },
    viewport: generalEventInvitationViewport,
    isThemeSupported(theme) {
      return isGeneralEventThemeKey(theme);
    },
    normalizeTheme(theme, fallback = GENERAL_EVENT_DEFAULT_THEME) {
      return normalizeGeneralEventThemeKey(theme, fallback as GeneralEventThemeKey);
    },
    resolveRouteTheme(previewPage, requestedTheme) {
      if (!previewPage) {
        return null;
      }

      if (requestedTheme) {
        return isGeneralEventThemeKey(requestedTheme) ? requestedTheme : null;
      }

      return GENERAL_EVENT_DEFAULT_THEME;
    },
  };
}

const weddingEventPageRenderer = createWeddingBackedRenderer('wedding');
const firstBirthdayEventPageRenderer = createFirstBirthdayRenderer();
const birthdayEventPageRenderer = createBirthdayRenderer();
const generalEventPageRenderer = createGeneralEventRenderer();

const EVENT_PAGE_RENDERER_REGISTRY: Partial<Record<EventTypeKey, EventPageRendererDefinition>> = {
  wedding: weddingEventPageRenderer,
  'first-birthday': firstBirthdayEventPageRenderer,
  birthday: birthdayEventPageRenderer,
  'general-event': generalEventPageRenderer,
};

export function resolveEventPageRenderer(eventType: unknown) {
  const requestedEventType = normalizeEventTypeKey(eventType, DEFAULT_EVENT_TYPE);
  const requestedEventMeta = getEventTypeMeta(requestedEventType);
  const requestedRenderer = EVENT_PAGE_RENDERER_REGISTRY[requestedEventType];

  if (requestedRenderer && requestedEventMeta.enabled) {
    return {
      requestedEventType,
      resolvedEventType: requestedEventType,
      renderer: requestedRenderer,
      usedFallback: false,
    } as const;
  }

  return {
    requestedEventType,
    resolvedEventType: DEFAULT_EVENT_TYPE,
    renderer: EVENT_PAGE_RENDERER_REGISTRY[DEFAULT_EVENT_TYPE]!,
    usedFallback: requestedEventType !== DEFAULT_EVENT_TYPE,
  } as const;
}
