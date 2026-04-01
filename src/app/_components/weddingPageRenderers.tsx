import { Fragment } from 'react';
import type { ReactNode } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

import type { WeddingPageReadyState } from './weddingPageState';
import type { WeddingInvitationRouteOptions } from './weddingThemes';

export interface WeddingThemeRendererProps {
  state: WeddingPageReadyState;
  options: WeddingInvitationRouteOptions;
}

export type WeddingThemeSectionSlot = (
  props: WeddingThemeRendererProps
) => ReactNode;

export interface WeddingThemeRendererDefinition {
  ariaLabelSuffix?: string;
  renderLoader: WeddingThemeSectionSlot;
  sections: WeddingThemeSectionSlot[];
}

export function createWeddingThemeRenderer(
  definition: WeddingThemeRendererDefinition
) {
  function WeddingThemeRenderer(props: WeddingThemeRendererProps) {
    const { state } = props;

    if (state.isLoading || state.imagesLoading) {
      return <>{definition.renderLoader(props)}</>;
    }

    return (
      <main
        role="main"
        aria-label={`${state.pageConfig.groomName}와 ${state.pageConfig.brideName}의 결혼식 청첩장${
          definition.ariaLabelSuffix ?? ''
        }`}
      >
        {definition.sections.map((renderSection, index) => (
          <Fragment key={index}>{renderSection(props)}</Fragment>
        ))}
      </main>
    );
  }

  WeddingThemeRenderer.displayName = 'WeddingThemeRenderer';

  return WeddingThemeRenderer;
}

export function createWeddingCalendarEvent(
  page: InvitationPage,
  weddingDate: Date,
  separator = '♡'
) {
  return {
    date: weddingDate.getDate(),
    type: 'wedding' as const,
    title: `${page.groomName} ${separator} ${page.brideName} 결혼식`,
    description: `${page.pageData?.ceremonyTime ?? ''} ${page.venue}`.trim(),
  };
}

export function getCeremonyAddress(page: InvitationPage) {
  return page.pageData?.ceremonyAddress ?? '';
}

export function getCeremonyContact(page: InvitationPage) {
  return page.pageData?.ceremonyContact;
}

export function getMapDescription(page: InvitationPage) {
  return (
    page.pageData?.mapDescription ?? '지하철 이용 시 편리하게 오실 수 있습니다'
  );
}

export function shouldShowGiftInfo(state: WeddingPageReadyState) {
  return Boolean(state.giftInfo && state.hasGiftAccounts);
}
