'use client';

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { createInvitationPageFromSeed, getWeddingPageBySlug } from '@/config/weddingPages';
import { useAdmin } from '@/contexts';
import { usePageImages } from '@/hooks';
import { getAdminInvitationPreviewSummary } from '@/lib/adminInvitationPreviewCache';
import { USE_FIREBASE } from '@/lib/firebase';
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
  adminNotice: string | null;
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
const LOAD_FAILED_MESSAGE =
  '청첩장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

function getInitialWeddingPage(slug: string) {
  if (USE_FIREBASE) {
    return null;
  }

  const seed = getWeddingPageBySlug(slug);
  return seed ? createInvitationPageFromSeed(seed) : null;
}

function getAdminPreviewInvitationPage(slug: string) {
  const seed = getWeddingPageBySlug(slug);
  if (!seed) {
    return null;
  }

  const summary = getAdminInvitationPreviewSummary(slug);

  return createInvitationPageFromSeed(seed, {
    published: summary?.published ?? true,
    displayPeriodEnabled: summary?.displayPeriodEnabled ?? false,
    displayPeriodStart: summary?.displayPeriodStart ?? null,
    displayPeriodEnd: summary?.displayPeriodEnd ?? null,
  });
}

function getAdminNotice(page: InvitationPage, isAdminLoggedIn: boolean) {
  if (!isAdminLoggedIn) {
    return null;
  }

  if (!page.published) {
    return '현재 비공개 상태인 청첩장입니다. 관리자만 볼 수 있습니다.';
  }

  if (!page.displayPeriodEnabled) {
    return null;
  }

  if (!page.displayPeriodStart || !page.displayPeriodEnd) {
    return '노출 기간 설정이 완전하지 않은 청첩장입니다. 관리자만 볼 수 있습니다.';
  }

  const now = new Date();

  if (now < page.displayPeriodStart) {
    return '현재 노출 시작 전인 페이지입니다. 관리자만 볼 수 있습니다.';
  }

  if (now > page.displayPeriodEnd) {
    return '현재 노출 종료된 페이지입니다. 관리자만 볼 수 있습니다.';
  }

  return null;
}

function isPublicInvitationPage(page: InvitationPage) {
  if (!page.published) {
    return false;
  }

  if (!page.displayPeriodEnabled) {
    return true;
  }

  if (!page.displayPeriodStart || !page.displayPeriodEnd) {
    return false;
  }

  const now = new Date();
  return now >= page.displayPeriodStart && now <= page.displayPeriodEnd;
}

export function useWeddingInvitationState(
  options: WeddingInvitationRouteOptions
): WeddingPageState {
  const initialPage = useMemo(() => getInitialWeddingPage(options.slug), [options.slug]);
  const [status, setStatus] = useState<WeddingPageState['status']>(
    initialPage ? 'ready' : 'loading'
  );
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [pageConfig, setPageConfig] = useState<InvitationPage | null>(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const { mainImage, galleryImages, loading: imagesLoading, error } = usePageImages(options.slug);
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  const themeDefinition = getWeddingThemeDefinition(options.theme);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    let cancelled = false;

    setStatus(initialPage ? 'ready' : 'loading');
    setBlockMessage(null);
    setPageConfig(initialPage);
    setIsLoading(true);

    const loadInvitationPage = async () => {
      try {
        const page = await getInvitationPageBySlug(options.slug, {
          includeSeedFallback: true,
          fallbackOnError: !isAdminLoggedIn,
          retryOnPermissionDenied: isAdminLoggedIn,
          retryCount: isAdminLoggedIn ? 4 : 0,
          retryDelayMs: 350,
        });

        if (cancelled) {
          return;
        }

        if (!page) {
          if (isAdminLoggedIn) {
            const adminPreviewPage = getAdminPreviewInvitationPage(options.slug);

            if (adminPreviewPage) {
              setPageConfig(adminPreviewPage);
              setBlockMessage(null);
              setStatus('ready');
              return;
            }
          }

          setPageConfig(null);
          setBlockMessage(BLOCKED_MESSAGE);
          setStatus('blocked');
          setIsLoading(false);
          return;
        }

        if (!isAdminLoggedIn && !isPublicInvitationPage(page)) {
          setPageConfig(null);
          setBlockMessage(BLOCKED_MESSAGE);
          setStatus('blocked');
          setIsLoading(false);
          return;
        }

        setPageConfig(page);
        setBlockMessage(null);
        setStatus('ready');
      } catch (loadError) {
        console.error('[weddingPageState] failed to load invitation page', loadError);

        if (cancelled) {
          return;
        }

        if (isAdminLoggedIn) {
          const adminPreviewPage = getAdminPreviewInvitationPage(options.slug);

          if (adminPreviewPage) {
            setPageConfig(adminPreviewPage);
            setBlockMessage(null);
            setStatus('ready');
            return;
          }
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
  }, [initialPage, isAdminLoading, isAdminLoggedIn, options.slug]);

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

  const mainImageUrl = mainImage?.url || pageConfig?.metadata.images.wedding || '';
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
    adminNotice: pageConfig ? getAdminNotice(pageConfig, isAdminLoggedIn) : null,
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
