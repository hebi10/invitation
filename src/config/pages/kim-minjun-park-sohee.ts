import { WeddingPageConfig } from '../weddingPages';

export const kimMinjunParkSoheeConfig: WeddingPageConfig = {
  slug: 'kim-minjun-park-sohee',
  displayName: '김민준 ♥ 박소희',
  description: '2026년 4월 14일 토요일 오후 3시, 김민준과 박소희가 하나 되는 날에 소중한 분들을 초대합니다.',
  date: '2026년 4월 14일',
  venue: '더케이웨딩홀',
  groomName: '김민준',
  brideName: '박소희',
  weddingDateTime: {
    year: 2026,
    month: 3, // 0-based (0 = January)
    day: 14,
    hour: 15,
    minute: 0
  },
  variants: {
    simple: {
      available: true,
      path: '/kim-minjun-park-sohee-simple',
      displayName: '김민준 ♥ 박소희 (심플 버전)'
    }
  },
  metadata: {
    title: '김민준 ♡ 박소희 결혼식에 초대합니다',
    description: '2026년 4월 14일 토요일 오후 3시, 김민준과 박소희가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '김민준', '박소희', '2026년 4월'],
    images: {
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fkim-minjun-park-sohee%2Fthum.jpg?alt=media',
      favicon: '/images/favicon.ico'
    },
    openGraph: {
      title: '김민준 ♡ 박소희 결혼식 초대',
      description: '2026년 4월 14일 토요일 오후 3시, 김민준과 박소희가 하나 되는 날에 소중한 분들을 초대합니다.'
    },
    twitter: {
      title: '김민준 ♡ 박소희 결혼식 초대',
      description: '2026년 4월 14일 토요일 오후 3시, 김민준과 박소희가 하나 되는 날에 소중한 분들을 초대합니다.'
    }
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오후 3:00',
    ceremonyAddress: '서울특별시 강남구 테헤란로 123',
    ceremonyContact: '02-1234-5678',
    greetingMessage: '두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다.',
    greetingAuthor: '김민준 · 박소희',
    mapDescription: '지하철 이용 시 더케이웨딩홀까지 편리하게 오실 수 있습니다',
    // 신랑/신부 가족 정보
    groom: {
      name: '김민준',
      order: '장남',
      father: {
        relation: '부',
        name: '김철수',
        phone: '010-1234-5678'
      },
      mother: {
        relation: '모',
        name: '이영희',
        phone: '010-2345-6789'
      },
      phone: '010-3456-7890'
    },
    bride: {
      name: '박소희',
      order: '차녀',
      father: {
        relation: '부',
        name: '박명수',
        phone: '010-4567-8901'
      },
      mother: {
        relation: '모',
        name: '정수현',
        phone: '010-5678-9012'
      },
      phone: '010-6789-0123'
    },
    // 카카오맵 설정 (강남구 테헤란로 123 근처 좌표)
    kakaoMap: {
      latitude: 37.5048,    // 위도
      longitude: 127.0280,  // 경도
      level: 3,             // 지도 확대 레벨 (1~14)
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
        content: '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 더케이웨딩홀\n주소: 서울특별시 강남구 테헤란로 123\n예식일시: 2026년 4월 14일 토요일 오후 3시\n수령인: 신랑 김민준 / 신부 박소희\n연락처: 02-1234-5678'
      },
      {
        title: '배송 시간',
        content: '화환은 예식 전날 오후 또는\n당일 오전 11시까지 도착할 수 있도록\n주문해 주시기 바랍니다.\n\n예식장 측 사정으로 인해\n예식 시작 2시간 전까지는\n반드시 배치가 완료되어야 하오니\n참고 부탁드립니다.'
      }
    ]
  }
};