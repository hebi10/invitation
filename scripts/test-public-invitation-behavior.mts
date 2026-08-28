import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getEventSamplePageBySlug } from '../src/config/eventSamplePages.ts';
import {
  createInvitationPageFromSeed,
  getRequiredWeddingPageBySlug,
} from '../src/config/weddingPages.ts';
import type { EventPageReadyState } from '../src/app/_components/eventPageState.tsx';
import { buildFirstBirthdayInvitationViewModel } from '../src/app/_components/firstBirthday/firstBirthdayAdapter.ts';
import { buildGeneralEventViewModel } from '../src/app/_components/generalEvent/generalEventAdapter.ts';
import {
  buildPublicInvitationDateFeature,
} from '../src/app/_components/public-invitations/shared/dateFeatureModel.ts';
import {
  buildFirstBirthdayGiftAccounts,
} from '../src/app/_components/public-invitations/shared/giftAccountsModel.ts';
import {
  resolveFirstBirthdayHeroTitle,
  resolveGardenFamilyMember,
} from '../src/app/_components/public-invitations/shared/identityModel.ts';
import {
  buildWeddingStoredContent,
} from '../src/app/_components/public-invitations/shared/weddingStoredContentModel.ts';
import {
  resolveGalleryOpacityTransition,
} from '../src/components/sections/Gallery/galleryMotion.ts';
import type { InvitationPage } from '../src/types/invitationPage.ts';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

function createReadyState(pageConfig: InvitationPage): EventPageReadyState {
  const weddingDate = new Date(
    pageConfig.weddingDateTime.year,
    pageConfig.weddingDateTime.month,
    pageConfig.weddingDateTime.day,
    pageConfig.weddingDateTime.hour,
    pageConfig.weddingDateTime.minute
  );
  const giftInfo = pageConfig.pageData?.giftInfo;

  return {
    status: 'ready',
    blockMessage: null,
    pageConfig,
    weddingDate,
    giftInfo,
    hasGiftAccounts: Boolean(
      giftInfo?.groomAccounts?.length || giftInfo?.brideAccounts?.length
    ),
    isLoading: false,
    setIsLoading: () => undefined,
    isRefreshingPage: false,
    refreshPage: async () => undefined,
    imagesLoading: false,
    heroImageUrl: '',
    mainImageUrl: '',
    galleryImageUrls: [],
    galleryPreviewImageUrls: [],
    preloadImages: [],
    adminNotice: null,
  };
}

const eventDate = new Date(2026, 9, 18, 11, 0);
const now = new Date(2026, 9, 10, 11, 0);

const premiumDateFeature = buildPublicInvitationDateFeature(
  { productTier: 'premium' },
  eventDate,
  { now, mode: 'calendar-countdown' }
);
assert.ok(premiumDateFeature, 'premium must expose its date feature');
assert.equal(premiumDateFeature.remainingDays, 8);
assert.equal(premiumDateFeature.countdownLabel, 'D-8');
assert.equal(premiumDateFeature.monthLabel, '2026년 10월');
assert.equal(premiumDateFeature.calendarWeeks.flat().includes(18), true);

assert.equal(
  buildPublicInvitationDateFeature(
    { productTier: 'standard' },
    eventDate,
    { now, mode: 'countdown' }
  ),
  null,
  'standard must not expose a premium countdown section'
);
assert.equal(
  buildPublicInvitationDateFeature(
    { productTier: 'premium', features: { showCountdown: false } },
    eventDate,
    { now, mode: 'calendar-countdown' }
  ),
  null,
  'an explicit false override must hide the whole date feature'
);

