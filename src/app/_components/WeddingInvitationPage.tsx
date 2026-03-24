'use client';

import { getRequiredWeddingPageBySlug } from '@/config/weddingPages';
import { AccessDeniedPage } from '@/utils';

import {
  renderBluePage,
  renderClassicPage,
  renderEmotionalPage,
  renderLoader,
  renderMinimalPage,
  renderSimplePage,
  renderSpacePage,
} from './weddingPageRenderers';
import { useWeddingInvitationState } from './weddingPageState';
import { type WeddingInvitationRouteOptions } from './weddingThemes';

export function createWeddingInvitationPage(options: WeddingInvitationRouteOptions) {
  const pageConfig = getRequiredWeddingPageBySlug(options.slug);

  function WeddingInvitationPage() {
    const state = useWeddingInvitationState(options, pageConfig);

    if (state.access === null) {
      return null;
    }

    if (!state.access.canAccess) {
      return <AccessDeniedPage message={state.access.message} />;
    }

    if (state.isLoading || state.imagesLoading) {
      return renderLoader(options.theme, state);
    }

    switch (options.theme) {
      case 'simple':
        return renderSimplePage(state);
      case 'minimal':
        return renderMinimalPage(state, options);
      case 'space':
        return renderSpacePage(state);
      case 'blue':
        return renderBluePage(state);
      case 'classic':
        return renderClassicPage(state);
      case 'emotional':
      default:
        return renderEmotionalPage(state);
    }
  }

  WeddingInvitationPage.displayName = `${pageConfig.slug}-${options.theme}-page`;

  return WeddingInvitationPage;
}
