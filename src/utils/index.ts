// === Utils Barrel Exports ===

// 웨딩 페이지 정보 (클라이언트용)
export { 
  getWeddingPagesClient, 
  getWeddingPageBySlug,
  getWeddingPageConfig,
  type WeddingPageInfo 
} from './getWeddingPagesClient';

// 페이지 접근 제어
export { checkPageAccess, AccessDeniedPage } from './pageAccess';

// 이미지 최적화
export { optimizeImageUrl, preloadImage, preloadImages, imageLoadTracker, ImageLoadTracker } from './imageOptimization';
export type { ImageOptimizationOptions } from './imageOptimization';

// 스크롤 유틸
export { scrollToSection } from './scrollToSection';
export { copyTextToClipboard } from './copyTextToClipboard';

// 주의: getWeddingPages는 fs를 사용하므로 서버 사이드에서만 직접 import 하세요
