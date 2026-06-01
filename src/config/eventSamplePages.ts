import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { EventTypeKey } from '@/lib/eventTypes';
import type {
  InvitationPage,
  InvitationPageSeed,
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';

const DEFAULT_PRODUCT_TIER: InvitationProductTier = 'premium';

type EventSampleInput = {
  eventType: EventTypeKey;
  slug: string;
  displayName: string;
  description: string;
  subtitle: string;
  date: { year: number; month: number; day: number; hour: number; minute: number };
  venue: string;
  address: string;
  contact: string;
  greetingMessage: string;
  greetingAuthor: string;
  defaultTheme: InvitationThemeKey;
  availableThemes: InvitationThemeKey[];
  primaryName: string;
  secondaryName?: string;
  ceremonyLabel?: string;
  programItems?: Array<{ time: string; title: string; description?: string }>;
  venueGuide?: Array<{ title: string; content: string }>;
  benefitItems?: Array<{ title: string; content: string }>;
};

function buildDateLabel(year: number, month: number, day: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(year, month, day));
}

function buildVariants(
  slug: string,
  displayName: string,
  themes: readonly InvitationThemeKey[]
) {
  return Object.fromEntries(
    themes.map((theme) => [
      theme,
      {
        available: true,
        path: `/${slug}/${theme}`,
        displayName: `${displayName} (${theme})`,
      },
    ])
  );
}

function buildEventSampleSeed(input: EventSampleInput): InvitationPageSeed {
  const productTier = DEFAULT_PRODUCT_TIER;
  const features = resolveInvitationFeatures(productTier);
  const dateLabel = buildDateLabel(input.date.year, input.date.month, input.date.day);
  const ceremonyTime = `${String(input.date.hour).padStart(2, '0')}:${String(
    input.date.minute
  ).padStart(2, '0')}`;
  const secondaryName = input.secondaryName ?? '';

  return {
    eventType: input.eventType,
    slug: input.slug,
    displayName: input.displayName,
    description: input.description,
    date: dateLabel,
    venue: input.venue,
    groomName: input.primaryName,
    brideName: secondaryName,
    couple: {
      groom: {
        name: input.primaryName,
        order: '',
        phone: input.contact,
        father: { relation: '', name: '', phone: '' },
        mother: { relation: '', name: '', phone: '' },
      },
      bride: {
        name: secondaryName,
        order: '',
        phone: '',
        father: { relation: '', name: '', phone: '' },
        mother: { relation: '', name: '', phone: '' },
      },
    },
    weddingDateTime: input.date,
    productTier,
    features,
    musicEnabled: false,
    musicVolume: 0.7,
    musicCategoryId: '',
    musicTrackId: '',
    musicStoragePath: '',
    musicUrl: '',
    metadata: {
      title: input.displayName,
      description: input.description,
      keywords: [input.displayName, input.venue, input.eventType],
      images: {
        wedding: '',
        favicon: '/favicon.ico',
        social: '',
        kakaoCard: '',
      },
      openGraph: {
        title: input.displayName,
        description: input.description,
      },
      twitter: {
        title: input.displayName,
        description: input.description,
      },
    },
    pageData: {
      subtitle: input.subtitle,
      birthdayTheme:
        input.eventType === 'birthday' ? input.defaultTheme : undefined,
      generalEventTheme:
        input.eventType === 'general-event' ? input.defaultTheme : undefined,
      ceremonyTime,
      ceremonyAddress: input.address,
      ceremonyContact: input.contact,
      ceremony: {
        time: ceremonyTime,
        location: input.ceremonyLabel ?? input.venue,
      },
      reception: {
        time: '',
        location: '',
      },
      galleryImages: [],
      greetingMessage: input.greetingMessage,
      greetingAuthor: input.greetingAuthor,
      mapUrl: '',
      mapDescription: input.address,
      venueName: input.venue,
      groom: {
        name: input.primaryName,
        order: '',
        phone: input.contact,
        father: { relation: '', name: '', phone: '' },
        mother: { relation: '', name: '', phone: '' },
      },
      bride: {
        name: secondaryName,
        order: '',
        phone: '',
        father: { relation: '', name: '', phone: '' },
        mother: { relation: '', name: '', phone: '' },
      },
      kakaoMap: {
        latitude: 37.5665,
        longitude: 126.978,
        level: 3,
        markerTitle: input.venue,
      },
      venueGuide: input.venueGuide ?? [],
      wreathGuide: input.benefitItems ?? [],
      programItems: input.programItems ?? [],
      giftInfo: {
        groomAccounts: [],
        brideAccounts: [],
        message: '',
      },
    },
    variants: buildVariants(input.slug, input.displayName, input.availableThemes),
  };
}

