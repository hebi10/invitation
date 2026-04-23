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
  createEventInvitationLayout,
  eventInvitationViewport,
  getEventInvitationMetadata,
} from './EventInvitationLayout';
import { EventInvitationRoutePage } from './EventInvitationPage';
import type { EventInvitationRouteOptions } from './eventPageThemes';

export interface EventPageRendererDefinition {
  eventType: EventTypeKey;
  renderPage: (options: EventInvitationRouteOptions) => ReactElement;
  createLayout: (
    theme: InvitationThemeKey
  ) => ({ children }: { children: ReactNode }) => ReactElement;
  getMetadata: (page?: InvitationPage | null) => Metadata;
  viewport: Viewport;
  isThemeSupported: (theme: string) => theme is InvitationThemeKey;
  normalizeTheme: (
    theme: string | null | undefined,
    fallback?: InvitationThemeKey
  ) => InvitationThemeKey;
  resolveRouteTheme: (
    previewPage: InvitationPage | null | undefined,
    requestedTheme?: string | null,
    defaultTheme?: string | null
  ) => InvitationThemeKey | null;
}

function createWeddingBackedRenderer(
  eventType: EventTypeKey
): EventPageRendererDefinition {
  return {
    eventType,
    renderPage(options) {
      return <EventInvitationRoutePage {...options} />;
    },
    createLayout(theme) {
      return createEventInvitationLayout({ theme });
    },
    getMetadata(page) {
      return getEventInvitationMetadata(page);
    },
    viewport: eventInvitationViewport,
    isThemeSupported(theme): theme is InvitationThemeKey {
      return isInvitationThemeKey(theme);
    },
    normalizeTheme(theme, fallback = DEFAULT_INVITATION_THEME) {
      return normalizeInvitationThemeKey(theme, fallback);
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

const weddingEventPageRenderer = createWeddingBackedRenderer('wedding');
const birthdayEventPageRenderer = createWeddingBackedRenderer('birthday');

const EVENT_PAGE_RENDERER_REGISTRY: Partial<Record<EventTypeKey, EventPageRendererDefinition>> = {
  wedding: weddingEventPageRenderer,
  birthday: birthdayEventPageRenderer,
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
