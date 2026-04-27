'use client';

import { useQuery } from '@tanstack/react-query';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { createInvitationPageFromSeed, getWeddingPageBySlug } from '@/config/weddingPages';
import { useAdmin } from '@/contexts';
import { usePageImages } from '@/hooks';
import { getAdminInvitationPreviewSummary } from '@/lib/adminInvitationPreviewCache';
import { appQueryKeys, FIFTEEN_MINUTES_MS, THIRTY_MINUTES_MS } from '@/lib/appQuery';
import { USE_FIREBASE } from '@/lib/firebase';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
import { resolveInvitationPageDataByTheme } from '@/lib/invitationThemePageData';
import { getCurrentFirebaseIdToken } from '@/services/adminAuth';
import { getStorageDownloadUrl, type UploadedImage } from '@/services/imageService';
import { getInvitationPageBySlug } from '@/services/invitationPageService';
import type { InvitationPage } from '@/types/invitationPage';

import {
  getWeddingThemeDefinition,
  type WeddingInvitationRouteOptions,
} from './weddingThemes';

type WeddingPageBaseState = {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  isRefreshingPage: boolean;
  refreshPage: () => Promise<void>;
  imagesLoading: boolean;
  heroImageUrl: string;
  mainImageUrl: string;
  galleryImageUrls: string[];
  galleryPreviewImageUrls: string[];
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

type WeddingPageQueryResult =
  | {
      status: 'ready';
      pageConfig: InvitationPage;
      blockMessage: null;
    }
  | {
      status: 'blocked';
      pageConfig: null;
      blockMessage: string;
    };

type AdminInvitationPageApiResponse = {
  success?: boolean;
  page?: InvitationPage;
  error?: string;
};

const BLOCKED_MESSAGE = '현재 접근할 수 없는 청첩장입니다.';
const LOAD_FAILED_MESSAGE =
  '청첩장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

function readApiDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hydrateInvitationPageFromApi(page: InvitationPage): InvitationPage {
  return {
    ...page,
    displayPeriodStart: readApiDate(page.displayPeriodStart),
    displayPeriodEnd: readApiDate(page.displayPeriodEnd),
  };
}

function getInitialWeddingPage(
  slug: string,
  initialPageConfig?: InvitationPage | null
) {
  if (initialPageConfig) {
    return initialPageConfig;
  }

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
  return getInvitationPublicAccessState(page).adminNotice;
  /*

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
  */
}

function isPublicInvitationPage(page: InvitationPage) {
  return getInvitationPublicAccessState(page).isPublic;
}

async function getAdminInvitationPageBySlug(slug: string) {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 토큰을 확인하지 못했습니다.');
  }

  const response = await fetch(`/api/admin/events/${encodeURIComponent(slug)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as
    | AdminInvitationPageApiResponse
    | null;

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 정보를 불러오지 못했습니다.'
    );
  }

  return payload?.page ? hydrateInvitationPageFromApi(payload.page) : null;
}

async function loadWeddingInvitationPage(
  slug: string,
  isAdminLoggedIn: boolean
): Promise<WeddingPageQueryResult> {
  try {
    if (isAdminLoggedIn) {
      try {
        const adminPage = await getAdminInvitationPageBySlug(slug);

        if (adminPage) {
          return {
            status: 'ready',
            pageConfig: adminPage,
            blockMessage: null,
          };
        }
      } catch (adminLoadError) {
        console.warn(
          '[weddingPageState] failed to load admin invitation page',
          adminLoadError
        );
      }
    }

    const allowSeedFallback = !USE_FIREBASE || isAdminLoggedIn;
    const page = await getInvitationPageBySlug(slug, {
      includeSeedFallback: allowSeedFallback,
      allowSeedFallbackWithFirestore: isAdminLoggedIn,
      requirePublicAccess: !isAdminLoggedIn,
      fallbackOnError: isAdminLoggedIn,
      retryOnPermissionDenied: isAdminLoggedIn,
      retryCount: isAdminLoggedIn ? 4 : 0,
      retryDelayMs: 350,
    });

    if (!page) {
      if (isAdminLoggedIn) {
        const adminPreviewPage = getAdminPreviewInvitationPage(slug);

        if (adminPreviewPage) {
          return {
            status: 'ready',
            pageConfig: adminPreviewPage,
            blockMessage: null,
          };
        }
      }

      return {
        status: 'blocked',
        pageConfig: null,
        blockMessage: BLOCKED_MESSAGE,
      };
    }

    if (!isAdminLoggedIn && !isPublicInvitationPage(page)) {
      return {
        status: 'blocked',
        pageConfig: null,
        blockMessage: BLOCKED_MESSAGE,
      };
    }

    return {
      status: 'ready',
      pageConfig: page,
      blockMessage: null,
    };
  } catch (loadError) {
    console.error('[weddingPageState] failed to load invitation page', loadError);

    if (isAdminLoggedIn) {
      const adminPreviewPage = getAdminPreviewInvitationPage(slug);

      if (adminPreviewPage) {
        return {
          status: 'ready',
          pageConfig: adminPreviewPage,
          blockMessage: null,
        };
      }
    }

    return {
      status: 'blocked',
      pageConfig: null,
      blockMessage: LOAD_FAILED_MESSAGE,
    };
  }
}

function isStorageManagedImageUrl(imageUrl?: string | null) {
  return Boolean(imageUrl?.includes('firebasestorage.googleapis.com'));
}

function resolveStorageManagedImageUrl(
  configuredImageUrl: string,
  fallbackImageUrl?: string | null
) {
  if (!configuredImageUrl) {
    return fallbackImageUrl?.trim() ?? '';
  }

  if (!isStorageManagedImageUrl(configuredImageUrl)) {
    return configuredImageUrl;
  }

  return fallbackImageUrl?.trim() || configuredImageUrl;
}

function findStorageImageByUrl(images: UploadedImage[], imageUrl: string) {
  const normalizedImageUrl = imageUrl.trim();
  if (!normalizedImageUrl) {
    return null;
  }

  return (
    images.find(
      (image) =>
        image.url.trim() === normalizedImageUrl ||
        image.thumbnailUrl?.trim() === normalizedImageUrl
    ) ?? null
  );
}

export function useWeddingInvitationState(
  options: WeddingInvitationRouteOptions
): WeddingPageState {
  const initialPage = useMemo(
    () => getInitialWeddingPage(options.slug, options.initialPageConfig),
    [options.slug, options.initialPageConfig]
  );
  const [status, setStatus] = useState<WeddingPageState['status']>(
    initialPage ? 'ready' : 'loading'
  );
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [pageConfig, setPageConfig] = useState<InvitationPage | null>(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  const themedPageData = useMemo(
    () => resolveInvitationPageDataByTheme(pageConfig, options.theme),
    [options.theme, pageConfig]
  );
  const shouldRunClientPageQuery = !isAdminLoading && (isAdminLoggedIn || !initialPage);
  const configuredGalleryImageUrls =
    themedPageData?.galleryImages?.filter((imageUrl) => imageUrl.trim()) ?? [];
  const configuredMainImageUrl = pageConfig?.metadata.images.wedding?.trim() ?? '';
  const shouldLoadStorageFallbackImages = useMemo(() => {
    if (!isAdminLoggedIn || !pageConfig) {
      return false;
    }

    const hasConfiguredGallery = Boolean(configuredGalleryImageUrls.length);
    return !hasConfiguredGallery;
  }, [configuredGalleryImageUrls.length, isAdminLoggedIn, pageConfig]);
  const shouldLoadStorageManagedImages = useMemo(
    () =>
      isAdminLoggedIn &&
      [configuredMainImageUrl, ...configuredGalleryImageUrls].some((imageUrl) =>
        isStorageManagedImageUrl(imageUrl)
      ),
    [configuredGalleryImageUrls, configuredMainImageUrl, isAdminLoggedIn]
  );
  const {
    images: storageImages,
    mainImage,
    galleryImages,
    loading: storageImagesLoading,
    error,
  } = usePageImages(options.slug, {
    enabled: shouldLoadStorageFallbackImages || shouldLoadStorageManagedImages,
    allowListing: isAdminLoggedIn,
  });
  const pageQuery = useQuery<WeddingPageQueryResult>({
    queryKey: appQueryKeys.invitationPage(options.slug, isAdminLoggedIn ? 'admin' : 'public'),
    enabled: shouldRunClientPageQuery,
    queryFn: async () => loadWeddingInvitationPage(options.slug, isAdminLoggedIn),
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });
  const themeDefinition = getWeddingThemeDefinition(options.theme);
  const imagesLoading =
    shouldLoadStorageFallbackImages || shouldLoadStorageManagedImages
      ? storageImagesLoading
      : false;
  const refreshPage = useCallback(async () => {
    await pageQuery.refetch();
  }, [pageQuery.refetch]);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    setStatus(initialPage ? 'ready' : 'loading');
    setBlockMessage(null);
    setPageConfig(initialPage);
    setIsLoading(true);
  }, [initialPage, isAdminLoading, isAdminLoggedIn, options.slug]);

  useEffect(() => {
    if (!pageQuery.data) {
      if (pageQuery.isPending) {
        setStatus(initialPage ? 'ready' : 'loading');
        setBlockMessage(null);
        setPageConfig(initialPage);
      }
      return;
    }

    if (!isAdminLoggedIn && initialPage && pageQuery.data.status === 'blocked') {
      setStatus('ready');
      setBlockMessage(null);
      setPageConfig(initialPage);
      return;
    }

    setStatus(pageQuery.data.status);
    setBlockMessage(pageQuery.data.blockMessage);
    setPageConfig(pageQuery.data.pageConfig);

    if (pageQuery.data.status === 'blocked') {
      setIsLoading(false);
    }
  }, [initialPage, isAdminLoggedIn, pageQuery.data, pageQuery.isPending]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.warn('[weddingPageState] image loading warning', error);
  }, [error]);

  useEffect(() => {
    if (!pageConfig?.musicStoragePath?.trim() || pageConfig.musicUrl?.trim()) {
      return;
    }

    const musicStoragePath = pageConfig.musicStoragePath.trim();
    let cancelled = false;

    const resolveMusicUrl = async () => {
      const downloadUrl = await getStorageDownloadUrl(musicStoragePath);
      if (!downloadUrl || cancelled) {
        return;
      }

      setPageConfig((current) => {
        if (!current || current.musicStoragePath?.trim() !== musicStoragePath) {
          return current;
        }

        if (current.musicUrl === downloadUrl) {
          return current;
        }

        return {
          ...current,
          musicUrl: downloadUrl,
        };
      });
    };

    void resolveMusicUrl();

    return () => {
      cancelled = true;
    };
  }, [pageConfig?.musicStoragePath, pageConfig?.musicUrl]);

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

  const galleryFeatures = resolveInvitationFeatures(
    pageConfig?.productTier,
    pageConfig?.features
  );
  const resolvedConfiguredGalleryImageUrls = configuredGalleryImageUrls.map((imageUrl, index) =>
    resolveStorageManagedImageUrl(imageUrl, galleryImages[index]?.url)
  );
  const configuredMainImage = findStorageImageByUrl(storageImages, configuredMainImageUrl);
  const mainImageUrl =
    resolveStorageManagedImageUrl(
      configuredMainImageUrl,
      configuredMainImage?.url ?? mainImage?.url ?? resolvedConfiguredGalleryImageUrls[0]
    ) ||
    resolvedConfiguredGalleryImageUrls[0] ||
    '';
  const galleryImageUrls =
    resolvedConfiguredGalleryImageUrls.length > 0
      ? resolvedConfiguredGalleryImageUrls.slice(0, galleryFeatures.maxGalleryImages)
      : galleryImages
          .map((image) => image.url)
          .slice(0, galleryFeatures.maxGalleryImages);
  const galleryPreviewImageUrls =
    resolvedConfiguredGalleryImageUrls.length > 0
      ? configuredGalleryImageUrls
          .slice(0, galleryFeatures.maxGalleryImages)
          .map((imageUrl, index) =>
            isStorageManagedImageUrl(imageUrl)
              ? galleryImages[index]?.thumbnailUrl ??
                galleryImages[index]?.url ??
                resolvedConfiguredGalleryImageUrls[index]
              : resolvedConfiguredGalleryImageUrls[index]
          )
      : galleryImages
          .map((image) => image.thumbnailUrl ?? image.url)
          .slice(0, galleryFeatures.maxGalleryImages);
  const heroImageUrl =
    resolveStorageManagedImageUrl(
      configuredMainImageUrl,
      configuredMainImage?.thumbnailUrl ??
        configuredMainImage?.url ??
        mainImage?.thumbnailUrl ??
        mainImage?.url ??
        galleryPreviewImageUrls[0]
    ) ||
    galleryPreviewImageUrls[0] ||
    mainImageUrl;
  const preloadImages = (heroImageUrl ? [heroImageUrl] : []).slice(0, 1);

  const giftInfo = themedPageData?.giftInfo;
  const hasGiftAccounts = Boolean(
    giftInfo?.groomAccounts?.length || giftInfo?.brideAccounts?.length
  );

  const baseState: WeddingPageBaseState = {
    isLoading,
    setIsLoading,
    isRefreshingPage: pageQuery.isRefetching,
    refreshPage,
    imagesLoading,
    heroImageUrl,
    mainImageUrl,
    galleryImageUrls,
    galleryPreviewImageUrls,
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