const weddingSeed = getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu');
const weddingPage = createInvitationPageFromSeed(weddingSeed);
const legacyWeddingPage: InvitationPage = {
  ...weddingPage,
  venue: '레거시 홀',
  pageData: {
    ...weddingPage.pageData,
    greetingMessage: '저장된 초대 인사',
    greetingAuthor: '두 사람 드림',
    ceremonyAddress: '서울시 레거시로 1',
    ceremonyContact: '02-1234-5678',
    reception: { time: '오후 5시', location: '2층 연회장' },
    venueGuide: [{ title: '주차', content: '두 시간 무료' }],
    wreathGuide: [{ title: '화환', content: '정중히 사양합니다' }],
    mapUrl: '',
    mapDescription: '지하철 1번 출구',
    kakaoMap: {
      latitude: 37.5,
      longitude: 127,
      markerTitle: '레거시 홀',
    },
  },
};
const legacyWeddingContent = buildWeddingStoredContent(
  legacyWeddingPage,
  legacyWeddingPage.pageData
);
assert.equal(legacyWeddingContent.greetingMessage, '저장된 초대 인사');
assert.equal(legacyWeddingContent.greetingAuthor, '두 사람 드림');
assert.deepEqual(legacyWeddingContent.reception, {
  time: '오후 5시',
  location: '2층 연회장',
});
assert.deepEqual(legacyWeddingContent.venueGuide, [
  { title: '주차', content: '두 시간 무료' },
]);
assert.deepEqual(legacyWeddingContent.wreathGuide, [
  { title: '화환', content: '정중히 사양합니다' },
]);
assert.equal(legacyWeddingContent.ceremonyContact, '02-1234-5678');
assert.equal(legacyWeddingContent.mapDescription, '지하철 1번 출구');
assert.equal(
  legacyWeddingContent.mapHref,
  'https://map.kakao.com/link/map/레거시 홀,37.5,127'
);

const addressOnlyWeddingContent = buildWeddingStoredContent(
  {
    ...legacyWeddingPage,
    pageData: {
      ceremonyAddress: '부산시 바다로 2',
      mapUrl: '',
    },
  },
  {
    ceremonyAddress: '부산시 바다로 2',
    mapUrl: '',
  }
);
assert.equal(
  addressOnlyWeddingContent.mapHref,
  'https://map.kakao.com/link/search/%EB%B6%80%EC%82%B0%EC%8B%9C%20%EB%B0%94%EB%8B%A4%EB%A1%9C%202'
);

const firstBirthdaySample = getEventSamplePageBySlug('first-birthday-ian-spring');
assert.ok(firstBirthdaySample);
const firstBirthdayPage: InvitationPage = {
  ...firstBirthdaySample,
  pageData: {
    ...firstBirthdaySample.pageData,
    giftInfo: {
      message: '아이의 첫 생일을 축하해 주세요.',
      groomAccounts: [
        {
          bank: '아빠은행',
          accountNumber: '111-222',
          accountHolder: '아빠',
        },
      ],
      brideAccounts: [
        {
          bank: '엄마은행',
          accountNumber: '333-444',
          accountHolder: '엄마',
        },
      ],
    },
  },
};
const firstBirthdayModel = buildFirstBirthdayInvitationViewModel(
  createReadyState(firstBirthdayPage)
);
const firstBirthdayGift = buildFirstBirthdayGiftAccounts(firstBirthdayModel);
assert.ok(firstBirthdayGift);
assert.equal(firstBirthdayGift.message, '아이의 첫 생일을 축하해 주세요.');
assert.equal(firstBirthdayGift.dadAccounts[0]?.accountNumber, '111-222');
assert.equal(firstBirthdayGift.momAccounts[0]?.accountNumber, '333-444');
assert.equal(
  buildFirstBirthdayGiftAccounts({
    giftMessage: '계좌가 없으면 이 문구도 숨긴다',
    dadAccounts: [],
    momAccounts: [],
  }),
  null,
  'the whole gift section must stay hidden without a real account'
);

const firstBirthdayWithoutGiftMessage: InvitationPage = {
  ...firstBirthdayPage,
  pageData: {
    ...firstBirthdayPage.pageData,
    giftInfo: {
      ...firstBirthdayPage.pageData?.giftInfo,
      message: '',
    },
  },
};
assert.equal(
  buildFirstBirthdayInvitationViewModel(
    createReadyState(firstBirthdayWithoutGiftMessage)
  ).giftMessage,
  '',
  'the adapter must not synthesize a gift message that was never stored'
);

