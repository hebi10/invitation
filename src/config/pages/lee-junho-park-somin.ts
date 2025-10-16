import { WeddingPageConfig } from '../weddingPages';

export const leeJunhoParkSominConfig: WeddingPageConfig = {
  slug: 'lee-junho-park-somin',
  displayName: '이준호 ♥ 박소민',
  description: '2024년 9월 28일 토요일 오후 2시, 이준호와 박소민이 하나 되는 날에 소중한 분들을 초대합니다.',
  date: '2024년 9월 28일',
  venue: '컨벤션웨딩홀',
  groomName: '이준호',
  brideName: '박소민',
  weddingDateTime: {
    year: 2024,
    month: 8, // 0-based (0 = January)
    day: 28,
    hour: 14,
    minute: 0
  },
  variants: {
    simple: {
      available: true,
      path: '/lee-junho-park-somin-simple',
      displayName: '이준호 ♥ 박소민 (심플 버전)'
    }
  },
  metadata: {
    title: '이준호 ♥ 박소민 결혼식에 초대합니다',
    description: '2024년 9월 28일 토요일 오후 2시, 이준호와 박소민이 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '이준호', '박소민', '2024년 9월'],
    images: {
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Flee-junho-park-somin%2Fthum.jpg?alt=media&token=2f3d2c5e-8e9b-4b5c-a7dd-1234567890ab',
      favicon: '/images/favicon.ico'
    },
    openGraph: {
      title: '이준호 ♥ 박소민 결혼식 초대',
      description: '2024년 9월 28일 토요일 오후 2시, 이준호와 박소민이 하나 되는 날에 소중한 분들을 초대합니다.'
    },
    twitter: {
      title: '이준호 ♥ 박소민 결혼식 초대',
      description: '2024년 9월 28일 토요일 오후 2시, 이준호와 박소민이 하나 되는 날에 소중한 분들을 초대합니다.'
    }
  },
  pageData: {
    subtitle: '사랑으로 하나가 되는 특별한 날',
    ceremonyTime: '오후 2:00',
    ceremonyAddress: '서울특별시 서초구 서초대로 456',
    ceremonyContact: '02-5678-9012',
    greetingMessage: '서로를 아끼고 사랑하는 두 사람이\n인생의 동반자가 되어 한 걸음씩 나아가고자 합니다.\n\n저희의 출발을 따뜻한 마음으로\n축복해 주시면 감사하겠습니다.',
    greetingAuthor: '이준호 · 박소민',
    mapDescription: '컨벤션센터 인근으로 대중교통으로 편리하게 오실 수 있습니다',
    // 신랑/신부 가족 정보
    groom: {
      name: '이준호',
      order: '장남',
      father: {
        relation: '부',
        name: '이성민',
        phone: '010-2828-2929'
      },
      mother: {
        relation: '모',
        name: '김지영',
        phone: '010-3030-3131'
      },
      phone: '010-3232-3333'
    },
    bride: {
      name: '박소민',
      order: '차녀',
      father: {
        relation: '부',
        name: '박준수',
        phone: '010-3434-3535'
      },
      mother: {
        relation: '모',
        name: '최현숙',
        phone: '010-3636-3737'
      },
      phone: '010-3838-3939'
    },
    kakaoMap: {
      latitude: 37.4900,
      longitude: 127.0100,
      level: 3,
      markerTitle: '컨벤션웨딩홀'
    },
    venueGuide: [
      {
        title: '신부 대기실',
        content: '신부대기실은 예식 시작 10분 전\n오후 1시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.'
      },
      {
        title: '식사',
        content: '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(13:30 - 15:30)'
      }
    ],
    wreathGuide: [
      {
        title: '화환 안내',
        content: '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 스카이웨딩홀\n예식일시: 2025년 12월 15일 일요일 오후 4시\n수령인: 신랑 이준호 / 신부 박소민\n연락처: 02-3333-4444'
      },
      {
        title: '배송 시간',
        content: '화환은 예식 전날 오후 또는\n당일 오전 11시까지 도착할 수 있도록\n주문해 주시기 바랍니다.\n\n예식장 측 사정으로 인해\n예식 시작 2시간 전까지는\n반드시 배치가 완료되어야 하오니\n참고 부탁드립니다.'
      }
    ]
  }
};