function publishSample(seed: InvitationPageSeed): InvitationPage {
  return {
    ...seed,
    published: true,
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
  };
}

const EVENT_SAMPLE_PAGE_SEEDS = [
  buildEventSampleSeed({
    eventType: 'first-birthday',
    slug: 'first-birthday-ian-spring',
    displayName: '이안의 봄날 돌잔치',
    description: '따뜻한 봄날에 준비한 이안의 첫 생일 초대장입니다.',
    subtitle: '첫 번째 생일잔치',
    date: { year: 2026, month: 3, day: 21, hour: 12, minute: 0 },
    venue: '라온제나 하우스',
    address: '서울특별시 송파구 올림픽로 300',
    contact: '010-3120-0321',
    greetingMessage:
      '이안이가 어느새 첫 생일을 맞았습니다. 소중한 걸음을 함께 축복해 주세요.',
    greetingAuthor: '아빠 지훈 · 엄마 서연',
    defaultTheme: 'first-birthday-pink',
    availableThemes: ['first-birthday-pink'],
    primaryName: '지훈',
    secondaryName: '서연',
    ceremonyLabel: '돌잔치',
  }),
  buildEventSampleSeed({
    eventType: 'first-birthday',
    slug: 'first-birthday-seoah-mint',
    displayName: '서아의 첫돌잔치',
    description: '맑은 민트 톤으로 준비한 서아의 첫돌 초대장입니다.',
    subtitle: '서아의 첫 번째 생일',
    date: { year: 2026, month: 5, day: 9, hour: 11, minute: 30 },
    venue: '메이필드 가든홀',
    address: '서울특별시 강서구 방화대로 94',
    contact: '010-5190-1109',
    greetingMessage:
      '서아의 첫 번째 생일에 감사한 분들을 모시고 따뜻한 시간을 나누려 합니다.',
    greetingAuthor: '아빠 민준 · 엄마 하은',
    defaultTheme: 'first-birthday-mint',
    availableThemes: ['first-birthday-mint'],
    primaryName: '민준',
    secondaryName: '하은',
    ceremonyLabel: '첫돌잔치',
  }),
  buildEventSampleSeed({
    eventType: 'birthday',
    slug: 'birthday-minseo-picnic',
    displayName: '민서의 피크닉 생일',
    description: '햇살 좋은 오후에 준비한 민서의 피크닉 생일 초대장입니다.',
    subtitle: '햇살 좋은 피크닉',
    date: { year: 2026, month: 8, day: 5, hour: 13, minute: 0 },
    venue: '그린테이블 스튜디오',
    address: '경기도 성남시 분당구 정자일로 140',
    contact: '010-9182-5021',
    greetingMessage:
      '가벼운 음식과 음악을 준비했습니다. 민서의 하루를 함께 축하해 주세요.',
    greetingAuthor: '민서',
    defaultTheme: 'birthday-minimal',
    availableThemes: ['birthday-minimal'],
    primaryName: '민서',
  }),
  buildEventSampleSeed({
    eventType: 'birthday',
    slug: 'birthday-jiwoo-rooftop',
    displayName: '지우의 루프탑 생일',
    description: '노을이 보이는 루프탑에서 여는 지우의 생일 초대장입니다.',
    subtitle: '노을 아래 루프탑 파티',
    date: { year: 2026, month: 7, day: 22, hour: 18, minute: 30 },
    venue: '스카이온 루프탑',
    address: '서울특별시 마포구 와우산로 29',
    contact: '010-4410-8820',
    greetingMessage:
      '올해 생일은 노을 아래에서 좋은 사람들과 편안하게 보내고 싶습니다. 함께해 주세요.',
    greetingAuthor: '지우',
    defaultTheme: 'birthday-floral',
    availableThemes: ['birthday-floral'],
    primaryName: '지우',
    ceremonyLabel: '루프탑 파티',
  }),
  buildEventSampleSeed({
    eventType: 'general-event',
    slug: 'general-event-brand-night',
    displayName: '브랜드 나이트 리셉션',
    description: '새로운 브랜드 방향성을 소개하는 프라이빗 리셉션 초대장입니다.',
    subtitle: '프라이빗 브랜드 리셉션',
    date: { year: 2026, month: 9, day: 17, hour: 19, minute: 0 },
    venue: '라움 아트센터',
    address: '서울특별시 강남구 언주로 564',
    contact: '02-512-0917',
    greetingMessage:
      '브랜드의 다음 장을 함께 열어갈 분들을 모십니다. 의미 있는 대화와 교류의 시간이 되길 바랍니다.',
    greetingAuthor: 'MSIGN 브랜드팀',
    defaultTheme: 'general-event-elegant',
    availableThemes: ['general-event-elegant'],
    primaryName: 'MSIGN',
    programItems: [
      { time: '19:00', title: '리셉션 오픈', description: '웰컴 드링크와 네트워킹' },
      { time: '19:40', title: '브랜드 세션', description: '신규 라인업 소개' },
      { time: '20:30', title: '네트워킹', description: '자유 교류' },
    ],
  }),
  buildEventSampleSeed({
    eventType: 'general-event',
    slug: 'general-event-summer-networking',
    displayName: '서머 네트워킹 파티',
    description: '여름 저녁에 열리는 캐주얼 네트워킹 파티 초대장입니다.',
    subtitle: '여름 저녁 네트워킹',
    date: { year: 2026, month: 6, day: 26, hour: 18, minute: 30 },
    venue: '루프스테이지 한남',
    address: '서울특별시 용산구 독서당로 70',
    contact: '02-790-2606',
    greetingMessage:
      '음악과 대화가 있는 여름 저녁에 초대합니다. 가볍고 즐거운 마음으로 함께해 주세요.',
    greetingAuthor: '서머 네트워킹 운영팀',
    defaultTheme: 'general-event-vivid',
    availableThemes: ['general-event-vivid'],
    primaryName: 'Summer Networking',
  }),
  buildEventSampleSeed({
    eventType: 'opening',
    slug: 'opening-bloom-cafe',
    displayName: '블룸 카페 오픈',
    description: '새롭게 문을 여는 블룸 카페의 오픈 초대장입니다.',
    subtitle: '블룸 카페 첫 오픈',
    date: { year: 2026, month: 4, day: 18, hour: 11, minute: 0 },
    venue: '블룸 카페 성수',
    address: '서울특별시 성동구 연무장길 45',
    contact: '02-461-0418',
    greetingMessage:
      '일상에 작은 쉼을 더하는 공간으로 인사드립니다. 오픈 첫날 따뜻한 커피로 맞이하겠습니다.',
    greetingAuthor: '블룸 카페',
    defaultTheme: 'opening-natural',
    availableThemes: ['opening-natural'],
    primaryName: '블룸 카페',
    venueGuide: [
      { title: '공간', content: '햇살이 드는 좌석과 조용한 작업석을 준비했습니다.' },
      { title: '메뉴', content: '시그니처 라떼와 시즌 디저트를 선보입니다.' },
    ],
    benefitItems: [
      { title: '오픈 혜택', content: '방문 고객에게 드립백을 증정합니다.' },
    ],
  }),
  buildEventSampleSeed({
    eventType: 'opening',
    slug: 'opening-studio-nova',
    displayName: '스튜디오 노바 오픈',
    description: '브랜드 촬영 스튜디오 노바의 오픈 초대장입니다.',
    subtitle: '스튜디오 노바 쇼케이스',
    date: { year: 2026, month: 10, day: 9, hour: 14, minute: 0 },
    venue: '스튜디오 노바',
    address: '서울특별시 중구 퇴계로 100',
    contact: '02-2260-1009',
    greetingMessage:
      '브랜드의 순간을 더 선명하게 기록하는 공간을 열었습니다. 오픈 쇼케이스에 함께해 주세요.',
    greetingAuthor: '스튜디오 노바',
    defaultTheme: 'opening-modern',
    availableThemes: ['opening-modern'],
    primaryName: '스튜디오 노바',
  }),
] as const;

export const EVENT_SAMPLE_PAGES = EVENT_SAMPLE_PAGE_SEEDS.map(publishSample);

export function getEventSamplePageBySlug(slug: string | null | undefined) {
  const normalizedSlug = slug?.trim() ?? '';
  if (!normalizedSlug) {
    return null;
  }

  return EVENT_SAMPLE_PAGES.find((page) => page.slug === normalizedSlug) ?? null;
}
