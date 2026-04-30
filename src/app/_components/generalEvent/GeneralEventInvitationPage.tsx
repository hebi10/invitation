'use client';

import { AccessDeniedPage } from '@/utils';

import { useEventInvitationState } from '../eventPageState';
import type { EventInvitationRouteOptions } from '../eventPageThemes';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  normalizeGeneralEventThemeKey,
  type GeneralEventThemeKey,
} from './generalEventThemes';
import { GeneralEventThemeRenderer } from './themeRenderers/shared';

type GeneralEventRouteOptions = Omit<EventInvitationRouteOptions, 'theme'> & {
  theme: GeneralEventThemeKey;
};

export default function GeneralEventInvitationPage(options: GeneralEventRouteOptions) {
  const visualTheme = normalizeGeneralEventThemeKey(options.theme, GENERAL_EVENT_DEFAULT_THEME);
  const state = useEventInvitationState({
    ...options,
    theme: 'emotional',
    eventType: 'general-event',
  });

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

  return <GeneralEventThemeRenderer state={state} theme={visualTheme} />;
}
