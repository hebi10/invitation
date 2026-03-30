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

function WeddingInvitationPageBody(options: WeddingInvitationRouteOptions) {
  const state = useWeddingInvitationState(options);
  const themeDefinition = getWeddingThemeDefinition(options.theme);

  if (state.access === null || !state.pageConfig) {
    return null;
  }

  if (!state.access.canAccess) {
    return <AccessDeniedPage message={state.access.message} />;
  }

  if (state.isLoading || state.imagesLoading || !state.weddingDate) {
    return renderLoader(options.theme, state);
  }

  const shareButton = (
    <WeddingKakaoShareButton
      title={themeDefinition.getShareTitle(state.pageConfig)}
      description={themeDefinition.getShareDescription(state.pageConfig)}
      imageUrl={state.pageConfig.metadata.images.wedding}
      pageSlug={options.slug}
      variant={themeDefinition.shareButtonVariant}
    />
  );

  const pageContent = (() => {
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
