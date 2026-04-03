'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { AdminProvider } from '@/contexts';
import { AccessDeniedPage } from '@/utils';

import { useWeddingInvitationState } from './weddingPageState';
import { type WeddingInvitationRouteOptions } from './weddingThemes';
import { getWeddingThemeDefinition } from './weddingThemes';
import WeddingKakaoShareButton from './WeddingKakaoShareButton';
import type { WeddingPageReadyState } from './weddingPageState';
import type { WeddingThemeRendererProps } from './weddingPageRenderers';
import styles from './WeddingInvitationPage.module.css';

const themeRendererRegistry = {
  emotional: dynamic<WeddingThemeRendererProps>(
    () => import('./themeRenderers/emotional'),
    { loading: () => null }
  ),
  simple: dynamic<WeddingThemeRendererProps>(
    () => import('./themeRenderers/simple'),
    { loading: () => null }
  ),
};

function upsertMetaTag(selector: string, attributes: Record<string, string>) {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function upsertLinkTag(selector: string, attributes: Record<string, string>) {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function syncInvitationMetadata(page: WeddingPageReadyState['pageConfig']) {
  if (typeof document === 'undefined') {
    return;
  }

  const title = page.metadata.title || page.displayName;
  const description = page.metadata.description || page.description;
  const imageUrl = page.metadata.images.wedding || '';
  const faviconUrl = page.metadata.images.favicon || '/favicon.ico';
  const pageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  document.title = title;

  upsertMetaTag('meta[name="description"]', {
    name: 'description',
    content: description,
  });
  upsertMetaTag('meta[property="og:title"]', {
    property: 'og:title',
    content: page.metadata.openGraph.title || title,
  });
  upsertMetaTag('meta[property="og:description"]', {
    property: 'og:description',
    content: page.metadata.openGraph.description || description,
  });
  upsertMetaTag('meta[property="og:type"]', {
    property: 'og:type',
    content: 'website',
  });
  upsertMetaTag('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  upsertMetaTag('meta[name="twitter:title"]', {
    name: 'twitter:title',
    content: page.metadata.twitter.title || title,
  });
  upsertMetaTag('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: page.metadata.twitter.description || description,
  });

  if (imageUrl) {
    upsertMetaTag('meta[property="og:image"]', {
      property: 'og:image',
      content: imageUrl,
    });
    upsertMetaTag('meta[name="twitter:image"]', {
      name: 'twitter:image',
      content: imageUrl,
    });
  }

  if (pageUrl) {
    upsertMetaTag('meta[property="og:url"]', {
      property: 'og:url',
      content: pageUrl,
    });
    upsertLinkTag('link[rel="canonical"]', {
      rel: 'canonical',
      href: pageUrl,
    });
  }

  upsertLinkTag('link[rel="icon"]', {
    rel: 'icon',
    href: faviconUrl,
  });
  upsertLinkTag('link[rel="shortcut icon"]', {
    rel: 'shortcut icon',
    href: faviconUrl,
  });
  upsertLinkTag('link[rel="apple-touch-icon"]', {
    rel: 'apple-touch-icon',
    href: faviconUrl,
  });
}

function WeddingInvitationPageBody(options: WeddingInvitationRouteOptions) {
  const state = useWeddingInvitationState(options);
  const themeDefinition = getWeddingThemeDefinition(options.theme);

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }

    syncInvitationMetadata(state.pageConfig);
  }, [state]);

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }

    const shouldLockScroll = state.isLoading || state.imagesLoading;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (shouldLockScroll) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [state.status, state.isLoading, state.imagesLoading]);

  if (state.status === 'blocked') {
    return <AccessDeniedPage message={state.blockMessage} />;
  }

  if (state.status !== 'ready') {
    return null;
  }

  const readyState: WeddingPageReadyState = state;
  const ThemeRenderer = themeRendererRegistry[options.theme];
  const isLoaderVisible = readyState.isLoading || readyState.imagesLoading;

  const shareButton = (
    <WeddingKakaoShareButton
      title={themeDefinition.getShareTitle(readyState.pageConfig)}
      description={themeDefinition.getShareDescription(readyState.pageConfig)}
      imageUrl={readyState.mainImageUrl}
      pageSlug={options.slug}
      variant={themeDefinition.shareButtonVariant}
    />
  );

  return (
    <>
      {readyState.adminNotice ? (
        <div className={styles.adminNoticeBar}>
          <div className={styles.adminNoticeInner}>
            <strong className={styles.adminNoticeTitle}>관리자 전용 보기</strong>
            <span className={styles.adminNoticeText}>{readyState.adminNotice}</span>
          </div>
        </div>
      ) : null}
      <ThemeRenderer state={readyState} options={options} />
      {!isLoaderVisible
        ? themeDefinition.shareContainer ? (
            <div
              className={themeDefinition.shareContainer.className}
              style={themeDefinition.shareContainer.style}
            >
              {shareButton}
            </div>
          ) : (
            shareButton
          )
        : null}
    </>
  );
}

export function WeddingInvitationRoutePage(options: WeddingInvitationRouteOptions) {
  return (
    <AdminProvider>
      <WeddingInvitationPageBody {...options} />
    </AdminProvider>
  );
}

export function createWeddingInvitationPage(options: WeddingInvitationRouteOptions) {
  function WeddingInvitationPage() {
    return <WeddingInvitationRoutePage {...options} />;
  }

  WeddingInvitationPage.displayName = `${options.slug}-${options.theme}-page`;

  return WeddingInvitationPage;
}
