import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { DEFAULT_SAMPLE_WEDDING_IMAGE_URL } from '../src/config/sampleInvitationDefaults';
import {
  getRequiredWeddingPageBySlug,
  WEDDING_PAGE_SAMPLES,
} from '../src/config/weddingPages';
import {
  isUsableSampleWeddingImage,
  mergeInvitationSampleFallback,
} from '../src/lib/invitationSampleFallback';
import {
  buildInvitationPageConfigRecordFromEventContent,
  type EventSummaryRecord,
} from '../src/server/repositories/eventReadThroughDtos';

const sample = getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu');
const stored = structuredClone(sample);

assert.equal(sample.metadata.images.wedding, DEFAULT_SAMPLE_WEDDING_IMAGE_URL);
assert.equal(
  existsSync(
    path.join(process.cwd(), 'public', DEFAULT_SAMPLE_WEDDING_IMAGE_URL.replace(/^\//, ''))
  ),
  true
);

stored.date = '';
stored.venue = '   ';
stored.weddingDateTime = {
  year: 0,
  month: 0,
  day: 0,
  hour: 0,
  minute: 0,
};
stored.pageData = {
  ...stored.pageData,
  ceremonyTime: '',
  ceremonyAddress: '',
  greetingMessage: '',
  galleryImages: [],
  kakaoMap: {
    latitude: 0,
    longitude: 0,
    level: 3,
    markerTitle: '',
  },
  giftInfo: {
    groomAccounts: [],
    brideAccounts: [],
    message: '',
  },
};
stored.metadata.images.wedding =
  'https://firebasestorage.googleapis.com/v0/b/example/o/wedding-images%2Fother-slug%2Fthum.jpg?alt=media';
stored.features = {
  ...stored.features,
  showMusic: false,
  showGuestbook: false,
};

const merged = mergeInvitationSampleFallback(stored, sample);

assert.equal(merged.date, '2026년 4월 14일');
assert.equal(merged.venue, '더케이웨딩홀');
assert.deepEqual(merged.weddingDateTime, {
  year: 2026,
  month: 3,
  day: 14,
  hour: 15,
  minute: 0,
});
assert.equal(merged.pageData?.ceremonyAddress, '서울특별시 강남구 테헤란로 123');
assert.equal(
  merged.pageData?.greetingMessage,
  '두 사람이 사랑으로 하나가 되는 순간을\n함께해 주시는 모든 분들께 감사드립니다.\n\n새로운 시작을 따뜻한 마음으로\n축복해 주시면 더없는 기쁨이겠습니다.'
);
assert.equal(merged.pageData?.giftInfo?.groomAccounts?.length, 3);
assert.equal(merged.pageData?.giftInfo?.brideAccounts?.length, 3);
assert.equal(merged.features?.showMusic, false);
assert.equal(merged.features?.showGuestbook, false);
assert.equal(
  isUsableSampleWeddingImage(sample.slug, stored.metadata.images.wedding),
  false
);

const personalized = mergeInvitationSampleFallback(
  {
    ...stored,
    date: '2027년 5월 9일',
    venue: '사용자 웨딩홀',
    weddingDateTime: {
      year: 2027,
      month: 4,
      day: 9,
      hour: 13,
      minute: 30,
    },
    pageData: {
      ...sample.pageData,
      ceremonyAddress: '사용자 입력 주소',
      greetingMessage: '사용자 입력 인사말',
      galleryImages: ['/images/user-photo.jpg'],
    },
    metadata: {
      ...sample.metadata,
      images: {
        ...sample.metadata.images,
        wedding: '/images/user-cover.jpg',
      },
    },
  },
  sample
);

assert.equal(personalized.date, '2027년 5월 9일');
assert.equal(personalized.venue, '사용자 웨딩홀');
assert.deepEqual(personalized.weddingDateTime, {
  year: 2027,
  month: 4,
  day: 9,
  hour: 13,
  minute: 30,
});
assert.equal(personalized.pageData?.ceremonyAddress, '사용자 입력 주소');
assert.equal(personalized.pageData?.greetingMessage, '사용자 입력 인사말');
assert.deepEqual(personalized.pageData?.galleryImages, ['/images/user-photo.jpg']);
assert.equal(personalized.metadata.images.wedding, '/images/user-cover.jpg');

for (const weddingSample of WEDDING_PAGE_SAMPLES) {
  const updatedEvent = mergeInvitationSampleFallback(
    {
      ...weddingSample,
      date: '2027년 5월 9일',
      venue: '사용자 웨딩홀',
      weddingDateTime: { year: 2027, month: 4, day: 9, hour: 13, minute: 30 },
      pageData: { ...weddingSample.pageData, wreathGuide: [] },
    },
    weddingSample
  );

  for (const guide of updatedEvent.pageData?.wreathGuide ?? []) {
    assert.doesNotMatch(
      guide.content,
      /예식장:|예식일시:|\d{4}년\s*\d+월\s*\d+일|(?:오전|오후)\s*\d+|\d{2,3}-\d{3,4}-\d{4}/,
      `${weddingSample.slug}: fallback wreath guidance must not reintroduce a different event's details`
    );
  }

  for (const description of [weddingSample.description, weddingSample.metadata.description]) {
    const schedule = description.match(
      /(\d{4})년 (\d+)월 (\d+)일 (?:([일월화수목금토])요일 )?(오전|오후) (\d+)시/
    );
    assert.ok(schedule, `${weddingSample.slug}: sample description includes its ceremony schedule`);
    const [, year, month, day, weekday, period, hour] = schedule;
    assert.deepEqual(
      {
        year: Number(year),
        month: Number(month) - 1,
        day: Number(day),
        hour: Number(hour) % 12 + (period === '오후' ? 12 : 0),
      },
      {
        year: weddingSample.weddingDateTime.year,
        month: weddingSample.weddingDateTime.month,
        day: weddingSample.weddingDateTime.day,
        hour: weddingSample.weddingDateTime.hour,
      },
      `${weddingSample.slug}: description and ceremony schedule must agree`
    );
    if (weekday) {
      assert.equal(
        weekday,
        '일월화수목금토'[new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()],
        `${weddingSample.slug}: description weekday must match its calendar date`
      );
    }
  }
}

const customWreathGuide = [
  {
    title: '직접 작성한 화환 안내',
    content: '예식장: 사용자 웨딩홀\n예식일시: 2027년 5월 9일 일요일 오후 1시 30분\n배송: 오전 11시',
  },
];
assert.deepEqual(
  mergeInvitationSampleFallback(
    { ...stored, pageData: { ...stored.pageData, wreathGuide: customWreathGuide } },
    sample
  ).pageData?.wreathGuide,
  customWreathGuide,
  'saved custom wreath guidance must remain unchanged'
);

const eventSummary = {
  eventId: 'sample-event',
  slug: sample.slug,
  eventType: 'wedding',
  status: 'published',
  ownerUid: null,
  ownerEmail: null,
  ownerDisplayName: null,
  title: null,
  displayName: null,
  summary: null,
  supportedVariants: ['romantic'],
  published: true,
  defaultTheme: 'romantic',
  featureFlags: {},
  commentCount: 0,
  ticketCount: 0,
  ticketBalance: 0,
  security: null,
  visibility: null,
  displayPeriod: null,
  hasCustomContent: true,
  createdAt: null,
  updatedAt: null,
  lastSavedAt: null,
  version: 1,
  migratedFromPageSlug: null,
} satisfies EventSummaryRecord;

const readRecord = buildInvitationPageConfigRecordFromEventContent(eventSummary, {
  content: stored,
  defaultTheme: 'romantic',
});

assert.ok(readRecord);
assert.equal(readRecord.config.date, sample.date);
assert.equal(readRecord.config.venue, sample.venue);
assert.deepEqual(readRecord.config.weddingDateTime, sample.weddingDateTime);
assert.equal(
  readRecord.config.pageData?.ceremonyAddress,
  sample.pageData?.ceremonyAddress
);
assert.equal(
  readRecord.config.metadata.images.wedding,
  sample.metadata.images.wedding
);

console.log('sample invitation fallback checks passed');
