'use client';

import { useEffect } from 'react';

import { AccessDeniedPage } from '@/utils';

import { useEventInvitationState } from '../eventPageState';
import type { EventInvitationRouteOptions } from '../eventPageThemes';
import {
  DEFAULT_OPENING_THEME,
  normalizeOpeningThemeKey,
  type OpeningThemeKey,
} from './openingThemes';
import { OpeningThemeRenderer } from './themeRenderers/shared';

type OpeningRouteOptions = Omit<EventInvitationRouteOptions, 'theme'> & {
  theme: OpeningThemeKey;
};

function upsertMetaTag(selector: string, attributes: Record<string, string>) {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function OpeningInvitationPageBody(options: OpeningRouteOptions) {
  const openingTheme = normalizeOpeningThemeKey(options.theme, DEFAULT_OPENING_THEME);
  const state = useEventInvitationState({
    ...options,
    theme: 'emotional',
    eventType: 'opening',
  });

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }

    const page = state.pageConfig;
    const title = page.metadata.title || page.displayName || '개업 초대장';
    const description =
      page.metadata.description || page.description || '새로운 시작에 초대합니다.';

    document.title = title;
    upsertMetaTag('meta[name="description"]', {
      name: 'description',
      content: description,
    });
    upsertMetaTag('meta[property="og:title"]', {
      property: 'og:title',
      content: page.metadata.openGraph.title || title,
    });
    upsertMetaTag('meta[property="og:description"]', {
      property: 'og:description',
      content: page.metadata.openGraph.description || description,
    });
  }, [state]);

  if (state.status === 'blocked') {
    return (
      <AccessDeniedPage
        message={state.blockMessage}
        actionLabel={state.isRefreshingPage ? '다시 불러오는 중...' : '다시 불러오기'}
        actionDisabled={state.isRefreshingPage}
        onAction={() => {
          void state.refreshPage();
        }}
      />
    );
  }

  if (state.status !== 'ready') {
    return null;
  }

  return <OpeningThemeRenderer state={state} theme={openingTheme} />;
}

export function OpeningInvitationRoutePage(options: EventInvitationRouteOptions) {
  return (
    <OpeningInvitationPageBody
      {...options}
      theme={normalizeOpeningThemeKey(options.theme, DEFAULT_OPENING_THEME)}
    />
  );
}
