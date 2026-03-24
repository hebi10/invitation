import type { WeddingPageConfig } from '../weddingPages';

import {
  createWeddingDisplayName,
  createWeddingPageConfig,
  createWeddingVariants,
} from './helpers';

const venue = 'CN웨딩홀 계산점 2층 베르테홀';

const couple = {
  groom: {
    name: '이종훈',
    order: '아들',
    phone: '010-8974-9750',
    father: {
      relation: '부',
      name: '이호규',
      phone: '010-8885-9750',
    },
    mother: {
      relation: '모',
      name: '김원연',
      phone: '010-3338-6201',
    },
  },
  bride: {
    name: '최 인',
    order: '딸',
    phone: '010-5292-4580',
    father: {
      relation: '부',
      name: '최우진',
      phone: '010-9981-4582',
    },
    mother: {
      relation: '모',
      name: '이옥희',
      phone: '010-2844-4580',
    },
  },
} as const;

const displayName = createWeddingDisplayName(couple, { brideFirst: true });
const invitationDescription = `2026년 3월 22일 일요일 오전 11시, ${couple.groom.name}과 ${couple.bride.name}이 하나 되는 날에 소중한 분들을 초대합니다.`;
const metadataDescription = `${invitationDescription} 저희의 새로운 시작을 함께 축복해 주세요.`;

export const leeJonghunChoiInConfig: WeddingPageConfig = createWeddingPageConfig({
  slug: 'lee-jonghun-choi-in',
  displayName,
  description: invitationDescription,
  date: '2026년 3월 22일 (일)',
  venue,
  couple,
  weddingDateTime: {
    year: 2026,
    month: 2,
    day: 22,
    hour: 11,
    minute: 0,
  },
  variants: createWeddingVariants({
    slug: 'lee-jonghun-choi-in',
    couple,
    displayName,
    enabledVariants: ['simple'],
    displayNameOverrides: {
      simple: displayName,
    },
  }),
  metadata: {
    description: metadataDescription,
    keywords: ['결혼식', '웨딩', '청첩장', couple.groom.name, couple.bride.name, '2026년 3월'],
    images: {
      wedding:
        'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Flee-jonghun-choi-in%2Fkakao_thum.jpg?alt=media&token=f233363f-5328-409d-bacb-e88a7810323f',
      favicon: '/images/favicon.ico',
    },
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오전 11:00',
    ceremonyAddress: '인천광역시 계양구 경명대로 1108, CN웨딩홀 계산점 2층 베르테홀',
    ceremonyContact: '032-546-0070',
    greetingMessage:
      '각자의 일상을 성실히 보내던 두 사람이\n서로의 일상이 되어주기로 약속합니다.\n\n저희의 새로운 시작을 지켜봐주세요.',
    mapDescription: '지하철 이용 시 CN웨딩홀 계산점까지 편리하게 오실 수 있습니다.',
    kakaoMap: {
      latitude: 37.5427244,
      longitude: 126.7300073,
      level: 3,
      markerTitle: 'CN웨딩홀 계산점',
    },
    venueGuide: [
      {
        title: '식사',
        content:
          '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(10:30 - 12:30)',
      },
    ],
    giftInfo: {
      groomAccounts: [
        {
          bank: '카카오뱅크',
          accountNumber: '3333-11-7757369',
          accountHolder: '(신랑) 이종훈',
        },
        {
          bank: '국민은행',
          accountNumber: '202-01-0925-182',
          accountHolder: '(부) 이호규',
        },
        {
          bank: '국민은행',
          accountNumber: '202-21-1777-244',
          accountHolder: '(모) 김원연',
        },
      ],
      brideAccounts: [
        {
          bank: '신한은행',
          accountNumber: '110-384-669470',
          accountHolder: '(신부) 최 인',
        },
        {
          bank: '농협은행',
          accountNumber: '566-12-205058',
          accountHolder: '(부) 최우진',
        },
        {
          bank: '우리은행',
          accountNumber: '537-112708-02-101',
          accountHolder: '(모) 이옥희',
        },
      ],
      message: '참석이 어려우신 분들을 위해 조심스레 계좌를 남깁니다. 따뜻한 축하만으로도 감사합니다.',
    },
  },
});
