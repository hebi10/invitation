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
import {
  createOpeningInvitationLayout,
  getOpeningInvitationMetadata,
  openingInvitationViewport,
} from './opening/OpeningInvitationLayout';
import { OpeningInvitationRoutePage } from './opening/OpeningInvitationPage';
import {
  DEFAULT_OPENING_THEME,
  isOpeningThemeKey,
  normalizeOpeningThemeKey,
  resolveOpeningRouteTheme,
  type OpeningThemeKey,
} from './opening/openingThemes';

export interface EventPageRouteRenderOptions {
  slug: string;
  theme: string;
  initialPageConfig?: InvitationPage | null;
  initialBlockMessage?: string | null;
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
    resolveRouteTheme(previewPage, requestedTheme, defaultTheme) {
      const preferred = normalizeFirstBirthdayThemeKey(
        requestedTheme ?? defaultTheme,
        DEFAULT_FIRST_BIRTHDAY_THEME
      );

      if (!previewPage) {
        return preferred;
      }

      const resolved = resolveAvailableInvitationVariant(previewPage.variants, preferred);
      return isFirstBirthdayThemeKey(resolved) ? resolved : preferred;
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

      return normalizeGeneralEventThemeKey(
        previewPage.pageData?.generalEventTheme,
        GENERAL_EVENT_DEFAULT_THEME
      );
    },
  };
}

function createOpeningRenderer(): EventPageRendererDefinition {
  return {
    eventType: 'opening',
    renderPage(options) {
      return (
        <OpeningInvitationRoutePage
          {...options}
          theme={normalizeOpeningThemeKey(options.theme)}
          eventType="opening"
        />
      );
    },
    createLayout() {
      return createOpeningInvitationLayout();
    },
    getMetadata(page) {
      return getOpeningInvitationMetadata(page);
    },
    viewport: openingInvitationViewport,
    isThemeSupported(theme) {
      return isOpeningThemeKey(theme);
    },
    normalizeTheme(theme, fallback = DEFAULT_OPENING_THEME) {
      return normalizeOpeningThemeKey(theme, fallback as OpeningThemeKey);
    },
    resolveRouteTheme(previewPage, requestedTheme, defaultTheme) {
      return resolveOpeningRouteTheme(previewPage, requestedTheme, defaultTheme);
    },
  };
}

const weddingEventPageRenderer = createWeddingBackedRenderer('wedding');
const firstBirthdayEventPageRenderer = createFirstBirthdayRenderer();
const birthdayEventPageRenderer = createBirthdayRenderer();
const generalEventPageRenderer = createGeneralEventRenderer();
const openingEventPageRenderer = createOpeningRenderer();

const EVENT_PAGE_RENDERER_REGISTRY: Partial<Record<EventTypeKey, EventPageRendererDefinition>> = {
  wedding: weddingEventPageRenderer,
  'first-birthday': firstBirthdayEventPageRenderer,
  birthday: birthdayEventPageRenderer,
  'general-event': generalEventPageRenderer,
  opening: openingEventPageRenderer,
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

  if (requestedEventType !== DEFAULT_EVENT_TYPE) {
    const reason = !requestedRenderer
      ? '등록된 렌더러 없음'
      : !requestedEventMeta.enabled
        ? '이벤트 타입 비활성'
        : '알 수 없음';
    console.warn(
      `[eventPageRenderer] '${requestedEventType}' fallback to '${DEFAULT_EVENT_TYPE}' (${reason})`
    );
  }

  return {
    requestedEventType,
    resolvedEventType: DEFAULT_EVENT_TYPE,
    renderer: EVENT_PAGE_RENDERER_REGISTRY[DEFAULT_EVENT_TYPE]!,
    usedFallback: requestedEventType !== DEFAULT_EVENT_TYPE,
  } as const;
}
