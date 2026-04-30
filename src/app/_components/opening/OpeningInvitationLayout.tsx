import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

import { eventInvitationViewport, getEventInvitationMetadata } from '../EventInvitationLayout';

export const openingInvitationViewport: Viewport = eventInvitationViewport;

export function getOpeningInvitationMetadata(page?: InvitationPage | null): Metadata {
  const metadata = getEventInvitationMetadata(page);

  if (page) {
    return metadata;
  }

  return {
    ...metadata,
    title: '개업 초대장',
    description: '새로운 시작을 알리는 개업 초대장 페이지',
  };
}

export function createOpeningInvitationLayout() {
  function OpeningInvitationLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  OpeningInvitationLayout.displayName = 'opening-layout';

  return OpeningInvitationLayout;
}
