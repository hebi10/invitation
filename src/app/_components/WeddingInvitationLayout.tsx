import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import {
  type WeddingInvitationRouteOptions,
  getWeddingThemeDefinition,
} from './weddingThemes';

export const weddingInvitationViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const genericInvitationMetadata: Metadata = {
  title: '모바일 청첩장',
  description: '모바일 청첩장 페이지입니다.',
};

export function getWeddingInvitationMetadata(_slug?: string): Metadata {
  return genericInvitationMetadata;
}

export function createWeddingInvitationLayout({
  theme,
}: Pick<WeddingInvitationRouteOptions, 'slug' | 'theme'>) {
  getWeddingThemeDefinition(theme);

  function WeddingInvitationLayout({ children }: { children: ReactNode }) {
    return (
      <>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {children}
      </>
    );
  }

  WeddingInvitationLayout.displayName = `${theme}-layout`;

  return WeddingInvitationLayout;
}
