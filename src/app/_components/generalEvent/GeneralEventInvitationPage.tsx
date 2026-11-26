'use client';

import { AccessDeniedPage } from '@/utils';
import { resolvePublicInvitationIntro } from '@/lib/publicInvitationIntro';
import PublicInvitationGifIntro from '@/components/sections/InvitationIntro/PublicInvitationGifIntro';

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

  const introDecision = resolvePublicInvitationIntro(
    state.pageConfig.introPresetId,
    state.pageConfig.introStyle,
    'general-event'
  );
  const GeneralEventPage = visualTheme === 'general-event-elegant'
    ? ProgramEditionPage
    : NightSchedulePage;

  return (
    <>
      <GeneralEventPage state={state} />
      {!state.isLoading && !state.imagesLoading && introDecision.kind === 'gif' ? (
        <PublicInvitationGifIntro
          key={`${state.pageConfig.slug}:${introDecision.preset.id}`}
          slug={state.pageConfig.slug}
          preset={introDecision.preset}
          preview={options.queryScope === 'experience'}
        />
      ) : null}
    </>
  );
}
