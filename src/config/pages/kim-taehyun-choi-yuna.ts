import { WeddingPageConfig } from '../weddingPages';

export const kimTaehyunChoiYunaConfig: WeddingPageConfig = {
  slug: 'kim-taehyun-choi-yuna',
  displayName: '김태현 ♥ 최유나',
  description: '2024년 11월 16일 토요일 오후 1시, 김태현과 최유나가 하나 되는 날에 소중한 분들을 초대합니다.',
  date: '2024년 11월 16일',
  venue: '엘리시안웨딩홀',
  groomName: '김태현',
  brideName: '최유나',
  weddingDateTime: {
    year: 2024,
    month: 10, // 0-based (0 = January)
    day: 16,
    hour: 13,
    minute: 0
  },
  variants: {
    simple: {
      available: true,
      path: '/kim-taehyun-choi-yuna-simple',
      displayName: '김태현 ♥ 최유나 (심플 버전)'
    }
  },
  metadata: {
    title: '김태현 ♥ 최유나 결혼식에 초대합니다',
    description: '2024년 11월 16일 토요일 오후 1시, 김태현과 최유나가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '김태현', '최유나', '2024년 11월'],
    images: {
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fkim-taehyun-choi-yuna%2Fthum.jpg?alt=media&token=7a8b9c0d-1e2f-3g4h-5i6j-0987654321ba',
      favicon: '/images/favicon.ico'
    },
    openGraph: {
      title: '김태현 ♥ 최유나 결혼식 초대',
      description: '2024년 11월 16일 토요일 오후 1시, 김태현과 최유나가 하나 되는 날에 소중한 분들을 초대합니다.'
    },
    twitter: {
      title: '김태현 ♥ 최유나 결혼식 초대',
      description: '2024년 11월 16일 토요일 오후 1시, 김태현과 최유나가 하나 되는 날에 소중한 분들을 초대합니다.'
    }
  },
  pageData: {
    subtitle: '진실한 사랑으로 맺어지는 인연',
    ceremonyTime: '오후 1:00',
    ceremonyAddress: '서울특별시 마포구 월드컵로 789',
    ceremonyContact: '02-9012-3456',
    greetingMessage: '오랜 시간 서로를 이해하고 사랑해온 두 사람이 이제 한 가정을 이루고자 합니다. 저희의 새로운 출발을 지켜봐 주시고 축복해 주시기 바랍니다.',
    greetingAuthor: '김태현 · 최유나',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25314.40229051596!2d127.01265801385874!3d37.52441811794768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4784ed95631%3A0x12a8bf0e6438ac9!2z7JeY66as7Iuc7JWI7Iqk64u4!5e0!3m2!1sko!2skr!4v1753176333094!5m2!1sko!2skr',
    mapDescription: '월드컵공원 인근으로 주차공간이 넉넉하게 준비되어 있습니다',
    kakaoMap: {
      latitude: 37.5663,
      longitude: 126.8997,
      level: 3,
      markerTitle: '엘리시안웨딩홀'
    }
  }
};