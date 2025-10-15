import { WeddingPageConfig } from '../weddingPages';

export const anDoyoungYoonJisooConfig: WeddingPageConfig = {
  slug: 'an-doyoung-yoon-jisoo',
  displayName: '안도영 ♥ 윤지수',
  description: '2025년 11월 30일 토요일 오후 11시, 안도영과 윤지수가 하나 되는 날에 소중한 분들을 초대합니다.',
  date: '2025년 11월 30일',
  venue: '소노펠리체 델피노',
  groomName: '안도영',
  brideName: '윤지수',
  weddingDateTime: {
    year: 2025,
    month: 10, // 0-based (0 = January)
    day: 30,
    hour: 11,
    minute: 0
  },
  variants: {
    simple: {
      available: true,
      path: '/an-doyoung-yoon-jisoo',
      displayName: '안도영 ♥ 윤지수'
    }
  },
  metadata: {
    title: '안도영 ♡ 윤지수 결혼합니다',
    description: '2025년 11월 30일 토요일 오후 11시, 안도영과 윤지수가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '안도영', '윤지수', '2025년 11월'],
    images: {
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fan-doyoung-yoon-jisoo%2Fmain.jpg?alt=media&token=4495e9e0-503f-4c3a-8cf4-4ba84b826822',
      favicon: '/images/favicon.ico'
    },
    openGraph: {
      title: '안도영 ♡ 윤지수 결혼식 초대',
      description: '2025년 11월 30일 토요일 오후 11시, 안도영과 윤지수가 하나 되는 날에 소중한 분들을 초대합니다.'
    },
    twitter: {
      title: '안도영 ♡ 윤지수 결혼식 초대',
      description: '2025년 11월 30일 토요일 오후 11시, 안도영과 윤지수가 하나 되는 날에 소중한 분들을 초대합니다.'
    }
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오전 11:00',
    ceremonyAddress: '강원특별자치도 고성군 토성면 미시령옛길 1153 그랜드 볼룸 1층',
    ceremonyContact: '02-1234-5678',
    venueName: '소노펠리체 델피노',
    greetingMessage: '처음엔 우연이었고,<br>지금은 이유가 되었어요.<br><br>함께 있는 게<br>가장 자연스러운 사람,<br><br>그래서 평생을 함께하기로 했습니다.<br><br>우리의 시작,<br>따뜻한 마음으로 함께해 주세요.',
    greetingAuthor: '안도영 · 윤지수',
    mapDescription: '서울역 2번 출구 및 강릉고속버스터미널에서 셔틀버스가 운행됩니다.',
    kakaoMap: {
      latitude: 38.2100918,   // 강원 고성 좌표
      longitude: 128.4978166,
      level: 6,  // 외곽 지역이라 좀 더 넓게
      markerTitle: '소노펠리체 델피노'
    },
    venueGuide: [
      {
        title: '신부 대기실',
        content: '신부대기실은 예식 시작 10분 전\n오전 10시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.'
      },
      {
        title: '식사',
        content: '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(10:30 - 12:30)'
      }
    ]
  }
};