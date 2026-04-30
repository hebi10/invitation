import type { BankAccount } from '@/types/invitationPage';

import type { EventPageReadyState } from '../eventPageState';

export type FirstBirthdayInvitationViewModel = {
  babyName: string;
  dadName: string;
  momName: string;
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
  giftMessage: string;
  dadAccounts: BankAccount[];
  momAccounts: BankAccount[];
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

export function buildFirstBirthdayInvitationViewModel(
  state: EventPageReadyState
): FirstBirthdayInvitationViewModel {
  const page = state.pageConfig;
  const pageData = page.pageData;
  const babyName =
    page.displayName.trim() ||
    page.metadata.title.trim() ||
    page.groomName.trim() ||
    '아기 이름';
  const dadName = page.couple.groom.name.trim() || page.groomName.trim() || '아빠';
  const momName = page.couple.bride.name.trim() || page.brideName.trim() || '엄마';
  const dateLabel = hasText(page.date) ? page.date : formatDate(state.weddingDate);
  const timeLabel =
    pageData?.ceremony?.time?.trim() ||
    pageData?.ceremonyTime?.trim() ||
    formatTime(state.weddingDate);
  const venueName =
    pageData?.venueName?.trim() || page.venue.trim() || '돌잔치 장소를 입력해 주세요';
  const giftInfo = pageData?.giftInfo ?? state.giftInfo;

  return {
    babyName,
    dadName,
    momName,
    subtitle: pageData?.subtitle?.trim() || '첫 번째 생일잔치에 초대합니다',
    dateLabel,
    timeLabel,
    venueName,
    address: pageData?.ceremonyAddress?.trim() || '',
    contact: pageData?.ceremonyContact?.trim() || '',
    greeting:
      pageData?.greetingMessage?.trim() ||
      page.description.trim() ||
      '어느새 첫 번째 생일을 맞이한 우리 아이의 특별한 날에 소중한 분들을 모시고 싶습니다.',
    greetingAuthor: pageData?.greetingAuthor?.trim() || `${dadName} · ${momName}`,
    mapUrl: pageData?.mapUrl?.trim() || '',
    mapDescription:
      pageData?.mapDescription?.trim() || '지도 링크를 통해 자세한 위치를 확인해 주세요.',
    coverImageUrl: state.mainImageUrl,
    galleryImageUrls: state.galleryImageUrls,
    countdownDate: state.weddingDate,
    venueGuide: (pageData?.venueGuide ?? []).filter(
      (item) => hasText(item.title) || hasText(item.content)
    ),
    giftMessage:
      giftInfo?.message?.trim() || '전해 주시는 따뜻한 마음을 감사히 간직하겠습니다.',
    dadAccounts: giftInfo?.groomAccounts ?? [],
    momAccounts: giftInfo?.brideAccounts ?? [],
  };
}
