'use client';

import type {
  WeddingPageBlockedState,
  WeddingPageLoadingState,
  WeddingPageReadyState,
  WeddingPageState,
} from './weddingPageState';
import { useWeddingInvitationState } from './weddingPageState';
import type { EventInvitationRouteOptions } from './eventPageThemes';

export type EventPageLoadingState = WeddingPageLoadingState;
export type EventPageBlockedState = WeddingPageBlockedState;
export type EventPageReadyState = WeddingPageReadyState;
export type EventPageState = WeddingPageState;

export function useEventInvitationState(
  options: EventInvitationRouteOptions
): EventPageState {
  return useWeddingInvitationState(options);
}
