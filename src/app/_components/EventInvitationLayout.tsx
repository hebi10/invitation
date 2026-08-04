import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

import { type EventThemeKey, getEventThemeDefinition } from './eventPageThemes';

export const eventInvitationViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const genericInvitationMetadata: Metadata = {
  title: 'Mobile Wedding Invitation',
  description: 'Wedding invitation page',
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

export function getEventInvitationMetadata(page?: InvitationPage | null): Metadata {
  if (!page) {
    return genericInvitationMetadata;
  }

  const socialPreviewImageUrl =
    page.metadata.images.social?.trim() || page.metadata.images.wedding?.trim() || '';

  return {
    title: page.metadata.title || page.displayName,
    description: page.metadata.description || page.description,
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
      title: page.metadata.openGraph.title || page.metadata.title || page.displayName,
      description:
        page.metadata.openGraph.description ||
        page.metadata.description ||
        page.description,
      images: socialPreviewImageUrl
        ? [
            {
              url: socialPreviewImageUrl,
              alt: page.displayName,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metadata.twitter.title || page.metadata.title || page.displayName,
      description:
        page.metadata.twitter.description ||
        page.metadata.description ||
        page.description,
      images: socialPreviewImageUrl ? [socialPreviewImageUrl] : undefined,
    },
  };
}

export function createEventInvitationLayout({ theme }: { theme: EventThemeKey }) {
  getEventThemeDefinition(theme);

  function EventInvitationLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  EventInvitationLayout.displayName = `${theme}-layout`;

  return EventInvitationLayout;
}
