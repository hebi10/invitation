'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import type { InvitationPage } from '@/types/invitationPage';
import { usePageImages } from '@/hooks';
import { getInvitationPageBySlug } from '@/services/invitationPageService';
import { useAdmin } from '@/contexts';

import {
  getWeddingThemeDefinition,
  type WeddingInvitationRouteOptions,
} from './weddingThemes';

export type PageAccessResult =
  | { canAccess: true }
  | { canAccess: false; message: string };

export interface WeddingPageState {
  access: PageAccessResult | null;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  imagesLoading: boolean;
  pageConfig: InvitationPage;
  weddingDate: Date;
  mainImageUrl: string;
  galleryImageUrls: string[];
  preloadImages: string[];
  hasGiftAccounts: boolean;
  giftInfo: NonNullable<InvitationPage['pageData']>['giftInfo'] | undefined;
}

export function useWeddingInvitationState(
  options: WeddingInvitationRouteOptions
): WeddingPageState {
  const [access, setAccess] = useState<PageAccessResult | null>(null);
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

    const loadInvitationPage = async () => {
      const page = await getInvitationPageBySlug(options.slug);
      if (cancelled) {
        return;
      }

      if (!page) {
        setPageConfig(null);
        setAccess({
          canAccess: false,
          message: '현재 노출되지 않는 청첩장입니다.',
        });
        return;
      }

      document.title = `${page.groomName} ♡ ${page.brideName} 결혼식 - ${page.date}${themeDefinition.documentTitleSuffix}`;
      setPageConfig(page);
      setAccess({ canAccess: true });
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

    console.warn('이미지 로딩 중 오류 발생:', error);
  }, [error]);

  useEffect(() => {
    const loadingDelay = options.loadingDelay ?? themeDefinition.defaultLoadingDelay;
    if (!loadingDelay || imagesLoading || !isLoading || access?.canAccess !== true) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, loadingDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [access, imagesLoading, isLoading, options.loadingDelay, themeDefinition.defaultLoadingDelay]);

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

  return {
    access,
    isLoading,
    setIsLoading,
    imagesLoading,
    pageConfig: pageConfig as InvitationPage,
    weddingDate: weddingDate as Date,
    mainImageUrl,
    galleryImageUrls,
    preloadImages,
    hasGiftAccounts: Boolean(
      pageConfig?.pageData?.giftInfo?.groomAccounts?.length ||
        pageConfig?.pageData?.giftInfo?.brideAccounts?.length
    ),
    giftInfo: pageConfig?.pageData?.giftInfo,
  };
}