const generalEventSample = getEventSamplePageBySlug('general-event-summer-networking');
assert.ok(generalEventSample);
const generalEventPage: InvitationPage = {
  ...generalEventSample,
  pageData: {
    ...generalEventSample.pageData,
    ceremonyAddress: '',
    mapDescription: '건물 뒤편 주차장을 이용해 주세요.',
    mapUrl: '',
  },
};
const generalEventModel = buildGeneralEventViewModel(
  createReadyState(generalEventPage)
);
assert.equal(
  generalEventModel.address,
  '',
  'mapDescription must not be presented as a ceremony address'
);
assert.equal(
  generalEventModel.mapDescription,
  '건물 뒤편 주차장을 이용해 주세요.'
);

assert.equal(resolveFirstBirthdayHeroTitle(''), '첫 번째 생일');
assert.equal(resolveFirstBirthdayHeroTitle(' 이안 '), '이안');
assert.deepEqual(
  resolveGardenFamilyMember(
    { relation: '', name: '', phone: '010-1111-2222' },
    0
  ),
  {
    side: '신랑측',
    relation: '아버지',
    name: '아버지',
    displayName: '아버지',
    phone: '010-1111-2222',
  }
);

assert.equal(resolveGalleryOpacityTransition(true, 220), 'none');
assert.equal(
  resolveGalleryOpacityTransition(false, 220),
  'opacity 0.22s ease'
);

const activeDateFeaturePages = [
  'src/app/_components/public-invitations/wedding/portrait-letter/Page.tsx',
  'src/app/_components/public-invitations/wedding/garden-note/Page.tsx',
  'src/app/_components/public-invitations/wedding/quiet-ceremony/Page.tsx',
  'src/app/_components/public-invitations/wedding/letterpress/Page.tsx',
  'src/app/_components/public-invitations/first-birthday/first-chapter/Page.tsx',
  'src/app/_components/public-invitations/first-birthday/dawn-chapter/Page.tsx',
  'src/app/_components/public-invitations/birthday/party-notes/Page.tsx',
  'src/app/_components/public-invitations/birthday/birthday-story/Page.tsx',
  'src/app/_components/public-invitations/opening/studio-opening/Page.tsx',
  'src/app/_components/public-invitations/opening/opening-poster/Page.tsx',
  'src/app/_components/public-invitations/general-event/program-edition/Page.tsx',
  'src/app/_components/public-invitations/general-event/night-schedule/Page.tsx',
] as const;

for (const pagePath of activeDateFeaturePages) {
  assert.match(
    read(pagePath),
    /<PublicInvitationDateFeature/,
    `${pagePath} must consume the shared premium date feature`
  );
}

for (const pagePath of activeDateFeaturePages.slice(0, 4)) {
  const pageSource = read(pagePath);
  assert.match(pageSource, /buildWeddingStoredContent/);
  assert.match(pageSource, /<WeddingStoredContent/);
}

for (const pagePath of activeDateFeaturePages.slice(4, 6)) {
  assert.match(read(pagePath), /<FirstBirthdayGiftAccounts/);
}

const gallerySource = read(
  'src/components/sections/Gallery/GalleryGridShared.tsx'
);
assert.match(gallerySource, /resolveGalleryOpacityTransition/);
assert.doesNotMatch(gallerySource, /transition:\s*['"]opacity 0\.(?:18|22)s ease['"]/);

for (const cssPath of [
  'src/app/_components/public-invitations/first-birthday/dawn-chapter/styles.module.css',
  'src/app/_components/public-invitations/birthday/party-notes/styles.module.css',
  'src/app/_components/public-invitations/birthday/birthday-story/styles.module.css',
]) {
  assert.doesNotMatch(
    read(cssPath),
    /\.page \.imageItem,[\s\S]*?\.page \.popupImage\s*\{\s*transition:\s*none !important;/,
    `${cssPath} must defer reduced-motion opacity transitions to GalleryGridShared`
  );
}

console.log('public invitation active-renderer behavior checks passed');
