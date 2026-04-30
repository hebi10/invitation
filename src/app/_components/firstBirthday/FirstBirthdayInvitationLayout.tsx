import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

export const firstBirthdayInvitationViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export function getFirstBirthdayInvitationMetadata(
  page?: InvitationPage | null
): Metadata {
  if (!page) {
    return {
      title: '돌잔치 초대장',
      description: '아기의 첫 번째 생일잔치 초대장',
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  const title = page.metadata.title || page.displayName || '돌잔치 초대장';
  const description =
    page.metadata.description || page.description || '소중한 돌잔치 자리에 초대합니다.';
  const imageUrl =
    page.metadata.images.social?.trim() || page.metadata.images.wedding?.trim() || '';

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      title,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export function createFirstBirthdayInvitationLayout() {
  function FirstBirthdayInvitationLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  FirstBirthdayInvitationLayout.displayName = 'first-birthday-layout';

  return FirstBirthdayInvitationLayout;
}
