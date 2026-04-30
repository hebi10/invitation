import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import type { EventTypeKey } from '../src/lib/eventTypes.ts';
import { resolveInvitationFeatures } from '../src/lib/invitationProducts.ts';
import type {
  InvitationPageSeed,
  InvitationProductTier,
} from '../src/types/invitationPage.ts';

type DummyEventSeed = InvitationPageSeed & {
  status: 'active';
  published: true;
  defaultTheme: string;
};

type PlannedWrite = {
  path: string;
  data: Record<string, unknown>;
  merge: boolean;
};

const EVENTS_COLLECTION = 'events';
const EVENT_CONTENT_COLLECTION = 'content';
const EVENT_CURRENT_CONTENT_DOC = 'current';
const EVENT_SLUG_INDEX_COLLECTION = 'eventSlugIndex';
const DEFAULT_PRODUCT_TIER: InvitationProductTier = 'premium';

function loadEnvironmentFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const unwrappedValue = rawValue.replace(/^(['"])(.*)\1$/, '$2');

    if (!process.env[key]) {
      process.env[key] = unwrappedValue;
    }
  }
}

function loadLocalEnvironment() {
  for (const fileName of ['.env.local', '.env']) {
    loadEnvironmentFile(path.join(process.cwd(), fileName));
  }
}

function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    undefined
  );
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id ?? getFirebaseProjectId(),
    });
    return getFirestore();
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'Firebase Admin credentials were not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: getFirebaseProjectId(),
  });

  return getFirestore();
}

function parseArgs(argv: string[]) {
  const [, , command = 'dry-run', ...rest] = argv;
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (/^\d+$/.test(value)) {
      options['timeout-ms'] = value;
      continue;
    }

    if (!value.startsWith('--')) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = rest[index + 1];
    if (!nextValue || nextValue.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = nextValue;
    index += 1;
  }

  return { command, options };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timeout.unref?.();
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeout);
  });
}

function buildVariants(
  slug: string,
  displayName: string,
  availableThemes: string[]
) {
  return Object.fromEntries(
    availableThemes.map((theme) => [
      theme,
      {
        available: true,
        path: `/${slug}/${theme}`,
        displayName: `${displayName} (${theme})`,
      },
    ])
  );
}

function buildDateLabel(year: number, month: number, day: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(year, month, day));
}

