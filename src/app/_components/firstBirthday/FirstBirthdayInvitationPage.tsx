'use client';

import { useEffect } from 'react';

import { BackgroundMusic } from '@/components';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { AccessDeniedPage } from '@/utils';

import type { EventInvitationRouteOptions } from '../eventPageThemes';
import { useEventInvitationState, type EventPageReadyState } from '../eventPageState';
import {
  DEFAULT_FIRST_BIRTHDAY_THEME,
  normalizeFirstBirthdayThemeKey,
} from './firstBirthdayThemes';
import { getFirstBirthdayThemeRenderer } from './themeRenderers/registry';
import styles from './FirstBirthdayInvitationPage.module.css';

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

function syncFirstBirthdayMetadata(page: EventPageReadyState['pageConfig']) {
  if (typeof document === 'undefined') {
    return;
  }

  const title = page.metadata.title || page.displayName || '돌잔치 초대장';
  const description =
    page.metadata.description || page.description || '소중한 돌잔치 자리에 초대합니다.';
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

function FirstBirthdayIntro({
  babyName,
  onOpen,
}: {
  babyName: string;
  onOpen: () => void;
}) {
  return (
    <div className={styles.curtain}>
      <div className={styles.curtainCard}>
        <span className={styles.curtainKicker}>You're invited</span>
        <h1 className={styles.curtainTitle}>{babyName}</h1>
        <button type="button" className={styles.curtainButton} onClick={onOpen}>
          초대장 열기
        </button>
      </div>
    </div>
  );
}

function FirstBirthdayInvitationPageBody(options: EventInvitationRouteOptions) {
  const state = useEventInvitationState({
    ...options,
    theme: DEFAULT_INVITATION_THEME,
  });

  useEffect(() => {
    if (state.status === 'ready') {
      syncFirstBirthdayMetadata(state.pageConfig);
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
  const firstBirthdayTheme = normalizeFirstBirthdayThemeKey(
    options.theme,
    DEFAULT_FIRST_BIRTHDAY_THEME
  );
  const ThemeRenderer = getFirstBirthdayThemeRenderer(firstBirthdayTheme);
  const features = resolveInvitationFeatures(
    readyState.pageConfig.productTier,
    readyState.pageConfig.features
  );
  const isLoaderVisible = readyState.isLoading || readyState.imagesLoading;
  const babyName =
    readyState.pageConfig.displayName.trim() ||
    readyState.pageConfig.metadata.title.trim() ||
    '첫 번째 생일';
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
              <strong>관리자 전용 보기</strong>
              <span className={styles.adminNoticeText}>{readyState.adminNotice}</span>
            </div>
            {refreshButton}
          </div>
        </div>
      ) : null}
      {isLoaderVisible ? (
        <FirstBirthdayIntro
          babyName={babyName}
          onOpen={() => readyState.setIsLoading(false)}
        />
      ) : (
        <ThemeRenderer state={readyState} />
      )}
      {!readyState.adminNotice && !isLoaderVisible ? (
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

export function FirstBirthdayInvitationRoutePage(options: EventInvitationRouteOptions) {
  return <FirstBirthdayInvitationPageBody {...options} />;
}
