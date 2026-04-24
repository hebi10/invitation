'use client';

import { useEffect } from 'react';

import { BackgroundMusic } from '@/components';
import { AdminProvider } from '@/contexts';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';
import { AccessDeniedPage } from '@/utils';

import {
  type EventInvitationRouteOptions,
  getEventThemeDefinition,
} from './eventPageThemes';
import {
  type EventPageReadyState,
  useEventInvitationState,
} from './eventPageState';
import { getWeddingThemeRenderer } from './themeRenderers/registry';
import WeddingKakaoShareButton from './WeddingKakaoShareButton';
import styles from './WeddingInvitationPage.module.css';

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

function syncInvitationMetadata(page: EventPageReadyState['pageConfig']) {
  if (typeof document === 'undefined') {
    return;
  }

  const title = page.metadata.title || page.displayName;
  const description = page.metadata.description || page.description;
  const imageUrl =
    page.metadata.images.social?.trim() || page.metadata.images.wedding?.trim() || '';
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

function EventInvitationPageBody(options: EventInvitationRouteOptions) {
  const state = useEventInvitationState(options);
  const themeDefinition = getEventThemeDefinition(options.theme);

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
    return (
      <AccessDeniedPage
        message={state.blockMessage}
        actionLabel={state.isRefreshingPage ? '다시 불러오는 중...' : '다시 불러오기'}
        actionDisabled={state.isRefreshingPage}
        onAction={() => {
          void state.refreshPage();
        }}
      />
    );
  }

  if (state.status !== 'ready') {
    return null;
  }

  const readyState: EventPageReadyState = state;
  const ThemeRenderer = getWeddingThemeRenderer(options.theme);
  const isLoaderVisible = readyState.isLoading || readyState.imagesLoading;
  const shareFeatures = resolveInvitationFeatures(
    readyState.pageConfig.productTier,
    readyState.pageConfig.features
  );
  const kakaoCardImageUrl = readyState.pageConfig.metadata.images.kakaoCard?.trim() || '';
  const fallbackShareImageUrl =
    readyState.pageConfig.metadata.images.social?.trim() ||
    readyState.mainImageUrl ||
    readyState.galleryImageUrls[0] ||
    '';
  const shouldRenderMusic =
    !isLoaderVisible &&
    shareFeatures.showMusic &&
    readyState.pageConfig.musicEnabled === true &&
    Boolean(readyState.pageConfig.musicUrl?.trim());

  const shareButton =
    shareFeatures.shareMode !== 'none' ? (
      <WeddingKakaoShareButton
        title={themeDefinition.getShareTitle(readyState.pageConfig)}
        description={themeDefinition.getShareDescription(readyState.pageConfig)}
        imageUrl={kakaoCardImageUrl}
        fallbackImageUrl={fallbackShareImageUrl}
        shareMode={shareFeatures.shareMode}
        variant={themeDefinition.shareButtonVariant}
      />
    ) : null;
  const refreshButton = (
    <button
      type="button"
      className={styles.pageRefreshButton}
      onClick={() => {
        void readyState.refreshPage();
      }}
      disabled={readyState.isRefreshingPage}
    >
      {readyState.isRefreshingPage ? '새로고침 중' : '새로고침'}
    </button>
  );

  return (
    <>
      {readyState.adminNotice ? (
        <div className={styles.adminNoticeBar}>
          <div className={styles.adminNoticeInner}>
            <div className={styles.adminNoticeCopy}>
              <strong className={styles.adminNoticeTitle}>관리자 전용 보기</strong>
              <span className={styles.adminNoticeText}>{readyState.adminNotice}</span>
            </div>
            {refreshButton}
          </div>
        </div>
      ) : null}
      <ThemeRenderer state={readyState} options={options} />
      {!readyState.adminNotice ? (
        <div className={styles.pageRefreshFloating}>{refreshButton}</div>
      ) : null}
      {shouldRenderMusic ? (
        <BackgroundMusic
          autoPlay
          volume={clampInvitationMusicVolume(
            readyState.pageConfig.musicVolume,
            DEFAULT_INVITATION_MUSIC_VOLUME
          )}
          musicUrl={readyState.pageConfig.musicUrl}
        />
      ) : null}
      {!isLoaderVisible && shareButton !== null
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

export function EventInvitationRoutePage(options: EventInvitationRouteOptions) {
  return (
    <AdminProvider>
      <EventInvitationPageBody {...options} />
    </AdminProvider>
  );
}

export function createEventInvitationPage(options: EventInvitationRouteOptions) {
  function EventInvitationPage() {
    return <EventInvitationRoutePage {...options} />;
  }

  EventInvitationPage.displayName = `${options.slug}-${options.theme}-page`;

  return EventInvitationPage;
}
