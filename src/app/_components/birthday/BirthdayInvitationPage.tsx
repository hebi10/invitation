'use client';

import { useEffect } from 'react';

import { BackgroundMusic } from '@/components';
import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { AccessDeniedPage } from '@/utils';

import type { EventInvitationRouteOptions } from '../eventPageThemes';
import { useEventInvitationState, type EventPageReadyState } from '../eventPageState';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { resolveBirthdayRouteTheme } from './birthdayThemes';
import { getBirthdayThemeRenderer } from './themeRenderers/registry';
import styles from './BirthdayInvitationPage.module.css';

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

function syncBirthdayMetadata(page: EventPageReadyState['pageConfig']) {
  if (typeof document === 'undefined') {
    return;
  }

  const title = page.metadata.title || page.displayName || '생일 초대장';
  const description =
    page.metadata.description || page.description || '소중한 생일 자리에 초대합니다.';
  const imageUrl =
    page.metadata.images.social?.trim() || page.metadata.images.wedding?.trim() || '';

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

  if (imageUrl) {
    upsertMetaTag('meta[property="og:image"]', {
      property: 'og:image',
      content: imageUrl,
    });
  }
}

function BirthdayInvitationPageBody(options: EventInvitationRouteOptions) {
  const state = useEventInvitationState({
    ...options,
    theme: DEFAULT_INVITATION_THEME,
  });

  useEffect(() => {
    if (state.status === 'ready') {
      syncBirthdayMetadata(state.pageConfig);
    }
  }, [state]);

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
  const birthdayTheme = resolveBirthdayRouteTheme(
    readyState.pageConfig,
    options.theme,
    null
  );
  const ThemeRenderer = getBirthdayThemeRenderer(birthdayTheme);
  const features = resolveInvitationFeatures(
    readyState.pageConfig.productTier,
    readyState.pageConfig.features
  );
  const isLoaderVisible = readyState.isLoading || readyState.imagesLoading;
  const shouldRenderMusic =
    !isLoaderVisible &&
    features.showMusic &&
    readyState.pageConfig.musicEnabled === true &&
    Boolean(readyState.pageConfig.musicUrl?.trim());
  const refreshButton = (
    <button
      type="button"
      className={styles.refreshButton}
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
            <div>
              <strong className={styles.adminNoticeTitle}>관리자 전용 보기</strong>
              <span className={styles.adminNoticeText}>{readyState.adminNotice}</span>
            </div>
            {refreshButton}
          </div>
        </div>
      ) : null}
      <ThemeRenderer state={readyState} />
      {!readyState.adminNotice ? (
        <div className={styles.floatingRefresh}>
          <button
            type="button"
            className={styles.floatingRefreshButton}
            onClick={() => {
              void readyState.refreshPage();
            }}
            disabled={readyState.isRefreshingPage}
          >
            {readyState.isRefreshingPage ? '새로고침 중' : '새로고침'}
          </button>
        </div>
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
    </>
  );
}

export function BirthdayInvitationRoutePage(options: EventInvitationRouteOptions) {
  return <BirthdayInvitationPageBody {...options} />;
}
