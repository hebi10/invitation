import type { EventPageReadyState } from '../eventPageState';

export type BirthdayInvitationViewModel = {
  name: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  address: string;
  contact: string;
  greeting: string;
  greetingAuthor: string;
  mapUrl: string;
  mapDescription: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  countdownDate: Date;
  venueGuide: Array<{ title: string; content: string }>;
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

export function buildBirthdayInvitationViewModel(
  state: EventPageReadyState
): BirthdayInvitationViewModel {
  const page = state.pageConfig;
  const pageData = page.pageData;
  const name =
    page.displayName.trim() ||
    page.metadata.title.trim() ||
    pageData?.greetingAuthor?.trim() ||
    '생일 주인공';
  const dateLabel = hasText(page.date) ? page.date : formatDate(state.weddingDate);
  const timeLabel =
    pageData?.ceremony?.time?.trim() ||
    pageData?.ceremonyTime?.trim() ||
    formatTime(state.weddingDate);
  const venueName =
    pageData?.venueName?.trim() || page.venue.trim() || '파티 장소를 입력해 주세요';

  return {
    name,
    title: page.metadata.title.trim() || `${name} 생일 초대장`,
    subtitle: pageData?.subtitle?.trim() || '소중한 분들과 함께하는 특별한 하루',
    dateLabel,
    timeLabel,
    venueName,
    address: pageData?.ceremonyAddress?.trim() || '',
    contact: pageData?.ceremonyContact?.trim() || '',
    greeting:
      pageData?.greetingMessage?.trim() ||
      page.description.trim() ||
      '소중한 분들과 함께 특별한 날을 나누고 싶어요. 편한 마음으로 함께해 주세요.',
    greetingAuthor: pageData?.greetingAuthor?.trim() || name,
    mapUrl: pageData?.mapUrl?.trim() || '',
    mapDescription:
      pageData?.mapDescription?.trim() || '지도 링크를 통해 자세한 위치를 확인해 주세요.',
    coverImageUrl: state.mainImageUrl,
    galleryImageUrls: state.galleryImageUrls,
    countdownDate: state.weddingDate,
    venueGuide: (pageData?.venueGuide ?? []).filter(
      (item) => hasText(item.title) || hasText(item.content)
    ),
  };
}
