import type { WeddingPageConfig } from '../weddingPages';

import {
  ALL_WEDDING_VARIANT_KEYS,
  createWeddingPageConfig,
  createWeddingVariants,
} from './helpers';

const venue = '엘리시안웨딩홀';

const couple = {
  groom: {
    name: '김태현',
    order: '차남',
    father: {
      relation: '부',
      name: '김상욱',
      phone: '010-7777-8888',
    },
    mother: {
      relation: '모',
      name: '최정희',
      phone: '010-8888-9999',
    },
    phone: '010-9999-0000',
  },
  bride: {
    name: '최유나',
    order: '차녀',
    father: {
      relation: '부',
      name: '최민호',
      phone: '010-1010-1111',
    },
    mother: {
      relation: '모',
      name: '윤서연',
      phone: '010-1212-1313',
    },
    phone: '010-1414-1515',
  },
} as const;

const invitationDescription = `2024년 11월 16일 토요일 오후 1시, ${couple.groom.name}와 ${couple.bride.name}가 하나 되는 날에 소중한 분들을 초대합니다.`;
const metadataDescription = `${invitationDescription} 저희의 새로운 시작을 함께 축복해 주세요.`;

export const kimTaehyunChoiYunaConfig: WeddingPageConfig = createWeddingPageConfig({
  slug: 'kim-taehyun-choi-yuna',
  description: invitationDescription,
  date: '2024년 11월 16일',
  venue,
  couple,
  weddingDateTime: {
    year: 2024,
    month: 10,
    day: 16,
    hour: 13,
    minute: 0,
  },
  variants: createWeddingVariants({
    slug: 'kim-taehyun-choi-yuna',
    couple,
    enabledVariants: ALL_WEDDING_VARIANT_KEYS,
  }),
  metadata: {
    description: metadataDescription,
    keywords: ['결혼식', '웨딩', '청첩장', couple.groom.name, couple.bride.name, '2024년 11월'],
    images: {
      wedding:
        'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fkim-taehyun-choi-yuna%2Fthum.jpg?alt=media&token=7a8b9c0d-1e2f-3g4h-5i6j-0987654321ba',
      favicon: '/images/favicon.ico',
    },
  },
  pageData: {
    subtitle: '진실한 사랑으로 맺어지는 인연',
    ceremonyTime: '오후 1:00',
    ceremonyAddress: '서울특별시 마포구 월드컵로 789',
    ceremonyContact: '02-9012-3456',
    greetingMessage:
      '오랜 시간 서로를 이해하고 사랑해온\n 두 사람이 이제 한 가정을 이루고자 합니다.\n\n저희의 새로운 출발을 지켜봐 주시고\n축복해 주시기 바랍니다.',
    mapDescription: '월드컵공원 인근으로 주차공간이 넉넉하게 준비되어 있습니다',
    kakaoMap: {
      latitude: 37.5657,
      longitude: 126.9025,
      level: 3,
    },
    venueGuide: [
      {
        title: '신부 대기실',
        content:
          '신부대기실은 예식 시작 10분 전\n오후 12시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.',
      },
      {
        title: '식사',
        content:
          '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(12:30 - 14:30)',
      },
    ],
    wreathGuide: [
      {
        title: '화환 안내',
        content:
          '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 플라워가든웨딩홀\n예식일시: 2025년 9월 5일 토요일 오전 11시\n수령인: 신랑 김태현 / 신부 최유나\n연락처: 031-5555-6666',
      },
      {
        title: '배송 시간',
        content:
          '화환은 예식 전날 오후 또는\n당일 오전 9시까지 도착할 수 있도록\n주문해 주시기 바랍니다.\n\n예식장 측 사정으로 인해\n예식 시작 2시간 전까지는\n반드시 배치가 완료되어야 하오니\n참고 부탁드립니다.',
      },
    ],
    giftInfo: {
      groomAccounts: [
        {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: couple.groom.name,
        },
      ],
      brideAccounts: [
        {
          bank: '우리은행',
          accountNumber: '1002-234-567890',
          accountHolder: couple.bride.name,
        },
      ],
      message: '마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다.',
    },
  },
});
