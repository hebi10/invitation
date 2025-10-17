import { WeddingPageConfig } from '../weddingPages';

export const shinMinjeKimHyunjiConfig: WeddingPageConfig = {
  slug: 'shin-minje-kim-hyunji',
  displayName: '신민제 ♥ 김현지',
  description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
  date: '2026년 4월 14일',
  venue: '더케이웨딩홀',
  groomName: '신민제',
  brideName: '김현지',
  weddingDateTime: {
    year: 2026,
    month: 3, // 0-based (0 = January)
    day: 14,
    hour: 15,
    minute: 0
  },
  variants: {
    emotional: {
      available: true,
      path: '/shin-minje-kim-hyunji',
      displayName: '신민제 ♥ 김현지 (감성 버전)'
    },
    simple: {
      available: true,
      path: '/shin-minje-kim-hyunji-simple',
      displayName: '신민제 ♥ 김현지 (심플 버전)'
    },
    minimal: {
      available: true,
      path: '/shin-minje-kim-hyunji-minimal',
      displayName: '신민제 ♥ 김현지 (미니멀 버전)'
    },
    space: {
      available: true,
      path: '/shin-minje-kim-hyunji-space',
      displayName: '신민제 ♥ 김현지 (우주 버전)'
    }
  },
  metadata: {
    title: '신민제 ♥ 김현지 결혼식에 초대합니다',
    description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '신민제', '김현지', '2026년 4월'],
    images: { // 카카오톡 카드 공유 이미지
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fshin-minje-kim-hyunji%2Fthum.jpg?alt=media&token=c5eef8b5-a83b-4a4c-b5bb-2491feaba51c',
      favicon: '/images/favicon.ico'
    },
    openGraph: {
      title: '신민제 ♥ 김현지 결혼식 초대',
      description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.'
    },
    twitter: {
      title: '신민제 ♥ 김현지 결혼식 초대',
      description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.'
    }
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오후 3:00',
    ceremonyAddress: '서울특별시 강남구 테헤란로 123',
    ceremonyContact: '02-1234-5678',
    greetingMessage: '두 사람이 사랑으로 하나가 되는 순간을\n함께해 주시는 모든 분들께 감사드립니다.\n\n새로운 시작을 따뜻한 마음으로\n축복해 주시면 더없는 기쁨이겠습니다.',
    greetingAuthor: '신민제 · 김현지',
    mapDescription: '지하철 이용 시 더케이웨딩홀까지 편리하게 오실 수 있습니다',
    // 신랑/신부 가족 정보
    groom: {
      name: '신민제',
      order: '장남',
      father: {
        relation: '부',
        name: '신동철',
        phone: '010-1111-2222'
      },
      mother: {
        relation: '모',
        name: '이미숙',
        phone: '010-2222-3333'
      },
      phone: '010-3333-4444'
    },
    bride: {
      name: '김현지',
      order: '장녀',
      father: {
        relation: '부',
        name: '김승현',
        phone: '010-4444-5555'
      },
      mother: {
        relation: '모',
        name: '박지은',
        phone: '010-5555-6666'
      },
      phone: '010-6666-7777'
    },
    kakaoMap: { // 카카오맵 설정 
      latitude: 37.5048,
      longitude: 127.0280,
      level: 3,
      markerTitle: '더케이웨딩홀'
    },
    venueGuide: [
      {
        title: '신부 대기실',
        content: '신부대기실은 예식 시작 10분 전\n오후 2시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.'
      },
      {
        title: '식사',
        content: '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(14:30 - 16:30)'
      }
    ],
    wreathGuide: [
      {
        title: '화환 안내',
        content: '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 그랜드컨벤션센터\n예식일시: 2025년 6월 21일 토요일 오후 2시\n수령인: 신랑 신민제 / 신부 김현지\n연락처: 02-9876-5432'
      },
      {
        title: '배송 시간',
        content: '화환은 예식 전날 오후 또는\n당일 오전 11시까지 도착할 수 있도록\n주문해 주시기 바랍니다.\n\n예식장 측 사정으로 인해\n예식 시작 2시간 전까지는\n반드시 배치가 완료되어야 하오니\n참고 부탁드립니다.'
      }
    ],
    giftInfo: {
      groomAccounts: [
        {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '신민제'
        }
      ],
      brideAccounts: [
        {
          bank: '우리은행',
          accountNumber: '1002-234-567890',
          accountHolder: '김현지'
        }
      ],
      message: '마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다.'
    }
  }
};