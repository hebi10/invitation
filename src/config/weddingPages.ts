// 웨딩 페이지 설정 파일
// 새로운 웨딩 페이지를 추가할 때 여기에만 추가하면 됩니다.

export interface WeddingPageConfig {
  slug: string;
  displayName: string;
  description: string;
  date: string;
  venue: string;
  groomName: string;
  brideName: string;
  weddingDateTime: {
    year: number;
    month: number; // 0-based (0 = January)
    day: number;
    hour: number;
    minute: number;
  };
  // 페이지 노출 기간 설정
  displayPeriod?: {
    startDate: Date;
    endDate: Date;
    isActive: boolean; // 노출 기간 제한 활성화 여부
  };
  // 메타데이터 설정
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    images: {
      wedding: string; // 메인 웨딩 이미지 URL
      favicon: string; // 파비콘 URL
    };
    openGraph: {
      title: string;
      description: string;
    };
    twitter: {
      title: string;
      description: string;
    };
  };
  // 상세 페이지 데이터
  pageData?: {
    subtitle?: string;
    ceremonyTime?: string;
    ceremonyAddress?: string;
    ceremonyContact?: string;
    greetingMessage?: string;
    greetingAuthor?: string;
    mapUrl?: string;
    mapDescription?: string;
  };
}

