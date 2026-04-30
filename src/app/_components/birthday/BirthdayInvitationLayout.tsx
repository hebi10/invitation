import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

export const birthdayInvitationViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const genericBirthdayMetadata: Metadata = {
  title: 'Birthday Invitation',
  description: 'Birthday invitation page',
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

export function getBirthdayInvitationMetadata(page?: InvitationPage | null): Metadata {
  if (!page) {
    return genericBirthdayMetadata;
  }

  const socialPreviewImageUrl =
    page.metadata.images.social?.trim() || page.metadata.images.wedding?.trim() || '';
  const title = page.metadata.title || page.displayName || '생일 초대장';
  const description =
    page.metadata.description || page.description || '소중한 생일 자리에 초대합니다.';

  return {
    title,
    description,
    keywords: page.metadata.keywords,
    robots: genericBirthdayMetadata.robots,
    icons: {
      icon: page.metadata.images.favicon || '/favicon.ico',
      shortcut: page.metadata.images.favicon || '/favicon.ico',
      apple: page.metadata.images.favicon || '/favicon.ico',
    },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      title: page.metadata.openGraph.title || title,
      description: page.metadata.openGraph.description || description,
      images: socialPreviewImageUrl
        ? [
            {
              url: socialPreviewImageUrl,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metadata.twitter.title || title,
      description: page.metadata.twitter.description || description,
      images: socialPreviewImageUrl ? [socialPreviewImageUrl] : undefined,
    },
  };
}

export function createBirthdayInvitationLayout() {
  function BirthdayInvitationLayout({ children }: { children: ReactNode }) {
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

  BirthdayInvitationLayout.displayName = 'birthday-invitation-layout';

  return BirthdayInvitationLayout;
}
