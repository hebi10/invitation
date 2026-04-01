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
  minimal: dynamic<WeddingThemeRendererProps>(
    () => import('./themeRenderers/minimal'),
    { loading: () => null }
  ),
  space: dynamic<WeddingThemeRendererProps>(
    () => import('./themeRenderers/space'),
    { loading: () => null }
  ),
  blue: dynamic<WeddingThemeRendererProps>(
    () => import('./themeRenderers/blue'),
    { loading: () => null }
  ),
  classic: dynamic<WeddingThemeRendererProps>(
    () => import('./themeRenderers/classic'),
    { loading: () => null }
  ),
};

function WeddingInvitationPageBody(options: WeddingInvitationRouteOptions) {
  const state = useWeddingInvitationState(options);
  const themeDefinition = getWeddingThemeDefinition(options.theme);

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
      imageUrl={readyState.pageConfig.metadata.images.wedding}
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
