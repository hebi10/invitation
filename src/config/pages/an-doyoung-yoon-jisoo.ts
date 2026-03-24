import type { WeddingPageConfig } from '../weddingPages';

import { createWeddingPageConfig, createWeddingVariants } from './helpers';

const venue = '소노펠리체 델피노';

const couple = {
  groom: {
    name: '안도영',
    order: '장남',
    father: {
      relation: '부',
      name: '안재훈',
      phone: '010-1616-1717',
    },
    mother: {
      relation: '모',
      name: '강수진',
      phone: '010-1818-1919',
    },
    phone: '010-2020-2121',
  },
  bride: {
    name: '윤지수',
    order: '장녀',
    father: {
      relation: '부',
      name: '윤태영',
      phone: '010-2222-2323',
    },
    mother: {
      relation: '모',
      name: '김은희',
      phone: '010-2424-2525',
    },
    phone: '010-2626-2727',
  },
} as const;

const invitationDescription = `2025년 11월 30일 토요일 오후 11시, ${couple.groom.name}와 ${couple.bride.name}가 하나 되는 날에 소중한 분들을 초대합니다.`;
const metadataDescription = `${invitationDescription} 저희의 새로운 시작을 함께 축복해 주세요.`;

export const anDoyoungYoonJisooConfig: WeddingPageConfig = createWeddingPageConfig({
  slug: 'an-doyoung-yoon-jisoo',
  description: invitationDescription,
  date: '2025년 11월 30일',
  venue,
  couple,
  weddingDateTime: {
    year: 2025,
    month: 10,
    day: 30,
    hour: 11,
    minute: 0,
  },
  variants: createWeddingVariants({
    slug: 'an-doyoung-yoon-jisoo',
    couple,
  }),
  metadata: {
    title: '안도영 ♡ 윤지수 결혼합니다',
    description: metadataDescription,
    keywords: ['결혼식', '웨딩', '청첩장', couple.groom.name, couple.bride.name, '2025년 11월'],
    images: {
      wedding:
        'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fan-doyoung-yoon-jisoo%2Fmain.jpg?alt=media&token=4495e9e0-503f-4c3a-8cf4-4ba84b826822',
      favicon: '/images/favicon.ico',
    },
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오전 11:00',
    ceremonyAddress: '강원특별자치도 고성군 토성면 미시령옛길 1153 그랜드 볼룸 1층',
    ceremonyContact: '02-1234-5678',
    greetingMessage:
      '처음엔 우연이었고,\n지금은 이유가 되었어요.\n\n함께 있는 게\n가장 자연스러운 사람,\n\n그래서 평생을 함께하기로 했습니다.\n\n우리의 시작,\n따뜻한 마음으로 함께해 주세요.',
    mapDescription: '서울역 2번 출구 및 강릉고속버스터미널에서 셔틀버스가 운행됩니다.',
    kakaoMap: {
      latitude: 38.2100918,
      longitude: 128.4978166,
      level: 6,
    },
    venueGuide: [
      {
        title: '신부 대기실',
        content:
          '신부대기실은 예식 시작 10분 전\n오전 10시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.',
      },
      {
        title: '식사',
        content:
          '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(10:30 - 12:30)',
      },
    ],
    wreathGuide: [
      {
        title: '화환 안내',
        content:
          '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 로얄가든웨딩홀\n예식일시: 2025년 10월 20일 일요일 오후 1시\n수령인: 신랑 안도영 / 신부 윤지수\n연락처: 02-7777-8888',
      },
      {
        title: '배송 시간',
        content:
          '화환은 예식 전날 오후 또는\n당일 오전 11시까지 도착할 수 있도록\n주문해 주시기 바랍니다.\n\n예식장 측 사정으로 인해\n예식 시작 2시간 전까지는\n반드시 배치가 완료되어야 하오니\n참고 부탁드립니다.',
      },
    ],
    giftInfo: {
      groomAccounts: [
        {
          bank: '국민',
          accountNumber: '016702-04-506376',
          accountHolder: couple.groom.name,
        },
        {
          bank: '농협',
          accountNumber: '325015-52-107296',
          accountHolder: '안근일',
        },
      ],
      brideAccounts: [
        {
          bank: '농협',
          accountNumber: '302-2058-7429-31',
          accountHolder: couple.bride.name,
        },
        {
          bank: '농협',
          accountNumber: '225038-52-000811',
          accountHolder: '윤석종',
        },
      ],
      message: '마음만으로도 충분합니다.\n축하의 뜻으로 전해주시는 축의금은\n소중히 받겠습니다.',
    },
  },
});
