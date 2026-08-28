import { resolveReceptionScheduleDetail } from '@/lib/invitationThemePageData';
import type {
  InvitationPage,
  InvitationPageData,
} from '@/types/invitationPage';
import {
  buildKakaoMapPinUrl,
  buildKakaoMapSearchUrl,
} from '@/utils/kakaoMaps';

type GuideItem = { content: string; title: string };

export type WeddingStoredContentModel = {
  ceremonyContact: string;
  greetingAuthor: string;
  greetingMessage: string;
  mapDescription: string;
  mapHref: string;
  reception: { location: string; time: string } | null;
  venueGuide: GuideItem[];
  wreathGuide: GuideItem[];
};

function normalizeGuideItems(items?: GuideItem[]) {
  return (items ?? []).flatMap((item) => {
    const normalized = {
      content: item.content.trim(),
      title: item.title.trim(),
    };

    return normalized.title || normalized.content ? [normalized] : [];
  });
}

function hasValidCoordinates(pageData?: InvitationPageData) {
  const latitude = pageData?.kakaoMap?.latitude;
  const longitude = pageData?.kakaoMap?.longitude;

  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

function resolveMapHref(page: InvitationPage, pageData?: InvitationPageData) {
  const explicitMapUrl = pageData?.mapUrl?.trim() ?? '';

  if (explicitMapUrl) {
    return explicitMapUrl;
  }

  if (hasValidCoordinates(pageData) && pageData?.kakaoMap) {
    const markerTitle =
      pageData.kakaoMap.markerTitle?.trim() ||
      pageData.venueName?.trim() ||
      page.venue.trim() ||
      '위치';

    return buildKakaoMapPinUrl(
      markerTitle,
      pageData.kakaoMap.latitude,
      pageData.kakaoMap.longitude
    );
  }

  const address =
    pageData?.ceremonyAddress?.trim() ||
    pageData?.ceremony?.location?.trim() ||
    page.venue.trim();

  return address ? buildKakaoMapSearchUrl(address) : '';
}

export function buildWeddingStoredContent(
  page: InvitationPage,
  pageData: InvitationPageData | undefined = page.pageData
): WeddingStoredContentModel {
  const reception = resolveReceptionScheduleDetail(pageData);
  const receptionTime = reception?.time?.trim() ?? '';
  const receptionLocation = reception?.location?.trim() ?? '';

  return {
    ceremonyContact: pageData?.ceremonyContact?.trim() ?? '',
    greetingAuthor: pageData?.greetingAuthor?.trim() ?? '',
    greetingMessage:
      pageData?.greetingMessage?.replace(/<br\s*\/?>/gi, '\n').trim() ?? '',
    mapDescription: pageData?.mapDescription?.trim() ?? '',
    mapHref: resolveMapHref(page, pageData),
    reception:
      receptionTime || receptionLocation
        ? { location: receptionLocation, time: receptionTime }
        : null,
    venueGuide: normalizeGuideItems(pageData?.venueGuide),
    wreathGuide: normalizeGuideItems(pageData?.wreathGuide),
  };
}
