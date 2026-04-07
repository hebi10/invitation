import type {
  InvitationPage,
  InvitationPageData,
  InvitationScheduleDetail,
  InvitationThemeKey,
  InvitationThemePageDataOverride,
} from '@/types/invitationPage';

type PageDataSource =
  | InvitationPage
  | InvitationPageData
  | null
  | undefined;

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function resolveBasePageData(source: PageDataSource): InvitationPageData | undefined {
  if (!source) {
    return undefined;
  }

  if ('slug' in source) {
    return source.pageData;
  }

  return source;
}

function mergeScheduleDetail(
  base: InvitationScheduleDetail | undefined,
  override: InvitationScheduleDetail | undefined,
  fallback: {
    time?: string;
    location?: string;
  } = {}
): InvitationScheduleDetail | undefined {
  const time = override?.time ?? base?.time ?? fallback.time;
  const location = override?.location ?? base?.location ?? fallback.location;

  if (!hasText(time) && !hasText(location)) {
    return undefined;
  }

  return {
    ...(hasText(time) ? { time } : {}),
    ...(hasText(location) ? { location } : {}),
  };
}

function mergeThemePageData(
  basePageData: InvitationPageData,
  override: InvitationThemePageDataOverride
): InvitationPageData {
  const mergedGiftInfo =
    basePageData.giftInfo || override.giftInfo
      ? {
          ...(basePageData.giftInfo ?? {}),
          ...(override.giftInfo ?? {}),
          groomAccounts:
            override.giftInfo?.groomAccounts ?? basePageData.giftInfo?.groomAccounts,
          brideAccounts:
            override.giftInfo?.brideAccounts ?? basePageData.giftInfo?.brideAccounts,
        }
      : undefined;

  const mergedKakaoMap =
    basePageData.kakaoMap || override.kakaoMap
      ? {
          ...(basePageData.kakaoMap ?? {}),
          ...(override.kakaoMap ?? {}),
          latitude:
            override.kakaoMap?.latitude ?? basePageData.kakaoMap?.latitude ?? 0,
          longitude:
            override.kakaoMap?.longitude ?? basePageData.kakaoMap?.longitude ?? 0,
        }
      : undefined;

  return {
    ...basePageData,
    ...override,
    ceremony: mergeScheduleDetail(basePageData.ceremony, override.ceremony, {
      time: basePageData.ceremonyTime,
      location: basePageData.ceremonyAddress,
    }),
    reception: mergeScheduleDetail(basePageData.reception, override.reception),
    kakaoMap: mergedKakaoMap,
    giftInfo: mergedGiftInfo,
  };
}

export function resolveInvitationPageDataByTheme(
  source: PageDataSource,
  theme: InvitationThemeKey
): InvitationPageData | undefined {
  const basePageData = resolveBasePageData(source);
  if (!basePageData) {
    return undefined;
  }

  const themeOverride = basePageData.themeOverrides?.[theme];

  if (!themeOverride) {
    return {
      ...basePageData,
      ceremony: mergeScheduleDetail(basePageData.ceremony, undefined, {
        time: basePageData.ceremonyTime,
        location: basePageData.ceremonyAddress,
      }),
      reception: mergeScheduleDetail(basePageData.reception, undefined),
    };
  }

  return mergeThemePageData(basePageData, themeOverride);
}

export function resolveCeremonyScheduleDetail(
  pageData: InvitationPageData | undefined,
  fallbackLocation: string
) {
  return mergeScheduleDetail(pageData?.ceremony, undefined, {
    time: pageData?.ceremonyTime,
    location: pageData?.ceremonyAddress || fallbackLocation,
  });
}

export function resolveReceptionScheduleDetail(pageData: InvitationPageData | undefined) {
  return mergeScheduleDetail(pageData?.reception, undefined);
}
