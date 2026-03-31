'use client';

import { AdminProvider } from '@/contexts';
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
import { getWeddingThemeDefinition } from './weddingThemes';
import WeddingKakaoShareButton from './WeddingKakaoShareButton';
import type { WeddingPageReadyState } from './weddingPageState';

function WeddingInvitationPageBody(options: WeddingInvitationRouteOptions) {
  const state = useWeddingInvitationState(options);
  const themeDefinition = getWeddingThemeDefinition(options.theme);

  if (state.status === 'blocked') {
    return <AccessDeniedPage message={state.blockMessage} />;
  }

  if (state.status !== 'ready') {
    return null;
  }

  const readyState: WeddingPageReadyState = state;

  if (readyState.isLoading || readyState.imagesLoading) {
    return renderLoader(options.theme, readyState);
  }

  const shareButton = (
    <WeddingKakaoShareButton
      title={themeDefinition.getShareTitle(readyState.pageConfig)}
      description={themeDefinition.getShareDescription(readyState.pageConfig)}
      imageUrl={readyState.pageConfig.metadata.images.wedding}
      pageSlug={options.slug}
      variant={themeDefinition.shareButtonVariant}
    />
  );

  const pageContent = (() => {
    switch (options.theme) {
      case 'simple':
        return renderSimplePage(readyState);
      case 'minimal':
        return renderMinimalPage(readyState, options);
      case 'space':
        return renderSpacePage(readyState);
      case 'blue':
        return renderBluePage(readyState);
      case 'classic':
        return renderClassicPage(readyState);
      case 'emotional':
      default:
        return renderEmotionalPage(readyState);
    }
  })();

  return (
    <>
      {pageContent}
      {themeDefinition.shareContainer ? (
        <div
          className={themeDefinition.shareContainer.className}
          style={themeDefinition.shareContainer.style}
        >
          {shareButton}
        </div>
      ) : (
        shareButton
      )}
    </>
  );
}

export function createWeddingInvitationPage(options: WeddingInvitationRouteOptions) {
  function WeddingInvitationPage() {
    return (
      <AdminProvider>
        <WeddingInvitationPageBody {...options} />
      </AdminProvider>
    );
  }

  WeddingInvitationPage.displayName = `${options.slug}-${options.theme}-page`;

  return WeddingInvitationPage;
}
