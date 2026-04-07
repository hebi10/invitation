import { Fragment } from 'react';
import type { ReactNode } from 'react';

import {
  resolveCeremonyScheduleDetail,
  resolveInvitationPageDataByTheme,
  resolveReceptionScheduleDetail,
} from '@/lib/invitationThemePageData';
import type { InvitationPage, InvitationScheduleDetail } from '@/types/invitationPage';
import type { InvitationThemeKey } from '@/lib/invitationThemes';

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
  separator = '♡',
  pageData = page.pageData
) {
  const ceremony = toRenderableScheduleDetail(
    resolveCeremonyScheduleDetail(pageData, page.venue)
  );

  return {
    date: weddingDate.getDate(),
    type: 'wedding' as const,
    title: `${page.groomName} ${separator} ${page.brideName} 결혼식`,
    description: `${ceremony?.time ?? pageData?.ceremonyTime ?? ''} ${page.venue}`.trim(),
  };
}

export function getThemePageData(page: InvitationPage, theme: InvitationThemeKey) {
  return resolveInvitationPageDataByTheme(page, theme);
}

function toRenderableScheduleDetail(detail?: InvitationScheduleDetail) {
  if (!detail) {
    return undefined;
  }

  const time = detail.time?.trim() ?? '';
  const location = detail.location?.trim() ?? '';

  if (!time && !location) {
    return undefined;
  }

  return {
    time,
    location,
  };
}

export function getCeremonySchedule(page: InvitationPage, pageData = page.pageData) {
  return toRenderableScheduleDetail(resolveCeremonyScheduleDetail(pageData, page.venue));
}

export function getReceptionSchedule(page: InvitationPage, pageData = page.pageData) {
  return toRenderableScheduleDetail(resolveReceptionScheduleDetail(pageData));
}

export function getCeremonyAddress(page: InvitationPage, pageData = page.pageData) {
  return pageData?.ceremonyAddress ?? getCeremonySchedule(page, pageData)?.location ?? '';
}

export function getCeremonyContact(_page: InvitationPage, pageData?: InvitationPage['pageData']) {
  return pageData?.ceremonyContact;
}

export function getMapDescription(page: InvitationPage, pageData = page.pageData) {
  return (
    pageData?.mapDescription ?? '지하철 이용 시 편리하게 오실 수 있습니다'
  );
}

export function shouldShowGiftInfo(state: WeddingPageReadyState) {
  return Boolean(state.giftInfo && state.hasGiftAccounts);
}
