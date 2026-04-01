import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import { getWeddingPageBySlug } from '@/config/weddingPages';

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
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export function getWeddingInvitationMetadata(slug?: string): Metadata {
  if (!slug) {
    return genericInvitationMetadata;
  }

  const page = getWeddingPageBySlug(slug);
  if (!page) {
    return genericInvitationMetadata;
  }

  return {
    title: page.metadata.title,
    description: page.metadata.description,
    keywords: page.metadata.keywords,
    robots: genericInvitationMetadata.robots,
    icons: {
      icon: page.metadata.images.favicon || '/favicon.ico',
      shortcut: page.metadata.images.favicon || '/favicon.ico',
      apple: page.metadata.images.favicon || '/favicon.ico',
    },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      title: page.metadata.openGraph.title,
      description: page.metadata.openGraph.description,
      images: page.metadata.images.wedding
        ? [
            {
              url: page.metadata.images.wedding,
              alt: page.displayName,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metadata.twitter.title,
      description: page.metadata.twitter.description,
      images: page.metadata.images.wedding
        ? [page.metadata.images.wedding]
        : undefined,
    },
  };
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
