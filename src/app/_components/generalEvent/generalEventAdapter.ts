import type { EventPageReadyState } from '../eventPageState';

export type GeneralEventProgramItem = {
  time: string;
  title: string;
  description?: string;
};

export type GeneralEventViewModel = {
  title: string;
  subtitle: string;
  greeting: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  address: string;
  mapUrl: string;
  programItems: GeneralEventProgramItem[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventDate: Date | null;
};

type GeneralEventPageData = NonNullable<EventPageReadyState['pageConfig']['pageData']> & {
  programItems?: GeneralEventProgramItem[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export const DEFAULT_GENERAL_EVENT_PROGRAM_ITEMS: GeneralEventProgramItem[] = [
  {
    time: '18:00',
    title: '게스트 입장 및 웰컴 드링크',
    description: '행사장 안내와 네트워킹 시간이 준비됩니다.',
  },
  {
    time: '18:30',
    title: '오프닝 세리머니',
    description: '행사 취지와 주요 프로그램을 소개합니다.',
  },
  {
    time: '19:10',
    title: '메인 프로그램',
    description: '공연, 발표, 시상 등 행사의 핵심 순서를 진행합니다.',
  },
  {
    time: '20:30',
    title: '네트워킹 및 클로징',
    description: '참석자와 자유롭게 인사를 나누는 시간입니다.',
  },
];

function buildDateFromPage(page: EventPageReadyState['pageConfig']) {
  const date = page.weddingDateTime;
  const candidate = new Date(date.year, date.month, date.day, date.hour, date.minute);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function formatEventDate(date: Date | null, fallback: string) {
  if (!date) {
    return fallback || '일정 미정';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatEventTime(date: Date | null, fallback?: string) {
  if (!date) {
    return fallback?.trim() || '시간 미정';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function buildGeneralEventViewModel(
  state: EventPageReadyState
): GeneralEventViewModel {
  const page = state.pageConfig;
  const pageData = (page.pageData ?? {}) as GeneralEventPageData;
  const eventDate = buildDateFromPage(page);
  const programItems =
    pageData.programItems?.filter((item) => item.time.trim() && item.title.trim()) ??
    DEFAULT_GENERAL_EVENT_PROGRAM_ITEMS;

  return {
    title: page.displayName || page.metadata.title || '행사',
    subtitle: page.description || pageData.subtitle?.trim() || '소중한 자리에 초대합니다.',
    greeting:
      pageData.greetingMessage?.trim() ||
      `${page.displayName || '행사'}에 소중한 분들을 초대합니다.\n함께 자리해 주시면 더 뜻깊은 시간이 되겠습니다.`,
    dateLabel: formatEventDate(eventDate, page.date),
    timeLabel: formatEventTime(eventDate, pageData.ceremonyTime),
    venueName: pageData.venueName?.trim() || page.venue || '장소 미정',
    address:
      pageData.ceremonyAddress?.trim() || pageData.mapDescription?.trim() || '',
    mapUrl: pageData.mapUrl?.trim() || '',
    programItems,
    contactName: pageData.contactName?.trim() || pageData.ceremonyContact?.trim() || '',
    contactEmail: pageData.contactEmail?.trim() || '',
    contactPhone: pageData.contactPhone?.trim() || '',
    eventDate,
  };
}