function buildBaseSeed(input: {
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
  defaultTheme: string;
  availableThemes: string[];
  primaryName: string;
  secondaryName?: string;
  ceremonyLabel?: string;
  programItems?: Array<{ time: string; title: string; description?: string }>;
  venueGuide?: Array<{ title: string; content: string }>;
  wreathGuide?: Array<{ title: string; content: string }>;
  giftMessage?: string;
}): DummyEventSeed {
  const productTier = DEFAULT_PRODUCT_TIER;
  const features = resolveInvitationFeatures(productTier);
  const dateLabel = buildDateLabel(input.date.year, input.date.month, input.date.day);
  const ceremonyTime = `${String(input.date.hour).padStart(2, '0')}:${String(
    input.date.minute
  ).padStart(2, '0')}`;
  const brideName = input.secondaryName ?? '';

  return {
    eventType: input.eventType,
    slug: input.slug,
    displayName: input.displayName,
    description: input.description,
    date: dateLabel,
    venue: input.venue,
    groomName: input.primaryName,
    brideName,
    couple: {
      groom: {
        name: input.primaryName,
        order: '',
        phone: input.contact,
        father: { relation: '', name: '', phone: '' },
        mother: { relation: '', name: '', phone: '' },
      },
      bride: {
        name: brideName,
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
      birthdayTheme: input.eventType === 'birthday' ? input.defaultTheme : undefined,
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
        name: brideName,
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
      wreathGuide: input.wreathGuide ?? [],
      programItems: input.programItems ?? [],
      giftInfo: {
        groomAccounts: [],
        brideAccounts: [],
        message: input.giftMessage ?? '',
      },
    },
    variants: buildVariants(input.slug, input.displayName, input.availableThemes),
    status: 'active',
    published: true,
    defaultTheme: input.defaultTheme,
  };
}

export const DUMMY_EVENT_SEEDS: DummyEventSeed[] = [
  buildBaseSeed({
    eventType: 'birthday',
    slug: 'birthday-harin-garden-party',
    displayName: '하린의 정원 생일파티',
    description: '푸른 정원에서 함께하는 하린의 생일 초대장입니다.',
    subtitle: 'A Garden Birthday',
    date: { year: 2026, month: 5, day: 13, hour: 15, minute: 0 },
    venue: '라온가든 파티룸',
    address: '서울특별시 성동구 서울숲2길 12',
    contact: '010-2301-7742',
    greetingMessage:
      '하린의 소중한 하루에 가까운 분들을 모시고 따뜻한 시간을 나누고자 합니다.',
    greetingAuthor: '하린 드림',
    defaultTheme: 'birthday-minimal',
    availableThemes: ['birthday-minimal'],
    primaryName: '하린',
    ceremonyLabel: '생일 파티',
    programItems: [
      { time: '15:00', title: '입장 및 포토타임' },
      { time: '16:00', title: '케이크 세리머니' },
      { time: '17:00', title: '가든 디너' },
    ],
  }),
  buildBaseSeed({
    eventType: 'birthday',
    slug: 'birthday-jiwoo-rooftop',
    displayName: '지우의 루프탑 생일',
    description: '노을이 보이는 루프탑에서 여는 지우의 생일 초대장입니다.',
    subtitle: 'Rooftop Birthday Night',
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
  buildBaseSeed({
    eventType: 'birthday',
    slug: 'birthday-minseo-picnic',
    displayName: '민서의 피크닉 생일',
    description: '햇살 좋은 오후에 준비한 민서의 피크닉 생일 초대장입니다.',
    subtitle: 'Picnic Birthday',
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
  buildBaseSeed({
    eventType: 'first-birthday',
    slug: 'first-birthday-yu an-pink-day'.replace(/\s+/g, '-'),
    displayName: '유안의 첫 번째 생일',
    description: '유안의 첫돌을 감사한 마음으로 함께 나누는 초대장입니다.',
    subtitle: 'First Birthday',
    date: { year: 2026, month: 6, day: 7, hour: 12, minute: 0 },
    venue: '더채플 앳 청담 라운지',
    address: '서울특별시 강남구 선릉로 757',
    contact: '010-3308-1207',
    greetingMessage:
      '작고 소중했던 아이가 어느새 첫 생일을 맞았습니다. 함께 축복해 주세요.',
    greetingAuthor: '아빠 준호 · 엄마 서연',
    defaultTheme: 'first-birthday-pink',
    availableThemes: ['first-birthday-pink'],
    primaryName: '유안',
    secondaryName: '서연',
    giftMessage: '축하의 마음만으로도 충분히 감사합니다.',
  }),
  buildBaseSeed({
    eventType: 'first-birthday',
    slug: 'first-birthday-seoah-mint',
    displayName: '서아의 첫돌잔치',
    description: '서아의 첫 생일을 맑은 민트빛 분위기로 전하는 초대장입니다.',
    subtitle: 'Seoah First Birthday',
    date: { year: 2026, month: 9, day: 19, hour: 11, minute: 30 },
    venue: '메이필드 보타닉홀',
    address: '서울특별시 강서구 방화대로 94',
    contact: '010-7720-4195',
    greetingMessage:
      '서아가 처음 맞는 생일에 감사한 분들을 모시고 기쁜 마음을 나누려 합니다.',
    greetingAuthor: '아빠 도윤 · 엄마 지민',
    defaultTheme: 'first-birthday-mint',
    availableThemes: ['first-birthday-mint'],
    primaryName: '서아',
    secondaryName: '지민',
  }),
  buildBaseSeed({
    eventType: 'first-birthday',
    slug: 'first-birthday-ian-spring',
    displayName: '이안의 봄날 돌잔치',
    description: '봄날처럼 따뜻한 이안의 돌잔치 초대장입니다.',
    subtitle: 'Ian Turns One',
    date: { year: 2026, month: 3, day: 28, hour: 12, minute: 30 },
    venue: '온더테이블 베이비홀',
    address: '부산광역시 해운대구 센텀남대로 35',
    contact: '010-6028-9133',
    greetingMessage:
      '첫 울음부터 첫 걸음까지 함께 응원해 주신 마음에 감사드립니다.',
    greetingAuthor: '아빠 민재 · 엄마 하은',
    defaultTheme: 'first-birthday-pink',
    availableThemes: ['first-birthday-pink'],
    primaryName: '이안',
    secondaryName: '하은',
  }),
  buildBaseSeed({
    eventType: 'general-event',
    slug: 'general-event-brand-night',
    displayName: '브랜드 쇼케이스 나이트',
    description: '신규 브랜드 라인업을 공개하는 프라이빗 쇼케이스 초대장입니다.',
    subtitle: 'Brand Showcase Night',
    date: { year: 2026, month: 4, day: 16, hour: 19, minute: 0 },
    venue: '플랫폼엘 컨템포러리 아트센터',
    address: '서울특별시 강남구 언주로133길 11',
    contact: '02-6200-1234',
    greetingMessage:
      '새로운 시즌의 방향과 제품을 가장 먼저 소개하는 자리에 초대합니다.',
    greetingAuthor: '브랜드팀',
    defaultTheme: 'general-event-elegant',
    availableThemes: ['emotional'],
    primaryName: '브랜드 쇼케이스',
    programItems: [
      { time: '19:00', title: '리셉션' },
      { time: '19:30', title: '쇼케이스 발표' },
      { time: '20:20', title: '네트워킹' },
    ],
  }),
  buildBaseSeed({
    eventType: 'general-event',
    slug: 'general-event-summer-networking',
    displayName: '서머 네트워킹 파티',
    description: '파트너와 고객을 위한 여름 네트워킹 행사 초대장입니다.',
    subtitle: 'Summer Networking',
    date: { year: 2026, month: 6, day: 25, hour: 18, minute: 0 },
    venue: '한강 세빛 라운지',
    address: '서울특별시 서초구 올림픽대로 2085-14',
    contact: '02-3477-8800',
    greetingMessage:
      '가벼운 대화와 음악, 시원한 다이닝이 있는 여름 저녁에 함께해 주세요.',
    greetingAuthor: '운영사무국',
    defaultTheme: 'general-event-vivid',
    availableThemes: ['emotional'],
    primaryName: '서머 네트워킹 파티',
  }),
  buildBaseSeed({
    eventType: 'general-event',
    slug: 'general-event-art-talk',
    displayName: '아트 토크 살롱',
    description: '작가와 관객이 만나는 작은 문화 살롱 초대장입니다.',
    subtitle: 'Art Talk Salon',
    date: { year: 2026, month: 10, day: 10, hour: 16, minute: 0 },
    venue: '서촌 아틀리에홀',
    address: '서울특별시 종로구 자하문로 7길 12',
    contact: '02-739-5011',
    greetingMessage:
      '작품 뒤의 이야기와 창작 과정을 나누는 조용한 오후에 초대합니다.',
    greetingAuthor: '아틀리에 운영팀',
    defaultTheme: 'general-event-elegant',
    availableThemes: ['emotional'],
    primaryName: '아트 토크 살롱',
  }),
  buildBaseSeed({
    eventType: 'opening',
    slug: 'opening-bloom-cafe',
    displayName: '블룸 카페 오픈',
    description: '따뜻한 커피와 디저트가 있는 블룸 카페 개업 초대장입니다.',
    subtitle: 'Grand Opening',
    date: { year: 2026, month: 4, day: 4, hour: 11, minute: 0 },
    venue: '블룸 카페',
    address: '서울특별시 용산구 한남대로 42',
    contact: '02-794-0420',
    greetingMessage:
      '새로운 공간을 열었습니다. 편안한 커피 한 잔으로 첫날을 함께해 주세요.',
    greetingAuthor: '블룸 카페',
    defaultTheme: 'opening-natural',
    availableThemes: ['opening-natural'],
    primaryName: '블룸 카페',
    venueGuide: [
      { title: '시그니처 커피', content: '오픈 주간 한정 블렌드를 준비했습니다.' },
      { title: '디저트 테이블', content: '구움과자와 시즌 케이크를 제공합니다.' },
    ],
  }),
  buildBaseSeed({
    eventType: 'opening',
    slug: 'opening-studio-nova',
    displayName: '스튜디오 노바 오픈',
    description: '브랜드 촬영과 콘텐츠 제작을 위한 스튜디오 개업 초대장입니다.',
    subtitle: 'Studio Nova Opening',
    date: { year: 2026, month: 5, day: 9, hour: 14, minute: 0 },
    venue: '스튜디오 노바',
    address: '서울특별시 성수이로 87',
    contact: '02-467-9012',
    greetingMessage:
      '새롭게 완성한 촬영 공간을 소개합니다. 공간 투어와 오픈 리셉션에 초대합니다.',
    greetingAuthor: '스튜디오 노바',
    defaultTheme: 'opening-modern',
    availableThemes: ['opening-modern'],
    primaryName: '스튜디오 노바',
  }),
  buildBaseSeed({
    eventType: 'opening',
    slug: 'opening-green-table',
    displayName: '그린테이블 오픈',
    description: '제철 식재료를 담은 작은 레스토랑 개업 초대장입니다.',
    subtitle: 'Green Table Opening',
    date: { year: 2026, month: 8, day: 14, hour: 17, minute: 30 },
    venue: '그린테이블',
    address: '제주특별자치도 제주시 애월읍 애월로 88',
    contact: '064-712-8801',
    greetingMessage:
      '계절의 맛을 담는 작은 식탁을 열었습니다. 첫 저녁을 함께 나누고 싶습니다.',
    greetingAuthor: '그린테이블',
    defaultTheme: 'opening-natural',
    availableThemes: ['opening-natural'],
    primaryName: '그린테이블',
  }),
];

function buildEventId(seed: DummyEventSeed) {
  return `evt_${seed.slug}`;
}

function readSupportedVariants(seed: DummyEventSeed) {
  return Object.keys(seed.variants ?? {});
}

function buildEventSummary(seed: DummyEventSeed, now: Date) {
  return {
    eventId: buildEventId(seed),
    eventType: seed.eventType,
    slug: seed.slug,
    status: seed.status,
    title: seed.displayName,
    displayName: seed.displayName,
    summary: seed.description,
    supportedVariants: readSupportedVariants(seed),
    published: seed.published,
    defaultTheme: seed.defaultTheme,
    productTier: seed.productTier,
    featureFlags: clone(seed.features ?? {}),
    stats: {
      commentCount: 0,
      ticketCount: 0,
      ticketBalance: 0,
    },
    visibility: {
      published: seed.published,
      displayStartAt: null,
      displayEndAt: null,
    },
    displayPeriod: null,
    hasCustomConfig: true,
    hasCustomContent: true,
    isDummy: true,
    createdAt: now,
    updatedAt: now,
    lastSavedAt: now,
    version: 1,
    migratedFromPageSlug: seed.slug,
  };
}

function buildEventContent(seed: DummyEventSeed, summary: Record<string, unknown>, now: Date) {
  return {
    schemaVersion: 1,
    eventType: seed.eventType,
    slug: seed.slug,
    content: clone(seed),
    themeState: {
      defaultTheme: seed.defaultTheme,
      variants: clone(seed.variants ?? {}),
    },
    productTier: seed.productTier ?? null,
    featureFlags: clone(seed.features ?? {}),
    seedSourceSlug: seed.slug,
    isDummy: true,
    createdAt: summary.createdAt ?? now,
    updatedAt: now,
  };
}

function buildSlugIndex(seed: DummyEventSeed, summary: Record<string, unknown>, now: Date) {
  return {
    slug: seed.slug,
    eventId: summary.eventId,
    eventType: seed.eventType,
    status: seed.status,
    targetSlug: null,
    isDummy: true,
    createdAt: summary.createdAt ?? now,
    updatedAt: now,
  };
}

export function buildDummyEventWritePlan(
  seeds: DummyEventSeed[] = DUMMY_EVENT_SEEDS,
  now = new Date()
): PlannedWrite[] {
  return seeds.flatMap((seed) => {
    const eventId = buildEventId(seed);
    const summary = buildEventSummary(seed, now);
    return [
      {
        path: `${EVENTS_COLLECTION}/${eventId}`,
        data: summary,
        merge: true,
      },
      {
        path: `${EVENTS_COLLECTION}/${eventId}/${EVENT_CONTENT_COLLECTION}/${EVENT_CURRENT_CONTENT_DOC}`,
        data: buildEventContent(seed, summary, now),
        merge: true,
      },
      {
        path: `${EVENT_SLUG_INDEX_COLLECTION}/${seed.slug}`,
        data: buildSlugIndex(seed, summary, now),
        merge: true,
      },
    ];
  });
}

function getDocRef(db: Firestore, documentPath: string) {
  const segments = documentPath.split('/');
  if (segments.length % 2 !== 0) {
    throw new Error(`Invalid document path: ${documentPath}`);
  }

  let ref = db.collection(segments[0]).doc(segments[1]);
  for (let index = 2; index < segments.length; index += 2) {
    ref = ref.collection(segments[index]).doc(segments[index + 1]);
  }
  return ref;
}

async function executeWrites(db: Firestore, writes: PlannedWrite[]) {
  const batch = db.batch();
  for (const write of writes) {
    batch.set(getDocRef(db, write.path), write.data, { merge: write.merge });
  }
  await batch.commit();
}

async function validateWrites(db: Firestore, seeds: DummyEventSeed[]) {
  const results = await Promise.all(
    seeds.map(async (seed) => {
      const eventId = buildEventId(seed);
      const [summary, content, slugIndex] = await Promise.all([
        getDocRef(db, `${EVENTS_COLLECTION}/${eventId}`).get(),
        getDocRef(
          db,
          `${EVENTS_COLLECTION}/${eventId}/${EVENT_CONTENT_COLLECTION}/${EVENT_CURRENT_CONTENT_DOC}`
        ).get(),
        getDocRef(db, `${EVENT_SLUG_INDEX_COLLECTION}/${seed.slug}`).get(),
      ]);

      return {
        slug: seed.slug,
        eventType: seed.eventType,
        hasSummary: summary.exists,
        hasContent: content.exists,
        hasSlugIndex: slugIndex.exists,
      };
    })
  );

  return {
    seedCount: seeds.length,
    validCount: results.filter(
      (result) => result.hasSummary && result.hasContent && result.hasSlugIndex
    ).length,
    invalidEntries: results.filter(
      (result) => !result.hasSummary || !result.hasContent || !result.hasSlugIndex
    ),
  };
}

async function main() {
  loadLocalEnvironment();
  const { command, options } = parseArgs(process.argv);
  const timeoutMs = Number(options['timeout-ms'] ?? 45_000);
  const writes = buildDummyEventWritePlan();

  if (command === 'dry-run') {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          seedCount: DUMMY_EVENT_SEEDS.length,
          writeCount: writes.length,
          slugs: DUMMY_EVENT_SEEDS.map((seed) => seed.slug),
        },
        null,
        2
      )
    );
    return;
  }

  if (command !== 'execute' && command !== 'validate') {
    throw new Error(`Unknown command: ${command}`);
  }

  const db = initializeFirebaseAdmin();

  if (command === 'execute') {
    await withTimeout(executeWrites(db, writes), timeoutMs, 'Dummy event seed write');
    console.log(
      JSON.stringify(
        {
          mode: 'execute',
          seedCount: DUMMY_EVENT_SEEDS.length,
          writeCount: writes.length,
          slugs: DUMMY_EVENT_SEEDS.map((seed) => seed.slug),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    JSON.stringify(
      await withTimeout(
        validateWrites(db, DUMMY_EVENT_SEEDS),
        timeoutMs,
        'Dummy event seed validation'
      ),
      null,
      2
    )
  );
}

if (process.argv[1]?.endsWith('seed-dummy-events.mts')) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
