import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import type { InvitationPage } from '@/types/invitationPage';
import { eventInvitationViewport, getEventInvitationMetadata } from '../EventInvitationLayout';

export const generalEventInvitationViewport: Viewport = eventInvitationViewport;

export function getGeneralEventInvitationMetadata(page?: InvitationPage | null): Metadata {
  const metadata = getEventInvitationMetadata(page);

  if (page) {
    return metadata;
  }

  return {
    ...metadata,
    title: '일반 행사 초대장',
    description: '행사 초대장 페이지',
  };
}

export function createGeneralEventInvitationLayout() {
  function GeneralEventInvitationLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  GeneralEventInvitationLayout.displayName = 'general-event-layout';

  return GeneralEventInvitationLayout;
}
