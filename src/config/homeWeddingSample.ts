import { createWeddingPageConfig } from './pages/helpers';
import type { InvitationPage } from '@/types/invitationPage';
import type { Comment } from '@/services/commentService';

export const SAMPLE_INVITATION_PATH = '/sample-invitation/';
export const SAMPLE_WEDDING_COVER = '/images/home-wedding/portrait.webp';
export const SAMPLE_WEDDING_IMAGES = [
  '/images/home-wedding/steps.webp',
  '/images/home-wedding/walk.webp',
  '/images/home-wedding/bouquet.webp',
  '/images/home-wedding/archway.webp',
  '/images/home-wedding/closeup.webp',
];

const seed = createWeddingPageConfig({
  slug: 'homepage-sample',
  eventType: 'wedding',
  description: '서준과 하은의 새로운 시작에 소중한 분들을 초대합니다.',
  date: '2027년 4월 17일 토요일',
  venue: '메종 가든 · 샘플 예식장',
  couple: {
    groom: { name: '이서준', order: '아들', father: { relation: '아버지', name: '이정호' }, mother: { relation: '어머니', name: '김미영' } },
    bride: { name: '김하은', order: '딸', father: { relation: '아버지', name: '김성진' }, mother: { relation: '어머니', name: '박지연' } },
  },
  weddingDateTime: { year: 2027, month: 3, day: 17, hour: 14, minute: 0 },
  productTier: 'premium',
  features: { maxGalleryImages: 18, showCountdown: true, showGuestbook: true, showMusic: false, shareMode: 'none' },
  variants: { simple: { available: true, path: SAMPLE_INVITATION_PATH, displayName: '기본형 샘플' } },
  metadata: { title: '이서준 · 김하은 — 기본형 샘플', images: { wedding: SAMPLE_WEDDING_COVER, favicon: '/favicon.ico' } },
  pageData: {
    ceremonyTime: '오후 2:00',
    greetingMessage: '함께 걷는 길 위에서\n서로의 가장 편안한 하루가 되었습니다.\n\n작은 기쁨은 나누고\n어려운 날에는 손을 더 꼭 잡으며\n이제 평생을 함께하려 합니다.\n\n저희의 첫걸음에 함께하시어\n따뜻한 축복을 보내주시면 감사하겠습니다.',
    galleryImages: SAMPLE_WEDDING_IMAGES,
    mapDescription: '실제 청첩장에는 예식장 주소와 지도가 표시됩니다. 이 페이지의 인물과 예식 정보는 디자인 확인을 위한 예시입니다.',
    venueGuide: [{ title: '식사 안내', content: '예식 30분 전부터 식사를 즐기실 수 있습니다.\n소중한 분들을 위해 정성껏 준비하겠습니다.' }, { title: '주차 안내', content: '실제 청첩장에는 주차 위치와 이용 시간을 안내할 수 있습니다.' }],
  },
});

export const sampleWeddingPage: InvitationPage = {
  ...seed, published: true, displayPeriodEnabled: false, displayPeriodStart: null, displayPeriodEnd: null,
};

export const sampleWeddingComments: Comment[] = [
  { id: 'sample-1', author: '수민', message: '함께 있을 때 가장 행복해 보이는 두 사람! 결혼 정말 축하해. 앞으로도 지금처럼 다정하게 살아가길 바라 🤍', createdAt: new Date('2026-09-09T09:00:00+09:00'), pageSlug: seed.slug },
  { id: 'sample-2', author: '지훈', message: '서준아, 하은아 결혼 축하해! 예쁜 봄날에 만나자. 두 사람의 새로운 시작을 응원할게.', createdAt: new Date('2026-09-08T18:00:00+09:00'), pageSlug: seed.slug },
  { id: 'sample-3', author: '예린', message: '사진만 봐도 미소가 지어져요. 서로에게 든든한 편이 되어 오래오래 행복하세요.', createdAt: new Date('2026-09-07T12:00:00+09:00'), pageSlug: seed.slug },
];
