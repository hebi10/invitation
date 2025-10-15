// 웨딩 페이지 설정 파일
// 새로운 웨딩 페이지를 추가할 때는 config/pages/ 디렉토리에 개별 설정 파일을 추가하고
// 아래 imports와 WEDDING_PAGES_CONFIG 배열에 추가해주세요.

// 개별 페이지 설정 파일들 import
import { kimMinjunParkSoheeConfig } from './pages/kim-minjun-park-sohee';
import { shinMinjeKimHyunjiConfig } from './pages/shin-minje-kim-hyunji';
import { leeJunhoParkSominConfig } from './pages/lee-junho-park-somin';
import { kimTaehyunChoiYunaConfig } from './pages/kim-taehyun-choi-yuna';
import { anDoyoungYoonJisooConfig } from './pages/an-doyoung-yoon-jisoo';

// 가족 정보 인터페이스
export interface FamilyMember {
  relation: string; // 부, 모
  name: string;
  phone?: string;
}

export interface PersonInfo {
  name: string;
  order?: string; // 장남, 차남, 장녀, 차녀 등
  father?: FamilyMember;
  mother?: FamilyMember;
  phone?: string;
}

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
  // 페이지 버전 설정
  variants?: {
    simple?: {
      available: boolean;
      path: string; // 심플 버전 경로
      displayName: string; // 심플 버전 표시명
    };
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
    venueName?: string; // 예식장 이름 (기본값: venue 또는 '웨딩홀')
    // 신랑/신부 가족 정보
    groom?: PersonInfo;
    bride?: PersonInfo;
    // 카카오맵 설정
    kakaoMap?: {
      latitude: number;   // 위도
      longitude: number;  // 경도
      level?: number;     // 지도 확대 레벨 (1~14, 기본값: 3)
      markerTitle?: string; // 마커 타이틀 (기본값: venueName 또는 venue)
    };
    // 예식장 안내
    venueGuide?: {
      title: string;
      content: string;
    }[];
    // 화환 안내
    wreathGuide?: {
      title: string;
      content: string;
    }[];
  };
}

export const WEDDING_PAGES_CONFIG: WeddingPageConfig[] = [
  kimMinjunParkSoheeConfig,
  shinMinjeKimHyunjiConfig,
  leeJunhoParkSominConfig,
  kimTaehyunChoiYunaConfig,
  anDoyoungYoonJisooConfig
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
