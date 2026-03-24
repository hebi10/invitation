'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { useAdmin } from '@/contexts';
import { type WeddingPageConfig } from '@/config/weddingPages';
import { usePageImages } from '@/hooks';
import { checkPageAccess } from '@/utils';

import {
  getWeddingThemeDefinition,
  type WeddingInvitationRouteOptions,
} from './weddingThemes';

export type PageAccessResult = Awaited<ReturnType<typeof checkPageAccess>>;

export interface WeddingPageState {
  access: PageAccessResult | null;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  imagesLoading: boolean;
  pageConfig: WeddingPageConfig;
  weddingDate: Date;
  mainImageUrl: string;
  galleryImageUrls: string[];
  preloadImages: string[];
  hasGiftAccounts: boolean;
  giftInfo: NonNullable<WeddingPageConfig['pageData']>['giftInfo'];
}

export function useWeddingInvitationState(
  options: WeddingInvitationRouteOptions,
  pageConfig: WeddingPageConfig
): WeddingPageState {
  const [access, setAccess] = useState<PageAccessResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { mainImage, galleryImages, loading: imagesLoading, error } = usePageImages(options.slug);
  const { isAdminLoggedIn } = useAdmin();
  const themeDefinition = getWeddingThemeDefinition(options.theme);

  useEffect(() => {
    let canceled = false;

    document.title = `${pageConfig.groomName} ♡ ${pageConfig.brideName} 결혼식 - ${pageConfig.date}${themeDefinition.documentTitleSuffix}`;

    checkPageAccess(options.slug, isAdminLoggedIn).then((result) => {
      if (!canceled) {
        setAccess(result);
      }
    });

    return () => {
      canceled = true;
    };
  }, [isAdminLoggedIn, options.slug, pageConfig, themeDefinition.documentTitleSuffix]);

  useEffect(() => {
    const kakaoShare = document.querySelector<HTMLDivElement>('.kakao_share');
    if (!kakaoShare) {
      return;
    }

    if (access === null || !access.canAccess) {
      kakaoShare.style.display = 'none';
      return;
    }

    kakaoShare.style.display = isLoading ? 'none' : 'block';
  }, [access, isLoading]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.warn('이미지 로딩 중 오류 발생:', error);
  }, [error]);

  useEffect(() => {
    const loadingDelay = options.loadingDelay ?? themeDefinition.defaultLoadingDelay;
    if (!loadingDelay || imagesLoading || !isLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, loadingDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [imagesLoading, isLoading, options.loadingDelay, themeDefinition.defaultLoadingDelay]);

  const weddingDate = new Date(
    pageConfig.weddingDateTime.year,
    pageConfig.weddingDateTime.month,
    pageConfig.weddingDateTime.day,
    pageConfig.weddingDateTime.hour,
    pageConfig.weddingDateTime.minute
  );

  const mainImageUrl = mainImage?.url || '';
  const galleryImageUrls = galleryImages.map((image) => image.url);
  const preloadImages = [
    ...(mainImageUrl ? [mainImageUrl] : []),
    ...galleryImageUrls.slice(0, 5),
  ].slice(0, 6);

  return {
    access,
    isLoading,
    setIsLoading,
    imagesLoading,
    pageConfig,
    weddingDate,
    mainImageUrl,
    galleryImageUrls,
    preloadImages,
    hasGiftAccounts: Boolean(
      pageConfig.pageData?.giftInfo?.groomAccounts?.length ||
        pageConfig.pageData?.giftInfo?.brideAccounts?.length
    ),
    giftInfo: pageConfig.pageData?.giftInfo,
  };
}
