import type { EventPageReadyState } from '../eventPageState';

export type OpeningInfoItem = {
  title: string;
  content: string;
};

export type OpeningInvitationViewModel = {
  businessName: string;
  brandName: string;
  tagline: string;
  greeting: string;
  openingDateLabel: string;
  openingTimeLabel: string;
  venueName: string;
  address: string;
  contact: string;
  mapUrl: string;
  mapDescription: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  openingDate: Date;
  brandItems: OpeningInfoItem[];
  benefitItems: OpeningInfoItem[];
  footerInfo: string;
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function filterGuideItems(items?: OpeningInfoItem[]) {
  return (items ?? []).filter((item) => hasText(item.title) || hasText(item.content));
}

export function buildOpeningInvitationViewModel(
  state: EventPageReadyState
): OpeningInvitationViewModel {
  const page = state.pageConfig;
  const pageData = page.pageData;
  const businessName =
    page.displayName.trim() ||
    page.metadata.title.trim() ||
    page.couple.groom.name.trim() ||
    '새 매장';
  const brandItems = filterGuideItems(pageData?.venueGuide);
  const benefitItems = filterGuideItems(pageData?.wreathGuide);
  const venueName = pageData?.venueName?.trim() || page.venue.trim() || businessName;
  const openingDateLabel = hasText(page.date) ? page.date : formatDate(state.weddingDate);
  const openingTimeLabel =
    pageData?.ceremony?.time?.trim() ||
    pageData?.ceremonyTime?.trim() ||
    formatTime(state.weddingDate);

  return {
    businessName,
    brandName: pageData?.subtitle?.trim() || 'Grand Opening',
    tagline: page.description.trim() || '새로운 공간의 시작에 소중한 분들을 초대합니다.',
    greeting:
      pageData?.greetingMessage?.trim() ||
      `${businessName}이 새로운 시작을 맞이합니다.\n방문해 주시는 한 분 한 분께 좋은 경험으로 인사드리겠습니다.`,
    openingDateLabel,
    openingTimeLabel,
    venueName,
    address: pageData?.ceremonyAddress?.trim() || '',
    contact: pageData?.ceremonyContact?.trim() || '',
    mapUrl: pageData?.mapUrl?.trim() || '',
    mapDescription:
      pageData?.mapDescription?.trim() || '주차와 대중교통 안내를 확인해 주세요.',
    coverImageUrl: state.mainImageUrl,
    galleryImageUrls: state.galleryImageUrls,
    openingDate: state.weddingDate,
    brandItems:
      brandItems.length > 0
        ? brandItems
        : [
            { title: '스페셜티', content: '대표 메뉴와 서비스를 정성스럽게 준비했습니다.' },
            { title: '공간', content: '편안하게 머물 수 있는 분위기를 만들었습니다.' },
            { title: '경험', content: '오픈 기간 동안 특별한 혜택을 제공합니다.' },
          ],
    benefitItems:
      benefitItems.length > 0
        ? benefitItems
        : [
            { title: '오픈 혜택', content: '오픈 기념 이벤트를 매장에서 안내드립니다.' },
            { title: '방문 선물', content: '준비 수량 소진 시까지 혜택이 제공됩니다.' },
          ],
    footerInfo: [pageData?.ceremonyAddress, pageData?.ceremonyContact]
      .filter((value) => value?.trim())
      .join(' · '),
  };
}
