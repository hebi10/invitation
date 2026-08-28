'use client';

import { AccessDeniedPage } from '@/utils';

import { useEventInvitationState } from '../eventPageState';
import type { EventInvitationRouteOptions } from '../eventPageThemes';
import {
  NightSchedulePage,
  ProgramEditionPage,
} from '../public-invitations/general-event';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  normalizeGeneralEventThemeKey,
  type GeneralEventThemeKey,
} from './generalEventThemes';

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

  if (visualTheme === 'general-event-elegant') {
    return <ProgramEditionPage state={state} />;
  }

  return <NightSchedulePage state={state} />;
}