export const WEDDING_PAGES_CONFIG: WeddingPageConfig[] = [
  {  // 김민준 ♥ 박소희
    slug: 'kim-minjun-park-sohee', // 영어 성함을 작성해주세요.
    displayName: '김민준 ♥ 박소희', // 웨딩 페이지의 표시 이름
    // 웨딩 페이지의 설명
    description: '2026년 4월 14일 토요일 오후 3시, 김민준과 박소희가 하나 되는 날에 소중한 분들을 초대합니다.',
    date: '2026년 4월 14일', // 결혼식 날짜
    venue: '더케이웨딩홀', // 웨딩홀 이름
    groomName: '김민준', // 신랑 성함
    brideName: '박소희', // 신부 성함
    weddingDateTime: {
      year: 2026, // 결혼식 연도
      month: 3, // 월 (0-based, 0 = January)
      day: 14, // 일
      hour: 15, // 시간 (24시간제)
      minute: 0 // 분
    },
    metadata: {  // 메타데이터 설정
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
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25314.40229051596!2d127.01265801385874!3d37.52441811794768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4784ed95631%3A0x12a8bf0e6438ac7!2z642U7YG0656Y7Iqk7LKt64u0!5e0!3m2!1sko!2skr!4v1753176333092!5m2!1sko!2skr',
      mapDescription: '지하철 이용 시 더케이웨딩홀까지 편리하게 오실 수 있습니다'
    }
  },
  {  // 신민제 ♥ 김현지
    slug: 'shin-minje-kim-hyunji', // 영어 성함을 작성해주세요.
    displayName: '신민제 ♥ 김현지', // 웨딩 페이지의 표시 이름
    // 웨딩 페이지의 설명
    description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
    date: '2026년 4월 14일', // 결혼식 날짜
    venue: '더케이웨딩홀', // 웨딩홀 이름
    groomName: '신민제', // 신랑 성함
    brideName: '김현지', // 신부 성함
    weddingDateTime: {
      year: 2026, // 결혼식 연도
      month: 3, // 월 (0-based, 0 = January)
      day: 14, // 일
      hour: 15, // 시간 (24시간제)
      minute: 0 // 분
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
  },
  {  // 이준호 ♥ 박소민
    slug: 'lee-junho-park-somin',
    displayName: '이준호 ♥ 박소민',
    description: '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
    date: '2026년 6월 20일',
    venue: '웨딩팰리스',
    groomName: '이준호',
    brideName: '박소민',
    weddingDateTime: {
      year: 2026,
      month: 5, // June (0-based)
      day: 20,
      hour: 14,
      minute: 0
    },
    metadata: {
      title: '이준호 ♥ 박소민 결혼식에 초대합니다',
      description: '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다. 저희의 행복한 출발을 함께 축복해 주세요.',
      keywords: ['결혼식', '웨딩', '청첩장', '이준호', '박소민', '2026년 6월'],
      images: {
        wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Flee-junho-park-somin%2Fthum.jpg?alt=media',
        favicon: '/images/favicon.ico'
      },
      openGraph: {
        title: '이준호 ♥ 박소민 결혼식 초대',
        description: '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.'
      },
      twitter: {
        title: '이준호 ♥ 박소민 결혼식 초대',
        description: '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.'
      }
    }
  },
  {  // 김태현 ♥ 최유나
    slug: 'kim-taehyun-choi-yuna',
    displayName: '김태현 ♥ 최유나',
    description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
    date: '2024년 6월 22일',
    venue: '가든 웨딩홀',
    groomName: '김태현',
    brideName: '최유나',
    weddingDateTime: {
      year: 2024,
      month: 5, // June (0-based)
      day: 22,
      hour: 13,
      minute: 0
    },
    metadata: {
      title: '김태현 ♥ 최유나 결혼식에 초대합니다',
      description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다. 저희의 사랑의 여정을 함께 지켜봐 주세요.',
      keywords: ['결혼식', '웨딩', '청첩장', '김태현', '최유나', '2024년 6월'],
      images: {
        wedding: 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fkim-taehyun-choi-yuna%2Fthum.jpg?alt=media',
        favicon: '/images/favicon.ico'
      },
      openGraph: {
        title: '김태현 ♥ 최유나 결혼식 초대',
        description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.'
      },
      twitter: {
        title: '김태현 ♥ 최유나 결혼식 초대',
        description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.'
      }
    },
    pageData: {
      subtitle: '영원한 사랑을 약속합니다',
      ceremonyTime: '오후 1:00',
      ceremonyAddress: '서울특별시 강남구 압구정로 456',
      ceremonyContact: '02-2345-6789',
      greetingMessage: '사랑하는 가족과 친구들과 함께 영원한 약속을 나누고자 합니다. 저희의 사랑의 여정을 따뜻하게 지켜봐 주세요.',
      greetingAuthor: '김태현 · 최유나',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25314.40229051596!2d127.01265801385874!3d37.52441811794768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4784ed95631%3A0x12a8bf0e6438ac7!2z642U7YG0656Y7Iqk7LKt64u0!5e0!3m2!1sko!2skr!4v1753176333092!5m2!1sko!2skr',
      mapDescription: '지하철 이용 시 가든 웨딩홀까지 편리하게 오실 수 있습니다'
    }
  }
];

// 편의 함수들
export function getWeddingPageBySlug(slug: string): WeddingPageConfig | undefined {
  return WEDDING_PAGES_CONFIG.find(page => page.slug === slug);
}

export function getAllWeddingPageSlugs(): string[] {
  return WEDDING_PAGES_CONFIG.map(page => page.slug);
}

export function getWeddingPageCount(): number {
  return WEDDING_PAGES_CONFIG.length;
}

// 메타데이터 생성 함수
export function generateMetadata(slug: string) {
  const pageConfig = getWeddingPageBySlug(slug);
  if (!pageConfig) {
    throw new Error(`Wedding page config not found for slug: ${slug}`);
  }

  const { metadata } = pageConfig;

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    icons: [
      {
        rel: 'icon',
        url: metadata.images.favicon,
      },
      {
        rel: 'shortcut icon',
        url: metadata.images.favicon,
      },
      {
        rel: 'apple-touch-icon',
        url: metadata.images.favicon,
      },
    ],
    openGraph: {
      title: metadata.openGraph.title,
      description: metadata.openGraph.description,
      images: [
        {
          url: metadata.images.wedding,
          width: 800,
          height: 600,
          alt: `${pageConfig.groomName} ♡ ${pageConfig.brideName} 결혼식`,
        },
      ],
      type: 'website' as const,
      locale: 'ko_KR',
      siteName: '모바일 청첩장',
    },
    other: {
      // X (구 Twitter) 카드
      'twitter:card': 'summary_large_image',
      'twitter:title': metadata.twitter.title,
      'twitter:description': metadata.twitter.description,
      'twitter:image': metadata.images.wedding,
    },
  };
}
