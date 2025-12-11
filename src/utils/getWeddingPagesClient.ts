// 정적 내보내기를 위한 클라이언트 사이드 유틸리티
import { WEDDING_PAGES_CONFIG, type WeddingPageConfig } from '@/config/weddingPages';

export interface WeddingPageInfo {
  slug: string;
  displayName: string;
  description?: string;
  date?: string;
  venue?: string;
  variants?: {
    emotional?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    simple?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    minimal?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    space?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    blue?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    classic?: {
      available: boolean;
      path: string;
      displayName: string;
    };
  };
}

/**
 * 설정 파일 기반으로 웨딩 페이지 목록을 가져옵니다.
 * 새로운 페이지를 추가하려면 /config/weddingPages.ts 파일만 수정하면 됩니다.
 */
export function getWeddingPagesClient(): WeddingPageInfo[] {
  // WEDDING_PAGES_CONFIG가 undefined이거나 배열이 아닌 경우 처리
  if (!WEDDING_PAGES_CONFIG || !Array.isArray(WEDDING_PAGES_CONFIG)) {
    console.error('WEDDING_PAGES_CONFIG is not available or not an array');
    return [];
  }

  return WEDDING_PAGES_CONFIG.filter(config => config && typeof config === 'object' && config.slug).map(config => ({
    slug: config.slug,
    displayName: config.displayName || '',
    description: config.description,
    date: config.date,
    venue: config.venue,
    variants: config.variants
  }));
}

/**
 * 특정 슬러그의 웨딩 페이지 정보를 가져옵니다.
 */
export function getWeddingPageBySlug(slug: string): WeddingPageInfo | undefined {
  if (!WEDDING_PAGES_CONFIG || !Array.isArray(WEDDING_PAGES_CONFIG)) {
    console.error('WEDDING_PAGES_CONFIG is not available or not an array');
    return undefined;
  }

  const config = WEDDING_PAGES_CONFIG.find(page => page && page.slug === slug);
  if (!config) return undefined;
  
  return {
    slug: config.slug,
    displayName: config.displayName || '',
    description: config.description,
    date: config.date,
    venue: config.venue,
    variants: config.variants
  };
}

/**
 * 웨딩 페이지의 전체 설정 정보를 가져옵니다. (더 자세한 정보 포함)
 */
export function getWeddingPageConfig(slug: string): WeddingPageConfig | undefined {
  if (!WEDDING_PAGES_CONFIG || !Array.isArray(WEDDING_PAGES_CONFIG)) {
    console.error('WEDDING_PAGES_CONFIG is not available or not an array');
    return undefined;
  }
  
  return WEDDING_PAGES_CONFIG.find(page => page && page.slug === slug);
}
