import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
} from '@/lib/invitationVariants';
import type {
  DemoExperienceComment,
  DemoExperienceSeedEvent,
} from '@/types/demoExperience';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

export const DEMO_EXPERIENCE_DAILY_SLUG = 'daily-experience-wedding';

export const DEMO_EXPERIENCE_IMAGE_OPTIONS = [
  '/images/001.png',
  '/images/002.png',
  '/images/003.png',
  '/images/004.png',
  '/images/005.png',
] as const;

const THEME_SEQUENCE: InvitationThemeKey[] = [
  'emotional',
  'romantic',
  'simple',
  'classic-r',
];

const COUPLES = [
  ['김하늘', '이바다'],
  ['박도윤', '최서아'],
  ['정시우', '윤하린'],
  ['강민준', '한지아'],
  ['조현우', '임다은'],
  ['송준호', '오유나'],
  ['백지훈', '문채원'],
  ['신태양', '장새봄'],
  ['권재민', '고은별'],
  ['남우진', '서가을'],
  ['유건우', '홍세아'],
  ['노정우', '배라온'],
  ['안도현', '표나래'],
  ['진성호', '마소율'],
  ['차은호', '주다인'],
] as const;

const VENUES = [
  '메시지 가든 1층',
  '데모 컨벤션 그랜드홀',
  '샘플 하우스 웨딩홀',
  '프리뷰 호텔 스카이홀',
  '모먼트 가든 채플',
] as const;

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error('체험 날짜 형식이 올바르지 않습니다.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('체험 날짜가 유효하지 않습니다.');
  }
  return parsed;
}

function buildComments(index: number, slug: string, baseDate: Date): DemoExperienceComment[] {
  if (index % 3 === 0) {
    return [];
  }

  return [
    {
      id: `demo-comment-${String(index + 1).padStart(2, '0')}`,
      author: '체험 하객',
      message: '두 분의 새로운 시작을 축하합니다.',
      pageSlug: slug,
      createdAt: new Date(baseDate.getTime() - (index + 1) * 60 * 60 * 1000),
    },
  ];
}

function buildConfig(index: number, dateKey: string): InvitationPageSeed {
  const baseSeed = getAllWeddingPageSeeds()[index % getAllWeddingPageSeeds().length];
  if (!baseSeed) {
    throw new Error('체험 청첩장 기본 템플릿을 찾을 수 없습니다.');
  }

  const config = structuredClone(baseSeed) as InvitationPageSeed;
  const [groomName, brideName] = COUPLES[index];
  const slug = `demo-seed-${String(index + 1).padStart(2, '0')}`;
  const theme = THEME_SEQUENCE[index % THEME_SEQUENCE.length];
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + (index - 4) * 7);
  const displayName = `${groomName} · ${brideName}`;
  const image = DEMO_EXPERIENCE_IMAGE_OPTIONS[index % DEMO_EXPERIENCE_IMAGE_OPTIONS.length];

  config.eventType = 'wedding';
  config.slug = slug;
  config.displayName = displayName;
  config.description = `${displayName}의 체험용 모바일 청첩장입니다.`;
  config.date = `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
  config.venue = VENUES[index % VENUES.length];
  config.groomName = groomName;
  config.brideName = brideName;
  config.couple.groom.name = groomName;
  config.couple.bride.name = brideName;
  config.weddingDateTime = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: 12 + (index % 5),
    minute: index % 2 === 0 ? 0 : 30,
  };
  config.metadata.title = displayName;
  config.metadata.description = config.description;
  config.metadata.images.wedding = image;
  config.metadata.images.social = image;
  config.metadata.images.kakaoCard = image;
  if (config.pageData) {
    config.pageData.galleryImages = [image];
  }
  config.variants = buildInvitationVariants(slug, displayName, {
    availability: createInvitationVariantAvailability([theme]),
  });

  return config;
}

export function createDemoExperienceSeedEvents(dateKey: string): DemoExperienceSeedEvent[] {
  const baseDate = parseDateKey(dateKey);

  return COUPLES.map((_, index) => {
    const eventId = `demo-seed-${String(index + 1).padStart(2, '0')}`;
    const updatedAt = new Date(baseDate.getTime() - index * 45 * 60 * 1000);
    const config = buildConfig(index, dateKey);

    return {
      eventId,
      slug: config.slug,
      kind: 'seed',
      ownerUid: index % 3 === 0 ? null : `demo-customer-${String(index + 1).padStart(2, '0')}`,
      published: index % 4 !== 0,
      defaultTheme: THEME_SEQUENCE[index % THEME_SEQUENCE.length],
      version: 1,
      config,
      createdAt: new Date(baseDate.getTime() - (index + 1) * 24 * 60 * 60 * 1000),
      updatedAt,
      comments: buildComments(index, config.slug, baseDate),
    };
  });
}

