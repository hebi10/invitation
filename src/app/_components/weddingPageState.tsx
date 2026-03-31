'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { useAdmin } from '@/contexts';
import { usePageImages } from '@/hooks';
import { getInvitationPageBySlug } from '@/services/invitationPageService';
import type { InvitationPage } from '@/types/invitationPage';

import {
  getWeddingThemeDefinition,
  type WeddingInvitationRouteOptions,
} from './weddingThemes';

type WeddingPageBaseState = {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  imagesLoading: boolean;
  mainImageUrl: string;
  galleryImageUrls: string[];
  preloadImages: string[];
};

export interface WeddingPageLoadingState extends WeddingPageBaseState {
  status: 'loading';
  blockMessage: null;
  pageConfig: InvitationPage | null;
  weddingDate: Date | null;
  hasGiftAccounts: boolean;
  giftInfo: NonNullable<InvitationPage['pageData']>['giftInfo'] | undefined;
}

export interface WeddingPageBlockedState extends WeddingPageBaseState {
  status: 'blocked';
  blockMessage: string;
  pageConfig: null;
  weddingDate: null;
  hasGiftAccounts: false;
  giftInfo: undefined;
}

export interface WeddingPageReadyState extends WeddingPageBaseState {
  status: 'ready';
  blockMessage: null;
  pageConfig: InvitationPage;
  weddingDate: Date;
  hasGiftAccounts: boolean;
  giftInfo: NonNullable<InvitationPage['pageData']>['giftInfo'] | undefined;
}

export type WeddingPageState =
  | WeddingPageLoadingState
  | WeddingPageBlockedState
  | WeddingPageReadyState;

const BLOCKED_MESSAGE = '현재 접근할 수 없는 청첩장입니다.';
const LOAD_FAILED_MESSAGE = '청첩장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

export function useWeddingInvitationState(
  options: WeddingInvitationRouteOptions
): WeddingPageState {
  const [status, setStatus] = useState<WeddingPageState['status']>('loading');
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [pageConfig, setPageConfig] = useState<InvitationPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { mainImage, galleryImages, loading: imagesLoading, error } = usePageImages(options.slug);
  const { isAdminLoading } = useAdmin();
  const themeDefinition = getWeddingThemeDefinition(options.theme);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    let cancelled = false;

    setStatus('loading');
    setBlockMessage(null);
    setPageConfig(null);
    setIsLoading(true);

    const loadInvitationPage = async () => {
      try {
        const page = await getInvitationPageBySlug(options.slug, {
          includeSeedFallback: true,
        });

        if (cancelled) {
          return;
        }

        if (!page) {
          setPageConfig(null);
          setBlockMessage(BLOCKED_MESSAGE);
          setStatus('blocked');
          setIsLoading(false);
          return;
        }

        document.title = `${page.groomName} ♥ ${page.brideName} 결혼식 - ${page.date}${themeDefinition.documentTitleSuffix}`;
        setPageConfig(page);
        setBlockMessage(null);
        setStatus('ready');
      } catch (loadError) {
        console.error('[weddingPageState] failed to load invitation page', loadError);

        if (cancelled) {
          return;
        }

        setPageConfig(null);
        setBlockMessage(LOAD_FAILED_MESSAGE);
        setStatus('blocked');
        setIsLoading(false);
      }
    };

    void loadInvitationPage();

    return () => {
      cancelled = true;
    };
  }, [isAdminLoading, options.slug, themeDefinition.documentTitleSuffix]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.warn('[weddingPageState] image loading warning', error);
  }, [error]);

  useEffect(() => {
    const loadingDelay = options.loadingDelay ?? themeDefinition.defaultLoadingDelay;
    if (!loadingDelay || imagesLoading || !isLoading || status !== 'ready') {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, loadingDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [imagesLoading, isLoading, options.loadingDelay, status, themeDefinition.defaultLoadingDelay]);

  const weddingDate = pageConfig
    ? new Date(
        pageConfig.weddingDateTime.year,
        pageConfig.weddingDateTime.month,
        pageConfig.weddingDateTime.day,
        pageConfig.weddingDateTime.hour,
        pageConfig.weddingDateTime.minute
      )
    : null;

  const mainImageUrl = mainImage?.url || '';
  const galleryImageUrls = galleryImages.map((image) => image.url);
  const preloadImages = [
    ...(mainImageUrl ? [mainImageUrl] : []),
    ...galleryImageUrls.slice(0, 2),
  ].slice(0, 3);

  const giftInfo = pageConfig?.pageData?.giftInfo;
  const hasGiftAccounts = Boolean(
    giftInfo?.groomAccounts?.length || giftInfo?.brideAccounts?.length
  );

  const baseState: WeddingPageBaseState = {
    isLoading,
    setIsLoading,
    imagesLoading,
    mainImageUrl,
    galleryImageUrls,
    preloadImages,
  };

  if (status === 'blocked') {
    return {
      ...baseState,
      status: 'blocked',
      blockMessage: blockMessage ?? BLOCKED_MESSAGE,
      pageConfig: null,
      weddingDate: null,
      hasGiftAccounts: false,
      giftInfo: undefined,
    };
  }

  if (status === 'ready' && pageConfig && weddingDate) {
    return {
      ...baseState,
      status: 'ready',
      blockMessage: null,
      pageConfig,
      weddingDate,
      hasGiftAccounts,
      giftInfo,
    };
  }

  return {
    ...baseState,
    status: 'loading',
    blockMessage: null,
    pageConfig,
    weddingDate,
    hasGiftAccounts,
    giftInfo,
  };
}
