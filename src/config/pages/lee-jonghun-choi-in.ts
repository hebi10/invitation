import { WeddingPageConfig } from '../weddingPages';

export const leeJonghunChoiInConfig: WeddingPageConfig = {
  slug: 'lee-jonghun-choi-in',
  displayName: '이종훈 ♥ 최 인',
  description: '2026년 3월 22일 토요일 오전 11시, 이종훈과 최 인이 하나 되는 날에 소중한 분들을 초대합니다.',
  date: '2026년 3월 22일',
  venue: '더케이웨딩홀',
  groomName: '이종훈',
  brideName: '최 인',
  weddingDateTime: {
    year: 2026,
    month: 2, // 0-based (0 = January)
    day: 22,
    hour: 11,
    minute: 0
  },
  variants: {
    simple: {
      available: true,
      path: '/lee-jonghun-choi-in-simple',
      displayName: '이종훈 ♥ 최 인'
    },
  },
  metadata: {
    title: '이종훈 ♥ 최 인 결혼식에 초대합니다',
    description: '2026년 3월 22일 토요일 오전 11시, 이종훈과 최 인이 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '이종훈', '최 인', '2026년 4월'],
    images: { // 카카오톡 카드 공유 이미지
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Flee-jonghun-choi-in%2Fkakao_thum.jpg?alt=media&token=f233363f-5328-409d-bacb-e88a7810323f',
      favicon: '/images/favicon.ico'
    },
    openGraph: {
      title: '이종훈 ♥ 최 인 결혼식 초대',
      description: '2026년 3월 22일 토요일 오전 11시, 이종훈과 최 인이 하나 되는 날에 소중한 분들을 초대합니다.'
    },
    twitter: {
      title: '이종훈 ♥ 최 인 결혼식 초대',
      description: '2026년 3월 22일 토요일 오전 11시, 이종훈과 최 인이 하나 되는 날에 소중한 분들을 초대합니다.'
    }
  },
  pageData: {
    subtitle: '두 사람이 사랑으로 하나가 되는 날',
    ceremonyTime: '오전 11:00',
    ceremonyAddress: '인천광역시 계양구 경명대로 1108, CN웨딩홀 계산점',
    ceremonyContact: '02-1234-5678',
    greetingMessage: '각자의 일상을 성실히 보내던 두 사람이\n서로의 일상이 되어주기로 약속합니다.\n\n저희의 새로운 시작을 지켜봐주세요.',
    greetingAuthor: '이종훈 · 최 인',
    mapDescription: '지하철 이용 시 CN웨딩홀 계산점까지 편리하게 오실 수 있습니다.',
    // 신랑/신부 가족 정보
    groom: {
      name: '이종훈',
      order: '장남',
      father: {
        relation: '부',
        name: '이호규',
        phone: '010-8885-9750'
      },
      mother: {
        relation: '모',
        name: '이호규',
        phone: '010-3338-6201'
      },
      phone: '010-8974-9750'
    },
    bride: {
      name: '최 인',
      order: '장녀',
      father: {
        relation: '부',
        name: '최우진',
        phone: '010-9981-4582'
      },
      mother: {
        relation: '모',
        name: '최우진',
        phone: '010-2844-4580'
      },
      phone: '010-5292-4580'
    },
    kakaoMap: { // 카카오맵 설정 
      latitude: 37.5427244,
      longitude: 126.7300073,
      level: 3,
      markerTitle: 'CN웨딩홀 계산점'
    },
    venueGuide: [
      // {
      //   title: '신부 대기실',
      //   content: '신부대기실은 예식 시작 10분 전\n오후 2시 50분 에 마감될 예정이오니\n신부와의 만남을 원하는 신부 측\n하객분들께서는 마감 시간 전까지\n방문해주시면 감사하겠습니다.'
      // },
      {
        title: '식사',
        content: '식사는 뷔페식으로 진행되며\n예식 30분 전부터 이용할 수 있습니다.\n한식·일식·양식으로 아낌없이 준비되어 있으며\n음료를 포함한 주류도 무제한 이용 가능하니\n마음껏 식사를 즐겨주시기 바랍니다.\n(10:30 - 12:30)'
      }
    ],
    // wreathGuide: [
    //   {
    //     title: '화환 안내',
    //     content: '축하의 뜻을 전하고자 화환을 보내주실 경우\n아래 안내 사항을 참고해 주시기 바랍니다.\n\n예식장: 그랜드컨벤션센터\n예식일시: 2025년 6월 21일 토요일 오후 2시\n수령인: 신랑 이종훈 / 신부 최 인\n연락처: 02-9876-5432'
    //   },
    //   {
    //     title: '배송 시간',
    //     content: '화환은 예식 전날 오후 또는\n당일 오전 11시까지 도착할 수 있도록\n주문해 주시기 바랍니다.\n\n예식장 측 사정으로 인해\n예식 시작 2시간 전까지는\n반드시 배치가 완료되어야 하오니\n참고 부탁드립니다.'
    //   }
    // ],
    giftInfo: {
      groomAccounts: [
        {
          bank: '카카오뱅크',
          accountNumber: '3333-11-7757369',
          accountHolder: '신랑 이종훈'
        },
        {
          bank: '국민은행',
          accountNumber: '202-01-0925-182',
          accountHolder: '부 이호규'
        },
        {
          bank: '국민은행',
          accountNumber: '202-21-1777-244',
          accountHolder: '모 김원연'
        }
      ],
      brideAccounts: [
        {
          bank: '신한은행',
          accountNumber: '1002-234-567890',
          accountHolder: '신부 최 인'
        },
        {
          bank: '국민은행',
          accountNumber: '566-12-205058',
          accountHolder: '부 최우진'
        },
        {
          bank: '우리은행',
          accountNumber: '566-12-205058',
          accountHolder: '모 이옥희'
        }
      ],
      message: '참석이 어려우신 분들을 위해 조심스레 계좌를 남깁니다. 따뜻한 축하만으로도 감사합니다.'
    }
  }
};