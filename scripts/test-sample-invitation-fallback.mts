import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { DEFAULT_SAMPLE_WEDDING_IMAGE_URL } from '../src/config/sampleInvitationDefaults';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages';
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
