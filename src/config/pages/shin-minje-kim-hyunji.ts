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
    simple: {
      available: true,
      path: '/shin-minje-kim-hyunji-simple',
      displayName: '신민제 ♥ 김현지 (심플 버전)'
    }
  },
  metadata: {
    title: '신민제 ♥ 김현지 결혼식에 초대합니다',
    description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '신민제', '김현지', '2026년 4월'],
    images: {
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
    greetingMessage: '두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다.',
    greetingAuthor: '신민제 · 김현지',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25314.40229051596!2d127.01265801385874!3d37.52441811794768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4784ed95631%3A0x12a8bf0e6438ac7!2z642U7YG0656Y7Iqk7LKt64u0!5e0!3m2!1sko!2skr!4v1753176333092!5m2!1sko!2skr',
    mapDescription: '지하철 이용 시 더케이웨딩홀까지 편리하게 오실 수 있습니다'
  }
};