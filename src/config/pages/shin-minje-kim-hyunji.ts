import type { WeddingPageConfig } from '../weddingPages';

import {
  ALL_WEDDING_VARIANT_KEYS,
  createWeddingPageConfig,
  createWeddingVariants,
} from './helpers';

const venue = '더케이웨딩홀';

const couple = {
  groom: {
    name: '김신랑',
    order: '장남',
    father: {
      relation: '부',
      name: '신동철',
      phone: '010-1111-2222',
    },
    mother: {
      relation: '모',
      name: '이미숙',
      phone: '010-2222-3333',
    },
    phone: '010-3333-4444',
  },
  bride: {
    name: '나신부',
    order: '장녀',
    father: {
      relation: '부',
      name: '김승현',
      phone: '010-4444-5555',
    },
    mother: {
      relation: '모',
      name: '박지은',
      phone: '010-5555-6666',
    },
    phone: '010-6666-7777',
  },
} as const;

const invitationDescription = `2026년 4월 14일 오후 3시, ${couple.groom.name}와 ${couple.bride.name}가 하나 되는 날에 소중한 분들을 초대합니다.`;
const metadataDescription = `${invitationDescription} 저희의 새로운 시작을 함께 축복해 주세요.`;

export const shinMinjeKimHyunjiConfig: WeddingPageConfig = createWeddingPageConfig({
  slug: 'kim-shinlang-na-sinbu',
  description: invitationDescription,
  date: '2026년 4월 14일',
  venue,
  couple,
  weddingDateTime: {
    year: 2026,
    month: 3,
    day: 14,
    hour: 15,
    minute: 0,
  },
  variants: createWeddingVariants({
    slug: 'kim-shinlang-na-sinbu',
    couple,
    enabledVariants: ALL_WEDDING_VARIANT_KEYS,
  }),
  metadata: {
    description: metadataDescription,
    keywords: ['결혼식', '웨딩', '청첩장', couple.groom.name, couple.bride.name, '2026년 4월'],
    images: {
      wedding:
        'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fkim-shinlang-na-sinbu%2Fthum.jpg?alt=media&token=c5eef8b5-a83b-4a4c-b5bb-2491feaba51c',
      favicon: '/images/favicon.ico',
    },
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오후 3:00',
    ceremonyAddress: '서울특별시 강남구 테헤란로 123',
    ceremonyContact: '02-1234-5678',
    greetingMessage:
      '두 사람이 사랑으로 하나가 되는 순간을\n함께해 주시는 모든 분들께 감사드립니다.\n\n새로운 시작을 따뜻한 마음으로\n축복해 주시면 더없는 기쁨이겠습니다.',
    mapDescription: `지하철 이용 시 ${venue}까지 편리하게 오실 수 있습니다`,
    kakaoMap: {
      latitude: 37.5048,
      longitude: 127.028,
      level: 3,
    },
    venueGuide: [
      {
        title: '신부 대기실',
        content:
          '신부대기실은 예식 시작 10분 전\n오후 2시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.',
      },
      {
        title: '식사',
        content:
          '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(14:30 - 16:30)',
      },
    ],
    wreathGuide: [
      {
        title: '화환 안내',
        content:
          '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 더케이웨딩홀\n예식일시: 2026년 4월 14일 오후 3시\n수령인: 신랑 김신랑 / 신부 나신부\n예식장 문의: 02-1234-5678',
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
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '신랑 김신랑',
        },
        {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '부 신ㅇㅇ',
        },
        {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '모 이ㅇㅇ',
        },
      ],
      brideAccounts: [
        {
          bank: '우리은행',
          accountNumber: '1002-234-567890',
          accountHolder: '신부 나신부',
        },
        {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '부 김ㅇㅇ',
        },
        {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '모 이ㅇㅇ',
        },
      ],
      message: '마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다.',
    },
  },
});
