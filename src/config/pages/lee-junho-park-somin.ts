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
    greetingMessage: '서로를 아끼고 사랑하는 두 사람이 인생의 동반자가 되어 한 걸음씩 나아가고자 합니다. 저희의 출발을 따뜻한 마음으로 축복해 주시면 감사하겠습니다.',
    greetingAuthor: '이준호 · 박소민',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25314.40229051596!2d127.01265801385874!3d37.52441811794768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4784ed95631%3A0x12a8bf0e6438ac8!2z7Lao67Kk7Iqx7YWo7Iqk64u4!5e0!3m2!1sko!2skr!4v1753176333093!5m2!1sko!2skr',
    mapDescription: '컨벤션센터 인근으로 대중교통으로 편리하게 오실 수 있습니다',
    kakaoMap: {
      latitude: 37.4900,
      longitude: 127.0100,
      level: 3,
      markerTitle: '컨벤션웨딩홀'
    }
  }
};