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
}

export const WEDDING_PAGES_CONFIG: WeddingPageConfig[] = [
  {
    slug: 'shin-minje-kim-hyunji', // 영어 성함을 작성해주세요.
    displayName: '신민제 ♥ 김현지', // 웨딩 페이지의 표시 이름
    // 웨딩 페이지의 설명
    description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
    date: '2024년 4월 14일', // 결혼식 날짜
    venue: '라벤더 웨딩홀', // 웨딩홀 이름
    groomName: '신민제', // 신랑 성함
    brideName: '김현지', // 신부 성함
    weddingDateTime: {
      year: 2024, // 결혼식 연도
      month: 3, // 월 (0-based, 0 = January)
      day: 14, // 일
      hour: 14, // 시간 (24시간제)
      minute: 0 // 분
    }
  },
  {
    slug: 'lee-junho-park-somin',
    displayName: '이준호 ♥ 박소민',
    description: '2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
    date: '2024년 5월 18일',
    venue: '블루밍 웨딩홀',
    groomName: '이준호',
    brideName: '박소민',
    weddingDateTime: {
      year: 2024,
      month: 4, // May (0-based)
      day: 18,
      hour: 15,
      minute: 0
    }
  },
  {
    slug: 'kim-taehyun-choi-yuna',
    displayName: '김태현 ♥ 최유나',
    description: '2024년 6월 8일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
    date: '2024년 6월 8일',
    venue: '가든 웨딩홀',
    groomName: '김태현',
    brideName: '최유나',
    weddingDateTime: {
      year: 2024,
      month: 5, // June (0-based)
      day: 8,
      hour: 13,
      minute: 0
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
