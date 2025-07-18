import fs from 'fs';
import path from 'path';

export interface WeddingPageInfo {
  slug: string;
  displayName: string;
  description?: string;
  date?: string;
  venue?: string;
}

export function getWeddingPages(): WeddingPageInfo[] {
  const pagesDirectory = path.join(process.cwd(), 'src/app/(page)');
  
  try {
    const pageDirectories = fs.readdirSync(pagesDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const weddingPages: WeddingPageInfo[] = pageDirectories.map(slug => {
      // 각 페이지의 정보를 매핑
      const pageInfo = getPageInfo(slug);
      
      return {
        slug,
        displayName: pageInfo.displayName,
        description: pageInfo.description,
        date: pageInfo.date,
        venue: pageInfo.venue
      };
    });

    return weddingPages;
  } catch (error) {
    console.error('Error reading wedding pages:', error);
    return [];
  }
}

function getPageInfo(slug: string) {
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

  return pageInfoMap[slug] || {
    displayName: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    description: `${slug}의 결혼식에 초대합니다.`,
    date: '2024년',
    venue: 'Wedding Hall'
  };
}
