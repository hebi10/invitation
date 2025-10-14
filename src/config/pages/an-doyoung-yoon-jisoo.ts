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
      path: '/an-doyoung-yoon-jisoo-simple',
      displayName: '안도영 ♥ 윤지수'
    }
  },
  metadata: {
    title: '안도영 ♡ 윤지수 결혼합니다',
    description: '2025년 11월 30일 토요일 오후 11시, 안도영과 윤지수가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
    keywords: ['결혼식', '웨딩', '청첩장', '안도영', '윤지수', '2025년 11월'],
    images: {
      wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fan-doyoung-yoon-jisoo%2Fgallery01.jpg?alt=media&token=89263d65-fb58-4c2e-9a64-a47570ab2131',
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
    ceremonyTime: '오후 3:00',
    ceremonyAddress: '강원특별자치도 고성군 토성면 미시령옛길 1153 그랜드 볼룸 1층',
    ceremonyContact: '02-1234-5678',
    venueName: '소노펠리체 델피노',
    greetingMessage: '처음엔 우연이었고,<br>지금은 이유가 되었어요.<br><br>함께 있는 게<br>가장 자연스러운 사람,<br><br>그래서 평생을 함께하기로 했습니다.<br><br>우리의 시작,<br>따뜻한 마음으로 함께해 주세요.',
    greetingAuthor: '안도영 · 윤지수',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3134.9915961581096!2d128.4978166!3d38.2100918!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5fd8bd4279e92d49%3A0xc1835ca41f296517!2z6rCV7JuQ7Yq567OE7J6Q7LmI64-EIOqzoOyEseq1sCDthqDshLHrqbQg66-47Iuc66C57Jib6ri4IDExNTM!5e0!3m2!1sko!2skr!4v1760341368999!5m2!1sko!2skr',
    mapDescription: '지하철 이용 시 소노펠리체 델피노까지 편리하게 오실 수 있습니다',
    kakaoMap: {
      latitude: 38.2100918,   // 강원 고성 좌표
      longitude: 128.4978166,
      level: 5,  // 외곽 지역이라 좀 더 넓게
      markerTitle: '소노펠리체 델피노'
    }
  }
};