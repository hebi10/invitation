import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import {
  generateMetadata as generateWeddingMetadata,
  getRequiredWeddingPageBySlug,
} from '@/config/weddingPages';

import WeddingKakaoShareButton from './WeddingKakaoShareButton';
import {
  getWeddingThemeDefinition,
  type WeddingInvitationRouteOptions,
} from './weddingThemes';

export const weddingInvitationViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export function getWeddingInvitationMetadata(slug: string): Metadata {
  return generateWeddingMetadata(slug);
}

export function createWeddingInvitationLayout({
  slug,
  theme,
}: Pick<WeddingInvitationRouteOptions, 'slug' | 'theme'>) {
  const pageConfig = getRequiredWeddingPageBySlug(slug);
  const themeDefinition = getWeddingThemeDefinition(theme);

  function WeddingInvitationLayout({ children }: { children: ReactNode }) {
    const shareButton = (
      <WeddingKakaoShareButton
        title={themeDefinition.getShareTitle(pageConfig)}
        description={themeDefinition.getShareDescription(pageConfig)}
        imageUrl={pageConfig.metadata.images.wedding}
        pageSlug={slug}
        variant={themeDefinition.shareButtonVariant}
      />
    );

    return (
      <>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {children}
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

  WeddingInvitationLayout.displayName = `${pageConfig.slug}-${theme}-layout`;

  return WeddingInvitationLayout;
}
