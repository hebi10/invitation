// 정적 내보내기를 위한 클라이언트 사이드 유틸리티
export interface WeddingPageInfo {
  slug: string;
  displayName: string;
  description?: string;
  date?: string;
  venue?: string;
}

export function getWeddingPagesClient(): WeddingPageInfo[] {
  const pageInfoMap: Record<string, { displayName: string; description: string; date: string; venue: string }> = {
    'shin-minje-kim-hyunji': {
      displayName: '신민제 ♥ 김현지',
      description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
      date: '2024년 4월 14일',
      venue: '라벤더 웨딩홀'
    },
    'lee-junho-park-somin': {
      displayName: '이준호 ♥ 박소민',
      description: '2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
      date: '2024년 5월 18일',
      venue: '로즈 웨딩홀'
    },
    'kim-taehyun-choi-yuna': {
      displayName: '김태현 ♥ 최유나',
      description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
      date: '2024년 6월 22일',
      venue: '가든 웨딩홀'
    }
  };

  return Object.keys(pageInfoMap).map(slug => ({
    slug,
    displayName: pageInfoMap[slug].displayName,
    description: pageInfoMap[slug].description,
    date: pageInfoMap[slug].date,
    venue: pageInfoMap[slug].venue
  }));
}
